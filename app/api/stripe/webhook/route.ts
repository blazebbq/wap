import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

// Disable body parsing — Stripe requires the raw body for signature verification
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  const rawBody = await req.text();

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  // ── Idempotency check ────────────────────────────────────────────────────
  const existing = await prisma.webhookEvent.findUnique({
    where: {
      provider_eventId: {
        provider: "stripe",
        eventId: event.id,
      },
    },
  });

  if (existing?.processedAt) {
    // Already processed — return 200 to prevent Stripe retries
    return NextResponse.json({ received: true, duplicate: true });
  }

  const webhookRecord = await prisma.webhookEvent.upsert({
    where: {
      provider_eventId: {
        provider: "stripe",
        eventId: event.id,
      },
    },
    update: {},
    create: {
      provider: "stripe",
      eventId: event.id,
      payloadJson: event as unknown as Prisma.InputJsonValue,
    },
  });

  // ── Process event ────────────────────────────────────────────────────────
  try {
    await processStripeEvent(event);

    await prisma.webhookEvent.update({
      where: { id: webhookRecord.id },
      data: { processedAt: new Date() },
    });
  } catch (err) {
    // Log but return 200 so Stripe doesn't retry indefinitely
    console.error("Error processing webhook:", event.type, err);
  }

  return NextResponse.json({ received: true });
}

async function processStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(subscription);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        );
        await handleSubscriptionChange(sub);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        );
        await handleSubscriptionChange(sub);
      }
      break;
    }

    default:
      // Unhandled event type — ignore
      break;
  }
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const customerId = sub.customer as string;

  // Find the business with this Stripe customer ID
  const existingSubscription = await prisma.subscription.findFirst({
    where: { providerCustomerId: customerId },
  });

  if (!existingSubscription) {
    // Unknown customer — possibly new subscription creation
    // In a real app, the customer metadata would include businessId
    const businessId = sub.metadata?.businessId;
    if (!businessId) return;

    await prisma.subscription.upsert({
      where: { providerSubscriptionId: sub.id },
      update: {
        status: mapStripeStatus(sub.status),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      },
      create: {
        businessId,
        provider: "stripe",
        providerCustomerId: customerId,
        providerSubscriptionId: sub.id,
        status: mapStripeStatus(sub.status),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      },
    });
    return;
  }

  await prisma.subscription.update({
    where: { providerSubscriptionId: sub.id },
    data: {
      status: mapStripeStatus(sub.status),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  });

  // Sync business status based on subscription
  const businessStatus = sub.status === "active" ? "active" : "suspended";
  await prisma.business.update({
    where: { id: existingSubscription.businessId },
    data: { status: businessStatus },
  });
}

function mapStripeStatus(
  status: Stripe.Subscription.Status
): "trialing" | "active" | "past_due" | "canceled" | "unpaid" {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    default:
      return "active";
  }
}
