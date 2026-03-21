import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function CustomerAccountPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/_tenant/${businessId}/login`);
  }

  const platformUser = await prisma.platformUser.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });

  const customer = platformUser?.email
    ? await prisma.customer.findUnique({
        where: {
          businessId_email: {
            businessId,
            email: platformUser.email,
          },
        },
      })
    : null;

  const now = new Date();

  const [upcoming, past] = customer
    ? await Promise.all([
        prisma.booking.findMany({
          where: {
            businessId,
            customerId: customer.id,
            status: { in: ["pending", "confirmed"] },
            startAtUtc: { gte: now },
          },
          orderBy: { startAtUtc: "asc" },
          include: {
            items: {
              include: { service: { select: { name: true } } },
            },
          },
        }),
        prisma.booking.findMany({
          where: {
            businessId,
            customerId: customer.id,
            OR: [
              { status: { in: ["completed", "cancelled"] } },
              { startAtUtc: { lt: now } },
            ],
          },
          orderBy: { startAtUtc: "desc" },
          take: 10,
          include: {
            items: {
              include: { service: { select: { name: true } } },
            },
          },
        }),
      ])
    : [[], []];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <Link
          href={`/_tenant/${businessId}`}
          className="text-slate-600 hover:text-slate-900 text-sm"
        >
          ← Home
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{platformUser?.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: `/_tenant/${businessId}` });
            }}
          >
            <button className="text-sm text-slate-500 hover:text-red-600 transition">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          My Bookings
        </h1>
        {!customer && (
          <p className="text-slate-500 text-sm mb-8">
            No bookings yet.{" "}
            <Link
              href={`/_tenant/${businessId}/book`}
              className="text-blue-600 hover:underline"
            >
              Book now
            </Link>
          </p>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section className="mb-10">
            <h2 className="font-semibold text-slate-700 mb-4">Upcoming</h2>
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-xl border border-slate-100 p-5 flex justify-between items-start"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {b.items.map((i) => i.service.name).join(", ")}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {formatDate(b.startAtUtc)}
                    </p>
                    <span
                      className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        b.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="font-semibold text-slate-700 mb-4">Past</h2>
            <div className="space-y-3">
              {past.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-xl border border-slate-100 p-5 opacity-75"
                >
                  <p className="font-medium text-slate-700">
                    {b.items.map((i) => i.service.name).join(", ")}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {formatDate(b.startAtUtc)} ·{" "}
                    <span
                      className={
                        b.status === "cancelled"
                          ? "text-red-400"
                          : "text-slate-400"
                      }
                    >
                      {b.status}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
