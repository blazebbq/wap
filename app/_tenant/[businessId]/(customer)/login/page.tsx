import { signIn } from "@/auth";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function CustomerLoginPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const session = await auth();
  if (session?.user) {
    redirect(`/_tenant/${businessId}/account`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Sign In</h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter your email to receive a magic link
          </p>
        </div>

        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("email", {
              email: formData.get("email") as string,
              redirectTo: `/_tenant/${businessId}/account`,
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
      </div>
    </div>
  );
}
