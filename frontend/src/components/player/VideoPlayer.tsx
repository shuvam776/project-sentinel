"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Diamond, Loader2 } from "lucide-react";
import DetectionOverlay from "./DetectionOverlay";
import PlayerControls from "./PlayerControls";
import Timeline from "./Timeline";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import { VideoItem, SearchResultSegment, Detection } from "@/types";
import { formatScore, formatTimestamp } from "@/lib/format";
import { getVideoStreamUrl, getVideoDownloadUrl } from "@/lib/api";

interface VideoPlayerProps {
  video: VideoItem;
  initialTime?: number;
  matches?: SearchResultSegment[];
  detections?: Detection[];
  selectedClasses?: string[];
  downloadAnnotatedUrl?: string;
  onTimeUpdate?: (time: number) => void;
  onSelectMatch?: (segment: SearchResultSegment | null) => void;
  onSelectDetection?: (det: Detection | null) => void;
  selectedDetectionId?: string | null;
  selectedSegmentId?: string | null;
  downloadClipUrl?: string;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  initialTime = 0,
  matches = [],
  detections = [],
  selectedClasses,
  downloadAnnotatedUrl: customDownloadAnnotatedUrl,
  onTimeUpdate,
  onSelectMatch,
  onSelectDetection,
  selectedDetectionId,
  selectedSegmentId,
  downloadClipUrl,
  className = "",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(video.duration_seconds || 0);

