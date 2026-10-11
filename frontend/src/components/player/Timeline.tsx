import React, { useRef, useState } from "react";
import { Diamond, Square } from "lucide-react";
import { SearchResultSegment, Detection } from "@/types";
import { formatTimestamp } from "@/lib/format";

interface TimelineProps {
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  matches?: SearchResultSegment[];
  detections?: Detection[];
  selectedMatchId?: string | null;
  selectedDetectionId?: string | null;
  onSelectMatch?: (segment: SearchResultSegment) => void;
  onSelectDetection?: (det: Detection) => void;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  onSeek,
  matches = [],
  detections = [],
  selectedMatchId,
  selectedDetectionId,
  onSelectMatch,
  onSelectDetection,
  className = "",
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const safeDuration = duration > 0 ? duration : 1;
  const playheadPercent = (currentTime / safeDuration) * 100;

  const calculateTimeFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || safeDuration <= 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    return fraction * safeDuration;
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const time = calculateTimeFromEvent(e);
    onSeek(time);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    setHoverX(x);
    setHoverTime(fraction * safeDuration);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  // Generate nice ruler interval marks
  const quarterTime = safeDuration * 0.25;
  const halfTime = safeDuration * 0.5;
  const threeQuarterTime = safeDuration * 0.75;

  return (
    <div
      ref={trackRef}
      onClick={handleTrackClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`h-[88px] bg-surface border-t border-border-subtle p-2 px-4 flex flex-col justify-between select-none relative cursor-pointer group ${className}`}
    >
      {/* Hover timestamp tooltip */}
      {hoverTime !== null && (
        <div
          style={{ left: `${hoverX}px` }}
          className="absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded-xs bg-chrome text-txt-primary border border-border-strong font-mono text-[10px] pointer-events-none z-30 shadow-xs whitespace-nowrap"
        >
          {formatTimestamp(hoverTime, true)}
        </div>
      )}

      {/* 1. Ruler & Legend (16px) */}
      <div className="flex items-center justify-between text-[10px] font-mono text-txt-tertiary h-4 relative">
        <span>00:00</span>
        <span className="hidden sm:inline" style={{ left: "25%" }}>
          {formatTimestamp(quarterTime)}
        </span>
        <span className="hidden sm:inline" style={{ left: "50%" }}>
          {formatTimestamp(halfTime)}
        </span>
        <span className="hidden sm:inline" style={{ left: "75%" }}>
          {formatTimestamp(threeQuarterTime)}
        </span>
        <span>{formatTimestamp(safeDuration)}</span>
      </div>

      {/* 2. Matches Track (24px) */}
      <div className="relative h-6 bg-surface-inset rounded-xs border border-border-subtle overflow-hidden">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-wider font-semibold text-txt-tertiary pointer-events-none">
          Matches
        </span>
        {matches.length === 0 ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-txt-disabled italic pointer-events-none">
            No matches in this video
          </span>
        ) : (
          matches.map((m) => {
            const pct = (m.best_timestamp / safeDuration) * 100;
            const isSelected = selectedMatchId === m.segment_id;
            return (
              <div
                key={m.segment_id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMatch?.(m);
                }}
                style={{ left: `${pct}%` }}
                title={`Match at ${formatTimestamp(m.best_timestamp)} (similarity ${m.best_score.toFixed(2)})`}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rotate-45 border cursor-pointer z-10 transition-transform ${
                  isSelected
                    ? "w-3 h-3 bg-accent border-white scale-125 z-20"
                    : "w-2.5 h-2.5 bg-txt-primary hover:bg-accent border-bg-surface hover:scale-125"
                }`}
              />
            );
          })
        )}
      </div>

      {/* 3. Detections Track (24px) */}
      <div className="relative h-6 bg-surface-inset rounded-xs border border-border-subtle overflow-hidden">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-wider font-semibold text-txt-tertiary pointer-events-none">
          Detections
        </span>
        {detections.length === 0 ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-txt-disabled italic pointer-events-none">
            No detections
          </span>
        ) : (
          detections.map((d) => {
            const pct = (d.timestamp / safeDuration) * 100;
            const isSelected = selectedDetectionId === d.id;
            return (
              <div
                key={d.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDetection?.(d);
                }}
                style={{ left: `${pct}%` }}
                title={`Detected ${d.class_name} at ${formatTimestamp(d.timestamp)} (conf ${d.confidence.toFixed(2)})`}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-xs cursor-pointer z-10 transition-all ${
                  isSelected
                    ? "w-1 h-4 bg-accent shadow-sm z-20"
                    : "w-[2px] h-3.5 bg-accent/80 hover:bg-accent hover:w-[3.5px]"
                }`}
              />
            );
          })
        )}
      </div>

      {/* 4. Scrub Bar & Playhead Indicator */}
      <div className="relative h-2 flex items-center">
        <div className="w-full h-1 bg-border-default rounded-full overflow-hidden">
          <div
            className="h-full bg-txt-secondary transition-[width] duration-75"
            style={{ width: `${playheadPercent}%` }}
          />
        </div>

        {/* Playhead Line & Handle */}
        <div
          style={{ left: `${playheadPercent}%` }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20 transition-[left] duration-75"
        >
          <div className="w-2.5 h-2.5 rounded-xs bg-txt-primary shadow-sm" />
          <div className="w-[1px] h-16 bg-txt-primary/60 -mt-0.5" />
        </div>
      </div>
    </div>
  );
};

export default Timeline;
