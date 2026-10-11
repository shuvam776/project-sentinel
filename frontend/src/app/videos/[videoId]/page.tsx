"use client";

import React, { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Search, MoreVertical, Download, Square, Trash2, Keyboard, Pencil, Check, X, Loader2 } from "lucide-react";
import AppShell from "@/components/shell/AppShell";
import Header from "@/components/shell/Header";
import VideoPlayer from "@/components/player/VideoPlayer";
import SidePanel from "@/components/player/SidePanel";
import InlineAlert from "@/components/ui/InlineAlert";
import KeyboardShortcutsModal from "@/components/player/KeyboardShortcutsModal";
import { fetchVideo, fetchDetections, searchVideo, deleteVideo, getVideoDownloadUrl, getClipDownloadUrl, updateVideoName } from "@/lib/api";
import { VideoItem, SearchResultSegment, Detection } from "@/types";

function VideoDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const videoId = params.videoId as string;
  const urlTimestamp = parseFloat(searchParams.get("t") || "0");
  const urlQuery = searchParams.get("q") || "";
  const urlEventId = searchParams.get("event") || null;

  const [video, setVideo] = useState<VideoItem | null>(null);
  const [matches, setMatches] = useState<SearchResultSegment[]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);

  const [currentTime, setCurrentTime] = useState<number>(urlTimestamp);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(urlEventId);
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  // Close overflow menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
    };
    if (headerMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [headerMenuOpen]);

  const loadData = useCallback(async () => {
    if (!videoId) return;
    setLoading(true);
    setError(null);

    try {
      const v = await fetchVideo(videoId);
      setVideo(v);

      const d = await fetchDetections(videoId).catch(() => []);
      setDetections(d || []);

      if (urlQuery) {
        const s = await searchVideo({ videoId, query: urlQuery }).catch(() => null);
        if (s && s.segments) {
          setMatches(s.segments);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load video";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [videoId, urlQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteVideo = async () => {
    if (!video) return;
    if (confirm(`Delete "${video.original_filename}"? This will remove all search and detection data and cannot be undone.`)) {
      await deleteVideo(video.id);
      router.push("/library");
    }
  };

  const handleStartRename = () => {
    if (video) {
      setRenameInput(video.original_filename);
      setRenameModalOpen(true);
      setHeaderMenuOpen(false);
    }
  };

  const handleRenameVideo = async (newName: string) => {
    if (!video || !newName.trim()) return;
    setIsSavingRename(true);
    try {
      const updated = await updateVideoName(video.id, newName.trim());
      setVideo(updated);
      setRenameModalOpen(false);
    } catch (e) {
      console.error("Failed to rename video", e);
      alert("Failed to rename video. Please try again.");
    } finally {
      setIsSavingRename(false);
    }
  };

  // Breadcrumbs logic per design.md §7.3
  const breadcrumbItems = urlQuery
    ? [
        { label: "Search", href: "/search" },
        { label: `“${urlQuery}”`, href: `/search?q=${encodeURIComponent(urlQuery)}` },
        { label: video?.original_filename || "Video", isCurrent: true },
      ]
    : [
        { label: "Library", href: "/library" },
        { label: video?.original_filename || "Video", isCurrent: true },
      ];

  const allClassNames = React.useMemo(() => {
    return Array.from(new Set(detections.map((d) => d.class_name)));
  }, [detections]);

  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [classesInitialized, setClassesInitialized] = useState(false);

  useEffect(() => {
    if (allClassNames.length > 0 && !classesInitialized) {
      const storageKey = `sentinel_classes_${videoId}`;
      const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((c) => allClassNames.includes(c));
            setSelectedClasses(valid);
            setClassesInitialized(true);
            return;
          }
        } catch {}
      }
      setSelectedClasses(allClassNames);
      setClassesInitialized(true);
    }
  }, [allClassNames, videoId, classesInitialized]);

  const handleUpdateSelectedClasses = (classes: string[]) => {
    setSelectedClasses(classes);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`sentinel_classes_${videoId}`, JSON.stringify(classes));
      } catch {}
    }
  };

  const isAllClasses =
    allClassNames.length > 0 && selectedClasses.length === allClassNames.length;
  const downloadAnnotatedUrl = video
    ? getVideoDownloadUrl(video.id, {
        annotated: true,
        classes: !isAllClasses ? selectedClasses : undefined,
      })
    : undefined;
  const downloadRawUrl = video
    ? video.download_url || getVideoDownloadUrl(video.id)
    : undefined;

  const activeSegment = matches.find((m) => m.segment_id === selectedSegmentId);
  const downloadClipUrl = activeSegment
    ? getClipDownloadUrl(videoId, activeSegment.segment_id)
    : undefined;

  // Header Right Actions (§7.3 & §8C)
  const headerActions = video ? (
    <div className="flex items-center gap-2">
      <button
        onClick={() => router.push(`/search?video=${video.id}`)}
        className="h-8 px-2.5 rounded-sm bg-surface border border-border-default hover:border-border-strong text-txt-primary flex items-center gap-1.5 text-xs font-medium transition-colors shadow-xs"
        title="Search within this video"
      >
        <Search className="w-3.5 h-3.5 text-accent" />
        <span className="hidden sm:inline">Search Video</span>
      </button>

      {/* Overflow Menu (…) */}
      <div className="relative" ref={headerMenuRef}>
        <button
          onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
          className="h-8 w-8 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised flex items-center justify-center transition-colors"
          title="Video options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {headerMenuOpen && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-surface border border-border-default rounded-md shadow-float p-1 text-xs space-y-0.5 z-40">
            <button
              onClick={() => {
                setHeaderMenuOpen(false);
                router.push(`/search?video=${video.id}`);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-sm text-txt-primary hover:bg-surface-raised flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5 text-accent" />
              <span>Search this video</span>
            </button>

            {downloadAnnotatedUrl && (
              <a
                href={downloadAnnotatedUrl}
                download={`annotated_${video.original_filename}`}
                onClick={() => setHeaderMenuOpen(false)}
                className="w-full text-left px-2.5 py-1.5 rounded-sm text-txt-primary hover:bg-surface-raised flex items-center gap-2"
              >
                <Square className="w-3.5 h-3.5 text-accent" />
                <span>Download annotated</span>
              </a>
            )}

            {downloadRawUrl && (
              <a
                href={downloadRawUrl}
                download={video.original_filename}
                onClick={() => setHeaderMenuOpen(false)}
                className="w-full text-left px-2.5 py-1.5 rounded-sm text-txt-primary hover:bg-surface-raised flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-txt-tertiary" />
                <span>Download original video</span>
              </a>
            )}

            <button
              onClick={() => {
                setHeaderMenuOpen(false);
                setShortcutsModalOpen(true);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-sm text-txt-primary hover:bg-surface-raised flex items-center gap-2"
            >
              <Keyboard className="w-3.5 h-3.5 text-txt-tertiary" />
              <span>Keyboard shortcuts</span>
            </button>

            <button
              onClick={handleStartRename}
              className="w-full text-left px-2.5 py-1.5 rounded-sm text-txt-primary hover:bg-surface-raised flex items-center gap-2"
            >
              <Pencil className="w-3.5 h-3.5 text-txt-tertiary" />
              <span>Rename video…</span>
            </button>

            <div className="h-px bg-border-subtle my-1" />

            <button
              onClick={() => {
                setHeaderMenuOpen(false);
                handleDeleteVideo();
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-sm text-danger hover:bg-danger-subtle flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5 text-danger" />
              <span>Delete video…</span>
            </button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <Header breadcrumbItems={breadcrumbItems} actions={headerActions} />

      <div className="flex-1 flex flex-col lg:flex-row min-w-0 h-[calc(100vh-48px)] overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8 text-xs text-txt-secondary">
            Loading video data...
          </div>
        ) : error || !video ? (
          <div className="flex-1 p-6 max-w-md mx-auto my-auto">
            <InlineAlert tone="danger" title="Video not found">
              {error || "This video does not exist or was deleted."}
            </InlineAlert>
          </div>
        ) : (
          <>
            {/* Player Main Area */}
            <VideoPlayer
              video={video}
              initialTime={urlTimestamp}
              matches={matches}
              detections={detections}
              selectedClasses={selectedClasses}
              downloadAnnotatedUrl={downloadAnnotatedUrl}
              selectedSegmentId={selectedSegmentId}
              selectedDetectionId={selectedDetectionId}
              onTimeUpdate={(t) => setCurrentTime(t)}
              onSelectMatch={(m) => setSelectedSegmentId(m ? m.segment_id : null)}
              onSelectDetection={(d) => setSelectedDetectionId(d ? d.id : null)}
              downloadClipUrl={downloadClipUrl}
            />

            {/* Side Panel */}
            <SidePanel
              video={video}
              matches={matches}
              detections={detections}
              currentTime={currentTime}
              selectedClasses={selectedClasses}
              onSelectClasses={handleUpdateSelectedClasses}
              downloadAnnotatedUrl={downloadAnnotatedUrl}
              activeTab={urlQuery && matches.length > 0 ? "matches" : "detections"}
              selectedSegmentId={selectedSegmentId}
              selectedDetectionId={selectedDetectionId}
              onSelectSegment={(m) => setSelectedSegmentId(m ? m.segment_id : null)}
              onSelectDetection={(d) => setSelectedDetectionId(d ? d.id : null)}
              onSeek={(time) => {
                const vidElem = document.querySelector("video");
                if (vidElem) vidElem.currentTime = time;
              }}
              onRenameVideo={handleRenameVideo}
              onDeleteVideo={handleDeleteVideo}
            />
          </>
        )}
      </div>

      {/* Rename Video Modal */}
      {renameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-md bg-surface border border-border-default rounded-md shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="text-sm font-semibold text-txt-primary flex items-center gap-2">
                <Pencil className="w-4 h-4 text-accent" />
                Rename Video
              </h3>
              <button
                type="button"
                onClick={() => setRenameModalOpen(false)}
                className="text-txt-tertiary hover:text-txt-primary p-1 rounded hover:bg-surface-raised"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-txt-secondary font-medium">New Video Name</label>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleRenameVideo(renameInput);
                  } else if (e.key === "Escape") {
                    setRenameModalOpen(false);
                  }
                }}
                autoFocus
                placeholder="Enter filename..."
                className="w-full h-9 px-3 text-xs bg-surface-raised border border-border-default rounded text-txt-primary focus:outline-none focus:border-accent"
              />
              <p className="text-[11px] text-txt-tertiary">
                Press Enter to save, or Escape to cancel.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenameModalOpen(false)}
                className="h-8 px-3 text-xs rounded text-txt-secondary hover:text-txt-primary hover:bg-surface-raised border border-border-subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRenameVideo(renameInput)}
                disabled={isSavingRename || !renameInput.trim()}
                className="h-8 px-3.5 text-xs rounded bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingRename ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save Name
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </>
  );
}

export default function VideoDetailPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-6 text-xs text-txt-tertiary">Loading video playback...</div>}>
        <VideoDetailContent />
      </Suspense>
    </AppShell>
  );
}
