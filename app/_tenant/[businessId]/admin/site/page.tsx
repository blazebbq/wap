import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseBlocks } from "@/lib/blocks";
import BlockEditor from "@/components/admin/BlockEditor";
import Link from "next/link";

export default async function AdminSitePage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/_tenant/${businessId}/login`);

  const membership = await prisma.businessMembership.findUnique({
    where: {
      businessId_userId: { businessId, userId: session.user.id },
    },
  });

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Access denied.</p>
      </div>
    );
  }

  // Get or create the home page
  let page = await prisma.page.findFirst({
    where: { businessId, slug: "home" },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!page) {
    page = await prisma.page.create({
      data: {
        businessId,
        slug: "home",
        title: "Home",
      },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
  }

  // Get latest blocks
  const latestVersion = page.versions[0];
  const blocks = latestVersion ? parseBlocks(latestVersion.blocksJson) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href={`/_tenant/${businessId}/admin`}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← Dashboard
          </Link>
          <span className="font-semibold text-slate-700">Page Builder</span>
        </div>
        <Link
          href={`/_tenant/${businessId}`}
          target="_blank"
          className="text-sm text-blue-600 hover:underline"
        >
          View live →
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <BlockEditor
          initialBlocks={blocks}
          pageId={page.id}
          businessId={businessId}
        />
      </div>
    </div>
  );
}
