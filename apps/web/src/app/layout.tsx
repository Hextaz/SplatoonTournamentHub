import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { cookies, headers } from "next/headers";
import { Locale } from "@/i18n/types";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tournament Hub",
  description: "Gérez vos tournois de manière professionnelle.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get("NEXT_LOCALE")?.value as Locale | undefined;

  let initialLocale: Locale = "fr";
  if (savedLocale === "en" || savedLocale === "fr") {
    initialLocale = savedLocale;
  } else {
    // Detect from Accept-Language header for first time visitors
    const headerList = await headers();
    const acceptLang = headerList.get("accept-language") || "";
    if (acceptLang.toLowerCase().startsWith("en")) {
      initialLocale = "en";
    }
  }

  return (
    <html
      lang={initialLocale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-slate-200">
        <AuthProvider>
          <LanguageProvider initialLocale={initialLocale}>
            <Navbar />
            <main className="flex-1 w-full flex flex-col">
              {children}
            </main>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


