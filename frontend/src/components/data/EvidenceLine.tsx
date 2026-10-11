import React from "react";
import { Square, Diamond } from "lucide-react";
import ConfidenceValue from "./ConfidenceValue";

interface DetectionSummary {
  className: string;
  count: number;
}

interface EvidenceLineProps {
  type: "detection" | "semantic";
  classes?: DetectionSummary[];
  maxConfidence?: number;
  className?: string;
}

export const EvidenceLine: React.FC<EvidenceLineProps> = ({
  type,
  classes = [],
  maxConfidence,
  className = "",
}) => {
  if (type === "detection") {
    const classSummaryStr = classes.length > 0
      ? classes.map((c) => `${c.className} ×${c.count}`).join(", ")
      : "object detected";

    return (
      <div className={`flex items-center gap-1.5 text-xs text-txt-secondary ${className}`}>
        <Square className="w-3.5 h-3.5 text-accent stroke-[1.5] flex-shrink-0" />
        <span className="text-[11px] uppercase tracking-wider font-semibold text-txt-secondary">
          Detected
        </span>
        <span className="text-txt-primary">{classSummaryStr}</span>
        {maxConfidence !== undefined && (
          <span className="ml-1">
            <ConfidenceValue confidence={maxConfidence} />
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs text-txt-secondary ${className}`}>
      <Diamond className="w-3.5 h-3.5 text-txt-primary stroke-[1.5] flex-shrink-0" />
      <span className="text-[11px] uppercase tracking-wider font-semibold text-txt-secondary">
        Frame match
      </span>
      <span className="text-txt-tertiary">Similar to your query</span>
    </div>
  );
};

export default EvidenceLine;
