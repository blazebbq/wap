import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboardPage({
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

  const [business, bookingCount, serviceCount, customerCount] =
    await Promise.all([
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.booking.count({ where: { businessId } }),
      prisma.service.count({ where: { businessId, active: true } }),
      prisma.customer.count({ where: { businessId } }),
    ]);

  const recentBookings = await prisma.booking.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      customer: { select: { email: true } },
      items: { include: { service: { select: { name: true } } } },
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <span className="font-bold text-slate-800">{business?.name} Admin</span>
        <div className="flex gap-4 text-sm">
          <Link
            href={`/_tenant/${businessId}/admin/site`}
            className="text-slate-600 hover:text-slate-900"
          >
            Site
          </Link>
          <Link
            href={`/_tenant/${businessId}/admin/bookings`}
            className="text-slate-600 hover:text-slate-900"
          >
            Bookings
          </Link>
          <Link
            href={`/_tenant/${businessId}/admin/services`}
            className="text-slate-600 hover:text-slate-900"
          >
            Services
          </Link>
          <Link
            href={`/_tenant/${businessId}/admin/settings`}
            className="text-slate-600 hover:text-slate-900"
          >
            Settings
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-8">Dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Bookings", value: bookingCount },
            { label: "Services", value: serviceCount },
            { label: "Customers", value: customerCount },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm"
            >
              <p className="text-3xl font-bold text-slate-800">{s.value}</p>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Recent Bookings</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {recentBookings.map((b) => (
              <div key={b.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {b.items.map((i) => i.service.name).join(", ")}
                  </p>
                  <p className="text-xs text-slate-500">{b.customer.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    {new Intl.DateTimeFormat("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(b.startAtUtc)}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      b.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : b.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
