# Gradio reliability verification — 24 October 2026

## Changes
- Existing 4 Hz sensor generator and 30-second scheduler unchanged; no model/calibration changes or resets.
- Per-nurse outstanding-request guard, strictly increasing unsent samples, sent/acknowledged watermarks persisted across reloads and same-origin tab locks.
- Busy subjects retain new samples until a later scheduled cycle, rather than sending overlapping requests. Pending buffers are bounded at 600 samples.
- Configurable server timeout (`GRADIO_REQUEST_TIMEOUT_MS`, default 90000 ms). SSE completion is consumed immediately instead of waiting for the connection to close.
- Timed-out, interrupted and invalid-response requests remain uncertain and pause only that subject. They are never blindly retried or treated as acknowledged.
- Server diagnostics contain subject IDs, counts, timestamp bounds, duration, HTTP status, actual state/probabilities and sanitized errors; no sensor payloads or credentials.

## Actual authenticated website test
Source: authenticated `/simulation` browser run and actual server outcome logs. Sensor timestamps: 17:03:22.747–17:05:52.497 UTC. No API responses were mocked in this run.

| Subject | Successful requests | Failed completed requests | Samples in successful responses | Batch sizes |
|---|---:|---:|---:|---|
| N-001 | 5 | 0 | 600 | 120,120,120,120,120 |
| N-002 | 5 | 0 | 600 | 120,120,120,120,120 |
| N-003 | 3 | 0 | 480 | 120,120,240 |
| N-004 | 5 | 0 | 600 | 120,120,120,120,120 |
| N-005 | 5 | 0 | 600 | 120,120,120,120,120 |

23 completed successful calls / 2880 accepted samples, HTTP 200, actual state ALERT. No older-state errors or model timeouts occurred in this run. N-003 needed 30–38 seconds, demonstrating that the old 25-second timeout was insufficient; its next batch safely accumulated 240 new samples. Its final queued samples were not dispatched while the previous call was outstanding.

All five actual responses were visibly displayed in nurse cards. Screenshot-confirmed examples (exact API values): N-001 0.5841540196947133, N-002 0.5690613625411902, N-003 0.5674544219586645, N-004 0.5432853726764695, N-005 0.6673554434221395. Later requests finished in server logs after the browser closed and are not claimed as visibly verified. Closing with requests outstanding caused local request-abort diagnostics; persisted uncertain watermarks deliberately prevent replay on reload.

ALERT is displayed verbatim. It is not inferred to mean HIGH_STRESS; existing numeric graph/categories remain unknown for unmapped model labels rather than fabricating a classification. The model did not return `alert_triggered:true` in these responses, so local alerts were not invented.

Browser: no page errors; no horizontal overflow at 950×639. All content routes already have page-specific head metadata. Latest automatic build: OK. Targeted tests: 28 passed, covering strict ordering, unsent-only batches, per-nurse serialization, persisted uncertainty, nurse independence, exact ALERT probability, configurable timeout/no retry, immediate SSE completion, unchanged sensor generation and stale-data rules.

## Remaining limitations / exact remote recovery requirement
Browser locks do not coordinate different devices or origins. No server-isolate in-memory lock can guarantee distributed serialization. The supplied external app copy already has a lock around model updates, but its deployment is not verified and it has no batch reconciliation endpoint.

Safe automatic timeout recovery requires the Space to accept an idempotent `batch_id`, serialize processing for each `subject_id`, record the last accepted timestamp and cached response for each completed batch, and expose a read-only batch-status/acknowledgement endpoint. That endpoint must synchronize with pending processing before returning status. The website could then reconcile the original request and send only timestamps beyond the acknowledged watermark. A known failed/no-processing result also needs to be explicit; a generic error cannot prove that a partially processed batch changed no state.

Until that contract exists, uncertain subjects pause with an error instead of resetting calibration or risking replay. No remote code has been modified; remote logging deployment still needs authenticated Space write access. This verifies simulated readings → actual Gradio → existing simulation cards, not physical sensors or the database-backed dashboard.