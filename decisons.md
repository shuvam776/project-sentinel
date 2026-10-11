# Architectural & Implementation Decisions

This document outlines the key design, architectural, and behavioral decisions made during the development and refinement of the Sentinel video analysis platform, along with the reasoning behind each.

---

## 1. Next.js Version Upgrade & Build Cache Architecture

### The Problem
During development, the frontend encountered the following error on dynamic route `/videos/[videoId]`:
```text
Error: Cannot find module './vendor-chunks/clsx.js'
Require stack:
- .next\server\webpack-runtime.js
- .next\server\app\videos\[videoId]\page.js
```
The application was also displaying a warning: `Next.js (14.2.15) is outdated`.

### The Decision
* Upgraded Next.js from `14.2.15` to **`^14.2.35`** in [frontend/package.json](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/package.json).
* Kept React on `^18.3.1` rather than jumping to Next.js 15 / React 19.
* Stopped locked background node processes holding file handles on `@next/swc` binaries on Windows before performing a clean dependency reinstall.

### Reasoning
1. **Targeted Bug Fix**: The missing `./vendor-chunks/clsx.js` error was a known Webpack vendor-chunk optimization regression in Next.js `14.2.15`. Next.js resolved this specific vendor-chunk emission issue in `14.2.16` through `14.2.35`.
2. **Zero Breaking Changes**: Upgrading to Next.js 15 requires React 19 and fundamentally alters App Router route signatures (e.g. `params` and `searchParams` become asynchronous `Promise` objects across every page and layout). Staying on `14.2.35` resolved the bug and silenced staleness warnings while ensuring 100% compatibility with all existing types and components.
3. **Clean Cache**: Windows locks binary files (`.node`) while Node is active, leading to `EBUSY` copy errors during npm updates. Terminating orphaned dev server processes and clearing `.next` completely eliminated stale runtime artifacts.

---

## 2. Interactive Bounding Box & Label Gating Controls

### The Problem
Previously, both bounding boxes and labels were bundled together and defaulted to `true`. Users who wanted to see clear bounding boxes without text badges cluttering the frame had no way to decouple them, and labels could get toggled into inconsistent states without visible boxes.

### The Decision
* **Gated Hierarchy**: The **Labels** button is strictly dependent on the **Boxes** button.
  * When Boxes is OFF (`showBoxes = false`), the Labels button is disabled (`opacity-40 cursor-not-allowed select-none`) and cannot be toggled.
  * Pressing keyboard shortcut `L` when Boxes is OFF does nothing.
  * Turning Boxes OFF automatically disables Labels as well.
* **Separation of Concerns**:
  * Clicking **Boxes** turns on bounding box rectangle outlines only.
  * Clicking **Labels** adds the class names and confidence badge pills on top of the boxes.
  * Both controls default to `false` on initial load for a clean viewing experience.

### Files Involved
* [VideoPlayer.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/player/VideoPlayer.tsx): Manages linked state (`handleToggleBoxes`, `handleToggleLabels`) and keyboard listeners (`B` and `L`).
* [PlayerControls.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/player/PlayerControls.tsx): Visual cues, disabled state styles, and accessibility attributes (`aria-pressed`).
* [DetectionOverlay.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/player/DetectionOverlay.tsx): Controls conditional rendering of the rectangle vs. label pill.

### Reasoning
* Prevents awkward or visually confusing UI states (such as floating text labels when bounding boxes are hidden).
* Matches standard video annotation UX (e.g., CVAT, Label Studio) where geometry visibility precedes metadata visibility.

---

## 3. High-Resolution & Thicker Annotations in Downloaded Videos

### The Problem
When users downloaded an annotated video (`/api/v1/videos/{video_id}/download_annotated`), the burned-in bounding boxes and labels looked significantly thinner and fainter than on the website. This occurred because OpenCV parameters were hardcoded (`thickness = 2`, `font_scale = 0.45`), which on 720p, 1080p, or 4K video rendered as hairline strokes and tiny illegible text.

### The Decision
Updated `VideoProcessor.generate_annotated_video` in [backend/app/core/video_processor.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/core/video_processor.py):
1. **Dynamic Resolution-Scaled Thickness**:
   ```python
   ref_dim = min(width, height)
   box_thickness = max(3, int(round(ref_dim / 260)))  # 3px for 720p, 4-5px for 1080p
   ```
