import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessIdFromRequest, requireCustomer } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const businessId = getBusinessIdFromRequest(req);
  if (!businessId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const customerResult = await requireCustomer(businessId);
  if ("error" in customerResult) return customerResult.error;

  const now = new Date();

  const [upcoming, past] = await Promise.all([
    prisma.booking.findMany({
      where: {
        businessId,
        customerId: customerResult.customerId,
        status: { in: ["pending", "confirmed"] },
        startAtUtc: { gte: now },
      },
      orderBy: { startAtUtc: "asc" },
      include: {
        items: { include: { service: { select: { name: true, durationMin: true } } } },
      },
    }),
    prisma.booking.findMany({
      where: {
        businessId,
        customerId: customerResult.customerId,
        OR: [
          { status: { in: ["completed", "cancelled"] } },
          { startAtUtc: { lt: now } },
        ],
      },
      orderBy: { startAtUtc: "desc" },
      take: 20,
      include: {
        items: { include: { service: { select: { name: true, durationMin: true } } } },
      },
    }),
  ]);

  return NextResponse.json({ upcoming, past });
}
