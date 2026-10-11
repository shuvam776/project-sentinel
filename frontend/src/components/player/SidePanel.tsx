import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Diamond,
  Square,
  Download,
  Film,
  Trash2,
  Search,
  SlidersHorizontal,
  Video,
  Layers,
  Loader2,
  CheckCircle2,
  Info,
  Clock,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { VideoItem, SearchResultSegment, Detection } from "@/types";
import ClassFilter from "@/components/data/ClassFilter";
import SimilarityValue from "@/components/data/SimilarityValue";
import ConfidenceValue from "@/components/data/ConfidenceValue";
import { formatTimestamp, formatFileSize, formatDate, formatTimeRange } from "@/lib/format";
import { getVideoDownloadUrl, getClipDownloadUrl } from "@/lib/api";

interface SidePanelProps {
  video: VideoItem;
  matches?: SearchResultSegment[];
  detections?: Detection[];
  currentTime?: number;
  selectedClasses?: string[];
  onSelectClasses?: (classes: string[]) => void;
  downloadAnnotatedUrl?: string;
  activeTab?: "matches" | "detections" | "info";
  onTabChange?: (tab: "matches" | "detections" | "info") => void;
  onSeek: (time: number) => void;
  selectedSegmentId?: string | null;
  onSelectSegment?: (seg: SearchResultSegment) => void;
  selectedDetectionId?: string | null;
  onSelectDetection?: (det: Detection) => void;
  onRenameVideo?: (newName: string) => Promise<void>;
  onDeleteVideo?: () => void;
  onOpenSizeComparison?: () => void;
  className?: string;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  video,
  matches = [],
  detections = [],
  currentTime = 0,
  selectedClasses: propsSelectedClasses,
  onSelectClasses,
  downloadAnnotatedUrl: propsDownloadAnnotatedUrl,
  activeTab = "matches",
  onTabChange,
  onSeek,
  selectedSegmentId,
  onSelectSegment,
  selectedDetectionId,
  onSelectDetection,
  onRenameVideo,
  onDeleteVideo,
  onOpenSizeComparison,
  className = "",
}) => {
  const router = useRouter();
  const [tab, setTab] = useState<"matches" | "detections" | "info">(activeTab);
  const [localSelectedClasses, setLocalSelectedClasses] = useState<string[]>([]);
  const [isGeneratingDownload, setIsGeneratingDownload] = useState(false);
  const [downloadingClass, setDownloadingClass] = useState<string | null>(null);

  const [isInlineRenaming, setIsInlineRenaming] = useState(false);
  const [inlineRenameName, setInlineRenameName] = useState(video.original_filename);
  const [isSavingInlineRename, setIsSavingInlineRename] = useState(false);

  useEffect(() => {
    setInlineRenameName(video.original_filename);
  }, [video.original_filename]);

  const handleSaveInlineRename = async () => {
    if (!inlineRenameName.trim() || inlineRenameName === video.original_filename) {
      setIsInlineRenaming(false);
      return;
    }
    if (onRenameVideo) {
      setIsSavingInlineRename(true);
      try {
        await onRenameVideo(inlineRenameName.trim());
        setIsInlineRenaming(false);
      } finally {
        setIsSavingInlineRename(false);
      }
    }
  };

  // Sub-header controls
  const [detectionViewMode, setDetectionViewMode] = useState<"timestamps" | "current" | "all">("timestamps");
  const [matchesSortMode, setMatchesSortMode] = useState<"time" | "rank">("rank");

  // Resizable width state (min 320px, max 480px, default 360px)
  const [panelWidth, setPanelWidth] = useState<number>(360);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sentinel.sidepanel_width");
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (parsed >= 320 && parsed <= 480) {
            setPanelWidth(parsed);
          }
        }
      } catch {}
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.max(320, Math.min(480, window.innerWidth - moveEvent.clientX));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        try {
          localStorage.setItem("sentinel.sidepanel_width", panelWidth.toString());
        } catch {}
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [panelWidth]);

  // Synchronize tab if prop changes
  useEffect(() => {
    if (activeTab) setTab(activeTab);
  }, [activeTab]);

  const supportedClasses = React.useMemo(() => {
    return Array.from(new Set(detections.map((d) => d.class_name)));
  }, [detections]);

  const rawActive = propsSelectedClasses ?? localSelectedClasses;
  const activeClasses =
    rawActive && rawActive.length > 0 ? rawActive : supportedClasses;
  const handleClassesChange = (newClasses: string[]) => {
    if (onSelectClasses) {
      onSelectClasses(newClasses);
    } else {
      setLocalSelectedClasses(newClasses);
    }
  };

  const classCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of detections) {
      counts[d.class_name] = (counts[d.class_name] || 0) + 1;
    }
    return counts;
  }, [detections]);

  const handleTabClick = (t: "matches" | "detections" | "info") => {
    setTab(t);
    onTabChange?.(t);
  };

  // Filter detections by active classes
  const filteredDetections = React.useMemo(() => {
    if (activeClasses.length === 0) return [];
    return detections.filter((d) => activeClasses.includes(d.class_name));
  }, [detections, activeClasses]);

  // Detections on the current frame
  const currentFrameDetections = React.useMemo(() => {
    if (filteredDetections.length === 0) return [];
    const windowSec = Math.max(0.8, 1.0 / (video.sample_rate || 1.0));
    return filteredDetections.filter(
      (d) => Math.abs(d.timestamp - currentTime) <= windowSec
    );
  }, [filteredDetections, currentTime, video.sample_rate]);

  // Structured Timestamps Breakdown: Groups detections chronologically by second/timestamp
  const timestampBreakdown = React.useMemo(() => {
    if (filteredDetections.length === 0) return [];

    const map = new Map<number, Detection[]>();
    for (const d of filteredDetections) {
      const t = Math.round(d.timestamp * 10) / 10;
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(d);
    }

    return Array.from(map.entries())
      .map(([time, items]) => {
        const classMap: Record<string, { count: number; maxConf: number }> = {};
        for (const item of items) {
          if (!classMap[item.class_name]) {
            classMap[item.class_name] = { count: 0, maxConf: item.confidence };
          }
          classMap[item.class_name].count += 1;
          classMap[item.class_name].maxConf = Math.max(classMap[item.class_name].maxConf, item.confidence);
        }
        return {
          time,
          items,
          classMap,
          total: items.length,
        };
      })
      .sort((a, b) => a.time - b.time);
  }, [filteredDetections]);

  // Sorted Matches
  const sortedMatches = React.useMemo(() => {
    const list = [...matches];
    if (matchesSortMode === "time") {
      return list.sort((a, b) => a.best_timestamp - b.best_timestamp);
    } else {
      return list.sort((a, b) => b.best_score - a.best_score);
    }
  }, [matches, matchesSortMode]);

  // Dynamic API URLs
  const downloadVideoUrl = video.download_url || getVideoDownloadUrl(video.id);
  const isCustomClassSelection =
    activeClasses.length > 0 && activeClasses.length < supportedClasses.length;

  const currentAnnotatedUrl =
    propsDownloadAnnotatedUrl ||
    getVideoDownloadUrl(video.id, {
      annotated: true,
      classes: isCustomClassSelection ? activeClasses : undefined,
    });

  // Individual single-class download trigger
  const handleDownloadSingleClass = (targetClass: string) => {
    setDownloadingClass(targetClass);
    const targetUrl = getVideoDownloadUrl(video.id, {
      annotated: true,
      classes: [targetClass],
    });
    const link = document.createElement("a");
    link.href = targetUrl;
    link.download = `annotated_${targetClass}_${video.original_filename}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadingClass(null), 3000);
  };

  // Trigger main download with processing feedback
  const handleTriggerMainDownload = () => {
    setIsGeneratingDownload(true);
    const link = document.createElement("a");
    link.href = currentAnnotatedUrl;
    const slug = isCustomClassSelection ? activeClasses.join("_") : "all";
    link.download = `annotated_${slug}_${video.original_filename}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsGeneratingDownload(false), 4000);
  };

  const downloadLabel = isCustomClassSelection
    ? `Download Annotated (${activeClasses.length} classes)`
    : "Download Annotated Video (All Classes)";

  return (
    <aside
      style={{ width: `${panelWidth}px` }}
      className={clsx(
        "relative bg-surface border-l border-border-default flex flex-col h-full select-none z-10 flex-shrink-0 transition-[width] duration-75",
        className
      )}
    >
      {/* 4px Resizable Drag Handle on Left Edge (§8C) */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize side panel"
        onMouseDown={handleMouseDown}
        className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-30 group flex items-center justify-center"
      >
        <div className="w-[3px] h-12 rounded-full bg-border-strong group-hover:bg-accent transition-colors" />
      </div>

      {/* Header Tabs (40px) */}
      <div className="h-[40px] border-b border-border-subtle flex items-center px-2 bg-chrome gap-1">
        {matches.length > 0 && (
          <button
            onClick={() => handleTabClick("matches")}
            className={clsx(
              "h-full px-3 text-xs font-medium relative transition-colors",
              tab === "matches"
                ? "text-txt-primary border-b-2 border-accent"
                : "text-txt-secondary hover:text-txt-primary"
            )}
          >
            Matches ({matches.length})
          </button>
        )}

        <button
          onClick={() => handleTabClick("detections")}
          className={clsx(
            "h-full px-3 text-xs font-medium relative transition-colors",
            tab === "detections"
              ? "text-txt-primary border-b-2 border-accent"
              : "text-txt-secondary hover:text-txt-primary"
          )}
        >
          Detections ({filteredDetections.length})
        </button>

        <button
          onClick={() => handleTabClick("info")}
          className={clsx(
            "h-full px-3 text-xs font-medium relative transition-colors",
            tab === "info"
              ? "text-txt-primary border-b-2 border-accent"
              : "text-txt-secondary hover:text-txt-primary"
          )}
        >
          Info & Export
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Matches Tab */}
        {tab === "matches" && (
          <div className="space-y-2.5">
            {/* Matches Sub-header: Count & Sort Toggle (§8C) */}
            <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
              <span className="text-[11px] text-txt-secondary font-medium">
                {matches.length} {matches.length === 1 ? "match" : "matches"}
              </span>
              <div className="flex items-center gap-1 bg-surface-raised p-0.5 rounded-sm border border-border-subtle text-[11px]">
                <button
                  onClick={() => setMatchesSortMode("time")}
                  className={clsx(
                    "px-2 py-0.5 rounded-xs transition-colors font-medium",
                    matchesSortMode === "time"
                      ? "bg-surface text-txt-primary shadow-xs"
                      : "text-txt-tertiary hover:text-txt-primary"
                  )}
                >
                  Time
                </button>
                <button
                  onClick={() => setMatchesSortMode("rank")}
                  className={clsx(
                    "px-2 py-0.5 rounded-xs transition-colors font-medium",
                    matchesSortMode === "rank"
                      ? "bg-surface text-txt-primary shadow-xs"
                      : "text-txt-tertiary hover:text-txt-primary"
                  )}
                >
                  Rank
                </button>
              </div>
            </div>

            {/* Sorted Matches List */}
            <div className="space-y-1.5">
              {sortedMatches.map((m) => {
                const isSelected = selectedSegmentId === m.segment_id;
                const clipDownloadUrl = getClipDownloadUrl(m.video_id, m.segment_id);

                return (
                  <div
                    key={m.segment_id}
                    onClick={() => {
                      onSeek(m.best_timestamp);
                      onSelectSegment?.(m);
                    }}
                    className={clsx(
                      "p-2 rounded-sm border transition-colors cursor-pointer space-y-1.5",
                      isSelected
                        ? "bg-amber-50/80 border-amber-300 ring-1 ring-amber-400"
                        : "border-border-subtle bg-surface-inset hover:bg-surface-raised"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Diamond className="w-3.5 h-3.5 text-txt-primary fill-current" />
                        <span className="font-mono text-xs font-semibold text-txt-primary">
                          {formatTimeRange(m.start_time, m.end_time)}
                        </span>
                      </div>
                      <SimilarityValue score={m.best_score} />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-txt-tertiary">
                        Best frame: {formatTimestamp(m.best_timestamp)}
                      </span>
                      <a
                        href={clipDownloadUrl}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800 hover:underline font-medium"
                        title="Download clip for this match"
                      >
                        <Film className="w-3 h-3" /> Clip
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detections Tab */}
        {tab === "detections" && (
          <div className="space-y-3">
            {/* Class Filter Checkboxes with 1-click 'Only' and Direct Class Download */}
            {supportedClasses.length > 0 && (
              <ClassFilter
                classes={supportedClasses}
                selectedClasses={activeClasses}
                onChange={handleClassesChange}
                counts={classCounts}
                onDownloadClass={handleDownloadSingleClass}
              />
            )}

            {/* Sub-header: Timestamps vs Current Frame vs All Segmented Control */}
            <div className="flex items-center justify-between pt-1 pb-1 border-t border-stone-200">
              <span className="text-[11px] text-stone-600 font-medium">Breakdown</span>
              <div className="flex items-center gap-0.5 bg-stone-100 p-0.5 rounded-sm border border-stone-200 text-[11px]">
                <button
                  onClick={() => setDetectionViewMode("timestamps")}
                  className={clsx(
                    "px-2 py-0.5 rounded-xs transition-colors font-medium flex items-center gap-1",
                    detectionViewMode === "timestamps"
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-500 hover:text-stone-800"
                  )}
                  title="Grouped chronological timestamps breakdown"
                >
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>Timestamps</span>
                  <span className="font-mono text-[10px] text-stone-500">
                    ({timestampBreakdown.length})
                  </span>
                </button>
                <button
                  onClick={() => setDetectionViewMode("current")}
                  className={clsx(
                    "px-2 py-0.5 rounded-xs transition-colors font-medium flex items-center gap-1",
                    detectionViewMode === "current"
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-500 hover:text-stone-800"
                  )}
                  title="Detections on current video frame"
                >
                  <span>Current</span>
                  {currentFrameDetections.length > 0 && (
                    <span className="font-mono text-[10px] text-amber-700 font-semibold">
                      ({currentFrameDetections.length})
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setDetectionViewMode("all")}
                  className={clsx(
                    "px-2 py-0.5 rounded-xs transition-colors font-medium flex items-center gap-1",
                    detectionViewMode === "all"
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-500 hover:text-stone-800"
                  )}
                  title="All individual detection boxes"
                >
                  <span>All</span>
                  <span className="font-mono text-[10px] text-stone-500">
                    ({filteredDetections.length})
                  </span>
                </button>
              </div>
            </div>

            {/* Detections List: Timestamps Mode (Default, Structured) */}
            {detectionViewMode === "timestamps" ? (
              <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-0.5">
                {timestampBreakdown.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-500 bg-stone-50 rounded-sm border border-stone-200">
                    No detections found for the selected classes.
                  </div>
                ) : (
                  timestampBreakdown.map((evt) => {
                    const isNear = Math.abs(currentTime - evt.time) <= 0.6;
                    return (
                      <div
                        key={evt.time}
                        onClick={() => onSeek(evt.time)}
                        className={clsx(
                          "p-2 rounded-sm border transition-all cursor-pointer space-y-1.5 select-none",
                          isNear
                            ? "bg-amber-50/90 border-amber-400 ring-1 ring-amber-300 shadow-2xs"
                            : "bg-white border-stone-200 hover:border-amber-200 hover:bg-stone-50/80"
                        )}
                        title={`Jump to ${formatTimestamp(evt.time, true)}`}
                      >
                        {/* Header: Timestamp badge + total count */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-stone-900">
                            <span
                              className={clsx(
                                "px-1.5 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1",
                                isNear
                                  ? "bg-amber-600 text-white"
                                  : "bg-stone-100 text-stone-800 border border-stone-200"
                              )}
                            >
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(evt.time, true)}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-stone-500">
                            {evt.total} {evt.total === 1 ? "object" : "objects"}
                          </span>
                        </div>

                        {/* Breakdown tags */}
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(evt.classMap).map(([cls, info]) => (
                            <span
                              key={cls}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSeek(evt.time);
                                const firstMatch = evt.items.find((item) => item.class_name === cls);
                                if (firstMatch) onSelectDetection?.(firstMatch);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-950 border border-amber-200/80 hover:bg-amber-100"
                            >
                              <Square className="w-2.5 h-2.5 text-amber-600" />
                              <span className="capitalize">{cls}</span>
                              {info.count > 1 && (
                                <span className="font-mono text-stone-500">×{info.count}</span>
                              )}
                              <span className="font-mono text-amber-800 text-[9px] opacity-80">
                                {Math.round(info.maxConf * 100)}%
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : detectionViewMode === "current" ? (
              /* Detections List: Current Frame Mode */
              <div className="space-y-1">
                {currentFrameDetections.length === 0 ? (
                  <div className="p-4 text-center text-xs text-txt-tertiary bg-surface-inset rounded-sm border border-border-subtle space-y-1">
                    <p className="font-medium text-txt-secondary">
                      No detections at {formatTimestamp(currentTime, true)}
                    </p>
                    <p className="text-[11px]">
                      Play video to watch live continuous detections per FPS, or switch view to <strong>Timestamps</strong>.
                    </p>
                  </div>
                ) : (
                  currentFrameDetections.map((det) => {
                    const isSelected = selectedDetectionId === det.id;
                    return (
                      <div
                        key={det.id}
                        onClick={() => {
                          if (isSelected) {
                            onSelectDetection?.(null as unknown as Detection);
                          } else {
                            onSeek(det.timestamp);
                            onSelectDetection?.(det);
                          }
                        }}
                        className={clsx(
                          "p-2 rounded-sm border flex items-center justify-between text-xs cursor-pointer transition-colors",
                          isSelected
                            ? "bg-amber-50 border-amber-400 ring-1 ring-amber-400 shadow-2xs"
                            : "border-border-subtle bg-surface-inset hover:bg-surface-raised"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Square className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-medium text-txt-primary capitalize">{det.class_name}</span>
                          <span className="font-mono text-txt-tertiary text-[11px]">
                            {formatTimestamp(det.timestamp, true)}
                          </span>
                        </div>
                        <ConfidenceValue confidence={det.confidence} />
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Detections List: All Mode */
              <div className="space-y-1 max-h-[460px] overflow-y-auto pr-0.5">
                {filteredDetections.length === 0 ? (
                  <div className="p-4 text-center text-xs text-txt-tertiary bg-surface-inset rounded-sm border border-border-subtle">
                    {activeClasses.length === 0
                      ? "All classes deselected. Check one or more classes above to view detections."
                      : "No detections found for the selected classes."}
                  </div>
                ) : (
                  filteredDetections.map((det) => {
                    const isSelected = selectedDetectionId === det.id;
                    return (
                      <div
                        key={det.id}
                        onClick={() => {
                          if (isSelected) {
                            onSelectDetection?.(null as unknown as Detection);
                          } else {
                            onSeek(det.timestamp);
                            onSelectDetection?.(det);
                          }
                        }}
                        className={clsx(
                          "p-2 rounded-sm border flex items-center justify-between text-xs cursor-pointer transition-colors",
                          isSelected
                            ? "bg-amber-50 border-amber-400 ring-1 ring-amber-400 shadow-2xs"
                            : "border-border-subtle bg-surface-inset hover:bg-surface-raised"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Square className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-medium text-txt-primary capitalize">{det.class_name}</span>
                          <span className="font-mono text-txt-tertiary text-[11px]">
                            {formatTimestamp(det.timestamp)}
                          </span>
                        </div>
                        <ConfidenceValue confidence={det.confidence} />
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* High-Visibility Annotated Video Export Card */}
            {activeClasses.length > 0 && (
              <div className="mt-3 p-3 rounded-md bg-stone-50 border border-amber-300/80 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900">
                      <Layers className="w-3.5 h-3.5 text-amber-600" />
                      <span>Export Annotated Video</span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-tight">
                      Burns in YOLOv8 bounding boxes & labels frame-by-frame at native FPS.
                    </p>
                  </div>
                </div>

                {/* Scope chips */}
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-[10px] text-stone-500 font-mono">Scope:</span>
                  {activeClasses.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-white border border-stone-200 text-stone-800"
                    >
                      {c}
                      {classCounts[c] !== undefined && (
                        <span className="text-stone-400">({classCounts[c]})</span>
                      )}
                    </span>
                  ))}
                </div>

                {/* Main Download Button */}
                <button
                  type="button"
                  onClick={handleTriggerMainDownload}
                  disabled={isGeneratingDownload}
                  className="w-full h-9 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-medium rounded-sm flex items-center justify-center gap-2 transition-all shadow-xs text-xs disabled:opacity-75 disabled:cursor-wait"
                  title="Render and download video with annotations for current active classes"
                >
                  {isGeneratingDownload ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Rendering with OpenCV & FFmpeg...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadLabel}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info & Export Tab (Clean, high-visibility, light UI) */}
        {tab === "info" && (
          <div className="space-y-4 text-xs">
            {/* Technical Metadata Card */}
            <div className="p-3 bg-stone-50/80 rounded-md border border-stone-200 space-y-2">
              <div className="font-semibold text-stone-900 text-xs pb-1 border-b border-stone-200 flex items-center justify-between">
                <span>Video Specifications</span>
                <span className="text-[10px] font-mono text-stone-500">
                  {video.mime_type || "video/mp4"}
                </span>
              </div>
              <div className="space-y-1.5 pt-0.5">
                <div className="flex flex-col gap-1 py-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Filename</span>
                    {!isInlineRenaming && onRenameVideo && (
                      <button
                        type="button"
                        onClick={() => {
                          setInlineRenameName(video.original_filename);
                          setIsInlineRenaming(true);
                        }}
                        className="text-stone-400 hover:text-stone-800 p-0.5 rounded transition-colors"
                        title="Rename video"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {isInlineRenaming ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="text"
                        value={inlineRenameName}
                        onChange={(e) => setInlineRenameName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveInlineRename();
                          } else if (e.key === "Escape") {
                            setIsInlineRenaming(false);
                            setInlineRenameName(video.original_filename);
                          }
                        }}
                        autoFocus
                        disabled={isSavingInlineRename}
                        className="flex-1 h-7 px-2 text-xs bg-white border border-amber-400 rounded text-stone-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSaveInlineRename}
                        disabled={isSavingInlineRename || !inlineRenameName.trim()}
                        className="h-7 w-7 flex items-center justify-center rounded bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
                        title="Save name"
                      >
                        {isSavingInlineRename ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsInlineRenaming(false);
                          setInlineRenameName(video.original_filename);
                        }}
                        className="h-7 w-7 flex items-center justify-center rounded bg-stone-200 hover:bg-stone-300 text-stone-700"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-medium text-stone-900 break-all text-left" title={video.original_filename}>
                      {video.original_filename}
                    </span>
                  )}
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-stone-500">Duration</span>
                  <span className="text-stone-900 font-medium">{formatTimestamp(video.duration_seconds)}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-stone-500">Resolution</span>
                  <span className="text-stone-900">{video.width && video.height ? `${video.width}×${video.height}` : "—"}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-stone-500">Frame Rate</span>
                  <span className="text-stone-900">{video.fps ? `${Math.round(video.fps)} fps` : "—"}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-stone-500">File Size</span>
                  <span className="text-stone-900">{formatFileSize(video.file_size_bytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Uploaded</span>
                  <span className="text-stone-900">{formatDate(video.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Index Status</span>
                  <span className="capitalize font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[11px]">
                    {video.status}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-stone-500">Sampling Rate</span>
                  <span className="text-stone-900">{video.sample_rate || 1.0} frame / sec</span>
                </div>
              </div>
            </div>

            {/* High-Visibility Annotated Video Export Card */}
            <div className="p-3.5 bg-white rounded-md border border-amber-300 shadow-sm space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-stone-900 text-xs">
                  <Film className="w-4 h-4 text-amber-600" />
                  <span>Burned-in Annotated Video Export</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-normal">
                  Renders bounding boxes and detection confidence tags directly into the video frames at native video FPS.
                </p>
              </div>

              {onOpenSizeComparison && (
                <button
                  type="button"
                  onClick={onOpenSizeComparison}
                  className="w-full h-8 px-2.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center gap-1.5 font-medium text-xs transition-colors shadow-2xs"
                  title="Analyze bounding box delta motion and simulate storage size savings per class"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
                  <span>Size & Bounding Box Delta Analyzer…</span>
                </button>
              )}

              {/* Individual Class 1-Click Downloads */}
              {supportedClasses.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-amber-100">
                  <span className="text-[11px] font-semibold text-stone-700">
                    Download Individual Class Video:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {supportedClasses.map((clsName) => {
                      const isThisDownloading = downloadingClass === clsName;
                      const count = classCounts[clsName];
                      return (
                        <button
                          key={clsName}
                          type="button"
                          onClick={() => handleDownloadSingleClass(clsName)}
                          disabled={isThisDownloading}
                          className="px-2 py-1.5 rounded bg-amber-50/80 hover:bg-amber-100/90 active:bg-amber-200 border border-amber-200/80 text-stone-900 flex items-center justify-between text-left transition-colors font-medium text-[11px]"
                          title={`Download video annotated with ${clsName} detections only`}
                        >
                          <span className="capitalize truncate flex items-center gap-1">
                            <Square className="w-3 h-3 text-amber-600" />
                            {clsName}
                            {count !== undefined && (
                              <span className="text-stone-500 font-mono text-[10px]">({count})</span>
                            )}
                          </span>
                          {isThisDownloading ? (
                            <Loader2 className="w-3 h-3 animate-spin text-amber-700 ml-1" />
                          ) : (
                            <Download className="w-3 h-3 text-amber-700 ml-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Combined / Active Classes Download */}
              <div className="pt-2 border-t border-amber-100 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-600">Selected Scope:</span>
                  <span className="font-mono text-stone-900 font-medium">
                    {isCustomClassSelection
                      ? `${activeClasses.length} selected classes`
                      : `All ${supportedClasses.length} classes`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerMainDownload}
                  disabled={isGeneratingDownload}
                  className="w-full h-9 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-medium rounded flex items-center justify-center gap-2 transition-all shadow-xs text-xs disabled:opacity-75 disabled:cursor-wait"
                  title="Download video with bounding boxes for all currently selected classes"
                >
                  {isGeneratingDownload ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating with OpenCV & FFmpeg...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadLabel}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Actions (Raw Video Download, Search, Delete) */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => router.push(`/search?video=${video.id}`)}
                className="w-full h-9 bg-white border border-stone-200 hover:border-stone-300 rounded-sm flex items-center justify-center gap-2 text-stone-800 font-medium transition-colors shadow-2xs"
                title="Search within this video"
              >
                <Search className="w-3.5 h-3.5 text-amber-600" /> Search This Video
              </button>

              <a
                href={downloadVideoUrl}
                download={video.original_filename}
                className="w-full h-9 bg-white border border-stone-200 hover:border-stone-300 rounded-sm flex items-center justify-center gap-2 text-stone-800 font-medium transition-colors shadow-2xs"
                title="Download original raw video without annotations"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" /> Download Original Raw Video
              </a>

              {onDeleteVideo && (
                <button
                  onClick={onDeleteVideo}
                  className="w-full h-9 bg-transparent border border-rose-200 text-rose-700 rounded-sm flex items-center justify-center gap-2 hover:bg-rose-50 font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Delete Video…
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SidePanel;
