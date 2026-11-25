# NurseCare Monitor branding verification

Implemented locally on `wecare-studio-v3`, 2026-11-25. No commit, push, deployment, history rewrite, database write, or external notification was performed.

## Implementation

- All four approved PNGs in `public/branding/` are byte-identical to the supplied archive. Lossless WebP derivatives retain transparency; compact variants remove outer whitespace only. ICO, touch icons and manifest icons derive from the supplied app icon.
- `BrandLogo.tsx` supplies the official wordmark and compact emblem. `brand.tsx` retains the existing import interface.
- `AnimatedLogo.tsx` uses three independently drawn SVG arc centerlines and a separate heart, following the supplied dark-logo geometry. The small loading variant runs once without spinning or repeated pulsing.
- `SplashScreen.tsx` mounts beside the application outlet. Authentication and queries initialize normally. A pre-paint session bootstrap prevents repeat introductions and an independent 1780ms deadline releases the screen even if hydration stalls. Reduced motion uses 120ms with no transforms or stroke animation. Storage denial is caught.
- Intro timing: background 0–200ms, arcs 200–700ms, heart 550–900ms, wordmark/byline 800–1200ms, tagline 1100–1400ms, exit 1400–1760ms, final cleanup by 1780ms.
- English and approved Bangla tagline are supported. Bangla: যাঁরা যত্ন নেন, আমরা তাঁদের যত্ন নিই
- Official product naming, sidebar, collapsed/mobile navigation, authentication/recovery, landing/footer, dashboard, notification preview, loading states, favicon, manifest and metadata updated.
- Sampled RGB values are recorded in `public/branding/palette.json`: ink #08242d, wordmark teal #005859, turquoise #74d6ca, coral #fe7452, amber #f7a936. UI background #F4F8F8; surfaces white. Existing clinical warning semantics retained.
- Mobile fixes address the existing fixed/relative sidebar conflict and an absolutely positioned table accessibility label that expanded the document width. Table scrolling remains available.

## Verification

- `npm.cmd test`: **58/58 passed**, 10 files. Includes five new tests for session persistence, concurrent content mounting, remount behavior, reduced motion, Bangla, and denied storage.
- `npm.cmd run build`: **passed, exit 0**, final run after visual corrections. Existing Vite/TanStack deprecation warnings remain.
- `npx.cmd tsc --noEmit`: **fails with 15 existing errors outside the new branding components**. Details: `validation/branding/typescript.log`. Affected areas: app-shell optional properties, queries foundNurse narrowing, activity event typing, missing Clock import in ai-devices, dashboard optional fields, nurse-detail temperature/history access, support request fields. These unrelated domain issues were not rewritten.
- Chromium: desktop 1440×1000, mobile 390×844, reduced-motion context, English/Bangla. Seven behavior checks passed; see `validation/branding/results.json`. Additional mobile landing measurement is 390px (no overflow).
- Confirmed no intro replay after navigation/reload, intro deadline exit, proper mobile workspace width, collapsed emblem, authentication branding and notification preview.
- No branding JavaScript or hydration errors in the final browser run. Demo nurse-directory navigation still produces HTTP 401 from the existing Supabase `profile_names` RPC. Authentication policies were not weakened or bypassed.
- Screenshots and short WebM preview are in `validation/branding/`. These use illustrative demo records. Preview server was stopped after verification.

## Existing local work preserved

The checkout already contained edits to package-lock.json, app-shell.tsx, queries.ts, routeTree.gen.ts, dashboard.tsx, and an untracked wecare-overview.css. Branding was layered onto those files without restoring or replacing the user's dashboard. Queries, auth/store, Supabase policies, Gradio transport and simulation behavior were not changed.

To review locally: `npm.cmd run dev`. A new browser session plays the intro once. For a deliberate replay during development, remove only sessionStorage key `nursecare-intro-v1` and reload.
