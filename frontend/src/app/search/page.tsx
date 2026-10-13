"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  History,
  X,
  Search,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Tag,
  Film,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import AppShell from "@/components/shell/AppShell";
import Header from "@/components/shell/Header";
import QueryField from "@/components/search/QueryField";
import ResultRow from "@/components/search/ResultRow";
import ClassFilterModal from "@/components/search/ClassFilterModal";
import VideoScopeSelector from "@/components/search/VideoScopeSelector";
import InlineAlert from "@/components/ui/InlineAlert";
import { searchVideo, fetchVideos, fetchSupportedClasses } from "@/lib/api";
import { SearchResultSegment, VideoItem } from "@/types";
import { useAuth } from "@/context/AuthContext";


const EXAMPLE_QUERIES = [
  "person carrying a backpack",
  "white vehicle near the entrance",
  "car moving fast",
  "bicycle or motorcycle",
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const urlQuery = searchParams.get("q") || "";
  const urlVideoId = searchParams.get("video") || "";

  const [query, setQuery] = useState(urlQuery);
  const [selectedVideoId, setSelectedVideoId] = useState<string>(urlVideoId);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [supportedClasses, setSupportedClasses] = useState<string[]>([]);

  const [results, setResults] = useState<SearchResultSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recent queries stored locally
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sentinel.recent_queries");
      if (stored) setRecentQueries(JSON.parse(stored));
    } catch {
      // Ignore
    }
  }, []);

  const saveRecentQuery = (q: string) => {
    try {
      const updated = [q, ...recentQueries.filter((item) => item !== q)].slice(0, 5);
      setRecentQueries(updated);
      localStorage.setItem("sentinel.recent_queries", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const removeRecentQuery = (q: string) => {
    try {
      const updated = recentQueries.filter((item) => item !== q);
      setRecentQueries(updated);
      localStorage.setItem("sentinel.recent_queries", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    async function loadMetadata() {
      if (!user) {
        setVideos([]);
        return;
      }
      try {
        const vData = await fetchVideos();
        setVideos(vData.videos || []);

        const classes = await fetchSupportedClasses();
        if (classes && classes.length > 0) setSupportedClasses(classes);
      } catch {
        // Fallback
      }
    }
    loadMetadata();
  }, [user]);

  const executeSearch = useCallback(
    async (searchQuery: string, videoId?: string, classesFilter?: string[]) => {
      if (!searchQuery.trim() || !user) return;
      setLoading(true);
      setError(null);
      saveRecentQuery(searchQuery);

      try {
        const targetVideoId = videoId !== undefined ? videoId : selectedVideoId;
        const targetClasses = classesFilter !== undefined ? classesFilter : selectedClasses;

        const res = await searchVideo({
          videoId: targetVideoId || undefined,
          query: searchQuery,
          filterClasses: targetClasses.length > 0 ? targetClasses : undefined,
        });

        setResults(res.segments || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Search failed";
        setError(msg);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedVideoId, selectedClasses, user]
  );

  // Sync URL on initial mount or back/forward navigation
  useEffect(() => {
    if (urlQuery && user) {
      setQuery(urlQuery);
      executeSearch(urlQuery, urlVideoId);
    }
  }, [urlQuery, urlVideoId, executeSearch, user]);


  const handleSubmit = (q: string) => {
    const params = new URLSearchParams();
    params.set("q", q);
    if (selectedVideoId) params.set("video", selectedVideoId);
    router.push(`/search?${params.toString()}`);
  };

  const handleSelectVideo = (videoId: string) => {
    setSelectedVideoId(videoId);
    if (query.trim()) {
      executeSearch(query, videoId, selectedClasses);
    }
  };

  const handleClassFilterChange = (classes: string[]) => {
    setSelectedClasses(classes);
    if (query.trim()) {
      executeSearch(query, selectedVideoId, classes);
    }
  };

  const handleRemoveSingleClass = (clsName: string) => {
    const next = selectedClasses.filter((c) => c !== clsName);
    handleClassFilterChange(next);
  };

  const videoMap = new Map<string, string>();
  videos.forEach((v) => videoMap.set(v.id, v.original_filename));

  const selectedVideoItem = videos.find((v) => v.id === selectedVideoId);

  if (authLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto py-24 flex flex-col items-center justify-center gap-3 text-xs text-txt-secondary font-mono">
        <Loader2 className="w-5 h-5 animate-spin text-accent" />
        <span>Verifying authenticated session...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-md mx-auto py-16 sm:py-24 text-center space-y-5 animate-in fade-in duration-150">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-lg">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-txt-primary">
            Private Video Intelligence Search
          </h2>
          <p className="text-xs text-txt-secondary leading-relaxed max-w-sm mx-auto">
            Semantic search and surveillance object queries are restricted to your authenticated account. Sign in with Google to search your private videos.
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
    );
  }

  return (

    <div className="p-3.5 sm:p-5 md:p-6 max-w-[980px] w-full mx-auto space-y-4 sm:space-y-5 select-none">
      {/* 1. Surveillance Natural Language Query Input */}
      <QueryField
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        loading={loading}
      />

      {/* 2. Target Footage Scope (Videos to Search From) */}
      {videos.length > 0 && (
        <VideoScopeSelector
          videos={videos}
          selectedVideoId={selectedVideoId}
          onSelectVideo={handleSelectVideo}
        />
      )}

      {/* 3. Filter Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-border-subtle">
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Filter Trigger Button with Modal */}
          {supportedClasses.length > 0 && (
            <ClassFilterModal
              classes={supportedClasses}
              selectedClasses={selectedClasses}
              onChange={handleClassFilterChange}
            />
          )}

          {/* Scope Indicator Pill */}
          <div className="h-8 px-2.5 rounded-sm bg-surface-raised border border-border-default flex items-center gap-1.5 text-xs text-txt-secondary">
            <span className="text-txt-tertiary">Scope:</span>
            <span className="font-medium text-txt-primary truncate max-w-[150px] sm:max-w-[220px]">
              {selectedVideoItem ? selectedVideoItem.original_filename : "All Ready Videos"}
            </span>
          </div>
        </div>

        {/* Clear All Filters Button */}
        {(selectedClasses.length > 0 || selectedVideoId) && (
          <button
            type="button"
            onClick={() => {
              setSelectedClasses([]);
              setSelectedVideoId("");
              if (query.trim()) executeSearch(query, "", []);
            }}
            className="text-xs text-txt-tertiary hover:text-txt-primary hover:underline transition-colors cursor-pointer"
          >
            Reset scope & filters
          </button>
        )}
      </div>

      {/* 4. Active Filter Chips Row (Visible only when classes are selected) */}
      {selectedClasses.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md bg-amber-500/5 border border-amber-500/20 text-xs animate-in fade-in duration-100">
          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-amber-600" />
            Active Class Filters:
          </span>
          {selectedClasses.map((cls) => (
            <span
              key={cls}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white dark:bg-stone-900 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] font-medium shadow-2xs"
            >
              <span className="capitalize">{cls}</span>
              <button
                type="button"
                onClick={() => handleRemoveSingleClass(cls)}
                className="hover:text-red-500 transition-colors cursor-pointer"
                title={`Remove ${cls} filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => handleClassFilterChange([])}
            className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-semibold ml-auto cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* 5. Idle Exploration State (No active search query) */}
      {!query && results.length === 0 && !loading && (
        <div className="pt-4 space-y-6">
          {/* Quick Surveillance Example Queries */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-txt-tertiary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Suggested Searches
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLE_QUERIES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => handleSubmit(ex)}
                  className="flex items-center justify-between p-3 rounded-md bg-surface border border-border-default hover:border-border-strong hover:bg-surface-raised text-xs text-txt-secondary hover:text-txt-primary transition-all text-left group cursor-pointer shadow-2xs"
                >
                  <span className="font-medium group-hover:text-txt-primary">{ex}</span>
                  <ArrowUpRight className="w-4 h-4 text-txt-tertiary group-hover:text-accent transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent Queries List */}
          {recentQueries.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border-subtle">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-txt-tertiary flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Recent History
              </span>
              <div className="space-y-1">
                {recentQueries.map((rq) => (
                  <div
                    key={rq}
                    className="group flex items-center justify-between px-3 py-2 rounded-sm bg-surface border border-border-subtle hover:border-border-default text-xs text-txt-secondary hover:bg-surface-raised hover:text-txt-primary transition-colors"
                  >
                    <button
                      onClick={() => handleSubmit(rq)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5 text-txt-tertiary shrink-0" />
                      <span className="truncate">{rq}</span>
                    </button>
                    <button
                      onClick={() => removeRecentQuery(rq)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-txt-tertiary hover:text-danger cursor-pointer transition-opacity"
                      title="Remove from history"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Loading Skeletons */}
      {loading && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2 text-xs text-txt-secondary font-mono">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            <span>Scanning footage vectors & ranking detection matches...</span>
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-md bg-surface-raised animate-pulse border border-border-subtle"
            />
          ))}
        </div>
      )}

      {/* 7. Error State */}
      {error && (
        <InlineAlert tone="danger" title="Search failed">
          {error}
        </InlineAlert>
      )}

      {/* 8. Search Results List */}
      {!loading && results.length > 0 && (
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between border-b border-border-default pb-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-txt-primary">
                {results.length} {results.length === 1 ? "match" : "matches"}
              </span>
              <span className="text-txt-tertiary">
                · Ranked by class detection frequency & semantic score
              </span>
            </div>

            {selectedVideoItem && (
              <span className="hidden sm:inline-block text-[11px] text-txt-secondary bg-surface-raised px-2 py-0.5 rounded-xs border border-border-subtle">
                Within {selectedVideoItem.original_filename}
              </span>
            )}
          </div>

          {/* Results List */}
          <div className="divide-y divide-border-subtle rounded-md border border-border-default bg-surface overflow-hidden shadow-xs">
            {results.map((segment, idx) => (
              <ResultRow
                key={segment.segment_id}
                segment={segment}
                rank={idx + 1}
                videoName={segment.video_name || videoMap.get(segment.video_id) || "Video Footage"}
                query={query}
              />
            ))}
          </div>
        </div>
      )}

      {/* 9. Empty Results State */}
      {!loading && query && results.length === 0 && !error && (
        <div className="py-12 text-center space-y-2 border border-dashed border-border-default rounded-md bg-surface p-6">
          <div className="font-semibold text-txt-primary text-sm">
            No matches found for “{query}”
          </div>
          <div className="text-xs text-txt-secondary max-w-md mx-auto">
            Try adjusting your search terms, switching the target video scope to &ldquo;All Videos&rdquo;, or loosening your class filters.
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <AppShell>
      <Header title="Search" />
      <Suspense fallback={<div className="p-6 text-xs text-txt-tertiary">Loading search...</div>}>
        <SearchContent />
      </Suspense>
    </AppShell>
  );
}