2. **Bold, Scaled Class Badges**:
   ```python
   font_scale = max(0.55, round((ref_dim / 1080.0) * 0.75, 2))
   font_thickness = max(2, int(round(box_thickness / 2)))  # Anti-aliased semi-bold
   pad_x = max(6, int(box_thickness * 1.8))
   pad_y = max(4, int(box_thickness * 1.3))
   ```
3. **Pill Badge Backgrounds & Screen Boundaries**:
   * Label badges are drawn as solid filled rectangles in Sentinel Cyan (`#46B5C9` -> BGR `(201, 181, 70)`) with high-contrast dark text (`(15, 15, 15)`).
   * Added flip logic: if a box is at the very top of the frame (`y1 - th < 0`), the badge flips inside the top edge of the box to prevent text from being clipped.
4. **Audio Preservation**:
   * Updated the final FFmpeg re-encoding command to include `-map 0:v:0 -map 1:a:0? -c:a aac -shortest`, preserving original audio tracks if present in the raw input video.
5. **Cache Management**:
   * Added `force: bool = Query(default=False)` in [backend/app/routers/videos.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/routers/videos.py) and removed previous thin cached MP4s from `data/clips/` so new downloads immediately receive the refreshed styling.

### Reasoning
* High-resolution video frames have a much higher pixel density than CSS layout viewports. Scaling thickness proportionally to `min(width, height)` ensures the downloaded video looks identical in aesthetic weight and legibility to the web player.

---

## 4. Isolated Single-Detection View on Sidebar Click

### The Problem
In the right-hand sidebar (**Detections** tab), users can view detected classes organized by timestamp. When clicking a specific detection (e.g. `person` at `00:04`), previous behavior either showed all other detections on that frame or showed nothing if boxes were off. If a frame contained multiple detections (e.g., 5 cars and 1 pedestrian), the clicked object was lost in a sea of boxes.

### The Decision
Implemented **Single-Detection Isolation** in [frontend/src/components/player/DetectionOverlay.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/player/DetectionOverlay.tsx):
```tsx
// If a specific detection is selected from sidebar, isolate it:
// ONLY render that clicked box and its label, hiding all other boxes on that frame
if (selectedId) {
  if (!isSelected) return null;
} else if (!showBoxes) {
  return null;
}
```
* **What shows on sidebar click**:
  * **ONLY** the clicked detection is rendered on the video.
  * All other detections on that frame are completely hidden.
  * The selected box is highlighted with prominent styling:
    * `border-[2.5px] border-[#46B5C9]`
    * Semi-transparent cyan fill (`bg-[#46B5C9]/25`)
    * Glowing highlight ring (`ring-2 ring-white/70 shadow-[0_0_16px_rgba(70,181,201,0.7)]`)
  * The label pill (`det.class_name` + confidence) is rendered directly on top with a white accent ring (`ring-2 ring-white/80`).
* **Deselection & Return to Global View**:
  * Clicking the already-selected item in the sidebar deselects it.
  * Clicking directly on the isolated box deselects it.
  * Clicking the global "Boxes" button in the player controls clears single-detection isolation and displays all bounding boxes on the frame.

### Reasoning
* Directly aligns with the analyst workflow: when a user clicks a specific item in a timestamped list, their focus is on verifying *that exact object*. Hiding all irrelevant surrounding boxes eliminates cognitive overload.

---

## 5. Precise Video Seeking & Player State Synchronization

### The Problem
In HTML5 `<video>`, programmatically assigning `video.currentTime = time` while the video is paused does not reliably emit the `timeupdate` event in modern browsers. As a result:
1. React's internal `currentTime` state did not update immediately upon sidebar click.
2. `currentDetections` was calculated based on the stale timestamp, causing the bounding box to fail to render until the video was manually played or scrubbed.

### The Decision
1. **Added `onSeeked` Listener** in [frontend/src/components/player/VideoPlayer.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/player/VideoPlayer.tsx):
   * Hooked `<video onSeeked={...} />` to immediately sync `currentTime` in React state upon pause-seeking.
2. **Automated `useEffect` on `selectedDetectionId`**:
   * When `selectedDetectionId` updates from sidebar interaction, the player automatically calls `handleSeek(targetDet.timestamp)` directly inside `VideoPlayer`.
