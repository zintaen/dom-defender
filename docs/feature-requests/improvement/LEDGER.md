# Improvement ledger (append-only)

Evidence log for `docs/improvement/BACKLOG.md`. Two entry kinds, newest at the bottom. Never edit a prior entry; correct with a new one.

Implementation entry template:

```
## <DD-ID> - <title> - <UTC date>
Branch/commit: auto/improve-<x> / <sha>
Status set: DONE | BLOCKED(<root cause or gate>)
Evidence:
<raw output of the task's verify line and the project gate - paste, do not summarize>
Notes: <deviations from the card, if any; one line>
```

Review entry template:

```
## REVIEW <phase or DD-ID list> - <UTC date> - <reviewer>
Verdicts: <DD-ID>: ACCEPT | REWORK(<reason>) | DEFER
Gate re-run: <pass/fail summary of lint/tsc/test/build run by the reviewer>
Spot checks: <what was manually exercised, e.g. forged-score curl, delete-account flow>
Merge decision: merged to main <sha> | held
```

Phase-exit entry template:

```
## PHASE <A|B|C|D> EXIT - <UTC date>
DONE: <ids>  BLOCKED/GATED: <ids + one-line reasons>
Gate summary for Stephen: <what needs his account/secret/decision/push>
```

---

(no entries yet)
