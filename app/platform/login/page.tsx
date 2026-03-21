import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function PlatformLoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/platform/dashboard");
  }

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Platform Login</h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter your email to receive a magic link
          </p>
        </div>

        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("email", {
              email: formData.get("email") as string,
              redirectTo: "/platform/dashboard",
            });
          }}
          className="space-y-4"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-semibold text-sm transition"
          >
            Send magic link
          </button>
        </form>

        {isDev && (
          <>
            {/* Visual divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-400 uppercase tracking-wider">
                  Dev only
                </span>
              </div>
            </div>

            {/* One-click dev login — bypasses magic link */}
            <form
              method="POST"
              action="/api/auth/dev-login?callbackUrl=/platform/dashboard"
            >
              <button
                type="submit"
                className="w-full border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 py-3 rounded-lg font-semibold text-sm transition"
              >
                🔧 Dev Login (admin@yourbrand.co.uk)
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
