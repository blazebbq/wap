import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminSettingsPage({
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

  if (!membership || membership.role !== "owner") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Owner access required.</p>
      </div>
    );
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { subscription: true },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
        <Link
          href={`/_tenant/${businessId}/admin`}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← Dashboard
        </Link>
        <span className="font-semibold text-slate-700">Settings</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Business info */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Business Info</h2>
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-700">Name:</span>{" "}
              {business?.name}
            </p>
            <p>
              <span className="font-medium text-slate-700">Subdomain:</span>{" "}
              {business?.subdomain}.yourbrand.co.uk
            </p>
            <p>
              <span className="font-medium text-slate-700">Timezone:</span>{" "}
              {business?.timezone}
            </p>
            <p>
              <span className="font-medium text-slate-700">Status:</span>{" "}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  business?.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {business?.status}
              </span>
            </p>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Subscription</h2>
          {business?.subscription ? (
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-700">Status:</span>{" "}
                {business.subscription.status}
              </p>
              {business.subscription.currentPeriodEnd && (
                <p>
                  <span className="font-medium text-slate-700">
                    Current period ends:
                  </span>{" "}
                  {new Intl.DateTimeFormat("en-GB").format(
                    business.subscription.currentPeriodEnd
                  )}
                </p>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No active subscription.</p>
          )}
        </div>
      </div>
    </div>
  );
}
