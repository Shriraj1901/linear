---
"@linear/import": patch
---

fix(import): import closed GitLab issues as Completed, since GitLab's CSV export writes the state as `Closed`, and read the `(UTC)` date columns as UTC instead of local time
