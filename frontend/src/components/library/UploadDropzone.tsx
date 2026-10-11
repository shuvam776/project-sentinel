import React, { useRef } from "react";
import { Upload } from "lucide-react";
import Button from "@/components/ui/Button";

interface UploadDropzoneProps {
  onFilesSelected: (files: FileList) => void;
  isDraggingOver?: boolean;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFilesSelected,
  isDraggingOver = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <div
      className={`min-h-[280px] rounded-md border border-dashed transition-colors duration-fast flex flex-col items-center justify-center p-8 text-center select-none ${
        isDraggingOver
          ? "bg-accent-subtle border-accent"
          : "bg-surface-inset border-border-strong hover:border-txt-tertiary"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="w-12 h-12 rounded-md bg-surface flex items-center justify-center mb-4 text-txt-tertiary border border-border-subtle">
        <Upload className="w-6 h-6 text-txt-tertiary" />
      </div>

      <h2 className="text-xl font-semibold text-txt-primary tracking-tight mb-1.5">
        Upload your first video
      </h2>

      <p className="text-sm text-txt-secondary max-w-md mb-6">
        Sentinel indexes footage so you can search it in plain language.
      </p>

      <Button
        variant="primary"
        size="md"
        icon={<Upload className="w-4 h-4" />}
        onClick={() => inputRef.current?.click()}
      >
        Choose files
      </Button>

      <p className="text-xs text-txt-tertiary mt-3 font-mono">
        or drag files here · MP4, MOV, WebM, MKV · up to 2 GB
      </p>
    </div>
  );
};

export default UploadDropzone;
