import type { ContactProps } from "@/lib/blocks";

export default function ContactBlock({ props }: { props: ContactProps }) {
  return (
    <section className="py-16 px-6 bg-slate-50">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-8">Contact Us</h2>
        <div className="space-y-3 text-slate-600">
          {props.phone && (
            <p>
              📞{" "}
              <a href={`tel:${props.phone}`} className="hover:text-blue-600">
                {props.phone}
              </a>
            </p>
          )}
          {props.email && (
            <p>
              ✉️{" "}
              <a
                href={`mailto:${props.email}`}
                className="hover:text-blue-600"
              >
                {props.email}
              </a>
            </p>
          )}
          {props.address && (
            <p>📍 {props.address}</p>
          )}
        </div>
      </div>
    </section>
  );
}
