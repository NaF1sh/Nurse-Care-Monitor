# Three-fresh-subject validation — 25 October 2026

## Scope and evidence

This is an isolated synthetic-input experiment, not a clinical validation. Existing N-001…N-005 subjects, their calibration, the showcase UI, trained model and thresholds were not reset or changed. The command-line harness uses the existing server-side Gradio transport; it does not write nurse records or predictions to the application database.

Public source revision inspected: `a8d2c7a15c039c36d8e3e2fb0cd2d06b0d4cf874`.

- [Training/inference source](https://huggingface.co/spaces/aahsann/JUSTNOva_Deepfake_Detector/blob/a8d2c7a15c039c36d8e3e2fb0cd2d06b0d4cf874/Nurse_Stress_Detector_training.py)
- [Space application](https://huggingface.co/spaces/aahsann/JUSTNOva_Deepfake_Detector/blob/a8d2c7a15c039c36d8e3e2fb0cd2d06b0d4cf874/app.py)
- [Published artifact](https://huggingface.co/spaces/aahsann/JUSTNOva_Deepfake_Detector/resolve/a8d2c7a15c039c36d8e3e2fb0cd2d06b0d4cf874/classical_production_model.joblib)

Downloaded artifact SHA-256: `bbc1c6d8178503d5aa45afc70995ce0f5e2848824be4f15b9ee0933c9da02cc3`; 97,700,394 bytes. Metadata and reference arrays were inspected statically, without unpickling, loading the model, or executing reducers. The API does not return its running revision or artifact hash, so source-to-running-container identity is not independently certified.

## Exact training and inference behavior

### Preprocessing and windows

Training source lines 315–433: load the merged CSV, rename X/Y/Z, normalize subject IDs, remove consecutive same-subject duplicates across the six sensor channels, aggregate means into subject-relative 250 ms bins, use modal labels, derive acceleration magnitude, cast channels to float32, and split gaps greater than 5 seconds. There is no interpolation across empty bins or documented unit conversion.

Lines 466–547: windows are 240 samples with 60-sample training stride (nominal 60 seconds / 15 seconds). A window is HIGH_STRESS when at least 50% of labels equal 2; labels 0 and 1 otherwise fall into the binary negative class. Personal baseline uses the first 450 elapsed seconds, inclusive, with median/IQR/mean/population standard deviation; IQR/std floors are 1e-6. Training windows beginning before calibration ends are excluded.

Runtime lines 2090–2117: accepts the already sampled stream without resampling, deduplication or gap blocking. Fresh subjects initialize NORMAL internally but the API reports PENDING while calibrating. The sample at elapsed 450 seconds completes calibration and still reports calibrating; it does not enter the prediction buffer. Another 240 samples are required. At exact 4 Hz starting at t=0, the baseline contains 1,801 samples and the first prediction occurs at t=510 seconds. Every subsequent sample triggers a prediction, not every 15-second training stride.

### Features and scaling

The deployed classical stacking model uses **109 handcrafted features** (lines 589–726), not the CNN raw-channel branch:

- 13 statistics each for EDA, HR, TEMP and ACC_MAG: mean, median, std, IQR, min, max, range, coefficient of variation, sample-index slope, first/second difference RMS, p10/p90.
- Eight EDA tonic/phasic/SCR features: 16-sample moving-average tonic with zero-padded `same` convolution, phasic std, peak count/density/amplitude mean/std/inter-peak interval/active fraction; peak height 0.01 input units and minimum separation four samples.
- Two HR features: acceleration/deceleration asymmetry and fraction above the current window mean; no beat-to-beat HRV or RMSSD.
- Three extra acceleration features: magnitude jerk RMS, zero-crossing rate and axis variability asymmetry.
- Six FFT features per EDA/HR/TEMP/ACC_MAG: dominant frequency, centroid, entropy, LF [0.01,0.15), HF [0.15,0.4), and LF/HF ratio.
- Five personal-relative features each for EDA/HR/TEMP/ACC_MAG: window mean (`baseline_abs`), delta from baseline median, absolute delta, relative change, and delta/baseline IQR.

Runtime lines 2123–2136: order the feature vector by artifact names, use zero for absent names, apply `nan_to_num`, standardize by stored training mean/scale, then evaluate stacking probabilities and IsolationForest. CNN robust raw-channel clipping at ±8 does **not** apply to this classical path.

### Probability and alert logic

Static artifact metadata gives actual enter threshold **0.13**; runtime clear threshold is **0.05**, not the configured default enter value 0.70. Lines 2064–2067 and 2138–2156:

- EMA initializes to the first raw probability, then `EMA = 0.3 × raw + 0.7 × previous EMA`.
- NORMAL enters ALERT after three eligible above-threshold prediction updates. At 4 Hz these are overlapping windows and can span only 0.5 seconds after the first prediction, not three independent minutes.
- ALERT clears only when an eligible EMA is strictly below 0.05.
- Alert cooldown is 600 seconds.
- OOD is IsolationForest prediction -1. It still updates EMA, but skips enter/clear logic and does not reset the previous consecutive-high count. It can preserve a previous ALERT or NORMAL state.
- `alert_triggered` describes the transition on the final processed sample, not whether an alert occurred anywhere inside a 120-sample batch. The endpoint returns only the final update, so intermediate events cannot be counted from batch replies.

The source fits a 200-tree IsolationForest with contamination 0.05. The stored artifact's metadata claims pooled AUROC 0.4982 and MCC 0.1466 and says it was resumed after a crash and trained on all subjects. These are artifact claims, not reproduced independent performance. They do not justify treating returned probabilities as clinical confidence.

## Input support and limitations

Neither the training source nor public API defines empirical permissible sensor ranges or performs unit conversion. Website admission bounds (HR 20–250, temperature 25–45, EDA 0–100, acceleration ±50) are safety checks, **not training-distribution evidence**. The training CSV, per-class feature quantiles and exact acceleration export units are not published in the Space.

The experiment uses the existing smooth N-001 baseline waveform for all three new IDs: HR center 74, EDA center 4.5, peripheral-temperature center 36.6, acceleration x/y near zero and z near one in the simulator's existing scale. Baseline variation is retained to avoid a zero-IQR calibration. Intended stress profiles gradually add 22 HR and 2.2 EDA, reduce temperature by 0.35, and increase smooth movement/pulse activity over 60 seconds. These are plausible synthetic hypotheses, **not confirmed in-distribution physiological recordings**. No units, thresholds or values were adjusted to force outputs.

## Experiment protocol

- Fresh IDs: `V-1dc5acbe-1`, `V-1dc5acbe-2`, `V-1dc5acbe-3`; no reset endpoint used.
- Actual start: 2026-10-25 03:58:20.580 UTC.
- Exact identical six-channel inputs and timestamp phase for all subjects through 540 seconds, including calibration and a complete baseline prediction window.
- At the first eligible batch after 540 seconds, elevate subjects 1/2 only, requiring all three actual `active` statuses and at least 2,160 explicitly acknowledged samples per subject. Subject 3 remains the same baseline waveform.
- 250 ms chronological timestamps, 120-sample/30-second batches, 240-sample runtime windows; 32 planned batches per subject (16 minutes), including a 60-second ramp and six subsequent minutes.
- Samples are submitted only after their scheduled real clock interval has elapsed; no accelerated clock, future timestamps, reset, request replay or model bypass.
- One outstanding request per subject. Unknown/mismatched acknowledgement pauses the subject, with no blind retry.
- Accepted counts use actual `samples_received`, not sent counts. Actual raw/smoothed probabilities, state, calibration, alert flag, OOD and API failures are recorded per reply. Missing OOD during PENDING is null in raw server logs, not a confirmed false value.

## Results

**Completed:** timestamped inputs 03:58:20.580–04:14:20.330 UTC; last API reply 04:14:37.517 UTC. **96 successful completed requests, 11,520 explicitly acknowledged samples, zero failed requests, zero uncertain outcomes.** Each subject received 32 batches / 3,840 samples. Every adjacent input timestamp was exactly 250 ms apart, with no ties or gaps. Three identical baseline streams and the two identical elevated streams yielded matching replies across subjects 1/2.

| Fresh subject | Intended input | Accepted | Final calibration | Actual final state | Actual raw probability | Actual EMA | Final alert_triggered | Final OOD |
|---|---|---:|---|---|---:|---:|---|---|
| V-1dc5acbe-1 | Elevated | 3,840 | active | ALERT | 0.5008216833868215 | 0.49421491759378344 | false | true |
| V-1dc5acbe-2 | Elevated | 3,840 | active | ALERT | 0.5008216833868215 | 0.49421491759378344 | false | true |
| V-1dc5acbe-3 | Baseline control | 3,840 | active | NORMAL | 0.5550896575324432 | 0.5545719841891852 | false | true |

### Actual progression

- Batches 1–15: all three `calibrating`, PENDING, no probability; 1,800 acknowledged samples at batch 15.
- Batches 16–17: all three `collecting_window`, PENDING; actual transition from fresh calibration verified.
- Batch 18: all three `active`, NORMAL, raw 0.5607145653235667 / EMA 0.562204282770966, OOD true. This is the end of the shared 540-second baseline.
- Elevation began at timestamp **04:07:20.580 UTC**, only after all subjects were actually active and had acknowledged 2,160 baseline samples.
- Batch 19: subjects 1/2 first returned ALERT, raw 0.5433789839779579 / EMA 0.5464476699352625, OOD false; control returned NORMAL, raw 0.5407661124984688 / EMA 0.5391920722727668, OOD true.
- Batches 19–32: elevated subjects remained ALERT in every reply; control remained NORMAL. Elevated subjects were OOD in 10/15 active replies; control was OOD in **15/15** active replies. Across all three, 35/45 active replies were OOD.
- Every final-sample `alert_triggered` flag was false. The observed NORMAL→ALERT change proves the returned state changed within batch 19; the endpoint does not expose which intermediate sample triggered it. No individual alert event time/count was invented.

### Does this prove separation?

**Observed returned states separated: yes—ALERT / ALERT / NORMAL on fresh IDs. Reliable stress-versus-normal discrimination: not established.**

The control's raw/EMA probability was above the actual 0.13 enter threshold throughout the active replies and its final probability was **higher**, not lower, than those of the intended elevated subjects. Its NORMAL state coincided with every returned control window being OOD. The source's OOD guard can preserve freshly initialized NORMAL despite high probability, just as it can preserve earlier ALERT for reused subjects. Elevated subjects had some eligible non-OOD updates and entered ALERT; later OOD updates retained that state. The evidence supports OOD eligibility plus state history as an important explanation—not clean probability separation. Batch-final OOD flags do not reveal every intermediate sample's OOD decision, so exact transition causality remains inferred from source and returned states rather than fully traced.

The earlier all-ALERT result is consistent with reused ALERT state being retained under OOD, but this run does not prove the exact historical cause for N-001…N-003. Those subjects were never inspected destructively or reset.

## Actual distributions and feature comparison

The same inspected pure numerical feature functions were applied offline to the actual sent samples, in float32 channel order, with the first 1,801 samples forming the runtime baseline. No local classifier was run. All reported classifications/probabilities above come exclusively from Hugging Face.

| Channel | Shared calibration min–max | Sustained elevated min–max | Training reference |
|---|---|---|---|
| HR | 69.60–78.40 | 92.40–99.60 | Window-mean training mean 85.8390, scale 13.6709 |
| EDA | 4.320–4.774 | 6.520–7.312 | Window-mean training mean 3.5461, scale 5.6975 |
| TEMP | 36.530–36.670 | 36.180–36.320 | Window-mean training mean 32.2289, scale 2.2661 |
| ACC_MAG | 0.9484–1.0538 | 0.9151–1.0930 | Window-mean training mean **64.5099**, scale **4.3689** |

These stored scaler values summarize training **features**, not empirical sensor min/max or class-conditional support. They establish a strong acceleration-scale mismatch without establishing the exact correct raw units; no 64× conversion was guessed or applied to force a result.

At the final shared-baseline window (t=539.75 s):

- ACC_MAG mean 1.000672 versus training 64.509866 ± scale 4.368885: standardized value **−14.54**.
- HR dominant frequency 0.166667 Hz versus training 0.017594 ± scale 0.004196: **+35.53**.
- TEMP LF/HF ratio 4,541.673 versus training 12.231 ± scale 11.534: **+392.69**.
- EDA LF/HF ratio 167.906 versus training 10.828 ± scale 11.945: **+13.15**.
- Fifteen distinct baseline features exceeded three stored training scales. These standardized deviations are descriptive, not a substitute for the learned IsolationForest decision.

Sustained elevation did not remove these mismatches: acceleration mean remained near 1 rather than 64.5; HR dominant frequency remained 0.166667; temperature LF/HF reached standardized +392.14. Smooth but highly periodic synthetic inputs produce narrow spectral support; unusually tiny HF power makes LF/HF ratios large. Physiological-looking HR/EDA alone does not make the joint feature vector representative of training. The simulator's temperature baseline also differs from the training window-mean center, and personal-relative features cannot remove retained absolute-unit/spectral features.

### Remaining evidence needed

To establish valid discrimination, obtain the actual training CSV/export transformation and acceleration units, empirical per-subject/per-class sensor and feature quantiles, and untouched real multichannel recordings. Then validate at unchanged 0.13/0.05 thresholds with OOD rates, calibration, false alerts and probability ranking—not merely desired state labels. The artifact's low stored pooled AUROC (0.4982), non-independent threshold selection and source/artifact provenance caveats further limit confidence; no retraining or threshold change was made.

## Retained evidence and repeatability

`validation/2026-10-25/` contains the run manifest, finished progress, all 96 actual bounded API outcome logs, per-batch results, cadence audit, sensor summaries, extracted feature windows and statically recovered training reference. Calibration-time missing OOD is preserved as null in these logs/results, not rewritten to false. Raw generated inputs were kept in the temporary audit workspace; their exact timestamps and deterministic waveform can be reconstructed from the manifest and generator. No credentials or patient data are in the evidence.

Repeat with `bun scripts/validate-showcase.ts /tmp/validation/<new-run>`; each invocation creates fresh UUID-based subjects and never calls reset. The experiment takes real elapsed time and finishes before results are claimed. Existing showcase remains untouched and available separately.

## Website and automated checks

Authenticated browser inspection confirmed the unchanged existing three-nurse showcase and standard-simulation controls remain available, without page errors. No existing simulation was started by this inspection. Thirty-three targeted tests pass: input generation, unchanged control, calibration gating, 4 Hz/30-second batches, acknowledgement diagnostics, actual response mapping, transport ordering and uncertainty safeguards.