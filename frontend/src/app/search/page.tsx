"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowUpRight, History, X, ChevronDown } from "lucide-react";
import AppShell from "@/components/shell/AppShell";
import Header from "@/components/shell/Header";
import QueryField from "@/components/search/QueryField";
import ClassFilter from "@/components/data/ClassFilter";
import ResultRow from "@/components/search/ResultRow";
import InlineAlert from "@/components/ui/InlineAlert";
import { searchVideo, fetchVideos, fetchSupportedClasses } from "@/lib/api";
import { SearchResultSegment, VideoItem } from "@/types";

const EXAMPLE_QUERIES = [
  "person carrying a bag",
  "white van near the entrance",
  "red car moving fast",
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlQuery = searchParams.get("q") || "";
  const urlVideoId = searchParams.get("video") || "";

  const [query, setQuery] = useState(urlQuery);
  const [selectedVideoId, setSelectedVideoId] = useState<string>(urlVideoId);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [supportedClasses, setSupportedClasses] = useState<string[]>(["person", "vehicle", "bag"]);

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
      // Ignore localStorage errors
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
  }, []);

  const executeSearch = useCallback(
    async (searchQuery: string, videoId?: string, classesFilter?: string[]) => {
      if (!searchQuery.trim()) return;
      setLoading(true);
      setError(null);
      saveRecentQuery(searchQuery);

      try {
        const res = await searchVideo({
          videoId: videoId || selectedVideoId,
          query: searchQuery,
          filterClasses: classesFilter !== undefined ? classesFilter : selectedClasses,
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
    [selectedVideoId, selectedClasses]
  );

  // Sync URL on search
  useEffect(() => {
    if (urlQuery) {
      setQuery(urlQuery);
      executeSearch(urlQuery, urlVideoId);
    }
  }, [urlQuery, urlVideoId, executeSearch]);

  const handleSubmit = (q: string) => {
    const params = new URLSearchParams();
    params.set("q", q);
    if (selectedVideoId) params.set("video", selectedVideoId);
    router.push(`/search?${params.toString()}`);
  };

  const handleClassFilterChange = (classes: string[]) => {
    setSelectedClasses(classes);
    if (query.trim()) {
      executeSearch(query, selectedVideoId, classes);
    }
  };

  const videoMap = new Map<string, string>();
  videos.forEach((v) => videoMap.set(v.id, v.original_filename));

  const readyVideos = videos.filter((v) => v.status === "completed" || v.status === "processing");

  return (
    <div className="p-4 md:p-6 max-w-[960px] w-full mx-auto space-y-4 select-none">
      {/* Query Input Field (48px) */}
      <QueryField
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        loading={loading}
      />

      {/* Scope and Class Filters Bar (32px) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Selector */}
          <div className="relative">
            <select
              value={selectedVideoId}
              onChange={(e) => {
                setSelectedVideoId(e.target.value);
                if (query.trim()) executeSearch(query, e.target.value);
              }}
              className="h-7 px-2.5 pr-7 bg-surface-raised border border-border-default rounded-sm text-xs text-txt-primary appearance-none cursor-pointer focus:outline-none hover:border-border-strong"
            >
              <option value="">Scope: All ready videos ({readyVideos.length})</option>
              {readyVideos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.original_filename}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-txt-tertiary absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Class Filter Toggles */}
          <ClassFilter
            classes={supportedClasses}
            selectedClasses={selectedClasses}
            onChange={handleClassFilterChange}
          />
        </div>

        {selectedClasses.length > 0 && (
          <button
            onClick={() => handleClassFilterChange([])}
            className="text-xs text-txt-tertiary hover:text-txt-primary transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Idle State (No search run yet) */}
      {!query && results.length === 0 && !loading && (
        <div className="pt-6 space-y-6">
          {/* Example Queries */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-txt-tertiary">
              Try
            </span>
            <div className="space-y-1">
              {EXAMPLE_QUERIES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => handleSubmit(ex)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-sm text-xs text-txt-secondary hover:bg-surface hover:text-txt-primary transition-colors text-left"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-txt-tertiary" />
                  <span>{ex}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Queries */}
          {recentQueries.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-txt-tertiary">
                Recent
              </span>
              <div className="space-y-1">
                {recentQueries.map((rq) => (
                  <div
                    key={rq}
                    className="group flex items-center justify-between px-3 py-2 rounded-sm text-xs text-txt-secondary hover:bg-surface hover:text-txt-primary transition-colors"
                  >
                    <button
                      onClick={() => handleSubmit(rq)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    >
                      <History className="w-3.5 h-3.5 text-txt-tertiary" />
                      <span className="truncate">{rq}</span>
                    </button>
                    <button
                      onClick={() => removeRecentQuery(rq)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-txt-tertiary hover:text-txt-primary"
                      title="Remove from recent"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-3 pt-4">
          <div className="text-xs text-txt-secondary font-mono">Searching footage...</div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-sm bg-surface-raised animate-pulse-soft border border-border-subtle" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <InlineAlert tone="danger" title="Search failed">
          {error}
        </InlineAlert>
      )}

      {/* Results Header */}
      {!loading && results.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between border-b border-border-default pb-2 text-xs">
            <div>
              <span className="font-semibold text-txt-primary">{results.length} matches</span>
              <span className="text-txt-tertiary ml-2">
                Ranked by similarity to your query. Review the footage to confirm.
              </span>
            </div>
          </div>

          {/* Result List */}
          <div className="divide-y divide-border-subtle">
            {results.map((segment, idx) => (
              <ResultRow
                key={segment.segment_id}
                segment={segment}
                rank={idx + 1}
                videoName={videoMap.get(segment.video_id) || "Video"}
                query={query}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty Results State */}
      {!loading && query && results.length === 0 && !error && (
        <div className="py-12 text-center space-y-2">
          <div className="font-semibold text-txt-primary text-sm">
            No matches for “{query}”
          </div>
          <div className="text-xs text-txt-secondary max-w-md mx-auto">
            Try describing the scene differently, or check if object class filters are applied.
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
