"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main className="md:ml-56 min-h-full pb-16 md:pb-0">{children}</main>
    </>
  );
}
