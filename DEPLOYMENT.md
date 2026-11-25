# Nurse Stress Monitor — Setup & Deployment

## Environment variables
| Name | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | auto (Lovable Cloud) | Browser client. Publishable, safe in frontend. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | auto, server only | Trusted server writes (sensor readings, predictions). Never in browser code. |
| `HF_API_TOKEN` | **not yet set** | Hugging Face token, server-side secret. Needed for Phase 3. |
| `HF_ENDPOINT_URL` | **not yet set** | Hugging Face model endpoint. Needed for Phase 3. |

## Database
Tables: `profiles`, `user_roles`, `nurses`, `sensor_readings`, `predictions`, `manual_actions` (migrations in `drizzle/migrations`).
- RLS is on for every table.
- New sign-ups always get the `supervisor` role. Admin is granted only by a trusted operator:
  `insert into public.user_roles(user_id, role) select id, 'admin' from auth.users where email = '<email>';`
- Browsers cannot insert sensor readings or predictions; only server code with the service role can.
- Manual actions: only for active nurses the user can access, author must be the signed-in user, linked prediction must belong to the same nurse, rows are immutable.
- Data older than 30 minutes is shown as "Stale".
- Retention policy for sensor readings / predictions: not yet defined (decide before go-live).

## Deploy
1. Click **Publish** in the Lovable editor (top right). Frontend changes need **Update** in the publish dialog; database changes apply immediately.
2. Create the first account, confirm the email, then grant admin (SQL above).
3. Admin adds nurses and assigns supervisors.

## Live Simulation (demo)
- `/simulation` generates synthetic readings for five demo nurses (N-001…N-005) every 30 s, fully in the browser — nothing is written to the real database, and the page is clearly marked as demo data.
- The page streams 4 Hz samples (every 250 ms) per demo nurse and, every 30 s, sends only new collected samples to the public Gradio Space `aahsann/JUSTNOva_Deepfake_Detector` (`/predict`) from the server. Start/resume never resets calibration; `/health` drives the model indicator. Optional server secrets: `GRADIO_SPACE_URL` (override), `HF_API_TOKEN` (only after authentication rejection), `GRADIO_REQUEST_TIMEOUT_MS` (default 90000, valid 1000–300000). Failures show actual errors — never an invented result.
- Per-subject requests are serialized across this browser's same-origin tabs, with sent/acknowledged timestamp watermarks in local storage. Timed-out, interrupted or invalid-response batches are never replayed; the subject is paused as uncertain, even after reload. Sampling remains 4 Hz; pending queues are bounded to 600 samples. A different browser/device is not covered by these browser locks.
- Safe remote recovery requires Hugging Face to lock `process_request()` per subject, accept an idempotent batch ID, and expose a read-only acknowledgement/status endpoint returning the last accepted timestamp, batch ID and cached result. Status reads must acquire the same lock after pending work completes. Only then can the website reconcile uncertain batches without retrying or resetting calibration. No such server change is applied here. Cross-device clients also need this server-side ordering protection.
- Known issue (Oct 2026): the Space reports `model_loaded: false` — "No module named '_loss'" (the saved model needs a matching scikit-learn version in the Space's requirements).

## Not yet implemented
- Real Hugging Face model connection — blocked on model details and token (`HF_API_TOKEN`, `HF_ENDPOINT_URL`).