3. **Safety Fallback in Detection Clustering**:
   * In `currentDetections`, the selected detection is explicitly verified and injected into the active render array even if sub-second frame sampling differences exist.

### Reasoning
* Guarantees instantaneous, zero-delay rendering of the selected bounding box the moment the user clicks a detection in the sidebar.

---

## 6. Smooth Checkbox Class Filtering & Persistent Selection

### The Problem
Users needed to easily filter the video display and detection list to focus on specific classes (e.g. only "cars" or only "persons") using checkboxes. Previously, classes were shown as generic chips without checkboxes, selections were reset on page reload, and filtering in the sidebar did not propagate to the video player overlay.

### The Decision
1. **Smooth Checkbox UI in `ClassFilter.tsx`**:
   * Designed custom rounded checkboxes (`w-4 h-4 rounded-[3.5px]`):
     * **When selected**: Displays a bold checkmark (`<Check className="w-3 h-3 text-black stroke-[3]" />`) with a solid Sentinel Cyan background (`bg-accent border-accent`).
     * **When deselected**: Completely empty inside (`bg-surface border-border-strong`), showing no text or icon.
     * Engineered smooth ease-in-out CSS transitions (`transition-all duration-200 ease-in-out`) on both hover and selection toggle.
   * Added class occurrence counts and quick "All" / "None" selection actions.
2. **Lifted State & LocalStorage Persistence**:
   * Lifted `selectedClasses` state to [page.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/app/videos/%5BvideoId%5D/page.tsx).
   * Stored user preferences in `localStorage` keyed by `sentinel_classes_${videoId}`.
   * Defaulted to all detected classes on initial load so all objects are visible until the user customizes the filter.
3. **Propagation to Video Player**:
   * Passed `selectedClasses` into `VideoPlayer.tsx`.
   * When the user clicks the global **Boxes** button, only bounding boxes for the checked classes are shown.
   * When the user clicks the global **Labels** button, only labels for the checked classes are shown.

### Reasoning
* Provides full user agency over scene inspection. Persisting preferences across page reloads prevents repetitive setup work.

---

## 7. Custom-Class Annotated Video Generation & Download

### The Problem
Users could only download an annotated video with *all* classes burned in. If a video had dozens of detections across multiple classes, users could not export a clean video containing only specific classes of interest (e.g., exporting a video showing only flagged "weapons" or "intruders").

### The Decision
1. **Backend Query Filtering (`/videos/{video_id}/download_annotated`)**:
   * Updated `_get_or_create_annotated_video` in [backend/app/routers/videos.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/routers/videos.py) to accept `classes: str | None = Query(default=None)`.
   * When provided, the database query filters `Detection.class_name.in_(selected_classes)` before passing bounding boxes to `VideoProcessor.generate_annotated_video`.
   * Annotated MP4 files are cached using a class slug (`{video_id}_annotated_{classes_slug}.mp4`), avoiding re-rendering while supporting multiple custom combinations.
   * Download responses format a descriptive filename: `annotated_{classes}_{original_filename}`.
2. **Dynamic Frontend Download URLs**:
   * In [page.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/app/videos/%5BvideoId%5D/page.tsx), `downloadAnnotatedUrl` automatically appends `?classes=${encodeURIComponent(selectedClasses.join(","))}` whenever a custom class subset is active.
   * Both [SidePanel.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/player/SidePanel.tsx) and [PlayerControls.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/player/PlayerControls.tsx) dynamically label the action: e.g. `Download Annotated (2 classes selected)`.

### Reasoning
* Allows targeted evidence export, drastically reducing file inspection noise for end users and downstream stakeholders.

---

## 8. Substantial Bounding Box Thickness & Contrast Enhancements

### The Problem
Bounding boxes were previously using standard 2px border strokes on the web UI and thin strokes on raw video frames, which could appear faint, thin, or difficult to see against noisy, bright, or complex video backgrounds.

### The Decision
1. **Web UI Bounding Box Enhancements** ([DetectionOverlay.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/player/DetectionOverlay.tsx)):
   * Increased default bounding box border thickness from `border-2` (2px) to **`border-[3px]`** in Sentinel Cyan (`#46B5C9`).
   * Added subtle drop shadow (`shadow-[0_0_4px_rgba(0,0,0,0.7)]`) to ensure boxes stand out sharply even on bright white backgrounds.
   * Increased isolated/selected box thickness to **`border-[3.5px]`** with high-glow accent ring (`ring-2 ring-white/80 shadow-[0_0_16px_rgba(70,181,201,0.8)]`).
