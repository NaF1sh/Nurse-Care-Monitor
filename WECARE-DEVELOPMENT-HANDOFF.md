# WeCare — Complete Development Status & AI Handoff Document

> **Last Updated:** 2026-11-25  
> **Repository Path:** `S:\WE Care\Website`  
> **Brand Tagline:** Care for those who care for us.  
> **Product Tagline:** Spot nurse strain early. Support teams sooner.  
> **Target Domain:** International AI Builders Congress — HealthSphere AI domain.

---

## 1. Quick Execution Commands

```bash
# Node environment
Node: v24.14.1
npm: 11.11.0

# Run all 53 automated tests (All Pass)
npm test

# Run development server (running at http://127.0.0.1:3000)
npm run dev

# Run production build (Nitro & Vite Build Pass)
npm run build

# Preview production build locally
npx vite preview
```

---

## 2. Design System & Visual Identity

### Aesthetic Philosophy
Inspired by **Linear** (layout precision and interaction quality), **Attio** (clean record tables and subtle borders), and **Oura / WHOOP** (calm, human-centered physiological metrics). The interface avoids dark navy administrative bloat, excessive gradients, and cartoonish containers in favor of a warm, intentional healthcare palette:

- **Canvas (Background):** `#F7F8F5`
- **Surfaces & Cards:** `#FFFFFF` with border `#E1E6E1`
- **Primary Text (Ink):** `#192C28`
- **Primary Accent (Pine):** `#244D45`
- **Soft Accent (Sage):** `#C6E2D6`
- **Muted Text:** `#64766E`
- **Status Colors:**
  - **Normal:** Pine `#244D45` / Soft `#E6EFEA`
  - **Moderate:** Amber `#B7791F` / Soft `#FFF3DD`
  - **Elevated Strain:** Crimson `#C24152` / Soft `#FDE8EA`

---

## 3. Left Menu & App Shell Capabilities (`src/components/app-shell.tsx`)

1. **Light-Colored Slim Sidebar (~220–240px):**
   - Replaced the dark navy sidebar with a clean, light surface (`#FFFFFF` with `#E1E6E1` right border).
   - Soft pine/sage active state pills (`#EFF3F0` background with `#244D45` text).
2. **Collapsible:**
   - Click the **"Collapse"** toggle in the top bar or sidebar header to smoothly collapse into a 64px icon rail.
   - Click **"Expand"** to restore.
3. **Resizable & Make It Bigger:**
   - Quick-toggle width button switches between compact (224px) and wide (280px).
   - Drag-to-resize handle allows custom width adjustment between 190px and 380px.
   - Settings persist automatically in `localStorage`.
4. **Minimal Header:**
   - Unified top bar with subtle breadcrumb, ward filter, unread notifications badge, and language toggle.

---

## 4. Supervisor Overview (`src/routes/dashboard.tsx` & `src/routes/index.tsx`)

1. **Compact Shift Overview:**
   - Removed oversized promotional hero banners.
   - Clean greeting: *"Good morning, Dr. Rahman • Morning Shift (07:00–15:30) • Central Inpatient Wing • 5 wearable devices connected"*.
2. **Key Metric Indicators:**
   - On Duty (5), Normal Range (3), Moderate Exertion (1), Elevated Strain (1).
   - Quick filters on status with subtle border highlights.
3. **Primary Operational Workspace (Nurse Monitoring Table):**
   - Clean Attio/Linear-style row layout with status dots (`● Normal`, `● Moderate`, `● Elevated`).
   - Monospace heart rate and electrodermal (EDA) readings.
   - SVG physiological trend sparklines (alerting in crimson for elevated strain).
   - Live telemetry status (e.g. `Live (Just now)` vs `Offline (42m ago)`).
4. **Animated Slide-Out Notification Drawer:**
   - Replaced the permanent side composer with a smooth slide-out drawer (Radix Sheet).
   - Opens when clicking **"Notify Selected"** or individual nurse **"Notify"** buttons.
   - Quick preset templates (Check-in, Break Coverage Approved, Ward Assistance).
   - Includes real-time Android Companion mobile notification preview.

---

## 5. Nurse Management Directory (`src/routes/nurses.index.tsx`)

- Clean data table with search, ward filtering, supervisor oversight assignment, and smartwatch pairing code.
- Admin add/edit nurse dialog using subtle border styling.

---

## 6. Verification Status

- **Automated Tests:** 53 / 53 passed (`src/test/*`).
- **Production Bundle:** `npx vite build` completed cleanly without errors.
- **Local Dev Server:** Active on `http://127.0.0.1:3000`.
