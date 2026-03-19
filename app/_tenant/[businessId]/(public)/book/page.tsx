"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  pricePence: number | null;
};

type Slot = {
  start: string;
  end: string;
};

export default function BookPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  const [step, setStep] = useState<"service" | "slot" | "details" | "confirm">(
    "service"
  );
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ email: "", phone: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    id: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/services`, {
      headers: { "x-business-id": businessId },
    })
      .then((r) => r.json())
      .then((d) => setServices(d.services ?? []))
      .catch(console.error);
  }, [businessId]);

  const loadSlots = async (service: Service, date: string) => {
    if (!date) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/public/availability?serviceId=${service.id}&date=${date}`,
        { headers: { "x-business-id": businessId } }
      );
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setError("Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedSlot) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": businessId,
          "idempotency-key": `${form.email}-${selectedSlot.start}`,
        },
        body: JSON.stringify({
          serviceId: selectedService.id,
          startAtUtc: selectedSlot.start,
          customerEmail: form.email,
          customerPhone: form.phone || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Booking failed");
      } else {
        setBookingResult(data.booking);
        setStep("confirm");
      }
    } catch {
      setError("Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatPrice = (pence: number | null) =>
    pence == null ? "" : `£${(pence / 100).toFixed(2)}`;

  if (step === "confirm" && bookingResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Booking confirmed!
          </h2>
          <p className="text-slate-500 mb-6">
            A confirmation has been sent to {form.email}.
          </p>
          <Link
            href={`/_tenant/${businessId}/account`}
            className="text-blue-600 hover:underline text-sm"
          >
            View my bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-8 text-center">
          Book an Appointment
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Choose service */}
        {step === "service" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-semibold text-slate-700 mb-4">
              Choose a service
            </h2>
            <div className="space-y-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedService(s);
                    setStep("slot");
                  }}
                  className="w-full text-left p-4 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  <div className="font-medium text-slate-800">{s.name}</div>
                  <div className="text-sm text-slate-500">
                    {s.durationMin} min
                    {s.pricePence != null && ` · ${formatPrice(s.pricePence)}`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Choose date & slot */}
        {step === "slot" && selectedService && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <button
              onClick={() => setStep("service")}
              className="text-sm text-blue-600 hover:underline mb-4 block"
            >
              ← Back
            </button>
            <h2 className="font-semibold text-slate-700 mb-4">
              {selectedService.name} — Choose a time
            </h2>

            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                loadSlots(selectedService, e.target.value);
              }}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {loading && (
              <p className="text-slate-400 text-sm text-center">Loading…</p>
            )}

            {!loading && slots.length === 0 && selectedDate && (
              <p className="text-slate-400 text-sm text-center">
                No availability on this date.
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.start}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setStep("details");
                  }}
                  className="py-2 text-sm border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-center"
                >
                  {formatTime(slot.start)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Customer details */}
        {step === "details" && selectedService && selectedSlot && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <button
              onClick={() => setStep("slot")}
              className="text-sm text-blue-600 hover:underline mb-4 block"
            >
              ← Back
            </button>
            <h2 className="font-semibold text-slate-700 mb-4">Your details</h2>
            <p className="text-sm text-slate-500 mb-4">
              {selectedService.name} at {formatTime(selectedSlot.start)}
            </p>

            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email address *"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleSubmit}
                disabled={!form.email || loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-lg font-semibold text-sm transition"
              >
                {loading ? "Booking…" : "Confirm Booking"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