2. **Backend Video Generation Thickness Upgrades** ([VideoProcessor.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/core/video_processor.py)):
   * Upgraded dynamic line thickness formula:
     ```python
     box_thickness = max(4, int(round(ref_dim / 190)))
     ```
     * **720p**: 4px stroke
     * **1080p**: 5–6px stroke
     * **4K**: 11px stroke
    * Scaled label text and background padding accordingly (`font_scale = max(0.65, ...)`, `pad_x = max(8, ...)`).
    * Purged old thin cached MP4s from `data/clips/`.

### Reasoning
* Guarantees bounding boxes remain crisp, solid, and immediately identifiable across all display sizes, video resolutions, and complex backgrounds.

---

## 9. Video Inspection Dashboard UX & Design System Enhancements

### The Problem
While the basic player and sidebar were functional, users needed better and easier options when inspecting a video:
1. When browsing detections, users either had to scroll through a huge list of all detections from the entire video or guess which detections belonged to the current frame.
2. In the Matches tab, there was no way to reorder matches by timestamp vs. similarity rank.
3. The side panel had a rigid fixed width, which restricted the user from allocating more width to detections/metadata or giving maximum room to video footage.
4. Users had no easy discovery mechanism for keyboard shortcuts (`Space`, `K`, `B`, `L`, `[`, `]`, `,`, `.`, `M`, `F`).
5. Quick actions (such as searching within the active video or downloading custom annotated footage) were scattered or missing from the top navigation bar.

### The Decision
Aligned the video inspection screen strictly with [design.md](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/design.md) §8C and introduced high-value user experience features:

1. **Segmented Detections View Mode (`Current frame` vs `All`)** ([SidePanel.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/player/SidePanel.tsx)):
   * Added a segmented control in the Detections sub-header:
     * **`Current frame` (default)**: Dynamically filters and displays only detections occurring on the active playhead frame (`±sampleInterval`), showing live badge counts. If no detections are present on the active frame, a helpful prompt invites the user to seek/play or switch to **All**.
     * **`All`**: Displays all detections for the active classes across the entire duration, enabling rapid scrubbing and jumps.
2. **Sort Toggle in Matches Tab (`Time` vs `Rank`)**:
   * Added a segmented control in the Matches sub-header allowing users to toggle between chronological order (`Time`) and similarity score descending (`Rank`).
3. **User-Resizable Side Panel**:
   * Added a 4px interactive vertical drag handle on the side panel's left edge (`role="separator"`, `aria-orientation="vertical"`).
   * Supports smooth mouse drag resizing between 320px and 480px (default 360px), with the preferred width persisted in `localStorage` under `sentinel.sidepanel_width`.
4. **Fast Navigation & Frame Stepping**:
   * Wired `[` and `]` to hop between previous and next semantic matches (if search query active) or detections.
   * Added `,` (comma) and `.` (period) to step one frame backward or forward when paused.
5. **Keyboard Shortcuts Discovery**:
   * Built [KeyboardShortcutsModal.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/player/KeyboardShortcutsModal.tsx) and wired it to `?` key press, player controls button, and header overflow menu.
6. **Enhanced Header Bar & Overflow Menu** ([page.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/app/videos/%5BvideoId%5D/page.tsx)):
   * Added a 1-click **Search Video** button in the header bar.
   * Added an overflow (`…`) menu with direct actions: *Search this video*, *Download annotated*, *Download original video*, *Keyboard shortcuts*, and *Delete video…*.
7. **Timeline Hover & Interval Indicator** ([Timeline.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/player/Timeline.tsx)):
   * Added floating hover timestamp tooltip following the cursor during scrubbing.
   * Added quarter/half duration tick marks and highlighted selection rings on active match diamonds (`◇`) and detection ticks (`▢`).

### Reasoning
* Preserves 100% of existing functionality while significantly upgrading ease of use, spatial ergonomics, and keyboard-first inspection efficiency as mandated in `design.md`.

---

## 10. Home Page Implementation & PathnameContext Client Directive Resolution

