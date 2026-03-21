import type { HeroProps } from "@/lib/blocks";
import Link from "next/link";

export default function HeroBlock({
  props,
  businessId,
}: {
  props: HeroProps;
  businessId?: string;
}) {
  const ctaHref =
    props.ctaHref ||
    (businessId ? `/_tenant/${businessId}/book` : "/book");

  return (
    <section
      className="relative flex flex-col items-center justify-center text-center px-6 py-32 bg-gradient-to-br from-slate-900 to-slate-700 text-white"
      style={
        props.backgroundImageKey
          ? {
              backgroundImage: `url(/images/${props.backgroundImageKey})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {props.backgroundImageKey && (
        <div className="absolute inset-0 bg-black/50" />
      )}
      <div className="relative z-10 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          {props.heading}
        </h1>
        {props.subheading && (
          <p className="text-xl text-white/80 mb-8">{props.subheading}</p>
        )}
        {props.ctaText && (
          <Link
            href={ctaHref}
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold transition"
          >
            {props.ctaText}
          </Link>
        )}
      </div>
    </section>
  );
}
