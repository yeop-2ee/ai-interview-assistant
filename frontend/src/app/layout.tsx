import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SessionGuardProvider } from "@/components/SessionGuardProvider";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI 면접 도우미",
  description: "AI 기반 실시간 면접 연습 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geist.className} h-full`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <SessionGuardProvider>
          {children}
        </SessionGuardProvider>
      </body>
    </html>
  );
}
