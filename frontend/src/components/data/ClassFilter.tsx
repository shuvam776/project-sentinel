import React from "react";
import { User, Car, Briefcase, Tag, Check, Download } from "lucide-react";
import { clsx } from "clsx";

interface ClassFilterProps {
  classes: string[];
  selectedClasses: string[];
  onChange: (selected: string[]) => void;
  counts?: Record<string, number>;
  onDownloadClass?: (className: string) => void;
  size?: "sm" | "md";
  className?: string;
}

export const ClassFilter: React.FC<ClassFilterProps> = ({
  classes,
  selectedClasses,
  onChange,
  counts = {},
  onDownloadClass,
  size = "sm",
  className = "",
}) => {
  const getClassIcon = (clsName: string) => {
    const lower = clsName.toLowerCase();
    if (lower.includes("person") || lower.includes("human")) return <User className="w-3.5 h-3.5" />;
    if (lower.includes("vehicle") || lower.includes("car")) return <Car className="w-3.5 h-3.5" />;
    if (lower.includes("bag") || lower.includes("backpack")) return <Briefcase className="w-3.5 h-3.5" />;
    return <Tag className="w-3.5 h-3.5" />;
  };

  const toggleClass = (clsName: string) => {
    if (selectedClasses.includes(clsName)) {
      onChange(selectedClasses.filter((c) => c !== clsName));
    } else {
      onChange([...selectedClasses, clsName]);
    }
  };

  const selectOnlyClass = (clsName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([clsName]);
  };

  const selectAll = () => {
    onChange([...classes]);
  };

  const deselectAll = () => {
    onChange([]);
  };

  if (!classes || classes.length === 0) return null;

  return (
    <div className={clsx("space-y-2", className)}>
      {/* Quick Select Header */}
      <div className="flex items-center justify-between text-[11px] text-txt-tertiary px-0.5">
        <span className="font-medium text-stone-700">
          Classes ({selectedClasses.length}/{classes.length})
        </span>
        <div className="flex items-center gap-1.5 font-medium">
          <button
            type="button"
            onClick={selectAll}
            className="hover:text-accent hover:underline transition-colors"
            title="Select all classes"
          >
            All
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={deselectAll}
            className="hover:text-accent hover:underline transition-colors"
            title="Deselect all classes"
          >
            None
          </button>
        </div>
      </div>

      {/* Class List with Smooth Checkboxes and 1-Click "Only" & Download */}
      <div className="grid grid-cols-1 gap-1.5">
        {classes.map((clsName) => {
          const isSelected = selectedClasses.includes(clsName);
          const count = counts[clsName];

          return (
            <div
              key={clsName}
              onClick={() => toggleClass(clsName)}
              className={clsx(
                "group px-2.5 py-1.5 rounded-sm border flex items-center justify-between text-xs cursor-pointer select-none transition-all duration-150 ease-in-out",
                isSelected
                  ? "bg-amber-50/70 border-amber-300/80 text-stone-900 shadow-2xs"
                  : "bg-surface-inset border-border-subtle text-txt-secondary hover:border-border-default hover:bg-surface-raised hover:text-txt-primary"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Smooth Custom Checkbox */}
                <div
                  className={clsx(
                    "w-4 h-4 rounded-[3.5px] border flex items-center justify-center transition-all duration-150 ease-in-out flex-shrink-0",
                    isSelected
                      ? "bg-amber-500 border-amber-600 text-black shadow-xs scale-100"
                      : "bg-surface border-stone-300 group-hover:border-amber-500/60"
                  )}
                >
                  {isSelected && (
                    <Check className="w-3 h-3 text-black stroke-[3] transition-transform duration-150 ease-out" />
                  )}
                </div>

                {/* Icon & Name */}
                <div className="flex items-center gap-1.5 truncate">
                  <span className={clsx("transition-colors", isSelected ? "text-amber-700" : "text-txt-tertiary")}>
                    {getClassIcon(clsName)}
                  </span>
                  <span className="capitalize font-medium truncate">{clsName}</span>
                </div>
              </div>

              {/* Right side: Count + Action shortcuts (Only / Download) */}
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {/* Quick "Only" button */}
                <button
                  type="button"
                  onClick={(e) => selectOnlyClass(clsName, e)}
                  className="hidden group-hover:inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono text-stone-600 hover:text-stone-900 hover:bg-stone-200/70 transition-colors"
                  title={`Isolate ${clsName} only`}
                >
                  Only
                </button>

                {/* Individual Class Download Shortcut */}
                {onDownloadClass && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadClass(clsName);
                    }}
                    className="hidden group-hover:inline-flex p-1 rounded text-stone-500 hover:text-amber-700 hover:bg-amber-100/70 transition-colors"
                    title={`Download annotated video for ${clsName} only`}
                  >
                    <Download className="w-3 h-3" />
                  </button>
                )}

                {/* Count Badge */}
                {count !== undefined && (
                  <span className="font-mono text-[11px] text-txt-tertiary">
                    {count}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClassFilter;
