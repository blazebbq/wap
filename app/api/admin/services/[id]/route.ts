import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getBusinessIdFromRequest,
  requireBusinessAdmin,
} from "@/lib/auth-helpers";
import { z } from "zod";

const ServiceUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  durationMin: z.number().int().min(5).max(480).optional(),
  pricePence: z.number().int().min(0).optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = getBusinessIdFromRequest(req);
  if (!businessId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const ctx = await requireBusinessAdmin(businessId);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const service = await prisma.service.findFirst({
    where: { id, businessId },
  });

  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ service });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = getBusinessIdFromRequest(req);
  if (!businessId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const ctx = await requireBusinessAdmin(businessId);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = ServiceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.service.findFirst({ where: { id, businessId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const service = await prisma.service.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ service });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = getBusinessIdFromRequest(req);
  if (!businessId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const ctx = await requireBusinessAdmin(businessId);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const existing = await prisma.service.findFirst({ where: { id, businessId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Soft delete: set inactive
  const service = await prisma.service.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ service });
}
