import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { MemberRole, Prisma } from "@prisma/client";

export type TenantContext = {
  businessId: string;
  userId: string;
  role: MemberRole;
};

export type PlatformContext = {
  userId: string;
  isPlatformAdmin: true;
};

/**
 * Assert that the current request has a valid business admin session
 * for the given businessId.
 */
export async function requireBusinessAdmin(
  businessId: string
): Promise<TenantContext | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.businessMembership.findUnique({
    where: {
      businessId_userId: {
        businessId,
        userId: session.user.id,
      },
    },
  });

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    businessId,
    userId: session.user.id,
    role: membership.role,
  };
}

/**
 * Assert platform admin role.
 */
export async function requirePlatformAdmin(): Promise<
  PlatformContext | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.platformUser.findUnique({
    where: { id: session.user.id },
    select: { isPlatformAdmin: true },
  });

  if (!user?.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { userId: session.user.id, isPlatformAdmin: true };
}

/**
 * Assert a logged-in customer session.
 * Looks up the Customer record for this business.
 */
export async function requireCustomer(businessId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const platformUser = await prisma.platformUser.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  if (!platformUser?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const customer = await prisma.customer.findUnique({
    where: {
      businessId_email: {
        businessId,
        email: platformUser.email,
      },
    },
  });

  if (!customer) {
    return { error: NextResponse.json({ error: "Customer not found" }, { status: 404 }) };
  }

  return { customerId: customer.id, userId: session.user.id, email: platformUser.email };
}

/**
 * Extract businessId from request (set by middleware via header or path param).
 */
export function getBusinessIdFromRequest(req: NextRequest): string | null {
  // From middleware header
  const fromHeader = req.headers.get("x-business-id");
  if (fromHeader) return fromHeader;

  // From URL path pattern /_tenant/[businessId]/...
  const match = req.nextUrl.pathname.match(/^\/_tenant\/([^/]+)/);
  return match?.[1] ?? null;
}

/**
 * Write an audit log entry.
 */
export async function writeAuditLog(params: {
  businessId?: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      businessId: params.businessId,
      actorUserId: params.actorUserId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metaJson: (params.meta ?? {}) as Prisma.InputJsonValue,
    },
  });
}
