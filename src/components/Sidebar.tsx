"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListPlus,
  CalendarDays,
  Repeat,
  TrendingUp,
  Settings,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Resumen", href: "/dashboard", icon: LayoutDashboard },
  { name: "Movimientos", href: "/household", icon: ListPlus },
  { name: "Calendario", href: "/calendar", icon: CalendarDays },
  { name: "Suscripciones", href: "/subscriptions", icon: Repeat },
  { name: "Patrimonio", href: "/net-worth", icon: TrendingUp },
  { name: "Reglas", href: "/rules", icon: Settings },
];

const mobileNav = [
  { name: "Chat", href: "/", icon: MessageCircle },
  { name: "Resumen", href: "/dashboard", icon: LayoutDashboard },
  { name: "Movi.", href: "/household", icon: ListPlus },
  { name: "Suscri.", href: "/subscriptions", icon: Repeat },
  { name: "Patri.", href: "/net-worth", icon: TrendingUp },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isChat = pathname === "/";

  return (
    <>
      {/* Desktop sidebar - hidden on mobile, hidden when chat is full-screen */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden md:flex w-56 flex-col bg-gray-900 text-white">
        <Link href="/" className="flex h-14 items-center gap-2.5 px-5 border-b border-gray-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight">Budget AN</span>
        </Link>

        <div className="px-3 pt-4 pb-2">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isChat
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-900/30"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            <MessageCircle size={18} />
            Asistente AI
          </Link>
        </div>

        <div className="px-3 pt-1">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Secciones
          </p>
          <nav className="space-y-0.5">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"
                  )}
                >
                  <item.icon size={17} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-gray-800 p-4 text-[11px] text-gray-600">
          Finanzas de Adrien Naeem
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 flex md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom,0px)]">
        {mobileNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                isActive ? "text-indigo-600" : "text-gray-400"
              )}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
