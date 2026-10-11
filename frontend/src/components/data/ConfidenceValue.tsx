import React from "react";
import { formatConfidence } from "@/lib/format";

interface ConfidenceValueProps {
  confidence: number;
  className?: string;
}

export const ConfidenceValue: React.FC<ConfidenceValueProps> = ({ confidence, className = "" }) => {
  const formatted = formatConfidence(confidence);
  return (
    <span
      tabIndex={0}
      title="Detector confidence for this detection. Not a measured accuracy."
      className={`font-mono text-txt-secondary text-[11px] tabular-nums cursor-help hover:text-txt-primary ${className}`}
    >
      conf {formatted}
    </span>
  );
};

export default ConfidenceValue;
