import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getBusinessIdFromRequest,
  requireBusinessAdmin,
} from "@/lib/auth-helpers";
import { z } from "zod";

const ServiceSchema = z.object({
  name: z.string().min(1).max(100),
  durationMin: z.number().int().min(5).max(480),
  pricePence: z.number().int().min(0).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const businessId = getBusinessIdFromRequest(req);
  if (!businessId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const ctx = await requireBusinessAdmin(businessId);
  if (ctx instanceof NextResponse) return ctx;

  const services = await prisma.service.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ services });
}

export async function POST(req: NextRequest) {
  const businessId = getBusinessIdFromRequest(req);
  if (!businessId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const ctx = await requireBusinessAdmin(businessId);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = ServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: { businessId, ...parsed.data },
  });

  return NextResponse.json({ service }, { status: 201 });
}
