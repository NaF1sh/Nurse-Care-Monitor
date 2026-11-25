# Hugging Face logging update

`app.py` is a copy of the public Space source inspected on 2026-10-24, with only structured server logging added. It is not deployed by Lovable. No authenticated Hugging Face write connection is available in this project.

Apply the logging changes to the Space's current `app.py` through its authenticated Files editor. Review against any newer Space changes before applying; the model and calibration logic must remain unchanged. No token is needed for public prediction calls.

Success logs contain subject ID, sample count, calibration status, returned state, and both returned probabilities. API errors log a separate event and exception class, never payloads, credentials, full internal details, or exception messages containing arbitrary user input. Model-unavailable errors do not parse sensor payloads and therefore log a null subject ID.

The website independently logs actual Gradio outcomes in its server log and shows the last successful request time and the subject ID actually returned by Gradio. Missing IDs are displayed as not returned, never invented. A successful request may still be calibrating, pending, or have an unknown state; it does not prove a final stress classification. Unknown labels such as `ALERT` are displayed literally and never interpreted as Normal or High without a documented model contract.

## Actual verification, 2026-10-24 UTC

- Authenticated website sent 120 existing simulated samples per subject, anonymously to the public named Gradio API; no reset calls were made.
- Server captured a real success at `16:55:37.885Z`: returned subject `N-003`, state `ALERT`, high-stress probability `0.536512095348628`, raw probability `0.5271735406221717`, calibration status `active`.
- That browser run closed before the complete five-subject batch resolved, so successful display of this response was not verified.
- Other subjects returned `Readings are older than existing state`. Repeat website runs produced this error and then `API timeout — Timed out`; those real failures were visibly confirmed on the nurse cards. Latest success indicator correctly stayed empty on these unsuccessful runs.
- Health reported model ready, which does not establish prediction availability. Remote accumulated state was preserved; no model changes or calibration resets were attempted.
- 17 website tests passed; logging-only Python source parsed successfully. Hugging Face logging remains unapplied pending authenticated write access.