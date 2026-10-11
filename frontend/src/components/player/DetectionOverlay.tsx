import React from "react";
import { Detection } from "@/types";
import { formatConfidence } from "@/lib/format";

interface DetectionOverlayProps {
  detections: Detection[];
  selectedId?: string | null;
  onSelectDetection?: (det: Detection) => void;
  showBoxes?: boolean;
  showLabels?: boolean;
  className?: string;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detections,
  selectedId,
  onSelectDetection,
  showBoxes = false,
  showLabels = false,
  className = "",
}) => {
  if (!detections || detections.length === 0) return null;

  // Render if showBoxes is true OR if the selected detection is present in this frame
  const hasSelectedInFrame = selectedId
    ? detections.some((d) => d.id === selectedId)
    : false;

  if (!showBoxes && !hasSelectedInFrame) return null;

  return (
    <div className={`absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden ${className}`}>
      {detections.map((det) => {
        const isSelected = selectedId === det.id;

        // When a specific detection is selected from the sidebar, isolate it:
        // ONLY that clicked box and its label should be visible, hiding all others on the frame
        if (selectedId) {
          if (!isSelected) return null;
        } else if (!showBoxes) {
          return null;
        }

        const box = det.box;
        if (!box) return null;

        const left = `${Math.max(0, Math.min(100, box.x1 * 100))}%`;
        const top = `${Math.max(0, Math.min(100, box.y1 * 100))}%`;
        const width = `${Math.max(0, Math.min(100, (box.x2 - box.x1) * 100))}%`;
        const height = `${Math.max(0, Math.min(100, (box.y2 - box.y1) * 100))}%`;

        // The label is visible if global showLabels is enabled OR if this specific box is selected
        const isLabelVisible = showLabels || isSelected;

        return (
          <div
            key={det.id}
            className="absolute pointer-events-auto cursor-pointer group transition-all duration-75"
            style={{ left, top, width, height }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectDetection?.(isSelected ? (null as unknown as Detection) : det);
            }}
          >
            {/* Box Rectangle Border & Highlight Fill */}
            <div
              className={`w-full h-full rounded-[2px] transition-all ${
                isSelected
                  ? "border-[3.5px] border-[#F59E0B] bg-[#F59E0B]/25 shadow-[0_0_16px_rgba(245,158,11,0.85),0_0_2px_rgba(0,0,0,0.8)] ring-2 ring-white/80"
                  : "border-[3px] border-[#F59E0B] bg-[#F59E0B]/10 shadow-[0_0_4px_rgba(0,0,0,0.7)] hover:border-[#FBBF24] hover:bg-[#F59E0B]/20"
              }`}
            />

            {/* Class + Confidence Label Pill */}
            {isLabelVisible && (
              <div className="absolute -top-6 left-0 pointer-events-none flex items-center z-20">
                <div
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-[2px] font-mono text-[11px] font-semibold leading-none select-none shadow-md whitespace-nowrap transition-transform ${
                    isSelected
                      ? "bg-[#F59E0B] text-black font-bold ring-2 ring-white/80 shadow-lg scale-105 origin-bottom-left"
                      : "bg-[#F59E0B] text-black font-medium"
                  }`}
                >
                  {det.class_name} {formatConfidence(det.confidence)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DetectionOverlay;