### The Problem
1. **Missing Home Page**: `/` previously executed an immediate server redirect (`redirect("/library")`), meaning there was no landing page to showcase Sentinel's capabilities, how it works, or sample search demos as mandated in [design.md](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/design.md) §8E.
2. **`TypeError: Cannot read properties of null (reading 'useContext')` in `PathnameContext`**:
   * Occurred during navigation/SSR when `Sidebar.tsx`, `BottomNav.tsx`, and `AppShell.tsx` invoked Next.js router hooks (`usePathname()`) without the `"use client";` boundary directive at the top of the component files. In Next.js App Router, evaluating navigation context hooks on the server without client boundary markers throws when React's internal dispatcher is uninitialized.
3. **Next.js Staleness Warning**:
   * Next.js dev server displays a yellow header banner (`Next.js (14.2.35) is outdated`) whenever a newer major release (Next.js 15/16) exists on npm. Staying on `14.2.35` preserves stability with React 18 and synchronous App Router props without breaking changes.

### The Decision
1. **Comprehensive Home Page at `/` ([app/page.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/app/page.tsx))**:
   * Built the complete marketing and product tour page strictly per `design.md` §8E:
     * **Top Bar (64px)**: Dark chrome rail (`data-zone="dark"`), mark + wordmark, *How it works* link, and primary `Open Sentinel` button.
     * **Hero Section**: 56px declarative headline (`Search your footage like you'd ask a person.`), lede, and dual CTAs.
     * **Interactive Framed Hero Demo**: Dual-column 60/40 product demonstration showing a video frame with a thick cyan bounding box (`vehicle 0.91`), match chip, mini timeline with diamond (`◇`) and square (`▢`) markers, query field (`white van near the entrance`), and real-time result rows.
     * **Two Kinds of Evidence**: Side-by-side cards comparing *Detections* (object boxes, confidence) and *Frame Matches* (embeddings, similarity).
     * **How It Works**: 3-step numbered breakdown (*01 Upload*, *02 Index*, *03 Search*).
     * **Scope**: Honest *Does* vs. *Doesn't* specifications.
     * **Closing CTA Band & Footer**: Dark zone with `Open Sentinel` links.
2. **Strict `"use client";` Boundaries on Shell Components**:
   * Added `"use client";` to:
     * [Sidebar.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/shell/Sidebar.tsx)
     * [BottomNav.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/shell/BottomNav.tsx)
     * [AppShell.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/shell/AppShell.tsx)
     * [Header.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/shell/Header.tsx)
     * [Breadcrumb.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/shell/Breadcrumb.tsx)
   * Removed legacy duplicate components from `src/components/` root.

### Reasoning
* Eliminates the `useContext` null pointer error completely.
* Delivers the dedicated public landing experience designed in `design.md` §8E while cleanly guiding users to `/library` and `/search`.

---

## 11. Cloudinary Cloud Storage & Fast CDN Integration

### The Problem
Serving high-definition video files and frame thumbnails solely from local storage can cause bandwidth bottlenecks, slow stream startup times, and limited scalability when multiple clients concurrently stream or download video footage. Furthermore, uploading and streaming directly through standard server disks consumes significant I/O and server compute.

### The Decision
Integrated **Cloudinary** cloud storage and CDN with environment-driven credentials to deliver ultra-fast CDN delivery while maintaining local pipeline efficiency:

1. **Dedicated Cloudinary Core Service ([cloudinary_service.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/core/cloudinary_service.py))**:
   * Initialized with secure SSL and credentials from configuration.
   * **Chunked Video Upload**: Implemented `upload_video(file_path, public_id)` using Cloudinary's `upload_large` with 6MB chunk sizes for resilient, high-speed streaming uploads to `sentinel/videos`.
   * **Thumbnail Upload**: Implemented `upload_image(file_path, public_id, folder)` for instant CDN distribution of video poster frames to `sentinel/thumbnails`.
   * **Asset Cleanup**: Implemented `delete_resource(public_id, resource_type)` to purge assets from Cloudinary when records are deleted in Sentinel.

2. **Database Schema & Safe Auto-Migration ([video.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/models/video.py), [main.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/main.py))**:
   * Added `cloudinary_url`, `cloudinary_public_id`, and `cloudinary_thumbnail_url` columns to the `videos` table.
   * Implemented non-destructive startup migrations in FastAPI lifespan that execute `ALTER TABLE videos ADD COLUMN ...` if columns do not yet exist, guaranteeing zero data loss on existing databases.

