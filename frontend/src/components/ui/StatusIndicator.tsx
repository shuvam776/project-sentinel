import React from "react";
import { clsx } from "clsx";

export type VideoStatusState = "uploading" | "queued" | "indexing" | "ready" | "partial" | "failed" | "processing" | "completed";

interface StatusIndicatorProps {
  status: VideoStatusState;
  progressPercent?: number;
  currentStep?: string;
  className?: string;
  showSubline?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  progressPercent,
  currentStep,
  className,
  showSubline = false,
}) => {
  // Normalize backend status names to design spec
  const normStatus = (() => {
    if (status === "processing") return "indexing";
    if (status === "completed") return "ready";
    return status;
  })();

  const dotClass = (() => {
    switch (normStatus) {
      case "uploading":
      case "queued":
        return "bg-processing";
      case "indexing":
        return "bg-processing animate-pulse-soft";
      case "ready":
        return "bg-success";
      case "partial":
        return "bg-warning";
      case "failed":
        return "bg-danger";
      default:
        return "bg-processing";
    }
  })();

  const textClass = (() => {
    switch (normStatus) {
      case "uploading":
      case "queued":
      case "indexing":
        return "text-processing-text";
      case "ready":
        return "text-success-text";
      case "partial":
        return "text-warning-text";
      case "failed":
        return "text-danger-text";
      default:
        return "text-txt-secondary";
    }
  })();

  const labelText = (() => {
    switch (normStatus) {
      case "uploading":
        return progressPercent !== undefined ? `Uploading ${progressPercent}%` : "Uploading";
      case "queued":
        return "Queued";
      case "indexing":
        return progressPercent !== undefined ? `Indexing ${progressPercent}%` : "Indexing";
      case "ready":
        return "Ready";
      case "partial":
        return "Partially indexed";
      case "failed":
        return "Failed";
      default:
        return status;
    }
  })();

  return (
    <div className={clsx("inline-flex flex-col gap-0.5", className)}>
      <div className="inline-flex items-center gap-1.5">
        <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", dotClass)} />
        <span className={clsx("text-xs font-medium", textClass)}>{labelText}</span>
      </div>
      {showSubline && currentStep && (normStatus === "indexing" || normStatus === "queued" || normStatus === "uploading") && (
        <span className="text-[11px] text-txt-tertiary truncate max-w-[180px] font-mono pl-3">
          {currentStep}
        </span>
      )}
    </div>
  );
};

export default StatusIndicator;
