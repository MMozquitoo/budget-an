import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Budget AN — Capital Allocation",
  description: "Capital allocation and freedom operating system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full`}>
      <body className="h-full bg-gray-50">
        <Sidebar />
        <main className="md:ml-64 min-h-full">
          <div className="p-4 pt-16 md:p-8 md:pt-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