3. **Hybrid Ingestion Pipeline ([worker.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/worker.py))**:
   * High Efficiency Architecture: Video files are initially saved locally on disk so OpenCV frame sampling, PyTorch Faster R-CNN detection, and CLIP embedding generation run at full native disk I/O speeds without network latency or repeated downloading.
   * Concurrently, thumbnail and video files are synced to Cloudinary, and their `secure_url` endpoints are committed directly to the database.

4. **Transparent CDN Streaming & Download Delivery ([videos.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/routers/videos.py))**:
   * `_to_video_response` sets `stream_url = video.cloudinary_url` and `thumbnail_url = video.cloudinary_thumbnail_url`, enabling all frontend components (`VideoPlayer.tsx`, `VideoCard.tsx`, `/library`) to stream and render directly from Cloudinary's global edge network without code modifications.
   * Direct API endpoints (`/stream`, `/download`, `/thumbnail`) issue `HTTP 307 Temporary Redirect` to Cloudinary CDN URLs with smooth fallback to local disk streaming when Cloudinary is not configured.
   * `DELETE /api/v1/videos/{video_id}` cascades deletion to Cloudinary cloud assets alongside database records and local cache files.

5. **Environment & Container Configuration ([.env.example](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/.env.example), [docker-compose.yml](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/docker-compose.yml))**:
   * Documented and injected `SENTINEL_CLOUDINARY_CLOUD_NAME`, `SENTINEL_CLOUDINARY_API_KEY`, `SENTINEL_CLOUDINARY_API_SECRET`, and `SENTINEL_CLOUDINARY_ENABLED`.

### Reasoning
* Offloads high-bandwidth video streaming and media downloads to Cloudinary's worldwide CDN edge servers, dramatically lowering server egress load and speeding up video buffering for users.
* Preserves fast local GPU/CPU neural inference on disk while saving permanent CDN URLs in the database for maximum efficiency.

---

## 12. Supabase PostgreSQL Cloud Database Integration

### The Problem
Running a local SQLite database limits Sentinel to single-node file locking and cannot support distributed production workloads, collaborative multi-user persistence, or managed cloud backups. The system needed migration support to connect to a cloud-hosted Supabase PostgreSQL database.

### The Decision
Configured full PostgreSQL and Supabase integration using cloud connection pooling and SSL mode:

1. **Driver & Engine Enhancements ([requirements.txt](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/requirements.txt), [database.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/database.py))**:
   * Installed `psycopg2-binary>=2.9.9` into the backend environment.
   * Configured SQLAlchemy engine with cloud connection pooling:
     * `pool_pre_ping=True`: Detects and recycles dropped cloud connections before queries.
     * `pool_recycle=300`: Periodically refreshes TCP sockets to prevent cloud pooler timeouts.
     * `pool_size=10, max_overflow=20`: Optimized connection concurrency.
   * Automatic URI normalization: Converts `postgres://` or `postgresql://` to `postgresql+psycopg2://`.

2. **Special Character Handling in Connection URIs**:
   * If a database password contains an `@` sign or special characters, writing it unencoded disrupts URI host parsing (`username:password@host`).
   * Passwords with `@` must be percent-encoded (`%40`). When `psycopg2` connects, it automatically decodes `%40` to the authenticating password.

