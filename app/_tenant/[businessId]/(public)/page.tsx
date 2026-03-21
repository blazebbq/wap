import { prisma } from "@/lib/prisma";
import { parseBlocks } from "@/lib/blocks";
import { notFound } from "next/navigation";
import BlockRenderer from "@/components/blocks/BlockRenderer";
import Link from "next/link";

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;

  const page = await prisma.page.findFirst({
    where: { businessId, slug: "home" },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true, subdomain: true },
  });

  if (!business) notFound();

  // Get published version if available
  let publishedVersion = null;
  if (page?.publishedVersionId) {
    publishedVersion = await prisma.pageVersion.findUnique({
      where: { id: page.publishedVersionId },
    });
  }

  const blocks = publishedVersion
    ? parseBlocks(publishedVersion.blocksJson)
    : [];

  return (
    <div className="min-h-screen">
      {/* Tenant nav */}
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <span className="font-bold text-slate-800">{business.name}</span>
        <div className="flex gap-4">
          <Link
            href={`/_tenant/${businessId}/book`}
            className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition"
          >
            Book Now
          </Link>
          <Link
            href={`/_tenant/${businessId}/account`}
            className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2 transition"
          >
            My Account
          </Link>
        </div>
      </nav>

      {blocks.length > 0 ? (
        <BlockRenderer blocks={blocks} businessId={businessId} />
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center px-6">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Welcome to {business.name}
          </h1>
          <p className="text-slate-500 mb-8">
            Book an appointment online — quick and easy.
          </p>
          <Link
            href={`/_tenant/${businessId}/book`}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold transition"
          >
            Book Now
          </Link>
        </div>
      )}
    </div>
  );
}
