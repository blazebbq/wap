import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getBusinessIdFromRequest,
  requireBusinessAdmin,
} from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const businessId = getBusinessIdFromRequest(req);
  if (!businessId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const ctx = await requireBusinessAdmin(businessId);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const bookings = await prisma.booking.findMany({
    where: {
      businessId,
      ...(status ? { status: status as never } : {}),
      ...(from || to
        ? {
            startAtUtc: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      customer: { select: { email: true, phone: true } },
      items: {
        include: { service: { select: { name: true, durationMin: true } } },
      },
      staff: { select: { name: true } },
    },
    orderBy: { startAtUtc: "desc" },
    take: 100,
  });

  return NextResponse.json({ bookings });
}