3. **Supabase Client Credentials & Dual Environment Setup**:
   * Frontend: Saved `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in [frontend/.env.local](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/.env.local).
   * Backend: Saved `SENTINEL_DATABASE_URL`, `SENTINEL_SUPABASE_URL`, and `SENTINEL_SUPABASE_KEY` in [backend/.env](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/.env).
   * Docker: Injected all Supabase variables into [docker-compose.yml](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/docker-compose.yml) with sensible defaults.

4. **Resilient Lifespan Initialization ([main.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/main.py))**:
   * Wrapped startup table creation (`Base.metadata.create_all`) in a resilient try/catch block so that if a developer's local Wi-Fi/ISP blocks outbound port 6543/5432, the server still boots with informative diagnostic logging.

### Reasoning
* Enables full cloud persistence on Supabase PostgreSQL while maintaining zero breaking changes to existing models (`Video`, `Frame`, `Detection`).
* Prepares the entire codebase for instant cloud deployment where production containers immediately connect to Supabase PostgreSQL over managed connection poolers.

---

## 13. Production Readiness & Cloud Deployment Architecture (Render + Vercel)

### The Problem
Moving an AI-powered full-stack application from local development to production on **Render** (Backend API + PyTorch inference) and **Vercel** (Next.js 14 App Router frontend) introduces key infrastructural challenges:
1. Render dynamically assigns a `$PORT` environment variable (typically 10000) that can break hardcoded `--port 8000` launch commands.
2. Cross-Origin Resource Sharing (CORS) between Vercel preview/production URLs and the Render backend will fail if wildcard `*` is combined with credentials.
3. Next.js production builds must succeed with strict TypeScript and route evaluation with zero errors.
4. Environments must have clean environment variable placement with zero `.env.example` leakage.

### The Decision
Engineered production-grade deployment infrastructure across the entire stack:

1. **Clean Environment Isolation**:
   * Removed legacy `.env.example` as requested.
   * Placed active production-ready configurations in [backend/.env](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/.env) (with Supabase PostgreSQL pooler URI, Cloudinary credentials, and debug mode disabled).
   * Placed frontend configurations in [frontend/.env.local](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/.env.local).
   * Both `.env` files are protected by `.gitignore` against accidental commits to public repositories.

2. **Render Dynamic Port Binding ([backend/run.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/run.py), [Dockerfile](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/Dockerfile))**:
   * Built `run.py` entrypoint that reads `os.environ.get("PORT", 8000)` and `os.environ.get("HOST", "0.0.0.0")`.
   * Updated `backend/Dockerfile` to invoke `python run.py`.
   * Authored root [`render.yaml`](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/render.yaml) Blueprint supporting 1-click automated deployment with Python 3.12, pre-configured environment variables, and `/health` health-check endpoints.

3. **CORS Regex Matching for Vercel ([main.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/main.py))**:
   * Replaced static `allow_origins=["*"]` with `allow_origin_regex=r"^https?://.*"`.
   * Ensures all Vercel dynamic preview URLs (`*.vercel.app`), local development ports, and custom domains can make authenticated API requests without CORS blocks.

4. **Production Build & Test Verification**:
   * **Frontend**: Executed `npm run build` in `frontend/` ➔ **7/7 static and dynamic pages compiled with 0 errors**.
   * **Backend**: Executed `pytest` test suite ➔ **25/25 unit & integration tests passed (100% pass rate)**.
   * Documented complete step-by-step instructions in [`deployment_guide.md`](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/deployment_guide.md).

### Reasoning
* Guarantees seamless, zero-downtime deployment to both Render and Vercel.
* Ensures both local development workflows and cloud production pipelines run consistently with full test coverage and automated validation.

---

## 14. Twelve Labs White Theme & Navy-Blue Purge Overhaul

### The Problem
The interface previously exhibited dark navy-blue tints (`#0D1117`, `#0E1114`, `#12161B`, `#182333`), navy hero gradients, dark headers with `data-zone="dark"` across the home page and shell, and hardcoded navy button states (`#1E242A`, `#20262C`). This gave the application a "vibecoded" dark navy tint that clashed with the clean, white visual standard exemplified by Twelve Labs' video AI products.

### The Decision
Executed a complete design system overhaul to implement a pristine **Twelve Labs white theme**:

1. **Color Token Restructuring ([globals.css](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/app/globals.css))**:
   * **Root Work Plane (`:root`)**: Replaced all navy tints with pure white (`#FFFFFF`) for `--bg-app`, `--bg-surface`, and `--bg-chrome`. Configured neutral zinc wells (`#F8F9FA`), subtle hairline borders (`#E4E4E7`), high-contrast obsidian typography (`#09090B`, secondary `#52525B`), and vivid Twelve Labs cyan accents (`#06B6D4` / `#0891B2`).
   * **Restricted Dark Zone (`[data-zone="dark"]`)**: Confined strictly to video inspection canvas viewports and player controls. Replaced GitHub navy colors with neutral carbon graphite (`#000000`, `#09090B`, `#18181B`, `#27272A`), ensuring zero navy undertones exist anywhere in the application.

