import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessIdFromRequest } from "@/lib/auth-helpers";
import { z } from "zod";

const BookingSchema = z.object({
  serviceId: z.string().min(1),
  startAtUtc: z.string().datetime(),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const businessId = getBusinessIdFromRequest(req);
  if (!businessId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Idempotency key support
  const idempotencyKey = req.headers.get("idempotency-key");

  const body = await req.json().catch(() => null);
  const parsed = BookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { serviceId, startAtUtc, customerEmail, customerPhone, notes } = parsed.data;

  // If idempotency key provided, check for existing booking
  if (idempotencyKey) {
    const existing = await prisma.booking.findFirst({
      where: {
        businessId,
        notes: `[idempotency:${idempotencyKey}]`,
      },
    });
    if (existing) {
      return NextResponse.json({ booking: existing }, { status: 200 });
    }
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true },
    select: { durationMin: true, pricePence: true, name: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const startAt = new Date(startAtUtc);
  const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);

  // Check for conflicts
  const conflict = await prisma.booking.findFirst({
    where: {
      businessId,
      status: { in: ["confirmed", "pending"] },
      OR: [
        {
          startAtUtc: { lt: endAt },
          endAtUtc: { gt: startAt },
        },
      ],
    },
  });

  if (conflict) {
    return NextResponse.json({ error: "Slot is no longer available" }, { status: 409 });
  }

  // Upsert customer
  const customer = await prisma.customer.upsert({
    where: {
      businessId_email: { businessId, email: customerEmail },
    },
    update: { phone: customerPhone },
    create: {
      businessId,
      email: customerEmail,
      phone: customerPhone,
    },
  });

  const booking = await prisma.booking.create({
    data: {
      businessId,
      customerId: customer.id,
      status: "pending",
      startAtUtc: startAt,
      endAtUtc: endAt,
      notes: idempotencyKey ? `[idempotency:${idempotencyKey}]` : notes,
      items: {
        create: {
          serviceId,
          pricePence: service.pricePence,
        },
      },
    },
    include: {
      items: { include: { service: { select: { name: true } } } },
      customer: { select: { email: true } },
    },
  });

  return NextResponse.json({ booking }, { status: 201 });
}
