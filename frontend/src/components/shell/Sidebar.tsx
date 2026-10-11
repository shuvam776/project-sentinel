"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Search, Settings2 } from "lucide-react";
import { clsx } from "clsx";
import Logo from "@/components/ui/Logo";

interface SidebarProps {
  hasProcessingVideos?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ hasProcessingVideos = false }) => {
  const pathname = usePathname();

  // Route active rules: /videos/* activates Library
  const isLibraryActive = pathname === "/" || pathname.startsWith("/library") || pathname.startsWith("/videos");
  const isSearchActive = pathname.startsWith("/search");
  const isSettingsActive = pathname.startsWith("/settings");

  const navItems = [
    { label: "Library", href: "/library", icon: Film, isActive: isLibraryActive, hasBadge: hasProcessingVideos },
    { label: "Search", href: "/search", icon: Search, isActive: isSearchActive },
  ];

  return (
    <aside
      className="w-[var(--sidebar-w)] bg-surface border-r border-border-default flex flex-col justify-between h-full flex-shrink-0 z-30 transition-[width] duration-base overflow-hidden"
    >
      {/* Top Header / Brand */}
      <div>
        <div className="h-[52px] flex items-center px-4 border-b border-border-default bg-surface">
          <Logo size="sm" showBadge={false} />
        </div>

        {/* Main Nav */}
        <nav className="p-2 space-y-1" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "relative flex items-center h-9 px-2.5 rounded-sm text-sm font-medium transition-colors duration-fast group select-none border",
                  item.isActive
                    ? "bg-surface-raised border-border-default text-txt-primary font-semibold shadow-2xs"
                    : "bg-transparent border-transparent text-txt-secondary hover:bg-hover hover:text-txt-primary"
                )}
              >
                <Icon
                  className={clsx(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    item.isActive ? "text-accent" : "text-txt-secondary group-hover:text-txt-primary"
                  )}
                />
                <span className="ml-2.5 hidden lg:inline truncate">{item.label}</span>

                {/* Processing Badge Dot */}
                {item.hasBadge && (
                  <span
                    aria-label="Videos processing"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-accent animate-pulse hidden lg:inline-block"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Pinned Nav (Settings) */}
      <div className="p-2 border-t border-border-default bg-surface">
        <Link
          href="/settings"
          className={clsx(
            "relative flex items-center h-9 px-2.5 rounded-sm text-sm font-medium transition-colors duration-fast group select-none border",
            isSettingsActive
              ? "bg-surface-raised border-border-default text-txt-primary font-semibold shadow-2xs"
              : "bg-transparent border-transparent text-txt-secondary hover:bg-hover hover:text-txt-primary"
          )}
        >
          <Settings2
            className={clsx(
              "w-4 h-4 flex-shrink-0 transition-colors",
              isSettingsActive ? "text-accent" : "text-txt-secondary group-hover:text-txt-primary"
            )}
          />
          <span className="ml-2.5 hidden lg:inline truncate">Settings</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
