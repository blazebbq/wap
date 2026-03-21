import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sign in – WAP",
  description: "Sign in with a magic link or create a developer account.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
