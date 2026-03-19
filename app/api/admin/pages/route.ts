import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getBusinessIdFromRequest,
  requireBusinessAdmin,
} from "@/lib/auth-helpers";
import { z } from "zod";

const PageSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  title: z.string().min(1).max(200),
});

export async function GET(req: NextRequest) {
  const businessId = getBusinessIdFromRequest(req);
  if (!businessId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const ctx = await requireBusinessAdmin(businessId);
  if (ctx instanceof NextResponse) return ctx;

  const pages = await prisma.page.findMany({
    where: { businessId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
    orderBy: { slug: "asc" },
  });

  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest) {
  const businessId = getBusinessIdFromRequest(req);
  if (!businessId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const ctx = await requireBusinessAdmin(businessId);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => null);
  const parsed = PageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const page = await prisma.page.create({
    data: {
      businessId,
      slug: parsed.data.slug,
      title: parsed.data.title,
    },
  });

  return NextResponse.json({ page }, { status: 201 });
}
