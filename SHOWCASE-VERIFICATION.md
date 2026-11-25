# Three-nurse showcase — 24 October 2026

## Inspected model source
Public Space revision: `a8d2c7a15c039c36d8e3e2fb0cd2d06b0d4cf874`.
Sources: https://huggingface.co/spaces/aahsann/JUSTNOva_Deepfake_Detector/blob/a8d2c7a15c039c36d8e3e2fb0cd2d06b0d4cf874/Nurse_Stress_Detector_training.py and its app.py.

The deployed classical engine uses EDA tonic/phasic peaks, HR/temperature statistics, acceleration magnitude/jerk, frequencies and personal-relative median/IQR features; absolute-unit features also remain. Calibration is 450 seconds of timestamps, followed by 240 additional samples (~60 s at 4 Hz). Actual statuses are calibrating, collecting_window and active. Its actual states are NORMAL/ALERT, not the health endpoint's advertised HIGH_STRESS. No model or configuration was modified.

## Sensor profiles
All three get smooth baseline waveforms during at least 450 seconds of acknowledged showcase baseline, even if the remote subject was already active. Elevation additionally requires actual collecting_window/active status, and transitions over 60 seconds without reset. State, probability and alert are exclusively remote outputs. Standard five-nurse generation remains available unchanged.

| Profile | HR baseline | EDA baseline | Peripheral skin temperature baseline |
|---|---:|---:|---:|
| N-001 | 74 bpm | 4.5 µS | 36.6°C |
| N-002 | 68 bpm | 3.1 µS | 36.4°C |
| N-003 | 70 bpm | 3.8 µS | 36.5°C |

After baseline, N-001/N-002 gradually add 22 bpm and 2.2 µS tonic EDA, reduce temperature by 0.35°C, increase smooth movement amplitude from 0.045 to 0.10, and increase smooth SCR-like pulse amplitude/frequency. HR has 6-second and 47-second oscillations; EDA has slow tonic modulation plus smooth rise/decay pulses; temperature changes slowly. N-003 remains baseline-like. Acceleration stays near x/y zero and z one in the existing simulator scale, without arbitrary extreme values or discontinuous white-noise bursts.

**Distribution limitation:** public training source preserves raw acceleration scale and does not document its units. Training CSV/distributions and artifact scaler statistics are not available for safe verification; g-versus-raw-E4 scaling cannot be certified. These are physiologically plausible synthetic hypotheses, not proven in-distribution training examples. Dataset study: https://www.nature.com/articles/s41597-022-01361-y . Exact merged CSV samples/unit documentation are needed before claiming in-distribution input.

## Actual authenticated website verification
Ran the real showcase for over nine minutes at 4 Hz with 30-second batches; no fake clock, mock response, reset, changed timestamp cadence or model bypass. Accepted timestamps: 17:17:46.380–17:26:46.131 UTC. All final values below were screenshot-confirmed in the nurse cards.

| Subject | Accepted samples | Successful calls | Failed calls | API calibration | Actual final state | Actual final probability |
|---|---:|---:|---:|---|---|---:|
| N-001 | 2160 | 18 | 0 | active | ALERT | 0.4781484700073648 |
| N-002 | 2160 | 18 | 0 | active | ALERT | 0.5396721717108548 |
| N-003 | 2160 | 18 | 0 | active | ALERT | 0.5358226505182819 |

54 successful HTTP-200 calls, 6480 accepted samples, no API errors. All subjects were already active on the FIRST response due to previously accumulated remote calibration. Their existing calibration was preserved; fresh calibrating→collecting_window→active progression was therefore **not** verified against these existing IDs. The website still held the new baseline until its own acknowledged 450 seconds before elevating N-001/N-002. No automatic recalibration was attempted.

Normal-control N-003 also returned ALERT and out_of_distribution:true. N-002 was also out of distribution on the final response. The model's OOD guard skips state transitions and can retain prior ALERT state, so this does not prove a successful elevated-vs-normal separation. Existing baseline from earlier simulations differs from the showcase baseline; without resetting, it cannot be replaced. Unverified acceleration units and stylized synthetic features are additional explanations. No NORMAL value or alert transition was invented; `alert_triggered` remained false on the final responses.

UI: default three-nurse showcase, standard mode still includes N-004/N-005, exact probabilities displayed, no browser page errors, no horizontal overflow at 950×639. Targeted automated tests cover baseline gating, three-vs-five IDs, gradual elevation, unchanged control, window constants, real PENDING calibration mapping and existing transport safeguards.

## Remaining verification
- Fresh remote 7.5-minute calibration cannot be proven using already-calibrated N-001..N-003 without resetting them (prohibited). A separately authorized fresh subject session would be required.
- Confirm exact merged-training acceleration units and reference feature distributions before claiming inputs are in distribution.
- Remote logging deployment and idempotent timeout recovery remain dependent on Hugging Face access/contract changes; existing uncertainty protection is preserved.