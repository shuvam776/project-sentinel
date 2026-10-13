"use client";

import React, { useState, useMemo } from "react";
import {
  SlidersHorizontal,
  Search,
  X,
  Check,
  Tag,
  User,
  Car,
  Briefcase,
  Layers,
  Dog,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";

interface ClassFilterModalProps {
  classes: string[];
  selectedClasses: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

const COMMON_SURVEILLANCE_CLASSES = [
  "person",
  "car",
  "bus",
  "truck",
  "motorcycle",
  "bicycle",
  "backpack",
  "handbag",
  "suitcase",
  "cell phone",
  "dog",
  "cat",
];

const CATEGORIES = [
  { id: "all", label: "All Classes" },
  { id: "surveillance", label: "Surveillance / Common" },
  { id: "people", label: "Persons & Gear" },
  { id: "vehicles", label: "Vehicles" },
  { id: "animals", label: "Animals" },
  { id: "objects", label: "Objects & Indoor" },
];

export const ClassFilterModal: React.FC<ClassFilterModalProps> = ({
  classes,
  selectedClasses,
  onChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [pendingSelected, setPendingSelected] = useState<string[]>(selectedClasses);

  const handleOpen = () => {
    setPendingSelected(selectedClasses);
    setSearchQuery("");
    setActiveCategory("all");
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleApply = () => {
    onChange(pendingSelected);
    setIsOpen(false);
  };

  const handleToggle = (clsName: string) => {
    const lower = clsName.toLowerCase();
    setPendingSelected((prev) =>
      prev.includes(lower)
        ? prev.filter((c) => c !== lower)
        : [...prev, lower]
    );
  };

  const handleSelectAllFiltered = (filtered: string[]) => {
    const lowerFiltered = filtered.map((c) => c.toLowerCase());
    setPendingSelected((prev) => Array.from(new Set([...prev, ...lowerFiltered])));
  };

  const handleClearAll = () => {
    setPendingSelected([]);
  };

  const getClassIcon = (clsName: string) => {
    const lower = clsName.toLowerCase();
    if (lower.includes("person") || lower.includes("human")) return <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
    if (lower.includes("vehicle") || lower.includes("car") || lower.includes("bus") || lower.includes("truck") || lower.includes("motorcycle"))
      return <Car className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    if (lower.includes("bag") || lower.includes("backpack") || lower.includes("suitcase"))
      return <Briefcase className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
    if (lower.includes("dog") || lower.includes("cat") || lower.includes("horse") || lower.includes("bird") || lower.includes("bear"))
      return <Dog className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
    return <Tag className="w-3.5 h-3.5 text-stone-400" />;
  };

  // Filtered classes based on active search and active category
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const lower = cls.toLowerCase();
      // Text search
      if (searchQuery.trim() && !lower.includes(searchQuery.toLowerCase().trim())) {
        return false;
      }
      // Category filter
      if (activeCategory === "surveillance") {
        return COMMON_SURVEILLANCE_CLASSES.includes(lower);
      }
      if (activeCategory === "people") {
        return lower.includes("person") || lower.includes("backpack") || lower.includes("handbag") || lower.includes("suitcase") || lower.includes("umbrella") || lower.includes("tie");
      }
      if (activeCategory === "vehicles") {
        return lower.includes("car") || lower.includes("bus") || lower.includes("truck") || lower.includes("motorcycle") || lower.includes("bicycle") || lower.includes("airplane") || lower.includes("boat") || lower.includes("train");
      }
      if (activeCategory === "animals") {
        return lower.includes("dog") || lower.includes("cat") || lower.includes("horse") || lower.includes("sheep") || lower.includes("cow") || lower.includes("elephant") || lower.includes("bear") || lower.includes("zebra") || lower.includes("giraffe") || lower.includes("bird");
      }
      if (activeCategory === "objects") {
        return !COMMON_SURVEILLANCE_CLASSES.includes(lower);
      }
      return true;
    });
  }, [classes, searchQuery, activeCategory]);

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className={clsx(
          "h-8 px-3 rounded-sm border flex items-center gap-2 text-xs font-medium cursor-pointer transition-all shadow-2xs select-none",
          selectedClasses.length > 0
            ? "bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
            : "bg-surface border-border-default text-txt-secondary hover:text-txt-primary hover:border-border-strong hover:bg-surface-raised",
          className
        )}
        title="Filter by detected object classes"
      >
        <SlidersHorizontal className={clsx("w-3.5 h-3.5", selectedClasses.length > 0 ? "text-amber-600 dark:text-amber-400 stroke-[2.2]" : "text-txt-tertiary")} />
        <span>Filter by Class</span>
        {selectedClasses.length > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-stone-950 text-[10px] font-bold">
            {selectedClasses.length}
          </span>
        ) : (
          <span className="text-[11px] text-txt-tertiary">All</span>
        )}
      </button>

      {/* Modern Filter Modal / Dialog */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-xl bg-surface border border-border-default rounded-lg shadow-float flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-chrome shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-txt-primary">
                  Filter by Object Classes
                </h3>
                {pendingSelected.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                    {pendingSelected.length} selected
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised transition-colors cursor-pointer"
                aria-label="Close filter modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Search & Quick Filter Tabs */}
            <div className="p-3 border-b border-border-subtle bg-surface-inset space-y-2 shrink-0">
              {/* Quick Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-txt-tertiary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to filter classes (e.g. person, car, backpack)..."
                  className="w-full h-8 pl-8 pr-7 bg-surface border border-border-default rounded-sm text-xs text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-accent"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-txt-tertiary hover:text-txt-primary"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Category Pills (Horizontal Scroll) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 text-[11px]">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={clsx(
                      "px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors cursor-pointer shrink-0",
                      activeCategory === cat.id
                        ? "bg-[#09090B] text-white dark:bg-stone-100 dark:text-stone-900 shadow-2xs"
                        : "bg-surface border border-border-default text-txt-secondary hover:text-txt-primary hover:border-border-strong"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle text-[11px] bg-surface shrink-0">
              <span className="text-txt-tertiary">
                Showing {filteredClasses.length} of {classes.length} classes
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllFiltered(filteredClasses)}
                  className="text-accent hover:underline font-medium cursor-pointer"
                >
                  Select Shown ({filteredClasses.length})
                </button>
                <span className="text-border-strong">·</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-txt-secondary hover:text-txt-primary hover:underline font-medium cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Classes Grid (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-3 min-h-[160px] max-h-[380px]">
              {filteredClasses.length === 0 ? (
                <div className="py-8 text-center text-xs text-txt-secondary">
                  No classes matching “{searchQuery}”
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {filteredClasses.map((clsName) => {
                    const isSelected = pendingSelected.includes(clsName.toLowerCase());
                    return (
                      <div
                        key={clsName}
                        onClick={() => handleToggle(clsName)}
                        className={clsx(
                          "px-2.5 py-1.5 rounded-sm border flex items-center justify-between text-xs cursor-pointer select-none transition-all",
                          isSelected
                            ? "bg-amber-500/15 border-amber-500/50 text-amber-900 dark:text-amber-200 font-semibold shadow-2xs"
                            : "bg-surface border-border-default text-txt-secondary hover:border-border-strong hover:bg-surface-raised hover:text-txt-primary"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="shrink-0">{getClassIcon(clsName)}</span>
                          <span className="capitalize truncate text-[11px]">
                            {clsName}
                          </span>
                        </div>
                        <div
                          className={clsx(
                            "w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 ml-1 transition-colors",
                            isSelected
                              ? "bg-amber-500 border-amber-600 text-stone-950"
                              : "border-border-strong bg-surface"
                          )}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer with Apply / Cancel Actions */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-default bg-chrome shrink-0">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={pendingSelected.length === 0}
                className="text-xs text-txt-secondary hover:text-txt-primary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                Reset selection
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 rounded-sm border border-border-default text-txt-secondary hover:text-txt-primary hover:bg-surface-raised text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-1.5 rounded-sm bg-[#09090B] text-white hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 text-xs font-semibold shadow-xs cursor-pointer transition-all"
                >
                  Apply Filters {pendingSelected.length > 0 && `(${pendingSelected.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClassFilterModal;
