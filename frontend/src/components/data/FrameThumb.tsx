import React, { useState } from "react";
import { Film, Play } from "lucide-react";
import { clsx } from "clsx";
import { formatTimestamp } from "@/lib/format";

interface FrameThumbProps {
  src?: string | null;
  alt?: string;
  size?: "64x36" | "96x54" | "176x99";
  timestampSec?: number;
  showPlayOnHover?: boolean;
  className?: string;
  onClick?: () => void;
}

export const FrameThumb: React.FC<FrameThumbProps> = ({
  src,
  alt = "Video frame",
  size = "96x54",
  timestampSec,
  showPlayOnHover = false,
  className = "",
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    "64x36": "w-[64px] h-[36px]",
    "96x54": "w-[96px] h-[54px]",
    "176x99": "w-[176px] h-[99px]",
  };

  const isInteractive = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={clsx(
        "relative rounded-sm border border-border-subtle bg-surface-inset overflow-hidden flex-shrink-0 group select-none",
        sizeClasses[size],
        isInteractive && "cursor-pointer",
        className
      )}
    >
      {src && !hasError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface-inset">
          <Film className="w-4 h-4 text-txt-tertiary" />
        </div>
      )}

      {showPlayOnHover && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-fast flex items-center justify-center">
          <div className="w-8 h-8 rounded-sm bg-overlay-chip flex items-center justify-center text-txt-primary">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>
      )}

      {timestampSec !== undefined && (
        <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded-xs bg-overlay-chip text-txt-primary font-mono text-[10px] leading-none tabular-nums">
          {formatTimestamp(timestampSec)}
        </div>
      )}
    </div>
  );
};

export default FrameThumb;
