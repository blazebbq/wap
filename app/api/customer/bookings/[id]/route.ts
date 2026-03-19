import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessIdFromRequest, requireCustomer } from "@/lib/auth-helpers";
import { z } from "zod";

const PatchSchema = z.object({
  action: z.enum(["cancel", "reschedule"]),
  newStartAtUtc: z.string().datetime().optional(),
});

// Cancellation / reschedule policy: must be >= 24h before appointment
const CANCEL_POLICY_HOURS = 24;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = getBusinessIdFromRequest(req);
  if (!businessId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const customerResult = await requireCustomer(businessId);
  if ("error" in customerResult) return customerResult.error;

  const { id } = await params;

  const booking = await prisma.booking.findFirst({
    where: {
      id,
      businessId,
      customerId: customerResult.customerId,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (!["pending", "confirmed"].includes(booking.status)) {
    return NextResponse.json(
      { error: "Booking cannot be modified" },
      { status: 409 }
    );
  }

  const hoursUntil =
    (booking.startAtUtc.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil < CANCEL_POLICY_HOURS) {
    return NextResponse.json(
      {
        error: `Cannot modify booking within ${CANCEL_POLICY_HOURS} hours of appointment`,
      },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { action, newStartAtUtc } = parsed.data;

  if (action === "cancel") {
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "cancelled" },
    });
    return NextResponse.json({ booking: updated });
  }

  if (action === "reschedule") {
    if (!newStartAtUtc) {
      return NextResponse.json(
        { error: "newStartAtUtc required for reschedule" },
        { status: 400 }
      );
    }

    const duration =
      booking.endAtUtc.getTime() - booking.startAtUtc.getTime();
    const newStart = new Date(newStartAtUtc);
    const newEnd = new Date(newStart.getTime() + duration);

    const updated = await prisma.booking.update({
      where: { id },
      data: { startAtUtc: newStart, endAtUtc: newEnd, status: "pending" },
    });
    return NextResponse.json({ booking: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
