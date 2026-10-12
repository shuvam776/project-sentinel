"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Upload, Search, X, ChevronDown, List, Columns3, CircleHelp, Loader2, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import AppShell from "@/components/shell/AppShell";
import Header from "@/components/shell/Header";
import Button from "@/components/ui/Button";
import VideoRow from "@/components/library/VideoRow";
import VideoCard from "@/components/library/VideoCard";
import UploadDropzone from "@/components/library/UploadDropzone";
import StatusIndicator from "@/components/ui/StatusIndicator";
import { fetchVideos, uploadVideo, deleteVideo, reprocessVideo, updateVideoName } from "@/lib/api";
import { VideoItem } from "@/types";
import { clsx } from "clsx";
import { useAuth } from "@/context/AuthContext";

export default function LibraryPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode: 'list' | 'board'
  const [viewMode, setViewMode] = useState<"list" | "board">("list");

  // Load view mode preference from localStorage
  useEffect(() => {
    try {
      const storedPrefs = localStorage.getItem("sentinel.prefs.v1");
      if (storedPrefs) {
        const parsed = JSON.parse(storedPrefs);
        if (parsed.libraryView) setViewMode(parsed.libraryView);
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleSetViewMode = (mode: "list" | "board") => {
    setViewMode(mode);
    try {
      const stored = localStorage.getItem("sentinel.prefs.v1");
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem("sentinel.prefs.v1", JSON.stringify({ ...parsed, libraryView: mode }));
    } catch {
      // Ignore
    }
  };

  // Filters & Sorting
  const [filterName, setFilterName] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("newest");

  // Pagination (10 videos per page)
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset pagination to page 1 whenever search filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterName, statusFilter, sortOption]);

  // Upload state
  const [uploadingFiles, setUploadingFiles] = useState<
    { name: string; percent: number; status: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const loadVideos = useCallback(async () => {
    try {
      const data = await fetchVideos();
      setVideos(data.videos || []);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load videos";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos, user]);

  // Polling while processing videos exist
  useEffect(() => {
    const hasActive = videos.some(
      (v) => v.status === "queued" || v.status === "processing"
    );
    if (!hasActive) return;

    const interval = setInterval(loadVideos, 2000);
    return () => clearInterval(interval);
  }, [videos, loadVideos]);

  const handleUploadFiles = async (fileList: FileList) => {
    const files = Array.from(fileList);
    for (const file of files) {
      const uploadItem = { name: file.name, percent: 0, status: "Uploading" };
      setUploadingFiles((prev) => [uploadItem, ...prev]);

      try {
        await uploadVideo(file, 1.0, (percent) => {
          setUploadingFiles((prev) =>
            prev.map((u) => (u.name === file.name ? { ...u, percent } : u))
          );
        });
        await loadVideos();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        alert(`Failed to upload ${file.name}: ${msg}`);
      } finally {
        setUploadingFiles((prev) => prev.filter((u) => u.name !== file.name));
      }
    }
  };

  const handleDelete = async (id: string) => {
    await deleteVideo(id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const handleRetry = async (id: string) => {
    await reprocessVideo(id);
    await loadVideos();
  };

  const handleRename = async (id: string, newName: string) => {
    try {
      await updateVideoName(id, newName);
      setVideos((prev) =>
        prev.map((v) => (v.id === id ? { ...v, original_filename: newName } : v))
      );
    } catch (err) {
      console.error("Failed to rename video:", err);
    }
  };

  // Filter & Sort Logic
  const filteredVideos = videos
    .filter((v) => {
      if (filterName && !v.original_filename.toLowerCase().includes(filterName.toLowerCase())) {
        return false;
      }
      if (statusFilter === "ready" && v.status !== "completed") return false;
      if (statusFilter === "indexing" && v.status !== "processing" && v.status !== "queued") return false;
      if (statusFilter === "failed" && v.status !== "failed") return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOption === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOption === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortOption === "name") return a.original_filename.localeCompare(b.original_filename);
      if (sortOption === "duration") return (b.duration_seconds || 0) - (a.duration_seconds || 0);
      return 0;
    });

  // Pagination Slicing
  const totalVideos = filteredVideos.length;
  const totalPages = Math.max(1, Math.ceil(totalVideos / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalVideos);
  const paginatedVideos = filteredVideos.slice(startIndex, endIndex);

  // Categorize for Board view columns (use paginated set if total > 10)
  const displayedVideos = totalVideos > PAGE_SIZE ? paginatedVideos : filteredVideos;
  const uploadingVideos = displayedVideos.filter((v) => v.status === "queued");
  const indexingVideos = displayedVideos.filter((v) => v.status === "processing");
  const readyVideos = displayedVideos.filter((v) => v.status === "completed");
  const needsAttentionVideos = displayedVideos.filter((v) => v.status === "failed");

  const getPaginationItems = (current: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }
    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  const hasProcessing = videos.some((v) => v.status === "queued" || v.status === "processing");

  // Drag & drop window handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <AppShell hasProcessingVideos={hasProcessing}>
      <Header
        title="Library"
        actions={
          videos.length > 0 ? (
            <Button
              variant="primary"
              size="md"
              icon={<Upload className="w-4 h-4" />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload video
            </Button>
          ) : undefined
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
        className="hidden"
        onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
      />

      <div
        className="p-4 md:p-6 pb-20 max-w-[1280px] w-full min-h-full flex flex-col select-none"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Underline Tab Strip: List | Board */}
        <div className="flex items-center gap-6 border-b border-border-default mb-4">
          <button
            onClick={() => handleSetViewMode("list")}
            className={clsx(
              "flex items-center gap-2 py-2 text-xs font-medium border-b-2 transition-colors",
              viewMode === "list"
                ? "border-accent text-txt-primary"
                : "border-transparent text-txt-secondary hover:text-txt-primary"
            )}
          >
            <List className="w-4 h-4" />
            <span>List</span>
          </button>
          <button
            onClick={() => handleSetViewMode("board")}
            className={clsx(
              "flex items-center gap-2 py-2 text-xs font-medium border-b-2 transition-colors",
              viewMode === "board"
                ? "border-accent text-txt-primary"
                : "border-transparent text-txt-secondary hover:text-txt-primary"
            )}
          >
            <Columns3 className="w-4 h-4" />
            <span>Board</span>
          </button>
        </div>

        {/* Subtitle Description */}
        <p className="text-sm text-txt-secondary mb-4">
          Upload recorded footage. Videos become searchable once indexed.
        </p>

        {/* Drag Over Visual State */}
        {isDragOver && (
          <div className="mb-4 p-4 rounded-md border border-dashed border-accent bg-accent-subtle text-center text-xs font-semibold text-accent-text">
            Drop files to upload
          </div>
        )}

        {/* Empty State */}
        {!loading && videos.length === 0 && uploadingFiles.length === 0 ? (
          <UploadDropzone onFilesSelected={handleUploadFiles} isDraggingOver={isDragOver} />
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 min-h-8">
              <div className="flex items-center gap-2">
                {/* Upload Button */}
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Upload className="w-3.5 h-3.5" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload video
                </Button>

                {/* Name Filter */}
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-txt-tertiary absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    placeholder="Filter videos..."
                    className="w-full h-8 pl-8 pr-7 bg-surface-inset border border-border-default rounded-sm text-xs text-txt-primary placeholder:text-txt-tertiary focus:outline-none focus:border-border-strong"
                  />
                  {filterName && (
                    <button
                      onClick={() => setFilterName("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-txt-tertiary hover:text-txt-primary"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Status Filter (List View Only) */}
                {viewMode === "list" && (
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-8 px-2.5 pr-7 bg-surface-raised border border-border-default rounded-sm text-xs text-txt-primary appearance-none cursor-pointer focus:outline-none hover:border-border-strong"
                    >
                      <option value="all">All statuses</option>
                      <option value="ready">Ready</option>
                      <option value="indexing">Indexing</option>
                      <option value="failed">Failed</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-txt-tertiary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Outlined Sort by Button */}
                <div className="relative">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="h-8 px-2.5 pr-7 bg-surface border border-border-default rounded-sm text-xs text-txt-primary font-medium appearance-none cursor-pointer focus:outline-none hover:border-border-strong"
                  >
                    <option value="newest">Sort by Newest</option>
                    <option value="oldest">Sort by Oldest</option>
                    <option value="name">Sort by Name A–Z</option>
                    <option value="duration">Sort by Duration</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-txt-tertiary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <span className="text-xs font-mono text-txt-tertiary">
                  {totalVideos > PAGE_SIZE && (
                    <span>Page {safeCurrentPage} of {totalPages} · </span>
                  )}
                  {filteredVideos.length} {filteredVideos.length === 1 ? "video" : "videos"}
                </span>
              </div>
            </div>

            {/* LIST VIEW */}
            {viewMode === "list" && (
              <div className="rounded-md border border-border-default bg-surface">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="h-8 border-b border-border-default bg-surface text-[11px] font-semibold tracking-wider text-txt-tertiary uppercase select-none">
                      <th className="px-3 font-semibold rounded-tl-md">Thumbnail</th>
                      <th className="px-3 font-semibold">Name</th>
                      <th className="px-3 font-semibold">Status</th>
                      <th className="px-3 font-semibold text-right">Duration</th>
                      <th className="px-3 font-semibold text-right hidden xl:table-cell">Size</th>
                      <th className="px-3 font-semibold text-right hidden lg:table-cell">Uploaded</th>
                      <th className="px-3 font-semibold text-right rounded-tr-md">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Uploading progress rows pinned at top */}
                    {uploadingFiles.map((up, idx) => (
                      <tr key={idx} className="border-b border-border-subtle bg-surface-raised relative text-xs">
                        <td className="py-2 px-3">
                          <div className="w-[96px] h-[54px] bg-surface-inset rounded-sm border border-border-subtle flex items-center justify-center">
                            <Upload className="w-4 h-4 text-processing animate-pulse-soft" />
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-medium text-txt-primary truncate max-w-[280px]">
                            {up.name}
                          </div>
                          <div className="text-[11px] text-txt-tertiary font-mono">Uploading file...</div>
                        </td>
                        <td className="py-2 px-3">
                          <StatusIndicator status="uploading" progressPercent={up.percent} />
                        </td>
                        <td colSpan={4} className="py-2 px-3 text-right">
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border-subtle">
                            <div
                              className="h-full bg-processing transition-all duration-200"
                              style={{ width: `${up.percent}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Video Rows */}
                    {paginatedVideos.map((video, idx) => (
                      <VideoRow
                        key={video.id}
                        video={video}
                        isLastRow={idx >= Math.max(0, paginatedVideos.length - 2)}
                        onDelete={handleDelete}
                        onRetry={handleRetry}
                        onRename={handleRename}
                      />
                    ))}
                  </tbody>
                </table>

                {/* Filtered Empty State */}
                {filteredVideos.length === 0 && uploadingFiles.length === 0 && (
                  <div className="py-12 text-center text-xs text-txt-secondary">
                    No videos match your current filter.
                    <button
                      onClick={() => {
                        setFilterName("");
                        setStatusFilter("all");
                      }}
                      className="ml-2 text-accent hover:underline font-medium"
                    >
                      Clear filter
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* BOARD VIEW */}
            {viewMode === "board" && (
              <div
                className={clsx(
                  "gap-5 items-start",
                  uploadingFiles.length === 0 && uploadingVideos.length === 0 && indexingVideos.length === 0
                    ? "grid grid-cols-1 lg:grid-cols-3"
                    : (uploadingFiles.length > 0 || uploadingVideos.length > 0) && indexingVideos.length > 0
                    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
                    : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                )}
              >
                {/* Column 1: Uploading (Only appears when videos/files are actively uploading) */}
                {(uploadingFiles.length > 0 || uploadingVideos.length > 0) && (
                  <div className="bg-well rounded-md p-3.5 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between h-9 px-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-semibold text-txt-primary">Uploading</span>
                        <span className="px-1.5 py-0.5 rounded-sm bg-amber-500/10 text-amber-700 font-mono text-[11px] font-medium">
                          {uploadingFiles.length + uploadingVideos.length}
                        </span>
                      </div>
                      <div title="Videos currently uploading or queued for index processing">
                        <CircleHelp className="w-4 h-4 text-txt-tertiary cursor-pointer hover:text-txt-secondary" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {uploadingFiles.map((up, idx) => (
                        <div key={idx} className="bg-surface border border-border-default rounded-md p-3 space-y-2 text-xs">
                          <div className="font-medium text-txt-primary truncate">{up.name}</div>
                          <StatusIndicator status="uploading" progressPercent={up.percent} />
                          <div className="w-full h-1 bg-border-subtle rounded-xs overflow-hidden">
                            <div className="h-full bg-processing" style={{ width: `${up.percent}%` }} />
                          </div>
                        </div>
                      ))}

                      {uploadingVideos.map((video) => (
                        <VideoCard key={video.id} video={video} onDelete={handleDelete} onRetry={handleRetry} onRename={handleRename} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Column 2: Indexing (Only appears when videos are actively indexing) */}
                {indexingVideos.length > 0 && (
                  <div className="bg-well rounded-md p-3.5 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between h-9 px-1">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                        <span className="text-xs font-semibold text-txt-primary">Indexing</span>
                        <span className="px-1.5 py-0.5 rounded-sm bg-accent-subtle font-mono text-[11px] text-accent-text font-medium">
                          {indexingVideos.length}
                        </span>
                      </div>
                      <div title="Videos still being indexed. Search may be incomplete.">
                        <CircleHelp className="w-4 h-4 text-txt-tertiary cursor-pointer hover:text-txt-secondary" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {indexingVideos.map((video) => (
                        <VideoCard key={video.id} video={video} onDelete={handleDelete} onRetry={handleRetry} onRename={handleRename} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Column 3: Ready (Videos already indexed and ready) */}
                <div
                  className={clsx(
                    "bg-well rounded-md p-3.5 space-y-3",
                    uploadingFiles.length === 0 && uploadingVideos.length === 0 && indexingVideos.length === 0 && "lg:col-span-2"
                  )}
                >
                  <div className="flex items-center justify-between h-9 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-txt-primary">Ready</span>
                      <span className="px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono text-[11px] font-medium">
                        {readyVideos.length}
                      </span>
                    </div>
                    <div title="Fully indexed videos ready for high-speed search and playback">
                      <CircleHelp className="w-4 h-4 text-txt-tertiary cursor-pointer hover:text-txt-secondary" />
                    </div>
                  </div>

                  <div
                    className={clsx(
                      uploadingFiles.length === 0 && uploadingVideos.length === 0 && indexingVideos.length === 0
                        ? "grid grid-cols-1 sm:grid-cols-2 gap-3.5"
                        : "space-y-3"
                    )}
                  >
                    {/* Upload Video Dropzone Tile inside Ready section */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[160px] rounded-lg border-2 border-dashed border-border-default hover:border-accent hover:bg-accent-subtle/30 transition-all p-4 flex flex-col items-center justify-center text-center cursor-pointer group bg-surface/60"
                      title="Click or drop video to upload"
                    >
                      <div className="w-9 h-9 rounded-full bg-surface-raised group-hover:bg-accent/10 border border-border-subtle flex items-center justify-center mb-1.5 transition-colors">
                        <Upload className="w-4 h-4 text-txt-secondary group-hover:text-accent transition-colors" />
                      </div>
                      <span className="text-xs font-semibold text-txt-primary group-hover:text-accent transition-colors">
                        Upload Video
                      </span>
                      <span className="text-[11px] text-txt-tertiary mt-0.5">
                        Drop video file or click to browse
                      </span>
                    </div>

                    {readyVideos.map((video) => (
                      <VideoCard key={video.id} video={video} onDelete={handleDelete} onRetry={handleRetry} onRename={handleRename} />
                    ))}
                  </div>

                  {readyVideos.length === 0 && (
                    <div className="py-8 text-center space-y-2">
                      <CheckCircle2 className="w-6 h-6 text-txt-tertiary mx-auto" />
                      <p className="text-xs text-txt-tertiary">Videos appear here once indexed.</p>
                    </div>
                  )}
                </div>

                {/* Column 4: Needs attention */}
                <div
                  className={clsx(
                    "bg-well rounded-md p-3.5 space-y-3",
                    uploadingFiles.length === 0 && uploadingVideos.length === 0 && indexingVideos.length === 0 && "lg:col-span-1"
                  )}
                >
                  <div className="flex items-center justify-between h-9 px-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "w-2 h-2 rounded-full",
                          needsAttentionVideos.length > 0 ? "bg-rose-500 animate-pulse" : "bg-txt-tertiary"
                        )}
                      />
                      <span className="text-xs font-semibold text-txt-primary">Needs attention</span>
                      <span
                        className={clsx(
                          "px-1.5 py-0.5 rounded-sm font-mono text-[11px] font-medium",
                          needsAttentionVideos.length > 0
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-surface-raised text-txt-secondary"
                        )}
                      >
                        {needsAttentionVideos.length}
                      </span>
                    </div>
                    <div title="Videos where indexing failed or was interrupted">
                      <CircleHelp className="w-4 h-4 text-txt-tertiary cursor-pointer hover:text-txt-secondary" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {needsAttentionVideos.map((video) => (
                      <VideoCard key={video.id} video={video} onDelete={handleDelete} onRetry={handleRetry} onRename={handleRename} />
                    ))}

                    {needsAttentionVideos.length === 0 && (
                      <div className="py-8 px-4 text-center rounded-md border border-dashed border-border-subtle bg-surface/40 space-y-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                        <p className="text-xs font-medium text-txt-primary">All systems operational</p>
                        <p className="text-[11px] text-txt-tertiary">No videos need attention.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pagination Controls (shown when more than 10 videos) */}
            {totalVideos > PAGE_SIZE && (
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 px-3.5 py-2.5 rounded-md border border-border-default bg-surface text-xs select-none">
                <div className="text-txt-secondary font-mono text-[11px]">
                  Showing <span className="font-semibold text-txt-primary">{startIndex + 1}</span>–<span className="font-semibold text-txt-primary">{endIndex}</span> of{" "}
                  <span className="font-semibold text-txt-primary">{totalVideos}</span> videos
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      document.getElementById("main")?.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={safeCurrentPage <= 1}
                    className="h-7 px-2.5 rounded-sm border border-border-default bg-surface hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed text-txt-primary font-medium flex items-center gap-1 transition-colors cursor-pointer text-xs"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {getPaginationItems(safeCurrentPage, totalPages).map((item, idx) => {
                      if (item === "...") {
                        return (
                          <span key={`ellipsis-${idx}`} className="px-1 text-txt-tertiary font-mono text-xs">
                            …
                          </span>
                        );
                      }
                      const pageNum = Number(item);
                      const isActive = pageNum === safeCurrentPage;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => {
                            setCurrentPage(pageNum);
                            document.getElementById("main")?.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={clsx(
                            "w-7 h-7 rounded-sm text-xs font-mono font-medium transition-colors cursor-pointer flex items-center justify-center",
                            isActive
                              ? "bg-accent text-accent-text border border-accent shadow-xs font-semibold"
                              : "border border-border-default bg-surface hover:bg-surface-raised text-txt-primary"
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      document.getElementById("main")?.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={safeCurrentPage >= totalPages}
                    className="h-7 px-2.5 rounded-sm border border-border-default bg-surface hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed text-txt-primary font-medium flex items-center gap-1 transition-colors cursor-pointer text-xs"
                    aria-label="Next page"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-sm bg-danger-subtle border border-danger-border text-danger-text text-xs">
            {error}
          </div>
        )}
      </div>
    </AppShell>
  );
}

