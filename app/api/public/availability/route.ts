import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessIdFromRequest } from "@/lib/auth-helpers";
import { z } from "zod";

const QuerySchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export async function GET(req: NextRequest) {
  const businessId = getBusinessIdFromRequest(req);
  if (!businessId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const parsed = QuerySchema.safeParse({
    serviceId: req.nextUrl.searchParams.get("serviceId"),
    date: req.nextUrl.searchParams.get("date"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { serviceId, date } = parsed.data;

  // Fetch service to get duration
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true },
    select: { durationMin: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Get day of week (0=Sun … 6=Sat)
  const [year, month, day] = date.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay();

  // Fetch availability rules for this day
  const rules = await prisma.availabilityRule.findMany({
    where: {
      businessId,
      staffId: null, // business-level rules
      dayOfWeek,
    },
  });

  // Check for exceptions on this date
  const exception = await prisma.availabilityException.findFirst({
    where: {
      businessId,
      staffId: null,
      date,
    },
  });

  if (exception?.type === "closed") {
    return NextResponse.json({ slots: [] });
  }

  // Determine work window
  let startTime = rules[0]?.startTime ?? "09:00";
  let endTime = rules[0]?.endTime ?? "18:00";

  if (exception?.type === "customHours" && exception.startTime && exception.endTime) {
    startTime = exception.startTime;
    endTime = exception.endTime;
  }

  // Generate 30-min slots (simplified)
  const slots = generateSlots(date, startTime, endTime, service.durationMin);

  // Remove slots that overlap with existing bookings
  const existingBookings = await prisma.booking.findMany({
    where: {
      businessId,
      status: { in: ["confirmed", "pending"] },
      startAtUtc: {
        gte: new Date(`${date}T00:00:00Z`),
        lt: new Date(`${date}T23:59:59Z`),
      },
    },
    select: { startAtUtc: true, endAtUtc: true },
  });

  const available = slots.filter((slot) => {
    return !existingBookings.some((b) => {
      const slotEnd = new Date(slot.start.getTime() + service.durationMin * 60_000);
      return slot.start < b.endAtUtc && slotEnd > b.startAtUtc;
    });
  });

  return NextResponse.json({
    slots: available.map((s) => ({
      start: s.start.toISOString(),
      end: new Date(s.start.getTime() + service.durationMin * 60_000).toISOString(),
    })),
  });
}

function generateSlots(
  date: string,
  startTime: string,
  endTime: string,
  durationMin: number
) {
  const slots: { start: Date }[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  let current = new Date(`${date}T00:00:00Z`);
  current.setUTCHours(sh, sm, 0, 0);

  const end = new Date(`${date}T00:00:00Z`);
  end.setUTCHours(eh, em, 0, 0);

  while (current.getTime() + durationMin * 60_000 <= end.getTime()) {
    slots.push({ start: new Date(current) });
    current = new Date(current.getTime() + durationMin * 60_000);
  }

  return slots;
}
