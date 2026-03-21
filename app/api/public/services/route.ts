import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessIdFromRequest } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const businessId = getBusinessIdFromRequest(req);
  if (!businessId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const services = await prisma.service.findMany({
    where: { businessId, active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      durationMin: true,
      pricePence: true,
    },
  });

  return NextResponse.json({ services });
}
