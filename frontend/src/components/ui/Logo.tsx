"use client";

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";

export interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  href?: string | null;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  showWordmark = true,
  showBadge = false,
  badgeText = "Surveillance AI",
  href = "/",
  className = "",
}) => {
  const markDimensions = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const textStyles = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  const content = (
    <div className={clsx("inline-flex items-center gap-2.5 select-none group", className)}>
      {/* High-Precision Surveillance Reticle Mark */}
      <div
        className={clsx(
          markDimensions[size],
          "relative flex-shrink-0 rounded-[4px] border-[1.5px] border-[#D97706] bg-amber-500/10 transition-all duration-fast group-hover:border-[#F59E0B] group-hover:shadow-[0_0_10px_rgba(217,119,6,0.3)] flex items-center justify-center"
        )}
      >
        {/* Four Target Reticle Corners (Camera Sensor Brackets) */}
        <span className="absolute top-[1.5px] left-[1.5px] w-1 h-1 border-t border-l border-[#D97706]" />
        <span className="absolute top-[1.5px] right-[1.5px] w-1 h-1 border-t border-r border-[#D97706]" />
        <span className="absolute bottom-[1.5px] left-[1.5px] w-1 h-1 border-b border-l border-[#D97706]" />
        <span className="absolute bottom-[1.5px] right-[1.5px] w-1 h-1 border-b border-r border-[#D97706]" />

        {/* Optical Sensor Aperture */}
        <div className="w-2 h-2 rounded-full bg-[#18181B] border border-[#F59E0B] flex items-center justify-center transition-transform duration-fast group-hover:scale-110">
          <div className="w-1 h-1 rounded-full bg-[#F59E0B]" />
        </div>
      </div>

      {/* Brand Wordmark & Security Badge */}
      {showWordmark && (
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              textStyles[size],
              "font-bold tracking-[-0.02em] text-txt-primary group-hover:text-txt-primary transition-colors"
            )}
          >
            Sentinel
          </span>
          {showBadge && (
            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-xs bg-amber-50 border border-amber-200 text-amber-800 font-semibold shadow-2xs">
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xs">
        {content}
      </Link>
    );
  }

  return content;
};

export default Logo;
