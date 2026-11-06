## 1. Worker

- [x] 1.1 Add serializable job runner.
- [x] 1.2 Add module worker and protocol.
- [x] 1.3 Add progress phases.
- [x] 1.4 Add cancel by termination.
- [x] 1.5 Add sync fallback.

## 2. UI and export

- [x] 2.1 Route heavy/light Fabricate reports.
- [x] 2.2 Add working status, progress and Cancel.
- [x] 2.3 Cache completed reports and invalidate on change.
- [x] 2.4 Use cached report for STL/3MF export.

## 3. Tests and acceptance

- [x] 3.1 Job runner unit tests.
- [x] 3.2 Worker progress/cancel E2E.
- [x] 3.3 Export uses cached result.
- [x] 3.4 Light path unchanged.
- [x] 3.5 Document and run full gates.

## Acceptance criteria

- Heavy jobs do not block the main thread.
- Progress and cancel are visible and functional.
- Export uses the completed result and never a partial one.
- Light jobs and fallback behave unchanged.
- No geometry algorithm change.
