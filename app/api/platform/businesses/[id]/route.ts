import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin, writeAuditLog } from "@/lib/auth-helpers";
import { z } from "zod";

const BusinessUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(["trial", "active", "suspended"]).optional(),
  timezone: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      memberships: true,
      domains: true,
      subscription: true,
      _count: { select: { bookings: true, customers: true, services: true } },
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ business });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = BusinessUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.business.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const business = await prisma.business.update({
    where: { id },
    data: parsed.data,
  });

  await writeAuditLog({
    actorUserId: ctx.userId,
    action: "update_business",
    targetType: "Business",
    targetId: id,
    meta: { changes: parsed.data },
  });

  return NextResponse.json({ business });
}
