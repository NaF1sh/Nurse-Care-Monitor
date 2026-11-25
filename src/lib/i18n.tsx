import type React from "react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Lang = "en" | "bn";

const en = {
  "app.name": "NurseCare Monitor",
  "nav.dashboard": "Dashboard",
  "nav.nurses": "Nurses",
  "nav.actions": "Manual Actions",
  "nav.predictions": "Predictions",
  "nav.simulation": "Live Simulation",
  "nav.logout": "Logout",

  "stress.normal": "Normal",
  "stress.moderate": "Moderate",
  "stress.high": "High",
  "stress.unknown": "Unknown",
  "stress.stale": "Stale",
  "stress.none": "No prediction yet",

  "login.title": "Nurse Stress Monitor",
  "login.subtitle.signin": "Sign in to continue",
  "login.subtitle.signup": "Create a supervisor account",
  "login.subtitle.forgot": "Reset your password",
  "login.name": "Full name",
  "login.email": "Email",
  "login.password": "Password",
  "login.forgot": "Forgot password?",
  "login.submit.signin": "Sign in",
  "login.submit.signup": "Create account",
  "login.submit.forgot": "Send reset link",
  "login.switch.toSignup": "New supervisor? Create an account",
  "login.switch.toSignin": "Back to sign in",
  "login.error.reset": "Could not send reset email. Try again.",
  "login.info.resetSent": "If that email has an account, a reset link is on its way.",
  "login.error.signin": "Wrong email or password, or email not confirmed yet.",
  "login.info.signup": "Check your email to confirm your account, then sign in.",

  "reset.title": "Set a new password",
  "reset.ready": "Enter your new password below",
  "reset.notReady": "Open this page from the reset link in your email.",
  "reset.newPassword": "New password",
  "reset.confirmPassword": "Confirm password",
  "reset.mismatch": "Passwords do not match.",
  "reset.failed": "Could not update password. The link may have expired.",
  "reset.updated": "Password updated",
  "reset.submit": "Update password",

  "common.loading": "Loading…",

  "dash.error": "Could not load nurses.",
  "dash.stats.total": "Total Nurses",
  "dash.stats.normal": "Normal",
  "dash.stats.moderate": "Moderate Stress",
  "dash.stats.high": "High Stress",
  "dash.disclaimer": "Stress levels are AI estimates, not medical diagnoses.",
  "dash.table.nurse": "Nurse",
  "dash.table.ward": "Ward",
  "dash.table.status": "Status",
  "dash.table.lastUpdate": "Last update",
  "dash.empty": "No nurses to show yet.",

  "pred.title": "Prediction Summary",
  "pred.error": "Could not load predictions.",
  "pred.stat.total": "Total Predictions",
  "pred.stat.errors": "API Errors",
  "pred.perNurse": "Summary per nurse",
  "pred.total": "Predictions",
  "pred.highCount": "High stress",
  "pred.recent": "Recent predictions",

  "nurses.search": "Search by name or ID",
  "nurses.allWards": "All wards",
  "nurses.add": "Add nurse",
  "nurses.table.id": "Nurse ID",
  "nurses.table.name": "Name",
  "nurses.table.ward": "Ward",
  "nurses.table.supervisor": "Supervisor",
  "nurses.table.device": "Device",
  "nurses.table.status": "Status",
  "nurses.table.actions": "Actions",
  "nurses.empty": "No nurses found.",
  "nurses.unassigned": "Unassigned",
  "nurses.inactive": "Inactive",
  "nurses.edit": "Edit",
  "nurses.deactivate": "Deactivate",
  "nurses.activate": "Activate",
  "nurses.deactivated": "Nurse deactivated",
  "nurses.activated": "Nurse activated",
  "nurses.saved": "Nurse saved",
  "nurses.dialog.editTitle": "Edit nurse",
  "nurses.dialog.addTitle": "Add nurse",
  "nurses.dialog.nurseId": "Nurse ID",
  "nurses.dialog.name": "Name",
  "nurses.dialog.ward": "Ward",
  "nurses.dialog.supervisor": "Supervisor",
  "nurses.dialog.device": "Device code",
  "nurses.dialog.cancel": "Cancel",
  "nurses.dialog.save": "Save",

  "detail.back": "Back",
  "detail.info": "Nurse information",
  "detail.latestReading": "Latest sensor reading",
  "detail.latestPrediction": "Latest AI prediction",
  "detail.notFound": "Nurse not found or not assigned to you.",
  "detail.noReadings": "No sensor readings received yet.",
  "detail.recorded": "Recorded {time}",
  "detail.stale": "stale",
  "detail.metric.heartRate": "Heart rate",
  "detail.metric.temperature": "Temperature",
  "detail.metric.accelX": "Accel X",
  "detail.metric.accelY": "Accel Y",
  "detail.metric.accelZ": "Accel Z",
  "detail.noPrediction": "No prediction yet.",
  "detail.apiError": "API error — no estimate available.",
  "detail.confidence": "Confidence",
  "detail.modelVersion": "Model version",
  "detail.timestamp": "Timestamp",
  "detail.aiOnly": "AI estimate only — not a medical diagnosis.",
  "detail.notProvided": "Not provided",
  "detail.history": "Prediction history",
  "detail.historyNote": "Oldest to newest. AI estimates only.",
  "detail.table.time": "Time",
  "detail.table.stress": "Stress",
  "detail.table.confidence": "Confidence",
  "detail.table.model": "Model",
  "detail.table.api": "API",
  "detail.noPredictions": "No predictions yet.",
  "detail.recordAction": "Record manual action",
  "detail.inactiveNoActions": "This nurse is inactive. Actions cannot be added.",
  "detail.actionHistory": "Action history",
  "detail.table.action": "Action",
  "detail.table.notes": "Notes",
  "detail.table.by": "By",
  "detail.noActions": "No actions recorded yet.",
  "detail.linkedPrediction": "linked to prediction",
  "detail.field.name": "Name",
  "detail.field.nurseId": "Nurse ID",
  "detail.field.ward": "Ward",
  "detail.field.supervisor": "Supervisor",
  "detail.field.device": "Device",
  "detail.field.status": "Status",
  "detail.active": "Active",
  "detail.inactive": "Inactive",

  "actions.record": "Record action",
  "actions.nurse": "Nurse",
  "actions.selectNurse": "Select nurse",
  "actions.selectToRecord": "Select a nurse to record an action.",
  "actions.previous": "Previous actions",
  "actions.empty": "No actions yet.",
  "actions.table.time": "Time",
  "actions.table.nurse": "Nurse",
  "actions.table.action": "Action",
  "actions.table.notes": "Notes",
  "actions.table.by": "By",

  "actionform.action": "Action",
  "actionform.notes": "Notes (optional)",
  "actionform.saving": "Saving…",
  "actionform.save": "Save Action",
  "actionform.saved": "Action saved",

  "action.checked": "Checked nurse",
  "action.recommend_rest": "Recommend rest",
  "action.follow_up": "Follow-up",
  "action.other": "Other action",

  "sim.view.showcase": "3-nurse showcase",
  "sim.view.standard": "Standard simulation",
  "sim.demoBanner": "DEMO MODE — SYNTHETIC DATA — NOT REAL PATIENT DATA",
  "sim.stop": "Stop Simulation",
  "sim.start": "Start Simulation",
  "sim.resetting": "Resetting nurses…",
  "sim.runningInfo": "Next update in {next} · streaming 4 Hz · {count} samples sent",
  "sim.waiting": "waiting",
  "sim.modelReady": "Model ready",
  "sim.modelUnavailable": "Model unavailable",
  "sim.checkingModel": "Checking model…",
  "sim.alertAfter": "Alert after",
  "sim.consecHigh": "consecutive high predictions",
  "sim.apiErrorPrefix": "API ERROR",
  "sim.modelReports": "Model reports: {calibration} · {window} · {first}",
  "sim.calibration": "{min} min calibration",
  "sim.calibrationNotReported": "calibration time not reported",
  "sim.window": "{sec} s window",
  "sim.windowNotReported": "window not reported",
  "sim.first": "first prediction ~{time} after start",
  "sim.firstNotReported": "first prediction time not reported",
  "sim.elapsed": "elapsed {time}",
  "sim.resetNote": "each new start resets N-001–N-003 once",
  "sim.nextPredictionIn": "Next Prediction In",
  "sim.lastRequest": "Last successful Hugging Face request {time} · Returned subject ID: {returned} · Sent subject ID: {sent} · {samples} samples",
  "sim.notReturned": "Not returned by API",
  "sim.noRequest": "Hugging Face: no successful prediction request yet",
  "sim.stat.nurses": "Demo Nurses",
  "sim.stat.normal": "Normal",
  "sim.stat.moderate": "Moderate",
  "sim.stat.high": "High",
  "sim.stat.alerts": "Active Alerts",
  "sim.alerts.title": "Persistent high-stress alerts",
  "sim.alerts.since": "since {time}",
  "sim.alerts.acknowledge": "Acknowledge",
  "sim.alerts.resolve": "Resolve",
  "sim.alertStatus.active": "active",
  "sim.alertStatus.acknowledged": "acknowledged",
  "sim.alertStatus.resolved": "resolved",
  "sim.simulatedDevice": "SIMULATED DEVICE",
  "sim.inputProfile": "Input profile",
  "sim.profile.control": "Normal control",
  "sim.profile.elevated": "Sustained elevated-stress",
  "sim.profile.baseline": "Baseline · elevated-stress pending",
  "sim.noReading": "No reading yet — start the simulation.",
  "sim.metric.heartRate": "Heart rate",
  "sim.metric.skinTemp": "Skin temp",
  "sim.metric.eda": "EDA",
  "sim.metric.accelX": "Accel X",
  "sim.metric.accelY": "Accel Y",
  "sim.metric.accelZ": "Accel Z",
  "sim.modelState": "Model state {state}",
  "sim.highProb": "High-stress probability {prob}",
  "sim.rawProb": "Raw probability {raw}",
  "sim.ood": "Out of distribution: {value}",
  "sim.modelAlert": "Model alert: {value}",
  "sim.lastSuccess": "Last success {time}",
  "sim.yes": "yes",
  "sim.no": "no",
  "sim.lastReading": "Last reading {time}",
  "sim.acceptedSamples": "Accepted samples: {count}",
  "sim.apiCalibration": "API calibration: {value}",
  "sim.notReceived": "Not received",
  "sim.chart.title": "Stress history (Hugging Face results)",
  "sim.chart.empty": "The graph fills in once the simulation is running.",
  "sim.collecting": "Collecting 4 Hz samples…",
  "sim.calibrating": "Calibrating",

  "clock.paused": "PAUSED",
  "clock.request": "PROCESSING",
  "clock.error": "API ERROR",
  "clock.waiting": "WAITING",
  "clock.calibration": "CALIBRATING",
  "clock.window": "COLLECTING DATA",
  "clock.ready": "PREDICTION READY",

  "clocklabel.Prediction in progress": "Prediction in progress",
  "clocklabel.Outcome uncertain — requests paused": "Outcome uncertain — requests paused",
  "clocklabel.API timeout": "API timeout",
  "clocklabel.API error": "API error",
  "clocklabel.Simulation paused": "Simulation paused",
  "clocklabel.Waiting for model": "Waiting for model",
  "clocklabel.Waiting for sensor samples": "Waiting for sensor samples",
  "clocklabel.Awaiting API timing": "Awaiting API timing",
  "clocklabel.Calibration timing unavailable": "Calibration timing unavailable",
  "clocklabel.Calibration remaining (est.)": "Calibration remaining (est.)",
  "clocklabel.Awaiting calibration confirmation": "Awaiting calibration confirmation",
  "clocklabel.Batch delayed — waiting for dispatch": "Batch delayed — waiting for dispatch",
  "clocklabel.Window timing unavailable": "Window timing unavailable",
  "clocklabel.Window ready / next batch (est.)": "Window ready / next batch (est.)",
  "clocklabel.Next prediction batch (est.)": "Next prediction batch (est.)",

  "fail.model_unavailable": "Model unavailable",
  "fail.timeout": "API timeout",
  "fail.api_error": "API error",
  "fail.invalid_response": "Invalid model response",
} as const;

