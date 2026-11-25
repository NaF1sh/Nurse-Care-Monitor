<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Data access goes through `src/lib/queries.ts` (browser client, RLS-enforced); auth state lives in `src/lib/store.tsx`. Why: one place for queries, database policies are the security boundary.
- Roles live in `public.user_roles` (checked via `has_role`), never on profiles; signup always gets `supervisor`, admin is granted manually. Why: prevents self-promotion.
- `sensor_readings` and `predictions` have no browser write policies; only trusted server code (service role) writes them. Why: browsers must not fabricate readings or AI results.
- All authenticated pages wrap content in `AppShell` (`src/components/app-shell.tsx`). Why: one shared nav and login guard.
- Gradio transport stays in `src/lib/simulation.functions.ts`, uses named Gradio calls, and sends credentials only after an authentication rejection. Why: public Spaces need no token and credentials must stay server-side.
- Prediction diagnostics are built server-side from the actual Gradio reply, logging only bounded outcome fields and never payloads or credentials; returned subject IDs must match requests. Why: verifies provenance without leaking sensitive inputs or assigning another subject's result.
- Only a new showcase start calls reset_subject (once per showcase nurse, confirmed for the same subject, behind the per-subject lock); ordinary batches and the standard view never reset, and calibration length comes from the model's Health/reset reply, never a website constant. Why: each demo starts a fresh calibration without discarding calibration mid-session or drifting from the Space's real configuration.
- Showcase input profiles live alongside the standard generator and persist their own baseline progress; elevation requires acknowledged baseline duration plus an actual completed-calibration status. Why: view switches/reloads cannot bypass baseline collection or manufacture model outputs, and standard generation remains unchanged.
- Simulation transport uses per-subject queues, same-origin Web Locks and persisted sent/acknowledged watermarks; uncertain outcomes pause that subject until remote reconciliation. Why: never replay a possibly processed batch or allow overlapping same-browser requests; cross-device ordering requires a Hugging Face per-subject lock and acknowledgement protocol.
- `huggingface/app.py` is an unapplied external-source logging patch, not part of the website runtime; compare with current Space source before deploying it. Why: Lovable cannot deploy to a Hugging Face repository without authenticated write access.
- Isolated validation runs use a command-line harness with fresh subject IDs and the existing Gradio transport, recording API acknowledgements separately from sent counts. Why: a repeatable audit must not reuse showcase calibration or count unacknowledged samples as accepted.
- Prediction readiness is derived in `src/lib/prediction-timing.ts` from whitelisted actual engine timing, sampled timestamps/counts and the dispatch deadline; missing remote timing has no numeric fallback. Why: batch readiness is not result arrival, and inactivity/API uncertainty cannot manufacture progress.
