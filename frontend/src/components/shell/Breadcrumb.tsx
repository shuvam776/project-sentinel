"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center min-w-0">
      <ol className="flex items-center gap-1.5 min-w-0 text-xs text-txt-secondary">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;

          return (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-txt-tertiary flex-shrink-0" />}
              <li className="min-w-0 flex items-center">
                {isLast ? (
                  <h1
                    aria-current="page"
                    className="font-semibold text-txt-primary truncate max-w-[280px] text-xs"
                    title={item.label}
                  >
                    {item.label}
                  </h1>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    className="hover:text-txt-primary transition-colors truncate max-w-[200px]"
                    title={item.label}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="truncate max-w-[200px]" title={item.label}>
                    {item.label}
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