  const [showBoxes, setShowBoxes] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [useAnnotatedStream, setUseAnnotatedStream] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Seek initial time on metadata load
  useEffect(() => {
    if (videoRef.current && initialTime > 0) {
      videoRef.current.currentTime = initialTime;
      setCurrentTime(initialTime);
    }
  }, [initialTime]);

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  }, [onTimeUpdate]);

  // Filter detections by user-selected classes
  const effectiveDetections = React.useMemo(() => {
    if (!detections || detections.length === 0) return [];
    if (!selectedClasses) return detections;
    if (selectedClasses.length === 0) return [];
    return detections.filter((d) => selectedClasses.includes(d.class_name));
  }, [detections, selectedClasses]);

  // Previous & Next navigation targets (§8C)
  const navTargets = React.useMemo(() => {
    if (matches && matches.length > 0) {
      return matches.map((m) => ({
        time: m.best_timestamp,
        segment: m,
        detection: null as Detection | null,
      })).sort((a, b) => a.time - b.time);
    } else if (effectiveDetections && effectiveDetections.length > 0) {
      return effectiveDetections.map((d) => ({
        time: d.timestamp,
        segment: null as SearchResultSegment | null,
        detection: d,
      })).sort((a, b) => a.time - b.time);
    }
    return [];
  }, [matches, effectiveDetections]);

  const handlePrevMatch = useCallback(() => {
    if (navTargets.length === 0) return;
    const prev = [...navTargets].reverse().find((t) => t.time < currentTime - 0.25);
    if (prev) {
      handleSeek(prev.time);
      if (prev.segment) onSelectMatch?.(prev.segment);
      if (prev.detection) {
        onSelectDetection?.(prev.detection);
        setShowBoxes(true);
      }
    }
  }, [navTargets, currentTime, handleSeek, onSelectMatch, onSelectDetection]);

  const handleNextMatch = useCallback(() => {
    if (navTargets.length === 0) return;
    const next = navTargets.find((t) => t.time > currentTime + 0.25);
    if (next) {
      handleSeek(next.time);
      if (next.segment) onSelectMatch?.(next.segment);
      if (next.detection) {
        onSelectDetection?.(next.detection);
        setShowBoxes(true);
      }
    }
  }, [navTargets, currentTime, handleSeek, onSelectMatch, onSelectDetection]);

  // Automatically seek to and highlight detection when selected from sidebar
  useEffect(() => {
    if (!selectedDetectionId || !detections || detections.length === 0) return;
    const targetDet = detections.find((d) => d.id === selectedDetectionId);
    if (targetDet) {
      handleSeek(targetDet.timestamp);
      setShowBoxes(true);
    }
  }, [selectedDetectionId, detections, handleSeek]);

  // Automatically seek to segment match when selected
  useEffect(() => {
    if (!selectedSegmentId || !matches || matches.length === 0) return;
    const targetMatch = matches.find((m) => m.segment_id === selectedSegmentId);
    if (targetMatch) {
      handleSeek(targetMatch.best_timestamp);
    }
  }, [selectedSegmentId, matches, handleSeek]);

  const handleToggleBoxes = useCallback(() => {
    if (selectedDetectionId) {
      onSelectDetection?.(null);
    }
    setShowBoxes((prev) => {
      const next = !prev;
      if (!next) {
        setShowLabels(false);
      }
      return next;
    });
  }, [selectedDetectionId, onSelectDetection]);

  const handleToggleLabels = useCallback(() => {
    setShowLabels((prevLabels) => {
      const nextLabels = !prevLabels;
      if (nextLabels && !showBoxes) {
        setShowBoxes(true);
      }
      return nextLabels;
    });
  }, [showBoxes]);

  const handleToggleAnnotatedMode = useCallback(() => {
    if (videoRef.current) {
      const savedTime = videoRef.current.currentTime;
      const wasPlaying = !videoRef.current.paused;
      setUseAnnotatedStream((prev) => !prev);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = savedTime;
          if (wasPlaying) videoRef.current.play().catch(() => {});
        }
      }, 60);
    } else {
      setUseAnnotatedStream((prev) => !prev);
    }
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const handleSeekRelative = useCallback(
    (deltaSeconds: number) => {
      handleSeek(Math.max(0, Math.min(duration, currentTime + deltaSeconds)));
    },
    [currentTime, duration, handleSeek]
  );

  const handleCaptureSnapshot = useCallback(() => {
    if (!videoRef.current) return;
    try {
      const v = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth || 1920;
      canvas.height = v.videoHeight || 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const a = document.createElement("a");
      a.href = dataUrl;
      const timeStr = formatTimestamp(v.currentTime).replace(":", "-");
      const baseName = video.original_filename?.replace(/\.[^/.]+$/, "") || "frame";
      a.download = `${baseName}_snapshot_${timeStr}.jpg`;
      a.click();
    } catch (e) {
      console.error("Failed to capture snapshot", e);
    }
  }, [video.original_filename]);

  const handleTogglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.error("Picture-in-picture error", e);
    }
  }, []);

  // Keyboard Shortcuts per design.md §10.4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const frameDelta = 1.0 / (video.fps || 25);

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          handleTogglePlay();
          break;
        case "b":
        case "B":
          e.preventDefault();
          handleToggleBoxes();
          break;
        case "l":
        case "L":
          e.preventDefault();
          handleToggleLabels();
          break;
        case "[":
          e.preventDefault();
          handlePrevMatch();
          break;
        case "]":
          e.preventDefault();
          handleNextMatch();
          break;
        case ",":
          // Step one frame back when paused
          e.preventDefault();
          if (videoRef.current?.paused) {
            handleSeek(Math.max(0, currentTime - frameDelta));
          }
          break;
        case ".":
          // Step one frame forward when paused
          e.preventDefault();
          if (videoRef.current?.paused) {
            handleSeek(Math.min(duration, currentTime + frameDelta));
          }
          break;
        case "f":
        case "F":
          e.preventDefault();
          if (containerRef.current) {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              containerRef.current.requestFullscreen();
            }
          }
          break;
        case "m":
        case "M":
          e.preventDefault();
          setIsMuted((prev) => !prev);
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleSeek(Math.max(0, currentTime - (e.shiftKey ? 1 : 5)));
          break;
        case "ArrowRight":
          e.preventDefault();
          handleSeek(Math.min(duration, currentTime + (e.shiftKey ? 1 : 5)));
          break;
        case "?":
          e.preventDefault();
          setShowShortcutsModal(true);
          break;
        case "Escape":
          setShowShortcutsModal(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTogglePlay, handleToggleBoxes, handleToggleLabels, handlePrevMatch, handleNextMatch, handleSeek, currentTime, duration, video.fps]);

  // Check active semantic match at current playhead position
  const activeMatch = matches.find(
    (m) => currentTime >= m.start_time && currentTime <= m.end_time
  );

  // Group detections by frame timestamp and find nearest sampled frame within window
  let currentDetections: Detection[] = [];
  if (effectiveDetections.length > 0 || selectedDetectionId) {
    const selectedDet = selectedDetectionId
      ? detections.find((d) => d.id === selectedDetectionId)
      : null;

    const timestamps = Array.from(new Set(effectiveDetections.map((d) => d.timestamp)));
    let closestTime = timestamps[0];
    let minDiff = Math.abs(closestTime - currentTime);

    for (const t of timestamps) {
      const diff = Math.abs(t - currentTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestTime = t;
      }
    }

    const maxWindow = Math.max(1.2, 1.2 / (video.sample_rate || 1.0));
    if (closestTime !== undefined && minDiff <= maxWindow) {
      currentDetections = effectiveDetections.filter((d) => d.timestamp === closestTime);
    }

    // Ensure selected detection is present in currentDetections when currentTime is nearby
    if (selectedDet && Math.abs(selectedDet.timestamp - currentTime) <= maxWindow * 2.0) {
      if (!currentDetections.some((d) => d.id === selectedDet.id)) {
        currentDetections = [selectedDet, ...currentDetections];
      }
    }
  }

  const streamUrl = video.stream_url || getVideoStreamUrl(video.id);
  const annotatedStreamUrl =
    video.annotated_stream_url ||
    getVideoStreamUrl(video.id, {
      annotated: true,
      classes: selectedClasses && selectedClasses.length > 0 ? selectedClasses : undefined,
    });
  const currentStreamSource = useAnnotatedStream ? annotatedStreamUrl : streamUrl;
  const downloadVideoUrl = video.download_url || getVideoDownloadUrl(video.id);
  const downloadAnnotatedUrl =
    customDownloadAnnotatedUrl ||
    getVideoDownloadUrl(video.id, {
      annotated: true,
      classes: selectedClasses && selectedClasses.length > 0 ? selectedClasses : undefined,
    });

  const videoWidth = video.width || videoRef.current?.videoWidth || 0;
  const videoHeight = video.height || videoRef.current?.videoHeight || 0;
  const aspectRatio = videoWidth > 0 && videoHeight > 0 ? `${videoWidth} / ${videoHeight}` : "16 / 9";

  return (
    <div
      ref={containerRef}
      className={`flex flex-col flex-1 bg-white overflow-hidden ${className}`}
    >
      {/* Light Clean Video Stage */}
      <div className="relative flex-1 bg-stone-100/90 p-2 sm:p-4 flex items-center justify-center overflow-hidden min-h-[300px]">
        <div
          className="relative max-w-full max-h-full flex items-center justify-center rounded-md overflow-hidden bg-stone-950 shadow-sm border border-stone-200"
          style={{ aspectRatio }}
        >
          <video
            ref={videoRef}
            src={streamUrl}
            loop={isLooping}
            className="w-full h-full object-contain cursor-pointer"
            onClick={handleTogglePlay}
            onTimeUpdate={() => {
              if (videoRef.current) {
                const t = videoRef.current.currentTime;
                setCurrentTime(t);
                onTimeUpdate?.(t);
              }
            }}
            onSeeked={() => {
              if (videoRef.current) {
                const t = videoRef.current.currentTime;
                setCurrentTime(t);
                onTimeUpdate?.(t);
              }
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
          />

          {/* Buffering Indicator */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          )}

          {/* Interactive Bounding Box Detection Overlay */}
          <DetectionOverlay
            detections={currentDetections}
            selectedId={selectedDetectionId}
            onSelectDetection={onSelectDetection}
            showBoxes={showBoxes}
            showLabels={showBoxes && showLabels}
          />

          {/* Stage Semantic Match Chip (§8C top-right of stage) */}
          {activeMatch && (
            <div className="absolute top-3 right-3 px-2 py-1 rounded-sm bg-white/95 border border-stone-300 text-stone-900 font-mono text-xs flex items-center gap-1.5 shadow-md z-20 backdrop-blur-xs">
              <Diamond className="w-3.5 h-3.5 text-stone-900 fill-current" />
              <span>Frame match · similarity {formatScore(activeMatch.best_score)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar (40px) */}
      <PlayerControls
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        currentTime={currentTime}
        duration={duration}
        onSeekRelative={handleSeekRelative}
        onPrevMatch={navTargets.length > 0 ? handlePrevMatch : undefined}
        onNextMatch={navTargets.length > 0 ? handleNextMatch : undefined}
        hasMatchesOrDetections={navTargets.length > 0}
        showBoxes={showBoxes}
        onToggleBoxes={handleToggleBoxes}
        showLabels={showLabels}
        onToggleLabels={handleToggleLabels}
        useAnnotatedStream={useAnnotatedStream}
        onToggleAnnotatedMode={handleToggleAnnotatedMode}
        playbackSpeed={playbackSpeed}
        onChangeSpeed={(speed) => {
          setPlaybackSpeed(speed);
          if (videoRef.current) videoRef.current.playbackRate = speed;
        }}
        isMuted={isMuted}
        onToggleMute={() => {
          setIsMuted(!isMuted);
          if (videoRef.current) videoRef.current.muted = !isMuted;
        }}
        volume={volume}
        onChangeVolume={(vol) => {
          setVolume(vol);
          if (videoRef.current) videoRef.current.volume = vol;
        }}
        isLooping={isLooping}
        onToggleLoop={() => setIsLooping((prev) => !prev)}
        onCaptureSnapshot={handleCaptureSnapshot}
        onTogglePiP={handleTogglePiP}
        onToggleFullscreen={() => {
          if (containerRef.current) containerRef.current.requestFullscreen();
        }}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        downloadVideoUrl={downloadVideoUrl}
        downloadAnnotatedUrl={downloadAnnotatedUrl}
        downloadClipUrl={downloadClipUrl}
      />

      {/* Timeline (88px) */}
      <Timeline
        duration={duration}
        currentTime={currentTime}
        onSeek={handleSeek}
        matches={matches}
        detections={effectiveDetections}
        selectedMatchId={selectedSegmentId}
        selectedDetectionId={selectedDetectionId}
        onSelectMatch={onSelectMatch}
        onSelectDetection={onSelectDetection}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
};

export default VideoPlayer;
