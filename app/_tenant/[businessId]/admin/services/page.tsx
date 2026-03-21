"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  pricePence: number | null;
  active: boolean;
};

export default function AdminServicesPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    durationMin: "30",
    pricePence: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/services`, {
      headers: { "x-business-id": businessId },
    })
      .then((r) => r.json())
      .then((d) => {
        setServices(d.services ?? []);
        setLoading(false);
      });
  }, [businessId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": businessId,
        },
        body: JSON.stringify({
          name: form.name,
          durationMin: parseInt(form.durationMin),
          pricePence: form.pricePence ? parseInt(form.pricePence) : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setServices((prev) => [...prev, data.service]);
        setForm({ name: "", durationMin: "30", pricePence: "" });
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (service: Service) => {
    const res = await fetch(`/api/admin/services/${service.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-business-id": businessId,
      },
      body: JSON.stringify({ active: !service.active }),
    });
    if (res.ok) {
      const data = await res.json();
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? data.service : s))
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
        <Link
          href={`/_tenant/${businessId}/admin`}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← Dashboard
        </Link>
        <span className="font-semibold text-slate-700">Services</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Add service form */}
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-8"
        >
          <h2 className="font-semibold text-slate-700 mb-4">Add service</h2>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="col-span-3 sm:col-span-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Duration (min)"
              value={form.durationMin}
              onChange={(e) =>
                setForm({ ...form, durationMin: e.target.value })
              }
              required
              min="5"
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Price (pence)"
              value={form.pricePence}
              onChange={(e) =>
                setForm({ ...form, pricePence: e.target.value })
              }
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
          >
            {saving ? "Saving…" : "Add service"}
          </button>
        </form>

        {/* Services list */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <p className="px-6 py-8 text-slate-400 text-sm text-center">
              Loading…
            </p>
          ) : (
            <div className="divide-y divide-slate-50">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="px-6 py-4 flex justify-between items-center"
                >
                  <div>
                    <p
                      className={`font-medium ${
                        s.active ? "text-slate-800" : "text-slate-400 line-through"
                      }`}
                    >
                      {s.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.durationMin} min
                      {s.pricePence != null &&
                        ` · £${(s.pricePence / 100).toFixed(2)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleActive(s)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                      s.active
                        ? "border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                        : "border-slate-200 text-slate-400 hover:bg-green-50 hover:border-green-200 hover:text-green-600"
                    }`}
                  >
                    {s.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
