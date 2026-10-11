"use client";

import React from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

interface AppShellProps {
  children: React.ReactNode;
  hasProcessingVideos?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ children, hasProcessingVideos = false }) => {
  return (
    <div className="flex h-screen w-screen bg-app text-txt-primary overflow-hidden font-sans select-none">
      {/* Fixed Sidebar */}
      <Sidebar hasProcessingVideos={hasProcessingVideos} />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <main id="main" className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-14 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (< 768px) */}
      <BottomNav />
    </div>
  );
};

export default AppShell;
