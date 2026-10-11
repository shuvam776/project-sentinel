import React from "react";
import { X, Keyboard } from "lucide-react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "Space / K", description: "Play / Pause playback" },
  { key: "B", description: "Toggle detection boxes" },
  { key: "L", description: "Toggle box labels (requires boxes enabled)" },
  { key: "[ / ]", description: "Jump to previous / next match or detection" },
  { key: ", / .", description: "Step one frame back / forward (when paused)" },
  { key: "← / →", description: "Seek 5s backward / forward (Shift for 1s)" },
  { key: "M", description: "Mute / Unmute audio" },
  { key: "F", description: "Toggle fullscreen" },
  { key: "Esc", description: "Exit fullscreen or close dialogs" },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface border border-border-default rounded-md shadow-float overflow-hidden flex flex-col animate-in fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-10 px-4 border-b border-border-subtle flex items-center justify-between bg-chrome">
          <div className="flex items-center gap-2 text-txt-primary text-xs font-semibold">
            <Keyboard className="w-4 h-4 text-accent" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-txt-tertiary hover:text-txt-primary hover:bg-surface-raised rounded-sm transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between text-xs py-1 border-b border-border-subtle last:border-0"
            >
              <span className="text-txt-secondary">{s.description}</span>
              <kbd className="px-2 py-0.5 bg-surface-inset border border-border-default rounded-xs font-mono text-[11px] font-medium text-txt-primary shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border-subtle bg-surface-inset text-right">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-surface border border-border-default hover:border-border-strong text-xs font-medium text-txt-primary rounded-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
