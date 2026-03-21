import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin, writeAuditLog } from "@/lib/auth-helpers";
import { z } from "zod";
import { SignJWT } from "jose";

const ImpersonateSchema = z.object({
  businessId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = ImpersonateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { businessId, reason } = parsed.data;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, subdomain: true },
  });

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Create a short-lived impersonation JWT (15 minutes)
  const secret = new TextEncoder().encode(
    process.env.IMPERSONATION_SECRET ?? process.env.AUTH_SECRET ?? "fallback"
  );

  const token = await new SignJWT({
    sub: ctx.userId,
    businessId,
    impersonator: ctx.userId,
    iat: Math.floor(Date.now() / 1000),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(secret);

  // Strict audit logging (required)
  await writeAuditLog({
    actorUserId: ctx.userId,
    businessId,
    action: "platform_impersonate",
    targetType: "Business",
    targetId: businessId,
    meta: {
      reason,
      businessName: business.name,
      subdomain: business.subdomain,
      timestamp: new Date().toISOString(),
    },
  });

  return NextResponse.json({
    impersonationToken: token,
    businessId,
    expiresIn: "15m",
    message: "Impersonation token issued. Access will be fully logged.",
  });
}
