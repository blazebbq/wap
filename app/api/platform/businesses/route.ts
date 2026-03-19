import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin, writeAuditLog } from "@/lib/auth-helpers";
import { z } from "zod";

const BusinessSchema = z.object({
  name: z.string().min(1).max(200),
  subdomain: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "Subdomain must be lowercase alphanumeric with hyphens"),
  timezone: z.string().optional().default("UTC"),
});

export async function GET(req: NextRequest) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { bookings: true, customers: true, services: true } },
    },
  });

  return NextResponse.json({ businesses });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = BusinessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Check subdomain uniqueness
  const existing = await prisma.business.findUnique({
    where: { subdomain: parsed.data.subdomain },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Subdomain already taken" },
      { status: 409 }
    );
  }

  const business = await prisma.business.create({
    data: {
      name: parsed.data.name,
      subdomain: parsed.data.subdomain,
      timezone: parsed.data.timezone,
      status: "trial",
      domains: {
        create: {
          domain: `${parsed.data.subdomain}.${process.env.BASE_DOMAIN ?? "yourbrand.co.uk"}`,
          type: "subdomain",
        },
      },
    },
  });

  await writeAuditLog({
    actorUserId: ctx.userId,
    action: "create_business",
    targetType: "Business",
    targetId: business.id,
    meta: { name: business.name, subdomain: business.subdomain },
  });

  return NextResponse.json({ business }, { status: 201 });
}
