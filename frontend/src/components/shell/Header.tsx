"use client";

import React from "react";
import Breadcrumb, { BreadcrumbItem } from "./Breadcrumb";

import AuthButton from "@/components/auth/AuthButton";

interface HeaderProps {
  title?: string;
  icon?: React.ReactNode;
  breadcrumbItems?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, icon, breadcrumbItems, actions }) => {
  return (
    <header className="min-h-[48px] h-auto py-1 bg-surface border-b border-border-default px-4 md:px-6 flex items-center justify-between flex-shrink-0 z-20 gap-3">
      <div className="flex items-center min-w-0 pr-2 flex-1">
        {breadcrumbItems && breadcrumbItems.length > 0 ? (
          <Breadcrumb items={breadcrumbItems} />
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            {icon && <span className="text-txt-secondary flex-shrink-0">{icon}</span>}
            <h1 className="text-lg font-semibold tracking-[-0.01em] text-txt-primary truncate">
              {title}
            </h1>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {actions}
        <AuthButton />
      </div>
    </header>
  );
};

export default Header;