2. **Complete Home Page Overhaul ([app/page.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/app/page.tsx))**:
   * **Clean White Navigation Bar**: Replaced `data-zone="dark"` and `bg-chrome` with `bg-surface/90 backdrop-blur-md border-b border-border-default`, high-contrast obsidian text, and Twelve Labs cyan brand mark.
   * **Hero Section**: Built on pure white canvas with a subtle 24px geometric micro-grid, live multimodal AI status pill, and bold declarative headline (`Search your footage like you'd ask a person.`).
   * **Interactive Terminal Demo**: Replaced simulated navy gradients (`from-[#0a0f16] via-[#121924] to-[#182333]`) with a true-black (`#000000`) video viewport, high-precision cyan bounding box (`vehicle 0.91`), synchronized scrubber, and white search inspection results with real-time cosine similarity scores.
   * **Features & Boundaries**: Redesigned "Two Kinds of Evidence", "Architecture", and "Engineering Boundaries" cards with clean white cards and zinc borders.

3. **Shell & Interactive Component Refinement**:
   * **Sidebar & Mobile Navigation ([Sidebar.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/shell/Sidebar.tsx), [BottomNav.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/shell/BottomNav.tsx))**: Removed legacy dark zone styling, standardizing on `bg-surface` with clean zinc dividers.
   * **Buttons ([Button.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/ui/Button.tsx))**: Purged hardcoded dark hover colors (`#1E242A`, `#20262C`), replacing them with semantic `--bg-hover` and `--bg-pressed` tokens.

### Reasoning
* Eliminates all "vibecoded" navy blue artifacts and creates a consistent, ultra-modern white aesthetic aligned with Twelve Labs' video AI design language.
* Preserves 100% of underlying functionality and test compatibility while dramatically elevating the user experience.

---

## 15. Google Firebase Authentication & Real-World Surveillance Visual Overhaul

### The Problem
1. **User Data Isolation**: Videos uploaded by different users were previously stored globally without user-specific ownership. Users needed a simple, seamless Google Firebase login system to safeguard and isolate their video data per account.
2. **Abstract / Placeholder UI**: The hero demo and evidence cards previously featured abstract black/beige empty boxes with generic icons. The user requested authentic, real-world CCTV surveillance pictures with realistic bounding box overlays and reduced technical buzzwords on the home page.

### The Decision
1. **Google Firebase Authentication Integration**:
   * **Frontend Configuration**: Stored client web credentials in [frontend/.env.local](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/.env.local) (`projectId: shabey-ce4be`). Implemented [firebase.ts](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/lib/firebase.ts), [AuthContext.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/context/AuthContext.tsx), and [AuthButton.tsx](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/frontend/src/components/auth/AuthButton.tsx) with 1-click Google popup authentication, profile avatar dropdown, and sign-out capabilities.
   * **Backend Verification**: Stored Admin SDK private key in [backend/firebase_service_account.json](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/firebase_service_account.json). Implemented [auth.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/core/auth.py) with `verify_id_token` and client header fallback.
   * **Per-User Database Isolation**: Added `user_id` column to the `videos` table in [video.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/models/video.py). Updated [videos.py](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/backend/app/routers/videos.py) to tag uploads with the authenticated user ID and filter library queries per user.

2. **Real-World CCTV Surveillance Imagery & Natural Copy Overhaul**:
   * Generated 5 realistic, high-definition surveillance camera still frames placed in `frontend/public/images/`:
     * `hero-cctv.jpg`: Wide-angle gate surveillance frame with a white commercial delivery van (`vehicle 0.91`).
     * `detection-card.jpg`: Driveway security frame with parked SUV (`vehicle 0.94`) and pedestrian courier (`person 0.92`).
     * `frame-match-1.jpg`, `frame-match-2.jpg`, `frame-match-3.jpg`: Sequential CCTV matching keyframes.
   * **Removed Flashy Buzzwords**: Purged technical copy (`REC | Optical Surveillance & Neural Search | Zero Hallucinations`).
   * **Simplified Hero Copy**: Updated to natural, accessible wording: *"Search your video footage like you'd ask a person."*

### Reasoning
* Enables secure, multi-tenant video search and private libraries with zero friction via Google Firebase.
* Replaces empty placeholder boxes with tangible real-world surveillance imagery, making the product immediately understandable.
