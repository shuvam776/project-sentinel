import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SearchResultSegment, Detection } from "@/types";
import FrameThumb from "@/components/data/FrameThumb";
import EvidenceLine from "@/components/data/EvidenceLine";
import SimilarityValue from "@/components/data/SimilarityValue";
import { formatTimeRange, formatTimestamp } from "@/lib/format";

interface ResultRowProps {
  segment: SearchResultSegment;
  rank: number;
  videoName: string;
  query: string;
  className?: string;
}

export const ResultRow: React.FC<ResultRowProps> = ({
  segment,
  rank,
  videoName,
  query,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasDetections = segment.detections && segment.detections.length > 0;
  const maxConfidence = hasDetections
    ? Math.max(...segment.detections.map((d: Detection) => d.confidence))
    : undefined;

  // Group detected classes with counts
  const classCountsMap: Record<string, number> = {};
  if (hasDetections) {
    segment.detections.forEach((d: Detection) => {
      classCountsMap[d.class_name] = (classCountsMap[d.class_name] || 0) + 1;
    });
  }
  const classSummaries = Object.entries(classCountsMap).map(([className, count]) => ({
    className,
    count,
  }));

  const linkHref = `/videos/${segment.video_id}?t=${segment.best_timestamp}&q=${encodeURIComponent(query)}&event=${segment.segment_id}`;

  return (
    <div
      className={`border-b border-border-subtle hover:bg-surface-raised transition-colors duration-fast p-3 md:px-4 text-xs group ${className}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-[28px_176px_1fr_88px] gap-3 md:gap-4 items-start">
        {/* Rank */}
        <div className="font-mono text-txt-tertiary text-xs pt-1 font-medium hidden md:block">
          {rank}
        </div>

        {/* Thumbnail (176x99) */}
        <Link href={linkHref} className="block">
          <FrameThumb
            src={segment.thumbnail_url}
            alt={videoName}
            size="176x99"
            timestampSec={segment.best_timestamp}
            showPlayOnHover
          />
        </Link>

        {/* Body Content */}
        <div className="min-w-0 space-y-1.5 pt-0.5">
          {/* Line 1: Video Name & Time Range */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={linkHref}
              className="font-medium text-txt-primary hover:text-accent truncate max-w-[280px] transition-colors"
            >
              {videoName}
            </Link>
            <span className="font-mono text-txt-secondary text-xs">
              {formatTimeRange(segment.start_time, segment.end_time)}
            </span>
          </div>

          {/* Line 2: Evidence Lines */}
          <div className="space-y-1">
            {hasDetections && (
              <EvidenceLine
                type="detection"
                classes={classSummaries}
                maxConfidence={maxConfidence}
              />
            )}
            <EvidenceLine type="semantic" />
          </div>

          {/* Frame Strip Toggle Button */}
          {segment.detections && segment.detections.length > 1 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-txt-tertiary hover:text-txt-primary pt-1 transition-colors"
            >
              <span>{segment.detections.length} sampled frames</span>
              {isExpanded ? (
                <ChevronUp className="w-3 h-3 text-txt-tertiary" />
              ) : (
                <ChevronDown className="w-3 h-3 text-txt-tertiary" />
              )}
            </button>
          )}
        </div>

        {/* Score Column */}
        <div className="flex justify-end pt-0.5">
          <SimilarityValue score={segment.best_score} />
        </div>
      </div>

      {/* Expanded Inline Frame Strip Well */}
      {isExpanded && segment.detections && (
        <div className="mt-3 p-2 bg-surface-inset rounded-sm border border-border-subtle flex gap-2 overflow-x-auto">
          {segment.detections.map((det, idx) => (
            <Link
              key={idx}
              href={`/videos/${segment.video_id}?t=${det.timestamp}&q=${encodeURIComponent(query)}`}
              className="flex-shrink-0 group/frame"
            >
              <div className="relative w-[96px] h-[54px] rounded-xs border border-border-subtle overflow-hidden bg-surface">
                <FrameThumb src={segment.thumbnail_url} size="96x54" />
                <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded-xs bg-overlay-chip text-txt-primary font-mono text-[9px] tabular-nums">
                  {formatTimestamp(det.timestamp)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultRow;
