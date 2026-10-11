import React from "react";
import { formatScore } from "@/lib/format";

interface SimilarityValueProps {
  score: number;
  className?: string;
}

const SCORE_TOOLTIP_TEXT =
  "Similarity score. How close this frame is to your query in the model's embedding space. It orders results within this search. It is not a probability that the described event happened, and it can't be compared across different queries.";

export const SimilarityValue: React.FC<SimilarityValueProps> = ({ score, className = "" }) => {
  const formatted = formatScore(score);

  return (
    <div
      tabIndex={0}
      title={SCORE_TOOLTIP_TEXT}
      aria-label={`Similarity ${formatted}. ${SCORE_TOOLTIP_TEXT}`}
      className={`inline-flex flex-col items-end cursor-help focus:outline-none ${className}`}
    >
      <span className="font-mono text-sm font-medium text-txt-primary tabular-nums">
        {formatted}
      </span>
      <span className="text-[11px] text-txt-tertiary">similarity</span>
    </div>
  );
};

export default SimilarityValue;
