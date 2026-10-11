"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Square,
  Diamond,
  Check,
  Minus,
  ArrowRight,
  Search,
  Play,
  Pause,
  Clock,
  ChevronRight,
  Cctv,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import AuthButton from "@/components/auth/AuthButton";

export default function HomePage() {
  const [isPlayingDemo, setIsPlayingDemo] = useState(true);

  return (
    <div className="min-h-screen bg-app text-txt-primary flex flex-col font-sans selection:bg-amber-500/20">
      {/* 1. Clean Top Bar (64px, Sticky) */}
      <header className="sticky top-0 z-50 h-16 bg-surface/90 backdrop-blur-md border-b border-border-default px-6 lg:px-10 flex items-center justify-between">
        <Logo size="md" showBadge={false} />

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-txt-secondary">
            <a href="#demo" className="hover:text-txt-primary transition-colors">
              How It Works
            </a>
            <a href="#evidence" className="hover:text-txt-primary transition-colors">
              Evidence
            </a>
            <a href="#scope" className="hover:text-txt-primary transition-colors">
              Specifications
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <AuthButton />
            <Link
              href="/library"
              className="h-8.5 px-4 rounded-sm bg-[#09090B] text-white font-medium text-xs flex items-center gap-1.5 hover:bg-stone-800 active:bg-stone-900 border border-stone-800 transition-all shadow-xs"
            >
              <span>Open Sentinel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section (Clean, Normal, Elegant) */}
      <section className="relative pt-16 pb-20 px-6 lg:px-10 border-b border-border-default overflow-hidden bg-gradient-to-b from-white via-white to-stone-50/50">
        <div className="relative max-w-4xl mx-auto flex flex-col items-center text-center space-y-6">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-[-0.03em] text-[#09090B]">
            Search your video footage like you&apos;d ask a person.
          </h1>

          {/* Natural, Non-Techy Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Upload recorded video files. Describe what you are looking for in plain language — like a person, vehicle, or action — and Sentinel jumps straight to the exact moment.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
            <Link
              href="/library"
              className="w-full sm:w-auto h-11 px-6 rounded-sm bg-[#09090B] text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-stone-800 active:bg-stone-900 border border-stone-800 transition-all shadow-xs"
            >
              <span>Explore Your Footage</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto h-11 px-5 rounded-sm bg-surface border border-border-default hover:border-border-strong text-txt-primary font-medium text-sm flex items-center justify-center gap-2 transition-colors hover:bg-well"
            >
              <span>See an Example</span>
            </a>
          </div>

          {/* Key Benefits */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-left border-t border-border-subtle/80 max-w-3xl w-full">
            <div className="space-y-0.5">
              <span className="font-mono text-base font-bold text-[#D97706]">Fast Seek</span>
              <span className="block text-[11px] text-slate-500">Jump to any second</span>
            </div>
            <div className="space-y-0.5">
              <span className="font-mono text-base font-bold text-[#09090B]">Plain Words</span>
              <span className="block text-[11px] text-slate-500">No complex queries</span>
            </div>
            <div className="space-y-0.5">
              <span className="font-mono text-base font-bold text-[#16A34A]">Visual Boxes</span>
              <span className="block text-[11px] text-slate-500">Highlighted on frames</span>
            </div>
            <div className="space-y-0.5">
              <span className="font-mono text-base font-bold text-[#78350F]">Direct Proof</span>
              <span className="block text-[11px] text-slate-500">Verify with your eyes</span>
            </div>
          </div>
        </div>

        {/* 3. Real-World Interactive Hero Demo Box */}
        <div id="demo" className="w-full max-w-5xl mx-auto mt-14 rounded-md border border-stone-200 bg-surface overflow-hidden shadow-float text-left">
          {/* Header Bar */}
          <div className="h-9 px-4 bg-stone-100/90 border-b border-stone-200 flex items-center justify-between text-xs text-stone-600 select-none">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                <span className="font-mono text-[11px] text-stone-700">Entrance-Gate-Camera-04.mp4</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-stone-500">
              <span>Duration 01:12:48</span>
              <span>1080p</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
            {/* Left 60%: Player Stage with REAL-WORLD Footage */}
            <div className="lg:col-span-7 bg-[#09090B] flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-800 relative p-4">
              {/* Real World Footage Frame Canvas */}
              <div className="relative aspect-video w-full rounded-xs overflow-hidden flex items-center justify-center border border-zinc-800 bg-black">
                {/* Real Surveillance Photo */}
                <img
                  src="/images/hero-cctv.jpg"
                  alt="Real-world security camera footage of a white van"
                  className="w-full h-full object-cover"
                />

                {/* Real Precision Bounding Box Over the White Van */}
                <div
                  className="absolute border-[2.5px] border-[#F59E0B] bg-[#F59E0B]/20 rounded-[2px] shadow-[0_0_14px_rgba(245,158,11,0.5)] transition-all"
                  style={{
                    top: "36%",
                    left: "53%",
                    width: "20%",
                    height: "31%",
                  }}
                >
                  {/* Label Tag */}
                  <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-[#F59E0B] text-black text-[10px] font-mono font-bold rounded-t-[2px] flex items-center gap-1 shadow-xs">
                    <span>vehicle</span>
                    <span className="opacity-80">0.91</span>
                  </div>
                </div>

                {/* Match Chip Top Right */}
                <div className="absolute top-2.5 right-2.5 px-2 py-1 bg-black/85 backdrop-blur-xs border border-[#F59E0B]/50 text-white font-mono text-[11px] rounded-xs flex items-center gap-1.5 shadow-sm">
                  <Diamond className="w-3 h-3 fill-current text-[#F59E0B]" />
                  <span>Match · similarity 0.31</span>
                </div>

                {/* Live Timecode Bottom Left */}
                <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 bg-black/85 text-amber-400 font-mono text-[10px] rounded-xs border border-zinc-800">
                  00:12:48.240 / 01:12:48.000
                </div>
              </div>

              {/* Timeline Under Stage */}
              <div className="mt-3 bg-[#18181B] p-2.5 rounded-xs border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>00:00:00</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-white">
                      <Diamond className="w-2.5 h-2.5 fill-current text-[#F59E0B]" /> Frame match
                    </span>
                    <span className="flex items-center gap-1 text-zinc-300">
                      <Square className="w-2.5 h-2.5 text-[#F59E0B]" /> Detection box
                    </span>
                  </div>
                  <span>01:12:48</span>
                </div>

                {/* Track with markers */}
                <div className="relative h-4 bg-zinc-900 rounded-xs border border-zinc-800 flex items-center cursor-pointer">
                  <div className="absolute left-[34%] right-[58%] top-0 bottom-0 bg-[#F59E0B]/25" />
                  <div className="absolute left-[38%] w-2.5 h-2.5 rotate-45 bg-[#F59E0B] border border-white -translate-x-1/2 shadow-xs" />
                  <div className="absolute left-[20%] w-[2px] h-3 bg-[#F59E0B]/70 -translate-x-1/2" />
                  <div className="absolute left-[38%] w-[2px] h-3 bg-[#F59E0B] -translate-x-1/2" />
                  <div className="absolute left-[54%] w-[2px] h-3 bg-[#F59E0B]/70 -translate-x-1/2" />
                  <div className="absolute left-[38%] top-0 bottom-0 w-[1.5px] bg-white -translate-x-1/2 shadow-xs" />
                </div>
              </div>

              {/* Caption & Play State */}
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 px-1">
                <span>Sample run: &ldquo;white van near the entrance&rdquo;</span>
                <button
                  onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                  className="p-1 hover:text-white transition-colors text-zinc-400"
                  aria-label="Pause demo"
                >
                  {isPlayingDemo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
              </div>
            </div>

            {/* Right 40%: Search Results */}
            <div className="lg:col-span-5 bg-surface p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                {/* Search Bar Input */}
                <div className="h-10 px-3 bg-stone-50 border border-stone-200 rounded-sm flex items-center gap-2 shadow-xs">
                  <Search className="w-4 h-4 text-[#B45309]" />
                  <span className="text-xs text-stone-900 font-medium truncate">
                    white van near the entrance
                  </span>
                  <kbd className="ml-auto px-1.5 py-0.5 text-[10px] bg-surface border border-stone-300 rounded-xs font-mono text-stone-600">
                    ⏎
                  </kbd>
                </div>

                <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                  <span className="text-stone-800">Results (2)</span>
                  <span className="text-[10px] font-mono text-[#B45309]">Ranked by relevance</span>
                </div>

                {/* Result Row 1 (Selected) */}
                <div className="p-3 rounded-sm border border-amber-300 bg-amber-50/70 space-y-1.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">Entrance-Gate-Camera-04</span>
                    <span className="font-mono text-xs text-amber-900 font-bold px-1.5 py-0.5 rounded-xs bg-white border border-amber-200 shadow-2xs">
                      0.31 sim
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-stone-600 font-mono">
                    <Clock className="w-3 h-3 text-[#B45309]" />
                    <span className="text-stone-900 font-semibold">00:12:41 – 00:12:48</span>
                    <span>·</span>
                    <span className="text-[#B45309] flex items-center gap-1 font-sans font-medium">
                      <Square className="w-2.5 h-2.5 text-[#D97706]" /> Vehicle detected
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-800 flex items-center gap-1.5 pt-0.5">
                    <Diamond className="w-2.5 h-2.5 fill-current text-[#D97706]" />
                    <span>Exact moment the van passes the gate</span>
                  </div>
                </div>

                {/* Result Row 2 */}
                <div className="p-3 rounded-sm border border-stone-200 bg-surface hover:bg-stone-50 transition-colors space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-800">Parking-Gate-01</span>
                    <span className="font-mono text-xs text-stone-600 px-1.5 py-0.5 rounded-xs bg-stone-100 border border-stone-200">
                      0.24 sim
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>00:04:15 – 00:04:22</span>
                    <span>·</span>
                    <span className="text-stone-600 flex items-center gap-1 font-sans">
                      <Square className="w-2.5 h-2.5 text-stone-400" /> Vehicle
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer readout */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
                <span>Clicking any result jumps to that second</span>
                <Link
                  href="/library"
                  className="text-xs font-semibold text-[#B45309] hover:text-amber-800 flex items-center gap-1 transition-colors"
                >
                  <span>Open workspace</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Two Kinds of Evidence with REAL WORLD PICTURES */}
      <section id="evidence" className="py-20 px-6 lg:px-10 max-w-5xl mx-auto w-full space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-2.5">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#09090B]">
            Two kinds of evidence, clearly separated.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Every result shows you whether it came from a detected object (like a car or person) or visual similarity across the whole scene.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Detections with REAL PHOTO */}
          <div className="p-6 rounded-md border border-stone-200 bg-surface space-y-4 hover:border-amber-400 transition-all shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-amber-50 border border-amber-200 flex items-center justify-center text-[#D97706]">
                <Square className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">Object Detections</h3>
                <span className="text-[11px] text-slate-500">Boxes drawn around vehicles and people</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              When an object is recognized, Sentinel draws a box around it. You can see the class name and detector confidence right on the frame.
            </p>

            {/* REAL-WORLD Photo with Bounding Boxes */}
            <div className="relative rounded-sm overflow-hidden border border-stone-200 aspect-video bg-black">
              <img
                src="/images/detection-card.jpg"
                alt="Real-world driveway with car and pedestrian detection"
                className="w-full h-full object-cover"
              />
              {/* Box around Car */}
              <div
                className="absolute border-[2px] border-[#F59E0B] bg-[#F59E0B]/15 rounded-xs"
                style={{ top: "34%", left: "26%", width: "24%", height: "30%" }}
              >
                <span className="absolute -top-4 left-0 bg-[#F59E0B] text-black text-[9px] font-mono font-bold px-1 rounded-t-xs">
                  vehicle 0.94
                </span>
              </div>
              {/* Box around Person */}
              <div
                className="absolute border-[2px] border-[#F59E0B] bg-[#F59E0B]/15 rounded-xs"
                style={{ top: "42%", left: "58%", width: "7%", height: "23%" }}
              >
                <span className="absolute -top-4 left-0 bg-[#F59E0B] text-black text-[9px] font-mono font-bold px-1 rounded-t-xs">
                  person 0.92
                </span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#B45309] font-semibold">vehicle 0.94 · person 0.92</span>
              <span className="text-slate-500">Live bounding boxes</span>
            </div>
          </div>

          {/* Card 2: Frame Matches with 3 REAL PHOTOS */}
          <div className="p-6 rounded-md border border-stone-200 bg-surface space-y-4 hover:border-stone-400 transition-all shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-900">
                <Diamond className="w-4 h-4 fill-current text-stone-900" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">Frame Matches</h3>
                <span className="text-[11px] text-slate-500">Ranked by similarity to your description</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your words are matched against video frames across the entire file. The most relevant moments are ranked from highest to lowest similarity.
            </p>

            {/* 3 REAL-WORLD PHOTO SAMPLES */}
            <div className="grid grid-cols-3 gap-2 aspect-video">
              {[
                { src: "/images/frame-match-1.jpg", score: "0.31", label: "Top match", border: "border-amber-400 ring-1 ring-amber-300" },
                { src: "/images/frame-match-2.jpg", score: "0.28", label: "Adjacent", border: "border-stone-200" },
                { src: "/images/frame-match-3.jpg", score: "0.24", label: "Trailing", border: "border-stone-200" },
              ].map((item, idx) => (
                <div key={idx} className={`relative rounded-xs overflow-hidden border ${item.border} bg-black flex flex-col justify-end`}>
                  <img src={item.src} alt={item.label} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="relative z-10 p-1.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-center space-y-0.5">
                    <span className="font-mono text-xs font-bold text-white block">{item.score}</span>
                    <span className="text-[9px] text-stone-300 block">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] font-mono">
              <span className="text-stone-900 font-semibold">Similarity scores</span>
              <span className="text-slate-500">Orders results chronologically</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works (Simple 3 Steps) */}
      <section className="py-20 px-6 lg:px-10 border-t border-border-default bg-stone-50/50">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#09090B]">
              From file to footage in three simple steps.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Upload your video once. Query it whenever you need answers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-md border border-stone-200 bg-surface space-y-3 shadow-xs">
              <span className="font-mono text-xs text-[#B45309] font-bold">01</span>
              <h3 className="text-sm font-bold text-stone-900">Upload Video</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Drop in MP4, MOV, or AVI files. Your videos are safely saved to your personal account.
              </p>
            </div>

            <div className="p-6 rounded-md border border-stone-200 bg-surface space-y-3 shadow-xs">
              <span className="font-mono text-xs text-stone-900 font-bold">02</span>
              <h3 className="text-sm font-bold text-stone-900">Automatic Indexing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sentinel samples frames and indexes people, vehicles, and objects in the background.
              </p>
            </div>

            <div className="p-6 rounded-md border border-stone-200 bg-surface space-y-3 shadow-xs">
              <span className="font-mono text-xs text-[#16A34A] font-bold">03</span>
              <h3 className="text-sm font-bold text-stone-900">Search &amp; Verify</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Describe the moment in plain words. Jump directly to that second and see the evidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Technical Specifications & Boundaries */}
      <section id="scope" className="py-20 px-6 lg:px-10 max-w-4xl mx-auto w-full space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#09090B]">
            System Specifications &amp; Capabilities
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Engine details, supported models, and platform boundaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 lg:p-8 rounded-md border border-stone-200 bg-surface shadow-xs">
          {/* Supported */}
          <div className="space-y-4">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#16A34A] flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#16A34A]" />
              Supported Capabilities
            </span>
            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
                <span>Natural language search with frame-accurate video seeking</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
                <span>Object detections for people, vehicles, and bags with confidence scores</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
                <span>User-specific video libraries with Google Firebase authentication</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
                <span>Cloud storage acceleration via Cloudinary CDN &amp; Postgres vector database</span>
              </li>
            </ul>
          </div>

          {/* Exclusions */}
          <div className="space-y-4 border-t md:border-t-0 md:border-l border-stone-200 pt-6 md:pt-0 md:pl-8">
            <span className="text-[11px] uppercase tracking-wider font-bold text-stone-500 flex items-center gap-1.5">
              <Minus className="w-3.5 h-3.5 text-stone-400" />
              Not Included
            </span>
            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <Minus className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                <span>No facial recognition or identity tracking</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Minus className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                <span>No live RTSP camera streaming (pre-recorded video only)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Minus className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                <span>Scores represent search order, not probabilistic fact</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 7. Bottom CTA */}
      <section className="border-t border-border-default bg-stone-50/60 py-20 px-6 text-center">
        <div className="max-w-xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold tracking-tight text-[#09090B]">
            Ready to search your footage?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Open the Sentinel console to upload files and inspect detections across your library.
          </p>
          <div className="pt-2">
            <Link
              href="/library"
              className="inline-flex h-11 px-8 rounded-sm bg-[#09090B] text-white font-medium text-sm items-center justify-center gap-2 hover:bg-stone-800 active:bg-stone-900 border border-stone-800 transition-all shadow-xs"
            >
              <span>Open Sentinel Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Clean Footer */}
      <footer className="h-16 bg-surface border-t border-border-default px-6 lg:px-10 flex items-center justify-between text-xs text-txt-secondary">
        <div className="flex items-center gap-3">
          <Logo size="sm" showBadge={false} />
          <span className="text-stone-400">· Video Search &amp; Intelligence</span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/library" className="hover:text-stone-900 transition-colors">
            Library
          </Link>
          <Link href="/search" className="hover:text-stone-900 transition-colors">
            Search
          </Link>
        </div>
      </footer>
    </div>
  );
}
