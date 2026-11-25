
import os
import json
import threading
import logging
import re
from datetime import datetime

import gradio as gr
import numpy as np

from Nurse_Stress_Detector_training import (
    ClassicalStressInferenceEngine,
    CFG,
)

MODEL_PATH = next(
    (
        p for p in [
            "classical_production_model.joblib",
            "classical_production_model.pth",
        ]
        if os.path.isfile(p)
    ),
    None,
)

engine = None
load_error = None
lock = threading.Lock()

try:
    if MODEL_PATH is None:
        raise FileNotFoundError(
            "Upload classical_production_model.pth "
            "or classical_production_model.joblib"
        )

    engine = ClassicalStressInferenceEngine(
        MODEL_PATH, CFG
    )
    print("Model loaded:", MODEL_PATH)

except Exception as exc:
    load_error = str(exc)
    print("Model loading failed:", load_error)


logger = logging.getLogger("nurse_stress_api")
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(logging.StreamHandler())


def diagnostic_subject(value):
    value = str(value or "")
    return value if re.fullmatch(r"[A-Za-z0-9_-]{1,40}", value) else None


REQUIRED = [
    "eda", "hr", "temp",
    "acc_x", "acc_y", "acc_z"
]


def parse_timestamp(value):
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(
            value, tz=__import__("datetime").timezone.utc
        )

    if not isinstance(value, str):
        raise ValueError(
            "timestamp must be an ISO datetime string"
        )

    return datetime.fromisoformat(
        value.replace("Z", "+00:00")
    )


def process_request(payload):
    subject_id = None
    if engine is None:
        logger.error(json.dumps({"event": "prediction_api_error", "subject_id": None, "error": "Model unavailable"}))
        return {
            "success": False,
            "error": "Model unavailable",
            "details": load_error,
        }

    try:
        if isinstance(payload, str):
            data = json.loads(payload)
        else:
            data = payload

        subject_id = str(
            data.get("subject_id", "")
        ).strip()

        if not subject_id:
            raise ValueError("subject_id is required")

        readings = data.get("readings")

        if readings is None:
            readings = [data]

        if not isinstance(readings, list) or not readings:
            raise ValueError(
                "readings must be a nonempty list"
            )

        processed = []

        for reading in readings:
            if not isinstance(reading, dict):
                raise ValueError(
                    "Each reading must be an object"
                )

            missing = [
                name for name in REQUIRED
                if name not in reading
            ]

            if missing:
                raise ValueError(
                    f"Missing fields: {missing}"
                )

            timestamp = parse_timestamp(
                reading["timestamp"]
            )

            values = {
                key: float(reading[key])
                for key in REQUIRED
            }

            if not all(
                np.isfinite(v)
                for v in values.values()
            ):
                raise ValueError(
                    "Sensor values must be finite"
                )

            processed.append((timestamp, values))

        # Preserve original sample order.
        for i in range(1, len(processed)):
            if processed[i][0] <= processed[i - 1][0]:
                raise ValueError(
                    "Timestamps must be strictly increasing"
                )

        with lock:
            state = engine.subjects_state.get(subject_id)
            if state:
                previous = (
                    state["window_buffer"][-1][0]
                    if state["window_buffer"]
                    else state["calib_start_time"]
                )
                if previous and processed[0][0] < previous:
                    raise ValueError(
                        "Readings are older than existing state"
                    )

            result = None

            for timestamp, values in processed:
                result = engine.update_subject(
                    subject_id=subject_id,
                    timestamp=timestamp,
                    **values,
                )

        result = result or {}

        response = {
            "success": True,
            "subject_id": subject_id,
            "samples_received": len(processed),
            "calibration_status": result.get(
                "calibration_status"
            ),
            "state": result.get("state", "PENDING"),
            "high_stress_probability": result.get(
                "smoothed_probability"
            ),
            "raw_probability": result.get(
                "raw_probability"
            ),
            "alert_triggered": result.get(
                "alert_triggered", False
            ),
            "out_of_distribution": result.get(
                "out_of_distribution"
            ),
            "details": result,
        }
        logger.info(json.dumps({
            "event": "prediction_api_success",
            "subject_id": diagnostic_subject(subject_id),
            "samples_received": response["samples_received"],
            "calibration_status": response["calibration_status"],
            "returned_state": response["state"],
            "returned_probability": response["high_stress_probability"],
            "raw_probability": response["raw_probability"],
        }, default=str))
        return response

    except (ValueError, KeyError, TypeError) as exc:
        logger.error(json.dumps({"event": "prediction_api_error", "subject_id": diagnostic_subject(subject_id), "error": "Invalid prediction request", "error_type": type(exc).__name__}))
        return {
            "success": False,
            "error": str(exc),
        }

    except Exception as exc:
        logger.error(json.dumps({"event": "prediction_api_error", "subject_id": diagnostic_subject(subject_id), "error": "Internal prediction error", "error_type": type(exc).__name__}))
        return {
            "success": False,
            "error": "Internal prediction error",
        }


def reset_subject(subject_id):
    if engine is None:
        return {"success": False, "error": load_error}

    subject_id = str(subject_id).strip()

    if not subject_id:
        return {
            "success": False,
            "error": "subject_id is required",
        }

    with lock:
        engine.initialize_subject(subject_id)

    return {
        "success": True,
        "subject_id": subject_id,
        "status": "reset",
    }


def health_check():
    return {
        "status": "ready" if engine else "error",
        "model_loaded": engine is not None,
        "model_file": MODEL_PATH,
        "calibration_minutes": CFG.calibration_minutes,
        "sample_rate_hz": CFG.target_hz,
        "window_seconds": CFG.window_seconds,
        "classes": ["NORMAL", "HIGH_STRESS"],
    }


example = json.dumps(
    {
        "subject_id": "N-001",
        "timestamp": "2026-10-24T10:00:00+00:00",
        "eda": 2.4,
        "hr": 92,
        "temp": 36.5,
        "acc_x": 0.1,
        "acc_y": 0.2,
        "acc_z": 0.9,
    },
    indent=2,
)

with gr.Blocks(
    title="Nurse Stress Detection API"
) as demo:

    gr.Markdown(
        "# Nurse Stress Detection\n"
        "Classical ML model for sustained HIGH stress.\n\n"
        "Requires 7.5-minute personal calibration "
        "followed by a 60-second sensor window "
        "sampled at approximately 4 Hz."
    )

    with gr.Tab("Prediction"):
        sensor_input = gr.Textbox(
            label="Sensor JSON",
            value=example,
            lines=13,
        )

        output = gr.JSON(label="Model Response")

        predict_button = gr.Button(
            "Submit Sensor Data",
            variant="primary",
        )

        predict_button.click(
            fn=process_request,
            inputs=sensor_input,
            outputs=output,
            api_name="predict",
        )

    with gr.Tab("Health"):
        health_output = gr.JSON()
        gr.Button("Check Model").click(
            fn=health_check,
            outputs=health_output,
            api_name="health",
        )

    with gr.Tab("Reset Nurse"):
        nurse_id = gr.Textbox(
            label="Nurse ID"
        )
        reset_output = gr.JSON()

        gr.Button("Reset State").click(
            fn=reset_subject,
            inputs=nurse_id,
            outputs=reset_output,
            api_name="reset_subject",
        )

demo.queue(default_concurrency_limit=1)
demo.launch()
