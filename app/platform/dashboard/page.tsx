import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function PlatformDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/platform/login");

  const platformUser = await prisma.platformUser.findUnique({
    where: { id: session.user.id },
    select: { isPlatformAdmin: true, name: true, email: true },
  });

  if (!platformUser?.isPlatformAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Access denied. Platform admin only.</p>
      </main>
    );
  }

  const [businessCount, totalBookings] = await Promise.all([
    prisma.business.count(),
    prisma.booking.count(),
  ]);

  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { _count: { select: { bookings: true, customers: true } } },
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <span className="font-bold text-slate-800">
          YourBrand Platform Admin
        </span>
        <span className="text-sm text-slate-500">{platformUser.email}</span>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-8">Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Businesses", value: businessCount },
            { label: "Total Bookings", value: totalBookings },
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

        {/* Business list */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-700">Businesses</h2>
            <Link
              href="/platform/businesses/new"
              className="text-sm text-blue-600 hover:underline"
            >
              + New
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Name</th>
                  <th className="px-6 py-3 text-left font-medium">Subdomain</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">Bookings</th>
                  <th className="px-6 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {b.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{b.subdomain}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          b.status === "active"
                            ? "bg-green-100 text-green-700"
                            : b.status === "suspended"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {b._count.bookings}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/platform/businesses/${b.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
