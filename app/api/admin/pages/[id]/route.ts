import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getBusinessIdFromRequest,
  requireBusinessAdmin,
} from "@/lib/auth-helpers";
import { z } from "zod";
import { BlocksArraySchema } from "@/lib/blocks";

const PageUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  blocksJson: z.unknown().optional(),
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
  const page = await prisma.page.findFirst({
    where: { id, businessId },
    include: { versions: { orderBy: { versionNumber: "desc" } } },
  });

  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ page });
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
  const parsed = PageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.page.findFirst({ where: { id, businessId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If blocksJson provided, create a new draft version
  if (parsed.data.blocksJson !== undefined) {
    const blocksResult = BlocksArraySchema.safeParse(parsed.data.blocksJson);
    if (!blocksResult.success) {
      return NextResponse.json(
        { error: "Invalid blocks", details: blocksResult.error.flatten() },
        { status: 400 }
      );
    }

    const lastVersion = await prisma.pageVersion.findFirst({
      where: { pageId: id },
      orderBy: { versionNumber: "desc" },
    });

    await prisma.pageVersion.create({
      data: {
        pageId: id,
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
        blocksJson: blocksResult.data,
      },
    });
  }

  const page = await prisma.page.update({
    where: { id },
    data: {
      title: parsed.data.title,
      slug: parsed.data.slug,
    },
  });

  return NextResponse.json({ page });
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
  const existing = await prisma.page.findFirst({ where: { id, businessId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.page.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
