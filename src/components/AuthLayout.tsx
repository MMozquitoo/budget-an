"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { CoachChatProvider } from "@/components/CoachChatProvider";
import CoachWidget from "@/components/CoachWidget";
import SelectionAskPopup from "@/components/SelectionAskPopup";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <CoachChatProvider>
      <Sidebar />
      <main className="md:ml-56 min-h-full pb-16 md:pb-0">{children}</main>
      <CoachWidget />
      <SelectionAskPopup />
    </CoachChatProvider>
  );
}
