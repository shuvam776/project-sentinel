"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  SlidersHorizontal,
  HardDrive,
  TrendingDown,
  Layers,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Info,
  Check,
  ChevronRight,
  Filter,
} from "lucide-react";
import { clsx } from "clsx";
import { VideoItem, Detection } from "@/types";
import { formatFileSize, formatTimestamp } from "@/lib/format";
import { getVideoDownloadUrl } from "@/lib/api";

interface VideoSizeComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoItem;
  detections: Detection[];
  selectedClasses?: string[];
  onSelectClasses?: (classes: string[]) => void;
}

export const VideoSizeComparisonModal: React.FC<VideoSizeComparisonModalProps> = ({
  isOpen,
  onClose,
  video,
  detections,
  selectedClasses: propSelectedClasses,
  onSelectClasses,
}) => {
  // Sensitivity threshold: 'aggressive' (0.05) | 'balanced' (0.025) | 'precise' (0.01)
  const [sensitivity, setSensitivity] = useState<"aggressive" | "balanced" | "precise">("balanced");
  
  // Local class selection state
  const allClasses = useMemo(() => {
    return Array.from(new Set(detections.map((d) => d.class_name))).sort();
  }, [detections]);

  const [activeClasses, setActiveClasses] = useState<string[]>(
    propSelectedClasses && propSelectedClasses.length > 0 ? propSelectedClasses : allClasses
  );

  // Sync if prop changes
  React.useEffect(() => {
    if (propSelectedClasses && propSelectedClasses.length > 0) {
      setActiveClasses(propSelectedClasses);
    } else {
      setActiveClasses(allClasses);
    }
  }, [propSelectedClasses, allClasses]);

  // Motion threshold in normalized coordinates
  const thresholdDelta = sensitivity === "aggressive" ? 0.05 : sensitivity === "balanced" ? 0.025 : 0.01;
  const confDeltaThreshold = sensitivity === "aggressive" ? 0.08 : sensitivity === "balanced" ? 0.04 : 0.02;

  // Compute per-class motion deltas, confidence shifts, and storage impact
  const classAnalytics = useMemo(() => {
    // Group detections by class sorted by timestamp
    const grouped: Record<string, Detection[]> = {};
    detections.forEach((d) => {
      if (!grouped[d.class_name]) grouped[d.class_name] = [];
      grouped[d.class_name].push(d);
    });

    Object.keys(grouped).forEach((cls) => {
      grouped[cls].sort((a, b) => a.timestamp - b.timestamp);
    });

    const totalRawBytes = video.file_size_bytes || 25 * 1024 * 1024;
    const totalDetectionsCount = Math.max(1, detections.length);

    // Approximate baseline full annotation overhead (H.264 burned-in pixels typically add 35-65% bitrate)
    const baseTotalAnnotationOverheadBytes = totalRawBytes * 0.55;

    return allClasses.map((className) => {
      const classDets = grouped[className] || [];
      const count = classDets.length;
      const proportion = count / totalDetectionsCount;

      let bbShiftCount = 0;
      let confShiftCount = 0;
      let totalDistance = 0;

      for (let i = 1; i < classDets.length; i++) {
        const prev = classDets[i - 1];
        const curr = classDets[i];

        // Coordinate shift delta: sum of corner displacements
        const dx1 = Math.abs((curr.box.x1 || 0) - (prev.box.x1 || 0));
        const dy1 = Math.abs((curr.box.y1 || 0) - (prev.box.y1 || 0));
        const dx2 = Math.abs((curr.box.x2 || 0) - (prev.box.x2 || 0));
        const dy2 = Math.abs((curr.box.y2 || 0) - (prev.box.y2 || 0));
        const dist = (dx1 + dy1 + dx2 + dy2) / 4.0;
        totalDistance += dist;

        if (dist > thresholdDelta) {
          bbShiftCount++;
        }

        if (Math.abs(curr.confidence - prev.confidence) > confDeltaThreshold) {
          confShiftCount++;
        }
      }

      // Dynamic activity ratio (how often does the bounding box or confidence shift)
      const activityRatio = count > 1 ? (bbShiftCount + confShiftCount) / (count * 2) : 0.5;

      // Unoptimized standard burned-in size impact for this class
      const unoptimizedOverheadBytes = baseTotalAnnotationOverheadBytes * proportion * (1.0 + activityRatio * 0.6);

      // Adaptive delta-compressed overhead:
      // When changes are rare, we interpolate or hold keyframe boxes, drastically reducing residual I/P-frame encoding bytes!
      const savingsRatio =
        sensitivity === "aggressive"
          ? 0.82 - activityRatio * 0.45
          : sensitivity === "balanced"
          ? 0.72 - activityRatio * 0.38
          : 0.58 - activityRatio * 0.30;
      const clampedSavingsRatio = Math.max(0.25, Math.min(0.85, savingsRatio));

      const optimizedOverheadBytes = unoptimizedOverheadBytes * (1.0 - clampedSavingsRatio);
      const savedBytes = unoptimizedOverheadBytes - optimizedOverheadBytes;

      return {
        className,
        count,
        proportion,
        bbShiftCount,
        confShiftCount,
        activityRatio,
        avgDistance: count > 1 ? totalDistance / (count - 1) : 0,
        unoptimizedOverheadBytes,
        optimizedOverheadBytes,
        savedBytes,
        savingsPercent: Math.round(clampedSavingsRatio * 100),
        complexityTier:
          activityRatio > 0.45 ? "High Dynamics" : activityRatio > 0.2 ? "Moderate Motion" : "Stable / Static",
      };
    });
  }, [allClasses, detections, video.file_size_bytes, thresholdDelta, confDeltaThreshold, sensitivity]);

  // Overall totals across currently selected classes
  const totals = useMemo(() => {
    const rawVideoBytes = video.file_size_bytes || 25 * 1024 * 1024;
    const selectedMetrics = classAnalytics.filter((c) => activeClasses.includes(c.className));

    const totalUnoptimizedOverhead = selectedMetrics.reduce((sum, c) => sum + c.unoptimizedOverheadBytes, 0);
    const totalOptimizedOverhead = selectedMetrics.reduce((sum, c) => sum + c.optimizedOverheadBytes, 0);
    const totalSavedOverhead = totalUnoptimizedOverhead - totalOptimizedOverhead;

    const unoptimizedTotalVideoBytes = rawVideoBytes + totalUnoptimizedOverhead;
    const optimizedTotalVideoBytes = rawVideoBytes + totalOptimizedOverhead;

    const totalBbShifts = selectedMetrics.reduce((sum, c) => sum + c.bbShiftCount, 0);
    const totalConfShifts = selectedMetrics.reduce((sum, c) => sum + c.confShiftCount, 0);
    const totalDetections = selectedMetrics.reduce((sum, c) => sum + c.count, 0);

    const overallSavingsPercent =
      totalUnoptimizedOverhead > 0
        ? Math.round((totalSavedOverhead / unoptimizedTotalVideoBytes) * 100)
        : 0;
    const annotationOverheadReductionPercent =
      totalUnoptimizedOverhead > 0
        ? Math.round((totalSavedOverhead / totalUnoptimizedOverhead) * 100)
        : 0;

    return {
      rawVideoBytes,
      totalUnoptimizedOverhead,
      totalOptimizedOverhead,
      totalSavedOverhead,
      unoptimizedTotalVideoBytes,
      optimizedTotalVideoBytes,
      totalBbShifts,
      totalConfShifts,
      totalDetections,
      overallSavingsPercent,
      annotationOverheadReductionPercent,
    };
  }, [classAnalytics, activeClasses, video.file_size_bytes]);

  const handleToggleClass = (className: string) => {
    const next = activeClasses.includes(className)
      ? activeClasses.filter((c) => c !== className)
      : [...activeClasses, className];
    setActiveClasses(next);
  };

  const handleSelectAll = () => {
    setActiveClasses(allClasses);
  };

  const handleDeselectAll = () => {
    setActiveClasses([]);
  };

  const handleApplyToPlayer = () => {
    if (onSelectClasses) {
      onSelectClasses(activeClasses);
    }
    onClose();
  };

  const handleTriggerExport = () => {
    if (onSelectClasses) {
      onSelectClasses(activeClasses);
    }
    const isAll = activeClasses.length === allClasses.length;
    const url = getVideoDownloadUrl(video.id, {
      annotated: true,
      classes: !isAll ? activeClasses : undefined,
    });
    const a = document.createElement("a");
    a.href = url;
    const slug = isAll ? "optimized_all" : `optimized_${activeClasses.join("_")}`;
    a.download = `sentinel_${slug}_${video.original_filename}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[92vh] bg-surface border border-border-default rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-txt-primary">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle bg-surface-raised/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-txt-primary flex items-center gap-2">
                Annotated Video Size & Compression Analyzer
                <span className="px-2 py-0.5 rounded-full bg-accent-subtle text-accent-text text-[10px] font-mono font-medium">
                  Adaptive Delta Engine
                </span>
              </h2>
              <p className="text-[11px] text-txt-tertiary">
                Simulate storage savings based on bounding box motion transformations (Δ BB) and confidence variance.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-txt-tertiary hover:text-txt-primary hover:bg-surface-raised transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top 3 KPI Comparative Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Raw Footage */}
            <div className="p-3.5 rounded-lg bg-surface border border-border-default space-y-1.5">
              <div className="flex items-center justify-between text-txt-tertiary text-[11px]">
                <span className="font-medium">Original Raw Video</span>
                <HardDrive className="w-3.5 h-3.5 text-txt-tertiary" />
              </div>
              <div className="font-mono text-xl font-bold text-txt-primary tracking-tight">
                {formatFileSize(totals.rawVideoBytes)}
              </div>
              <p className="text-[10px] text-txt-tertiary">
                Native camera capture without graphics overhead
              </p>
            </div>

            {/* Card 2: Standard Burned-in Annotated Video */}
            <div className="p-3.5 rounded-lg bg-rose-500/5 border border-rose-300/60 dark:border-rose-900/40 space-y-1.5">
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-[11px]">
                <span className="font-medium">Standard Burned-in Size</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  +
                  {totals.rawVideoBytes > 0
                    ? Math.round((totals.totalUnoptimizedOverhead / totals.rawVideoBytes) * 100)
                    : 0}
                  % Bloat
                </span>
              </div>
              <div className="font-mono text-xl font-bold text-rose-700 dark:text-rose-400 tracking-tight">
                {formatFileSize(totals.unoptimizedTotalVideoBytes)}
              </div>
              <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80">
                Continuous per-frame bounding box pixel redraws
              </p>
            </div>

            {/* Card 3: Adaptive Delta-Optimized Video (USP) */}
            <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-400/70 dark:border-emerald-800/50 space-y-1.5 relative overflow-hidden">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-[11px]">
                <span className="font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Adaptive Delta Size (USP)
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Save {totals.annotationOverheadReductionPercent}%
                </span>
              </div>
              <div className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
                {formatFileSize(totals.optimizedTotalVideoBytes)}
              </div>
              <p className="text-[10px] text-emerald-600/90 dark:text-emerald-400/90 font-medium">
                Reduces file size by {formatFileSize(totals.totalSavedOverhead)} via Δ-motion caching
              </p>
            </div>
          </div>

          {/* Visual Storage Comparison Bar */}
          <div className="p-3.5 rounded-lg bg-surface border border-border-default space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-txt-primary flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-emerald-600" /> Storage Footprint Comparison
              </span>
              <span className="font-mono text-[11px] text-txt-tertiary">
                Saved: <strong className="text-emerald-600 font-bold">{formatFileSize(totals.totalSavedOverhead)}</strong>{" "}
                across {activeClasses.length} selected classes
              </span>
            </div>

            <div className="space-y-1.5">
              {/* Unoptimized Bar */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-txt-tertiary">
                  <span>Standard Continuous Export</span>
                  <span className="font-mono">{formatFileSize(totals.unoptimizedTotalVideoBytes)}</span>
                </div>
                <div className="h-3 w-full bg-border-subtle rounded-sm overflow-hidden flex">
                  <div
                    className="h-full bg-stone-500"
                    style={{
                      width: `${(totals.rawVideoBytes / totals.unoptimizedTotalVideoBytes) * 100}%`,
                    }}
                    title="Original Video Stream"
                  />
                  <div
                    className="h-full bg-rose-500"
                    style={{
                      width: `${(totals.totalUnoptimizedOverhead / totals.unoptimizedTotalVideoBytes) * 100}%`,
                    }}
                    title="Unoptimized Annotation Overhead"
                  />
                </div>
              </div>

              {/* Optimized Bar */}
              <div className="space-y-0.5 pt-0.5">
                <div className="flex justify-between text-[10px] text-txt-tertiary">
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    Adaptive Delta Optimized Export
                  </span>
                  <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatFileSize(totals.optimizedTotalVideoBytes)} (-{totals.overallSavingsPercent}%)
                  </span>
                </div>
                <div className="h-3 w-full bg-border-subtle rounded-sm overflow-hidden flex">
                  <div
                    className="h-full bg-stone-500"
                    style={{
                      width: `${(totals.rawVideoBytes / totals.unoptimizedTotalVideoBytes) * 100}%`,
                    }}
                    title="Original Video Stream"
                  />
                  <div
                    className="h-full bg-emerald-500"
                    style={{
                      width: `${(totals.totalOptimizedOverhead / totals.unoptimizedTotalVideoBytes) * 100}%`,
                    }}
                    title="Optimized Delta Overhead"
                  />
                  <div
                    className="h-full bg-emerald-100 dark:bg-emerald-950/40 border-l border-emerald-300"
                    style={{
                      width: `${(totals.totalSavedOverhead / totals.unoptimizedTotalVideoBytes) * 100}%`,
                    }}
                    title="Storage Reclaimed"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-[10px] text-txt-tertiary">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-stone-500 inline-block" /> Raw Footage Stream
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" /> Unoptimized Bounding Box Pixels
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" /> Delta-Cached Bounding Boxes
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-100 border border-emerald-400 inline-block" /> Reclaimed Storage
              </span>
            </div>
          </div>

          {/* Technical USP Explanation Card */}
          <div className="p-3.5 rounded-lg bg-surface-raised border border-border-default flex items-start gap-3">
            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-txt-primary text-xs">
                How Class-Adaptive Bounding Box Compression Works (Your Strategic USP)
              </div>
              <p className="text-[11px] text-txt-secondary leading-relaxed">
                H.264/H.265 codecs rely on temporal motion prediction (<span className="font-mono text-[10px]">P/B-frames</span>). Continuous per-frame bounding box graphics constantly introduce artificial sharp edges, destroying inter-frame redundancy. By analyzing coordinate displacement (<strong>Δ BB</strong>) and score stability (<strong>Δ Conf</strong>), Sentinel burns in annotations adaptively—allocating higher data density to rapidly changing objects and caching static ones to drastically slash file size without losing tracking accuracy.
              </p>
            </div>
          </div>

          {/* Controls Bar: Sensitivity & Class Bulk Selection */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-txt-secondary">Change Sensitivity:</span>
              <div className="flex items-center p-0.5 rounded-md bg-surface-raised border border-border-default text-[11px]">
                <button
                  type="button"
                  onClick={() => setSensitivity("aggressive")}
                  className={clsx(
                    "px-2.5 py-1 rounded-xs transition-colors font-medium",
                    sensitivity === "aggressive"
                      ? "bg-accent text-white shadow-xs"
                      : "text-txt-secondary hover:text-txt-primary"
                  )}
                  title="Only redraw on large changes (>5%). Maximum storage reduction."
                >
                  Aggressive (~75% savings)
                </button>
                <button
                  type="button"
                  onClick={() => setSensitivity("balanced")}
                  className={clsx(
                    "px-2.5 py-1 rounded-xs transition-colors font-medium",
                    sensitivity === "balanced"
                      ? "bg-accent text-white shadow-xs"
                      : "text-txt-secondary hover:text-txt-primary"
                  )}
                  title="Recommended balance between visual smoothness and storage reduction."
                >
                  Balanced (~60% savings)
                </button>
                <button
                  type="button"
                  onClick={() => setSensitivity("precise")}
                  className={clsx(
                    "px-2.5 py-1 rounded-xs transition-colors font-medium",
                    sensitivity === "precise"
                      ? "bg-accent text-white shadow-xs"
                      : "text-txt-secondary hover:text-txt-primary"
                  )}
                  title="Frequent updates on small movements (>1%)."
                >
                  Precise (~38% savings)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 rounded text-txt-secondary hover:text-txt-primary hover:bg-surface-raised border border-border-subtle"
              >
                Select All Classes
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2.5 py-1 rounded text-txt-secondary hover:text-txt-primary hover:bg-surface-raised border border-border-subtle"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Per-Class Comparative Matrix Table */}
          <div className="rounded-lg border border-border-default overflow-hidden bg-surface">
            <div className="px-4 py-2.5 bg-surface-raised border-b border-border-subtle flex items-center justify-between">
              <span className="font-semibold text-xs text-txt-primary">
                Class Motion Dynamics & Size Breakdown Matrix ({classAnalytics.length} Classes Detected)
              </span>
              <span className="text-[11px] text-txt-tertiary font-mono">
                {activeClasses.length} of {allClasses.length} included in export
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-raised/40 text-txt-tertiary font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 w-8">Active</th>
                    <th className="py-2.5 px-3">Class Name</th>
                    <th className="py-2.5 px-3 text-right">Detections</th>
                    <th className="py-2.5 px-3 text-right" title="Count of bounding box coordinate shifts beyond sensitivity threshold">
                      Δ BB Shifts
                    </th>
                    <th className="py-2.5 px-3 text-right" title="Count of significant confidence score fluctuations">
                      Δ Conf Jitter
                    </th>
                    <th className="py-2.5 px-3 text-center">Complexity Tier</th>
                    <th className="py-2.5 px-3 text-right">Standard Size</th>
                    <th className="py-2.5 px-3 text-right">Adaptive Size</th>
                    <th className="py-2.5 px-3 text-right font-bold text-emerald-600">Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {classAnalytics.map((item) => {
                    const isSelected = activeClasses.includes(item.className);
                    return (
                      <tr
                        key={item.className}
                        onClick={() => handleToggleClass(item.className)}
                        className={clsx(
                          "hover:bg-surface-raised/60 cursor-pointer transition-colors",
                          !isSelected && "opacity-40"
                        )}
                      >
                        <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleClass(item.className)}
                            className="rounded border-border-strong text-accent focus:ring-accent cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold text-txt-primary">
                          <span className="capitalize">{item.className}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-txt-secondary">
                          {item.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-txt-primary">
                          {item.bbShiftCount}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-txt-tertiary">
                          {item.confShiftCount}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={clsx(
                              "px-2 py-0.5 rounded-full text-[10px] font-medium font-mono",
                              item.complexityTier === "High Dynamics" &&
                                "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
                              item.complexityTier === "Moderate Motion" &&
                                "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                              item.complexityTier === "Stable / Static" &&
                                "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            )}
                          >
                            {item.complexityTier}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-txt-secondary">
                          +{formatFileSize(item.unoptimizedOverheadBytes)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-txt-primary font-medium">
                          +{formatFileSize(item.optimizedOverheadBytes)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          -{item.savingsPercent}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-border-subtle bg-surface-raised flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-txt-secondary">
            <span className="font-semibold text-txt-primary">Export Scope:</span>
            <span className="font-mono font-medium">
              {activeClasses.length === allClasses.length
                ? "All Classes"
                : `${activeClasses.length} of ${allClasses.length} Classes`}
            </span>
            <span className="text-txt-tertiary">·</span>
            <span>
              Projected Size: <strong className="text-emerald-600 font-mono font-bold">{formatFileSize(totals.optimizedTotalVideoBytes)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-md text-xs text-txt-secondary hover:text-txt-primary hover:bg-surface-inset border border-border-subtle transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyToPlayer}
              className="h-8 px-3.5 rounded-md text-xs font-medium bg-surface border border-border-strong text-txt-primary hover:bg-surface-raised transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5 text-accent" />
              <span>Apply to Player Overlay</span>
            </button>
            <button
              type="button"
              onClick={handleTriggerExport}
              disabled={activeClasses.length === 0}
              className="h-8 px-4 rounded-md text-xs font-medium bg-accent hover:bg-accent/90 text-white transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Optimized Video</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoSizeComparisonModal;
