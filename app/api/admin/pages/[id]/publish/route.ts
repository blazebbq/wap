import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getBusinessIdFromRequest,
  requireBusinessAdmin,
} from "@/lib/auth-helpers";

export async function POST(
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
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  if (!page) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const latestVersion = page.versions[0];
  if (!latestVersion) {
    return NextResponse.json(
      { error: "No versions to publish" },
      { status: 400 }
    );
  }

  const updated = await prisma.page.update({
    where: { id },
    data: { publishedVersionId: latestVersion.id },
  });

  return NextResponse.json({ page: updated, publishedVersionId: latestVersion.id });
}
