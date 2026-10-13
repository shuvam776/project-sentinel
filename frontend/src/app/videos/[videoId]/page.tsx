"use client";

import React, { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Search, MoreVertical, Download, Square, Trash2, Keyboard, Pencil, Check, X, Loader2, SlidersHorizontal, Layers, ChevronUp, ChevronLeft, Lock, ShieldCheck } from "lucide-react";
import AppShell from "@/components/shell/AppShell";
import Header from "@/components/shell/Header";
import VideoPlayer from "@/components/player/VideoPlayer";
import SidePanel from "@/components/player/SidePanel";
import InlineAlert from "@/components/ui/InlineAlert";
import KeyboardShortcutsModal from "@/components/player/KeyboardShortcutsModal";
import VideoSizeComparisonModal from "@/components/player/VideoSizeComparisonModal";
import { fetchVideo, fetchDetections, searchVideo, deleteVideo, getVideoDownloadUrl, getClipDownloadUrl, updateVideoName } from "@/lib/api";
import { VideoItem, SearchResultSegment, Detection } from "@/types";
import { useAuth } from "@/context/AuthContext";

function VideoDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();


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
  const [sizeComparisonModalOpen, setSizeComparisonModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [desktopSidePanelCollapsed, setDesktopSidePanelCollapsed] = useState(false);
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
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
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
  }, [videoId, urlQuery, user, authLoading]);


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
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = parsed.filter((c) => allClassNames.includes(c));
            if (valid.length > 0) {
              setSelectedClasses(valid);
              setClassesInitialized(true);
              return;
            }
          }
        } catch {}
      }
      setSelectedClasses(allClassNames);
      setClassesInitialized(true);
    }
  }, [allClassNames, videoId, classesInitialized]);

  const effectiveSelectedClasses =
    selectedClasses.length > 0 ? selectedClasses : allClassNames;

  const handleUpdateSelectedClasses = (classes: string[]) => {
    setSelectedClasses(classes);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`sentinel_classes_${videoId}`, JSON.stringify(classes));
      } catch {}
    }
  };

  const isAllClasses =
    allClassNames.length > 0 && effectiveSelectedClasses.length === allClassNames.length;
  const downloadAnnotatedUrl = video
    ? getVideoDownloadUrl(video.id, {
        annotated: true,
        classes: !isAllClasses ? effectiveSelectedClasses : undefined,
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
        onClick={() => setSizeComparisonModalOpen(true)}
        className="hidden md:flex h-8 px-2.5 rounded-sm bg-surface border border-border-default hover:border-amber-400 hover:bg-amber-50/50 text-txt-primary items-center gap-1.5 text-xs font-medium transition-colors shadow-xs"
        title="Compare annotated video sizes, bounding box delta shifts, and storage savings per class"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
        <span>Size & Storage Analyzer</span>
      </button>

      <button
        onClick={() => router.push(`/search?video=${video.id}`)}
        className="hidden md:flex h-8 px-2.5 rounded-sm bg-surface border border-border-default hover:border-border-strong text-txt-primary items-center gap-1.5 text-xs font-medium transition-colors shadow-xs"
        title="Search within this video"
      >
        <Search className="w-3.5 h-3.5 text-accent" />
        <span>Search Video</span>
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
          <div className="absolute right-0 top-full mt-1 w-56 bg-surface border border-border-default rounded-md shadow-float p-1 text-xs space-y-0.5 z-40">
            <button
              onClick={() => {
                setHeaderMenuOpen(false);
                setSizeComparisonModalOpen(true);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-sm text-txt-primary hover:bg-surface-raised flex items-center gap-2"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span>Size & Storage Analyzer</span>
            </button>

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
        {authLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-xs text-txt-secondary font-mono">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
            <span>Verifying authenticated session...</span>
          </div>
        ) : !user ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-5 animate-in fade-in duration-150">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-lg">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight text-txt-primary">
                  Private Video Surveillance
                </h2>
                <p className="text-xs text-txt-secondary leading-relaxed max-w-sm mx-auto">
                  Surveillance footage, object detections, and search vectors are strictly private to the account that uploaded them. Sign in to view this video.
                </p>
              </div>
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="h-10 px-5 rounded-sm bg-[#09090B] text-white hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>
              <div className="pt-2 text-[11px] text-txt-tertiary flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero-leak multi-tenant surveillance privacy active</span>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center p-8 text-xs text-txt-secondary">
            Loading video data...
          </div>
        ) : error || !video ? (
          <div className="flex-1 p-6 max-w-md mx-auto my-auto">
            <InlineAlert tone="danger" title="Video not available">
              {error || "This video does not exist, was deleted, or belongs to another private account."}
            </InlineAlert>
          </div>
        ) : (

          <>
            {/* Player Main Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              <VideoPlayer
                video={video}
                initialTime={urlTimestamp}
                matches={matches}
                detections={detections}
                selectedClasses={effectiveSelectedClasses}
                downloadAnnotatedUrl={downloadAnnotatedUrl}
                selectedSegmentId={selectedSegmentId}
                selectedDetectionId={selectedDetectionId}
                onTimeUpdate={(t) => setCurrentTime(t)}
                onSelectMatch={(m) => setSelectedSegmentId(m ? m.segment_id : null)}
                onSelectDetection={(d) => setSelectedDetectionId(d ? d.id : null)}
                downloadClipUrl={downloadClipUrl}
              />
            </div>

            {/* Mobile Minimized Floating Pill Trigger (Only on phone/tablet < lg) */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden fixed bottom-28 right-3.5 z-30 flex items-center gap-2 px-3 py-2 rounded-full bg-surface border border-border-strong text-txt-primary shadow-float hover:bg-surface-raised active:scale-95 transition-all text-xs font-semibold cursor-pointer"
              title="Open Detections, Info & Export panel"
              aria-label="Open Detections, Info and Export panel"
            >
              <Layers className="w-4 h-4 text-accent" />
              <span>Detections ({detections.length}) & Info</span>
              <ChevronUp className="w-3.5 h-3.5 text-txt-secondary" />
            </button>

            {/* Mobile Drawer (Bottom Sheet Overlay) */}
            {mobileDrawerOpen && (
              <div 
                className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
                onClick={() => setMobileDrawerOpen(false)}
              >
                <div 
                  className="w-full bg-surface border-t border-border-default rounded-t-xl shadow-2xl flex flex-col h-[82vh] max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-full flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-chrome shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-1 rounded-full bg-border-strong block" />
                      <span className="text-xs font-semibold text-txt-primary flex items-center gap-1.5 ml-1">
                        <Layers className="w-3.5 h-3.5 text-accent" />
                        Detections, Info & Export
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised transition-colors cursor-pointer"
                      aria-label="Close sidebar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden">
                    <SidePanel
                      video={video}
                      matches={matches}
                      detections={detections}
                      currentTime={currentTime}
                      selectedClasses={effectiveSelectedClasses}
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
                      onOpenSizeComparison={() => {
                        setMobileDrawerOpen(false);
                        setSizeComparisonModalOpen(true);
                      }}
                      isMobileDrawer={true}
                      onCloseMobile={() => setMobileDrawerOpen(false)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Side Panel (Collapsible) */}
            {desktopSidePanelCollapsed ? (
              <div className="hidden lg:flex flex-col items-center justify-start border-l border-border-default bg-surface py-3 px-1.5 w-10 shrink-0">
                <button
                  type="button"
                  onClick={() => setDesktopSidePanelCollapsed(false)}
                  className="p-1.5 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised transition-colors cursor-pointer"
                  title="Expand side panel"
                  aria-label="Expand side panel"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopSidePanelCollapsed(false)}
                  className="mt-6 cursor-pointer [writing-mode:vertical-rl] rotate-180 text-[11px] font-medium text-txt-secondary hover:text-txt-primary tracking-wider uppercase flex items-center gap-1.5 py-2 select-none"
                  title="Expand side panel"
                >
                  <Layers className="w-3.5 h-3.5 text-accent mb-1" />
                  Detections & Info
                </button>
              </div>
            ) : (
              <div className="hidden lg:flex h-full shrink-0">
                <SidePanel
                  video={video}
                  matches={matches}
                  detections={detections}
                  currentTime={currentTime}
                  selectedClasses={effectiveSelectedClasses}
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
                  onOpenSizeComparison={() => setSizeComparisonModalOpen(true)}
                  onToggleCollapse={() => setDesktopSidePanelCollapsed(true)}
                />
              </div>
            )}
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

      {video && (
        <VideoSizeComparisonModal
          isOpen={sizeComparisonModalOpen}
          onClose={() => setSizeComparisonModalOpen(false)}
          video={video}
          detections={detections}
          selectedClasses={effectiveSelectedClasses}
          onSelectClasses={handleUpdateSelectedClasses}
        />
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
