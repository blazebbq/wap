import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 text-white px-6 py-24 text-center">
        <h1 className="text-5xl font-bold mb-4 leading-tight">
          YourBrand<span className="text-blue-400">.</span>
        </h1>
        <p className="text-xl text-slate-300 mb-10 max-w-xl">
          The all-in-one booking platform for modern service businesses. Launch
          your branded site, manage bookings, and grow — all in one place.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/platform/login"
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold transition"
          >
            Get Started
          </Link>
          <a
            href="#features"
            className="border border-white/30 hover:border-white text-white px-8 py-3 rounded-lg font-semibold transition"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-14 text-slate-800">
            Everything you need
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "🏪",
                title: "Branded storefront",
                desc: "Your own subdomain with a beautiful, customisable page builder.",
              },
              {
                icon: "📅",
                title: "Smart booking engine",
                desc: "Services, availability rules, staff calendars — all built-in.",
              },
              {
                icon: "💳",
                title: "Stripe-powered billing",
                desc: "Transparent subscription billing with instant webhook processing.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2 text-slate-800">
                  {f.title}
                </h3>
                <p className="text-slate-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-slate-400 border-t border-slate-100">
        © {new Date().getFullYear()} YourBrand. All rights reserved.
      </footer>
    </main>
  );
}
