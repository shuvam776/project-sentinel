import React, { useRef, useEffect } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import Button from "@/components/ui/Button";

interface QueryFieldProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (val: string) => void;
  loading?: boolean;
  className?: string;
}

export const QueryField: React.FC<QueryFieldProps> = ({
  value,
  onChange,
  onSubmit,
  loading = false,
  className = "",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // '/' shortcut to focus query field
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim().length >= 2) {
        onSubmit(value);
      }
    } else if (e.key === "Escape") {
      if (value) {
        onChange("");
      } else {
        inputRef.current?.blur();
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().length >= 2) {
      onSubmit(value);
    }
  };

  const canSubmit = value.trim().length >= 2;

  return (
    <form onSubmit={handleFormSubmit} className={`relative flex items-center w-full ${className}`}>
      <div className="relative w-full flex items-center bg-surface-inset border border-border-default hover:border-border-strong focus-within:border-accent rounded-sm h-[48px] px-4 transition-colors">
        <SearchIcon className="w-4 h-4 text-txt-tertiary mr-3 flex-shrink-0" />

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDownInput}
          placeholder="Describe what to find, e.g. “person carrying a backpack”"
          className="w-full h-full bg-transparent text-sm text-txt-primary placeholder:text-txt-tertiary focus:outline-none"
        />

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-1 text-txt-tertiary hover:text-txt-primary mr-2"
            aria-label="Clear query"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!canSubmit}
          loading={loading}
          className="flex-shrink-0"
        >
          <span>Search</span>
          <span className="ml-1.5 px-1 py-0.5 text-[10px] font-mono bg-accent-fg/20 rounded-xs text-accent-fg hidden sm:inline-block">
            ⏎
          </span>
        </Button>
      </div>
    </form>
  );
};

export default QueryField;
