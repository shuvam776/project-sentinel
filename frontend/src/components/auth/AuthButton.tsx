"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogOut, ShieldCheck, Loader2, ChevronDown, Video, User as UserIcon } from "lucide-react";
import Link from "next/link";

export const AuthButton: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setSigningIn(true);
      await signInWithGoogle();
    } catch (err) {
      console.error("Login failed", err);
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className={`h-9 w-32 bg-stone-100 rounded-sm animate-pulse ${className}`} />
    );
  }

  if (!user) {
    return (
      <button
        onClick={handleGoogleLogin}
        disabled={signingIn}
        className={`h-9 px-3.5 rounded-sm bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 font-medium text-xs flex items-center gap-2.5 transition-all shadow-2xs hover:border-stone-400 active:bg-stone-100 shrink-0 select-none ${className}`}
        aria-label="Sign in with Google"
      >
        {signingIn ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#B45309]" />
        ) : (
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
        )}
        <span className="font-semibold tracking-tight">Sign in with Google</span>
      </button>
    );
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "User";
  const userPhoto = user.photoURL;

  return (
    <div className={`relative shrink-0 ${className}`} ref={dropdownRef}>
      {/* Spacious, unclipped profile pill button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="group h-9 pl-1.5 pr-2.5 rounded-sm bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-900 border border-stone-200 hover:border-stone-300 font-medium text-xs flex items-center gap-2.5 transition-all shadow-2xs select-none"
        aria-label="User account menu"
        aria-expanded={dropdownOpen}
      >
        {userPhoto ? (
          <img
            src={userPhoto}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="w-6.5 h-6.5 rounded-full object-cover border border-amber-500/40 shrink-0"
          />
        ) : (
          <div className="w-6.5 h-6.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60 flex items-center justify-center font-bold text-xs shrink-0">
            {displayName[0]?.toUpperCase() || <UserIcon className="w-3.5 h-3.5" />}
          </div>
        )}

        <div className="flex flex-col text-left leading-tight pr-0.5">
          <span className="font-semibold text-stone-900 max-w-[130px] sm:max-w-[180px] truncate">
            {displayName}
          </span>
          <span className="text-[10px] text-stone-500 font-normal">
            Account
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-transform duration-150 shrink-0 ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Flyout menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-1.5 w-68 rounded-md bg-white border border-stone-200 shadow-float py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-stone-100">
          {/* Header user summary */}
          <div className="px-3.5 py-2.5 space-y-1.5">
            <div className="flex items-center gap-2.5">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-amber-500/40 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm shrink-0">
                  {displayName[0]?.toUpperCase() || "U"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-stone-900 truncate text-[13px]">{displayName}</div>
                <div className="text-[11px] text-stone-500 truncate">{user.email}</div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#92400E] bg-amber-50/90 border border-amber-200/60 px-2 py-0.5 rounded-xs w-full mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
              <span className="truncate">Protected by Firebase Auth</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="p-1 space-y-0.5">
            <Link
              href="/library"
              onClick={() => setDropdownOpen(false)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xs text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-colors"
            >
              <Video className="w-3.5 h-3.5 text-stone-500" />
              <span>My Video Vault</span>
            </Link>
          </div>

          {/* Sign Out Action */}
          <div className="p-1">
            <button
              onClick={() => {
                setDropdownOpen(false);
                signOutUser();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 transition-colors text-left font-medium"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthButton;