export type StringKey = keyof typeof en;

const bn: Record<StringKey, string> = {
  "app.name": "নার্সকেয়ার মনিটর",
  "nav.dashboard": "ড্যাশবোর্ড",
  "nav.nurses": "নার্স",
  "nav.actions": "ম্যানুয়াল অ্যাকশন",
  "nav.predictions": "প্রেডিকশন",
  "nav.simulation": "লাইভ সিমুলেশন",
  "nav.logout": "লগআউট",

  "stress.normal": "স্বাভাবিক",
  "stress.moderate": "মাঝারি",
  "stress.high": "উচ্চ",
  "stress.unknown": "অজানা",
  "stress.stale": "পুরনো",
  "stress.none": "এখনো প্রেডিকশন নেই",

  "login.title": "নার্স স্ট্রেস মনিটর",
  "login.subtitle.signin": "চালিয়ে যেতে সাইন ইন করুন",
  "login.subtitle.signup": "সুপারভাইজার অ্যাকাউন্ট তৈরি করুন",
  "login.subtitle.forgot": "পাসওয়ার্ড রিসেট করুন",
  "login.name": "পুরো নাম",
  "login.email": "ইমেইল",
  "login.password": "পাসওয়ার্ড",
  "login.forgot": "পাসওয়ার্ড ভুলে গেছেন?",
  "login.submit.signin": "সাইন ইন",
  "login.submit.signup": "অ্যাকাউন্ট তৈরি করুন",
  "login.submit.forgot": "রিসেট লিংক পাঠান",
  "login.switch.toSignup": "নতুন সুপারভাইজার? অ্যাকাউন্ট তৈরি করুন",
  "login.switch.toSignin": "সাইন ইনে ফিরে যান",
  "login.error.reset": "রিসেট ইমেইল পাঠানো যায়নি। আবার চেষ্টা করুন।",
  "login.info.resetSent": "এই ইমেইলে অ্যাকাউন্ট থাকলে একটি রিসেট লিংক পাঠানো হয়েছে।",
  "login.error.signin": "ইমেইল বা পাসওয়ার্ড ভুল, অথবা ইমেইল এখনো নিশ্চিত হয়নি।",
  "login.info.signup": "আপনার ইমেইল চেক করে অ্যাকাউন্ট নিশ্চিত করুন, তারপর সাইন ইন করুন।",

  "reset.title": "নতুন পাসওয়ার্ড দিন",
  "reset.ready": "নিচে আপনার নতুন পাসওয়ার্ড লিখুন",
  "reset.notReady": "আপনার ইমেইলের রিসেট লিংক থেকে এই পেজে আসুন।",
  "reset.newPassword": "নতুন পাসওয়ার্ড",
  "reset.confirmPassword": "পাসওয়ার্ড নিশ্চিত করুন",
  "reset.mismatch": "পাসওয়ার্ড দুটি মিলছে না।",
  "reset.failed": "পাসওয়ার্ড বদলানো যায়নি। লিংকটির মেয়াদ শেষ হয়ে যেতে পারে।",
  "reset.updated": "পাসওয়ার্ড বদলানো হয়েছে",
  "reset.submit": "পাসওয়ার্ড বদলান",

  "common.loading": "লোড হচ্ছে…",

  "dash.error": "নার্সদের তথ্য আনা যায়নি।",
  "dash.stats.total": "মোট নার্স",
  "dash.stats.normal": "স্বাভাবিক",
  "dash.stats.moderate": "মাঝারি স্ট্রেস",
  "dash.stats.high": "উচ্চ স্ট্রেস",
  "dash.disclaimer": "স্ট্রেস লেভেল AI-এর অনুমান, চিকিৎসাগত রোগ নির্ণয় নয়।",
  "dash.table.nurse": "নার্স",
  "dash.table.ward": "ওয়ার্ড",
  "dash.table.status": "অবস্থা",
  "dash.table.lastUpdate": "শেষ আপডেট",
  "dash.empty": "এখনো দেখানোর মতো নার্স নেই।",

  "pred.title": "প্রেডিকশন সামারি",
  "pred.error": "প্রেডিকশন আনা যায়নি।",
  "pred.stat.total": "মোট প্রেডিকশন",
  "pred.stat.errors": "API ত্রুটি",
  "pred.perNurse": "প্রতি নার্সের সামারি",
  "pred.total": "প্রেডিকশন",
  "pred.highCount": "উচ্চ স্ট্রেস",
  "pred.recent": "সাম্প্রতিক প্রেডিকশন",

  "nurses.search": "নাম বা আইডি দিয়ে খুঁজুন",
  "nurses.allWards": "সব ওয়ার্ড",
  "nurses.add": "নার্স যোগ করুন",
  "nurses.table.id": "নার্স আইডি",
  "nurses.table.name": "নাম",
  "nurses.table.ward": "ওয়ার্ড",
  "nurses.table.supervisor": "সুপারভাইজার",
  "nurses.table.device": "ডিভাইস",
  "nurses.table.status": "অবস্থা",
  "nurses.table.actions": "অ্যাকশন",
  "nurses.empty": "কোনো নার্স পাওয়া যায়নি।",
  "nurses.unassigned": "অনির্ধারিত",
  "nurses.inactive": "নিষ্ক্রিয়",
  "nurses.edit": "এডিট",
  "nurses.deactivate": "নিষ্ক্রিয় করুন",
  "nurses.activate": "সক্রিয় করুন",
  "nurses.deactivated": "নার্স নিষ্ক্রিয় করা হয়েছে",
  "nurses.activated": "নার্স সক্রিয় করা হয়েছে",
  "nurses.saved": "নার্স সংরক্ষিত হয়েছে",
  "nurses.dialog.editTitle": "নার্স এডিট করুন",
  "nurses.dialog.addTitle": "নার্স যোগ করুন",
  "nurses.dialog.nurseId": "নার্স আইডি",
  "nurses.dialog.name": "নাম",
  "nurses.dialog.ward": "ওয়ার্ড",
  "nurses.dialog.supervisor": "সুপারভাইজার",
  "nurses.dialog.device": "ডিভাইস কোড",
  "nurses.dialog.cancel": "বাতিল",
  "nurses.dialog.save": "সংরক্ষণ",

  "detail.back": "ফিরে যান",
  "detail.info": "নার্সের তথ্য",
  "detail.latestReading": "সর্বশেষ সেন্সর রিডিং",
  "detail.latestPrediction": "সর্বশেষ AI প্রেডিকশন",
  "detail.notFound": "নার্স পাওয়া যায়নি বা আপনার সাথে যুক্ত নয়।",
  "detail.noReadings": "এখনো কোনো সেন্সর রিডিং আসেনি।",
  "detail.recorded": "রেকর্ড হয়েছে {time}",
  "detail.stale": "পুরনো",
  "detail.metric.heartRate": "হার্ট রেট",
  "detail.metric.temperature": "তাপমাত্রা",
  "detail.metric.accelX": "অ্যাক্সেল X",
  "detail.metric.accelY": "অ্যাক্সেল Y",
  "detail.metric.accelZ": "অ্যাক্সেল Z",
  "detail.noPrediction": "এখনো প্রেডিকশন নেই।",
  "detail.apiError": "API ত্রুটি — কোনো অনুমান পাওয়া যায়নি।",
  "detail.confidence": "কনফিডেন্স",
  "detail.modelVersion": "মডেল ভার্সন",
  "detail.timestamp": "সময়",
  "detail.aiOnly": "শুধু AI অনুমান — চিকিৎসাগত রোগ নির্ণয় নয়।",
  "detail.notProvided": "দেওয়া হয়নি",
  "detail.history": "প্রেডিকশন ইতিহাস",
  "detail.historyNote": "পুরনো থেকে নতুন। শুধু AI অনুমান।",
  "detail.table.time": "সময়",
  "detail.table.stress": "স্ট্রেস",
  "detail.table.confidence": "কনফিডেন্স",
  "detail.table.model": "মডেল",
  "detail.table.api": "API",
  "detail.noPredictions": "এখনো কোনো প্রেডিকশন নেই।",
  "detail.recordAction": "ম্যানুয়াল অ্যাকশন রেকর্ড করুন",
  "detail.inactiveNoActions": "এই নার্স নিষ্ক্রিয়। অ্যাকশন যোগ করা যাবে না।",
  "detail.actionHistory": "অ্যাকশন ইতিহাস",
  "detail.table.action": "অ্যাকশন",
  "detail.table.notes": "নোট",
  "detail.table.by": "করেছেন",
  "detail.noActions": "এখনো কোনো অ্যাকশন রেকর্ড হয়নি।",
  "detail.linkedPrediction": "প্রেডিকশনের সাথে যুক্ত",
  "detail.field.name": "নাম",
  "detail.field.nurseId": "নার্স আইডি",
  "detail.field.ward": "ওয়ার্ড",
  "detail.field.supervisor": "সুপারভাইজার",
  "detail.field.device": "ডিভাইস",
  "detail.field.status": "অবস্থা",
  "detail.active": "সক্রিয়",
  "detail.inactive": "নিষ্ক্রিয়",

  "actions.record": "অ্যাকশন রেকর্ড করুন",
  "actions.nurse": "নার্স",
  "actions.selectNurse": "নার্স নির্বাচন করুন",
  "actions.selectToRecord": "অ্যাকশন রেকর্ড করতে একজন নার্স নির্বাচন করুন।",
  "actions.previous": "আগের অ্যাকশন",
  "actions.empty": "এখনো কোনো অ্যাকশন নেই।",
  "actions.table.time": "সময়",
  "actions.table.nurse": "নার্স",
  "actions.table.action": "অ্যাকশন",
  "actions.table.notes": "নোট",
  "actions.table.by": "করেছেন",

  "actionform.action": "অ্যাকশন",
  "actionform.notes": "নোট (ঐচ্ছিক)",
  "actionform.saving": "সংরক্ষণ হচ্ছে…",
  "actionform.save": "অ্যাকশন সংরক্ষণ",
  "actionform.saved": "অ্যাকশন সংরক্ষিত হয়েছে",

  "action.checked": "নার্সকে দেখা হয়েছে",
  "action.recommend_rest": "বিশ্রামের পরামর্শ",
  "action.follow_up": "ফলো-আপ",
  "action.other": "অন্যান্য অ্যাকশন",

  "sim.view.showcase": "৩-নার্স শোকেস",
  "sim.view.standard": "স্ট্যান্ডার্ড সিমুলেশন",
  "sim.demoBanner": "ডেমো মোড — কৃত্রিম ডেটা — আসল রোগীর ডেটা নয়",
  "sim.stop": "সিমুলেশন বন্ধ করুন",
  "sim.start": "সিমুলেশন শুরু করুন",
  "sim.resetting": "নার্স রিসেট হচ্ছে…",
  "sim.runningInfo": "পরের আপডেট {next} পরে · 4 Hz স্ট্রিমিং · {count} স্যাম্পল পাঠানো হয়েছে",
  "sim.waiting": "অপেক্ষমাণ",
  "sim.modelReady": "মডেল প্রস্তুত",
  "sim.modelUnavailable": "মডেল পাওয়া যাচ্ছে না",
  "sim.checkingModel": "মডেল পরীক্ষা হচ্ছে…",
  "sim.alertAfter": "অ্যালার্ট হবে",
  "sim.consecHigh": "পরপর উচ্চ প্রেডিকশনের পর",
  "sim.apiErrorPrefix": "API ত্রুটি",
  "sim.modelReports": "মডেল জানাচ্ছে: {calibration} · {window} · {first}",
  "sim.calibration": "{min} মিনিট ক্যালিব্রেশন",
  "sim.calibrationNotReported": "ক্যালিব্রেশনের সময় জানানো হয়নি",
  "sim.window": "{sec} সেকেন্ড উইন্ডো",
  "sim.windowNotReported": "উইন্ডো জানানো হয়নি",
  "sim.first": "প্রথম প্রেডিকশন শুরুর ~{time} পরে",
  "sim.firstNotReported": "প্রথম প্রেডিকশনের সময় জানানো হয়নি",
  "sim.elapsed": "অতিবাহিত {time}",
  "sim.resetNote": "প্রতিটি নতুন শুরুতে N-001–N-003 একবার রিসেট হয়",
  "sim.nextPredictionIn": "পরের প্রেডিকশন",
  "sim.lastRequest": "সর্বশেষ সফল Hugging Face অনুরোধ {time} · ফেরত সাবজেক্ট আইডি: {returned} · পাঠানো সাবজেক্ট আইডি: {sent} · {samples} স্যাম্পল",
  "sim.notReturned": "API ফেরত দেয়নি",
  "sim.noRequest": "Hugging Face: এখনো কোনো সফল প্রেডিকশন অনুরোধ নেই",
  "sim.stat.nurses": "ডেমো নার্স",
  "sim.stat.normal": "স্বাভাবিক",
  "sim.stat.moderate": "মাঝারি",
  "sim.stat.high": "উচ্চ",
  "sim.stat.alerts": "সক্রিয় অ্যালার্ট",
  "sim.alerts.title": "ধারাবাহিক উচ্চ-স্ট্রেস অ্যালার্ট",
  "sim.alerts.since": "{time} থেকে",
  "sim.alerts.acknowledge": "স্বীকার করুন",
  "sim.alerts.resolve": "সমাধান করুন",
  "sim.alertStatus.active": "সক্রিয়",
  "sim.alertStatus.acknowledged": "স্বীকৃত",
  "sim.alertStatus.resolved": "সমাধান হয়েছে",
  "sim.simulatedDevice": "সিমুলেটেড ডিভাইস",
  "sim.inputProfile": "ইনপুট প্রোফাইল",
  "sim.profile.control": "স্বাভাবিক নিয়ন্ত্রণ",
  "sim.profile.elevated": "ধারাবাহিক উচ্চ-স্ট্রেস",
  "sim.profile.baseline": "বেসলাইন · উচ্চ-স্ট্রেস অপেক্ষমাণ",
  "sim.noReading": "এখনো রিডিং নেই — সিমুলেশন শুরু করুন।",
  "sim.metric.heartRate": "হার্ট রেট",
  "sim.metric.skinTemp": "স্কিন তাপমাত্রা",
  "sim.metric.eda": "EDA",
  "sim.metric.accelX": "অ্যাক্সেল X",
  "sim.metric.accelY": "অ্যাক্সেল Y",
  "sim.metric.accelZ": "অ্যাক্সেল Z",
  "sim.modelState": "মডেল অবস্থা {state}",
  "sim.highProb": "উচ্চ-স্ট্রেস সম্ভাবনা {prob}",
  "sim.rawProb": "কাঁচা সম্ভাবনা {raw}",
  "sim.ood": "ডিস্ট্রিবিউশনের বাইরে: {value}",
  "sim.modelAlert": "মডেল অ্যালার্ট: {value}",
  "sim.lastSuccess": "সর্বশেষ সফল {time}",
  "sim.yes": "হ্যাঁ",
  "sim.no": "না",
  "sim.lastReading": "সর্বশেষ রিডিং {time}",
  "sim.acceptedSamples": "গৃহীত স্যাম্পল: {count}",
  "sim.apiCalibration": "API ক্যালিব্রেশন: {value}",
  "sim.notReceived": "পাওয়া যায়নি",
  "sim.chart.title": "স্ট্রেস ইতিহাস (Hugging Face ফলাফল)",
  "sim.chart.empty": "সিমুলেশন চালু হলে গ্রাফ পূর্ণ হবে।",
  "sim.collecting": "4 Hz স্যাম্পল সংগ্রহ হচ্ছে…",
  "sim.calibrating": "ক্যালিব্রেশন চলছে",

  "clock.paused": "বিরত",
  "clock.request": "প্রক্রিয়াধীন",
  "clock.error": "API ত্রুটি",
  "clock.waiting": "অপেক্ষমাণ",
  "clock.calibration": "ক্যালিব্রেশন চলছে",
  "clock.window": "ডেটা সংগ্রহ চলছে",
  "clock.ready": "প্রেডিকশন প্রস্তুত",

  "clocklabel.Prediction in progress": "প্রেডিকশন প্রক্রিয়াধীন",
  "clocklabel.Outcome uncertain — requests paused": "ফলাফল অনিশ্চিত — অনুরোধ বিরত",
  "clocklabel.API timeout": "API টাইমআউট",
  "clocklabel.API error": "API ত্রুটি",
  "clocklabel.Simulation paused": "সিমুলেশন বিরত",
  "clocklabel.Waiting for model": "মডেলের জন্য অপেক্ষা",
  "clocklabel.Waiting for sensor samples": "সেন্সর স্যাম্পলের জন্য অপেক্ষা",
  "clocklabel.Awaiting API timing": "API সময়ের অপেক্ষায়",
  "clocklabel.Calibration timing unavailable": "ক্যালিব্রেশনের সময় পাওয়া যায়নি",
  "clocklabel.Calibration remaining (est.)": "ক্যালিব্রেশন বাকি (আনুমানিক)",
  "clocklabel.Awaiting calibration confirmation": "ক্যালিব্রেশন নিশ্চিতকরণের অপেক্ষায়",
  "clocklabel.Batch delayed — waiting for dispatch": "ব্যাচ বিলম্বিত — পাঠানোর অপেক্ষায়",
  "clocklabel.Window timing unavailable": "উইন্ডোর সময় পাওয়া যায়নি",
  "clocklabel.Window ready / next batch (est.)": "উইন্ডো প্রস্তুত / পরের ব্যাচ (আনুমানিক)",
  "clocklabel.Next prediction batch (est.)": "পরের প্রেডিকশন ব্যাচ (আনুমানিক)",

  "fail.model_unavailable": "মডেল পাওয়া যাচ্ছে না",
  "fail.timeout": "API টাইমআউট",
  "fail.api_error": "API ত্রুটি",
  "fail.invalid_response": "মডেলের উত্তর সঠিক নয়",
};

