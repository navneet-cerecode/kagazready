#!/usr/bin/env python3
"""
Regenerate VERIFICATION.md from tests.json.

    python scripts/verification-md.py

tests.json is the ledger of what actually ran. VERIFICATION.md is the readable version of the same
facts, so it is generated rather than maintained by hand — the two cannot disagree.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEDGER = ROOT / "tests.json"
OUT = ROOT / "VERIFICATION.md"


def main() -> None:
    data = json.loads(LEDGER.read_text(encoding="utf-8"))
    checks = data["checks"]
    summary = {k: sum(c["status"] == k for c in checks) for k in ("passing", "blocked", "not_run")}
    deploy = data["deployment"]
    credits = deploy.get("credits", {})

    rows = []
    for c in checks:
        evidence = c["evidence"].replace("|", "\\|")
        rows.append(f"| `{c['id']}` | {c['type']} | **{c['status']}** | {c['lastRun'] or '—'} | {evidence} |")
    table = "| Check | Type | Status | Last run | Evidence |\n| --- | --- | --- | --- | --- |\n" + "\n".join(rows)

    model = deploy.get("bedrockModelId") or "(empty)"
    text = f"""# Verification

What was actually run, when, and what it showed. `tests.json` is the machine-readable ledger this
page is generated from (`python scripts/verification-md.py`); the two cannot disagree, and the
summary counts below are computed from it.

**Summary ({data['updated']}):** {summary['passing']} passing · {summary['blocked']} blocked · {summary['not_run']} not run.

Nothing is listed as passing unless it ran successfully. "Blocked" names the blocker. "Not run"
means exactly that.

## How to reproduce the local checks

```bash
npm install
npm run verify        # prettier --check, eslint, tsc --noEmit, all workspace tests, all builds
```

Live checks need AWS credentials (`aws login`) in ap-south-1:

```bash
RUN_AWS_TESTS=1 npm run test -w @kagazready/fixtures     # 8 tests against real Textract (~24 pages)
```

```bash
E2E_BASE_URL={deploy['frontendUrl']} npx playwright test -c apps/web/playwright.config.ts
```

The Playwright run exercises the deployed stack end to end (real S3, real Textract) in three
projects: desktop Chromium, Pixel 7 emulation, and Chromium with `prefers-reduced-motion: reduce`.
Each run costs about 18 Textract pages.

## Deployment under test

- API: `{deploy['apiBaseUrl']}`
- Frontend: `{deploy['frontendUrl']}` (Amplify app `{deploy['amplifyAppId']}`)
- Stack `{deploy['stackName']}`, region `{deploy['region']}`, `BedrockModelId` = `{model}`
- Credits: USD {credits.get('activeCreditsUsd', 0):.0f} active, USD {credits.get('usedUsd', 0):.0f} used (checked {credits.get('checked', '—')})

## The one blocked check

`aws-bedrock-smoke`: the account's Bedrock request quotas are 0; a Support case is open. The
fallback path is verified live and the adapter is tested against a fake client. See
`docs/limitations.md`.

## Ledger

{table}
"""
    OUT.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {OUT.relative_to(ROOT)}: {summary}")


if __name__ == "__main__":
    main()
