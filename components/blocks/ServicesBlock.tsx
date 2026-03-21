import type { ServicesProps } from "@/lib/blocks";
import { prisma } from "@/lib/prisma";

async function getServices(serviceIds: string[]) {
  return prisma.service.findMany({
    where: { id: { in: serviceIds }, active: true },
    select: { id: true, name: true, durationMin: true, pricePence: true },
  });
}

export default async function ServicesBlock({
  props,
}: {
  props: ServicesProps;
}) {
  const services = await getServices(props.serviceIds);

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        {props.title && (
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-10">
            {props.title}
          </h2>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          {services.map((s) => (
            <div
              key={s.id}
              className="border border-slate-100 rounded-xl p-6 hover:shadow-sm transition"
            >
              <h3 className="font-semibold text-slate-800 text-lg">{s.name}</h3>
              <p className="text-slate-500 text-sm mt-1">
                {s.durationMin} min
                {props.showPrices && s.pricePence != null && (
                  <span className="ml-2 text-slate-700 font-medium">
                    £{(s.pricePence / 100).toFixed(2)}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
