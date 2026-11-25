# Prediction readiness countdown — 25 October 2026

## Meaning and calculation

The per-nurse **Next Prediction In** timer is an estimate of sensor readiness / the next eligible scheduled prediction batch, **not a promise of result arrival**. The existing “Next update” remains the separate 30-second UI/batch schedule. The clock refreshes once a second from the current clock and actual buffers, not by blindly decrementing a number.

- **Calibration:** expose the engine's actual `details.seconds_remaining` through the existing authenticated server function. Show the last API-acknowledged remaining time plus an explicitly marked estimate based on newly sampled sensor timestamps. Reaching zero does not claim calibration success: it shows “Awaiting calibration confirmation.”
- **Window:** expose actual `details.samples_collected` and `details.samples_needed`. Missing samples = required − remote collected − actual local queued samples, clamped at zero. Divide by the actual `/health` sample rate (4 Hz), then round to the next eligible 30-second submission. Display acknowledged and queued counts separately. A 60-second window needs 240 samples; it is not rebuilt after each active result.
- **Active:** the inspected engine predicts on every new sample once its rolling window is full. The website only receives the final result in each scheduled batch, so use the existing scheduler's next deadline, not response completion plus 30 seconds and not the training stride of 15 seconds.
- **Request:** dispatch immediately sets the individual nurse to “Prediction in progress”; each nurse's clock settles on its own response, independently of slower nurses.
- **Failure/uncertainty:** no numeric success countdown. Existing timeout/replay quarantine remains authoritative, with no automatic retry or reset.
- **Missing timing / reload:** wait for actual API timing; page start, old showcase progress or total sent counts do not establish remote calibration state.
- **Delayed/inactive:** samples older than two seconds yield “Waiting for sensor samples”; overdue dispatch yields “Batch delayed — waiting for dispatch.” No negative countdown or wall-clock-created window samples.

API latency and Gradio queue time have no guaranteed upper ETA; hence `~` and `(est.)` on numeric readiness estimates. Remote calibration advances only after actual processing, not because an estimate decreases.

## Actual authenticated website run

25 October 2026, existing showcase subjects, ordinary Start → one scheduled batch → replies → Stop. No API mocking, fresh subject replacement, reset, model change or accelerated sensors.

| Subject | Sent / received | HTTP | Calibration | Actual state | Actual probability | Duration |
|---|---|---|---|---|---|---|
| N-001 | 120 / 120 | 200 | active | ALERT | 0.5782913482178926 | 6230 ms |
| N-002 | 120 / 120 | 200 | active | ALERT | 0.6103242479352572 | 11897 ms |
| N-003 | 120 / 120 | 200 | active | ALERT | 0.542088088309918 | 17919 ms |

Input timestamps: 15:57:52.389–15:58:22.140 UTC. API completion: 15:58:28.703–15:58:40.810 UTC. Exact UI values matched server logs. Observed N-001 states: Simulation paused → Awaiting API timing → Prediction in progress → Next prediction batch (est.) ~00:07 → Simulation paused. The ~00:07 was the remaining scheduler time, not a new 30-second delay from completion. These existing subjects were already calibrated, so live calibration/window progression was not claimed or forced with a reset.

43 focused tests passed, including 10 countdown cases: actual calibration countdown/one-second progress, 240-sample window and 30-second schedule, in-flight state, active success, timeout/failure quarantine, sleeping tab, overdue dispatch, absent timing, calibration confirmation, pause, whitelisted metadata and MM:SS formatting. Calibration/window/error behavior is verified by deterministic tests, not claimed as a new live 8.5-minute model experiment.

Browser: no page errors; timer and per-nurse states screenshot-checked. No page horizontal overflow at 950×639. At 390×844 the existing top navigation extends beyond the viewport; the new timer wraps within the content and no unrelated navigation redesign was made. Automatic build: OK.

## Preservation and limitations

Existing 4 Hz sampling, values, 30-second batches, 7.5-minute calibration, 60-second window, predictions/probabilities, charts, alerts, persisted duplicate protection and server-only Hugging Face requests remain unchanged. Only bounded existing timing metadata is exposed; raw provider details and credentials are not returned.

No remote read-only per-subject acknowledgement endpoint exists. Reloads and uncertain remote outcomes cannot be reconciled safely with an invented countdown. OOD and model reliability limitations remain; this timer does not certify stress detection.