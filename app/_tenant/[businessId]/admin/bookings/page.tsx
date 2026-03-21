import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminBookingsPage({
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

  if (!membership || !["owner", "admin", "staff"].includes(membership.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Access denied.</p>
      </div>
    );
  }

  const bookings = await prisma.booking.findMany({
    where: { businessId },
    orderBy: { startAtUtc: "desc" },
    take: 50,
    include: {
      customer: { select: { email: true, phone: true } },
      items: { include: { service: { select: { name: true } } } },
    },
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
        <span className="font-semibold text-slate-700">Bookings</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Customer</th>
                  <th className="px-6 py-3 text-left font-medium">Service</th>
                  <th className="px-6 py-3 text-left font-medium">Date/Time</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="text-slate-800">{b.customer.email}</p>
                      {b.customer.phone && (
                        <p className="text-xs text-slate-400">{b.customer.phone}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {b.items.map((i) => i.service.name).join(", ")}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(b.startAtUtc)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          b.status === "confirmed"
                            ? "bg-green-100 text-green-700"
                            : b.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : b.status === "completed"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
