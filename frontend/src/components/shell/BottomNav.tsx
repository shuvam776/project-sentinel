"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Search, Settings2 } from "lucide-react";
import { clsx } from "clsx";

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  const isLibraryActive = pathname === "/" || pathname.startsWith("/library") || pathname.startsWith("/videos");
  const isSearchActive = pathname.startsWith("/search");
  const isSettingsActive = pathname.startsWith("/settings");

  const items = [
    { label: "Library", href: "/library", icon: Film, isActive: isLibraryActive },
    { label: "Search", href: "/search", icon: Search, isActive: isSearchActive },
    { label: "Settings", href: "/settings", icon: Settings2, isActive: isSettingsActive },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 h-[56px] bg-surface border-t border-border-default flex items-center justify-around z-40 px-2"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-col items-center justify-center gap-1 w-full h-full text-[11px] font-medium transition-colors select-none",
              item.isActive ? "text-txt-primary" : "text-txt-secondary hover:text-txt-primary"
            )}
          >
            <Icon className={clsx("w-4 h-4", item.isActive ? "text-accent" : "text-txt-secondary")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
