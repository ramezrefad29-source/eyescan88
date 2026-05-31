import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RetinaScan AI — تشخيص اعتلال الشبكية المخروطي",
  description:
    "منصة تشخيص طبي متقدمة تعتمد على الذكاء الاصطناعي لاكتشاف اعتلال الشبكية المخروطي (Cone-Rod Dystrophy) بدقة تتخطى 96%.",
  keywords: ["cone-rod dystrophy", "retina AI", "eye scan", "medical AI", "اعتلال الشبكية"],
  authors: [{ name: "RetinaScan AI" }],
  openGraph: {
    title: "RetinaScan AI",
    description: "تشخيص اعتلال الشبكية المخروطي بالذكاء الاصطناعي",
    type: "website",
  },
};

import ConsoleDebug from "@/components/ui/ConsoleDebug";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased">
        {children}
        <ConsoleDebug />
      </body>
    </html>
  );
}
