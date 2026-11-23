"use client";
/**
 * FileUpload — drag-and-drop file upload zone.
 */
import { useCallback, useRef, useState } from "react";
import { UploadCloud, File, X, CheckCircle2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";

export interface UploadedFile {
  file:   File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  url?:   string;
}

interface FileUploadProps {
  accept?:       string;
  maxFiles?:     number;
  maxSizeMb?:    number;
  onFilesChange: (files: UploadedFile[]) => void;
  files:         UploadedFile[];
  className?:    string;
  disabled?:     boolean;
}

export function FileUpload({
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  maxFiles = 10,
  maxSizeMb = 20,
  onFilesChange,
  files,
  className,
  disabled = false,
}: FileUploadProps) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming);
    const valid = arr.filter((f) => f.size <= maxSizeMb * 1024 * 1024);
    const added: UploadedFile[] = valid.map((f) => ({ file: f, status: "pending" }));
    onFilesChange([...files, ...added].slice(0, maxFiles));
  }, [files, maxFiles, maxSizeMb, onFilesChange]);

  const removeFile = (idx: number) => {
    onFilesChange(files.filter((_, i) => i !== idx));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) addFiles(e.dataTransfer.files);
  };

  return (
    <div className={className}>
      {/* Drop zone */}
      <button
        type="button"
        disabled={disabled || files.length >= maxFiles}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={clsx(
          "w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 transition-all",
          dragging
            ? "border-[#6338F5] bg-[#6338F5]/10"
            : "border-[#29345A] hover:border-[#6338F5]/60 hover:bg-[#6338F5]/5",
          (disabled || files.length >= maxFiles) && "opacity-50 cursor-not-allowed"
        )}
      >
        <UploadCloud size={32} className="text-[#6338F5]" />
        <div className="text-center">
          <p className="text-sm font-medium text-white">
            Drop files here or <span className="text-[#6338F5]">browse</span>
          </p>
          <p className="text-xs text-[#AAB4CC] mt-0.5">
            {accept} · Max {maxSizeMb}MB per file · Up to {maxFiles} files
          </p>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        onChange={(e) => addFiles(e.target.files)}
        disabled={disabled}
        aria-label="File input"
      />

      {/* File list */}
      {files.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-xl border border-[#29345A] bg-[#111832] px-4 py-3"
            >
              <File size={18} className="shrink-0 text-[#AAB4CC]" />
              <span className="flex-1 text-sm text-white truncate">{f.file.name}</span>
              <span className="text-xs text-[#AAB4CC]">
                {(f.file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              {f.status === "done"      && <CheckCircle2 size={16} className="text-[#13C98A]" />}
              {f.status === "error"     && <AlertCircle  size={16} className="text-[#EF4444]" />}
              {f.status === "uploading" && (
                <div className="h-4 w-4 rounded-full border-2 border-[#29345A] border-t-[#6338F5] animate-spin" />
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-[#AAB4CC] hover:text-white transition-colors ml-1"
                aria-label={`Remove ${f.file.name}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