const dictionaries: Record<Lang, Record<StringKey, string>> = { en, bn };

type TFn = (key: StringKey, vars?: Record<string, string | number>) => string;

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TFn;
}

// Keep one context object across hot reloads so the provider and hooks always match.
const g = globalThis as unknown as { __nsmLangCtx?: React.Context<LangState | null> };
const Ctx = (g.__nsmLangCtx ??= createContext<LangState | null>(null));

const STORAGE_KEY = "nsm-lang";

function initialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "bn" ? "bn" : "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Read the saved choice after hydration to avoid an SSR/client mismatch.
  useEffect(() => {
    setLangState(initialLang());
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch { /* Keep the in-memory choice. */ }
  };

  useEffect(() => {
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
  }, [lang]);

  const t: TFn = (key, vars) => {
    let text = dictionaries[lang][key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  };

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLanguage() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useLanguage outside provider");
  return s;
}

export function useT(): TFn {
  return useLanguage().t;
}

/** English label of a prediction-clock phase state, translated when Bangla is active. */
export function clockStateT(phase: "paused" | "request" | "error" | "waiting" | "calibration" | "window" | "ready", t: TFn): string {
  return t(`clock.${phase}` as StringKey);
}

/** Translate a fixed English prediction-clock label when Bangla is active; unknown labels pass through. */
export function clockLabelT(label: string, t: TFn): string {
  const key = `clocklabel.${label}` as StringKey;
  const translated = t(key);
  return translated === key ? label : translated;
}

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLang(lang === "en" ? "bn" : "en")}
      aria-label={lang === "en" ? "Switch to Bangla" : "Switch to English"}
    >
      <Languages className="h-4 w-4" />
      {lang === "en" ? "বাংলা" : "English"}
    </Button>
  );
}
