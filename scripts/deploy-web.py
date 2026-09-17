#!/usr/bin/env python3
"""
Deploy the built frontend to Amplify Hosting as a manual (zip) deployment.

    npm run build -w @kagazready/web        # with VITE_API_BASE_URL set
    python scripts/deploy-web.py

Why a script, and why Python: Amplify's manual deployment wants a zip whose entries use forward
slashes. PowerShell 5.1's Compress-Archive writes backslashes, so the first deployment served
index.html and 404'd every asset — Amplify saw "assets\\index.css" as a file at the root. Python's
zipfile writes portable entries and is available on every platform this project is built on.

Uses the AWS CLI credentials and region already configured (aws login). No secrets in this file.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

APP_ID = os.environ.get("AMPLIFY_APP_ID", "d109ovvm872kui")
BRANCH = os.environ.get("AMPLIFY_BRANCH", "main")
REGION = os.environ.get("AWS_REGION", "ap-south-1")
DIST = Path(__file__).resolve().parent.parent / "apps" / "web" / "dist"


def aws(*args: str) -> dict:
    result = subprocess.run(
        ["aws", *args, "--region", REGION, "--output", "json"],
        check=True,
        capture_output=True,
        text=True,
        env={**os.environ, "AWS_PAGER": ""},
    )
    return json.loads(result.stdout) if result.stdout.strip() else {}


def main() -> int:
    if not (DIST / "index.html").exists():
        print(f"No build at {DIST}. Run: npm run build -w @kagazready/web", file=sys.stderr)
        return 1

    with tempfile.TemporaryDirectory() as tmp:
        archive = Path(tmp) / "dist.zip"
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
            for path in DIST.rglob("*"):
                if path.is_file():
                    bundle.write(path, path.relative_to(DIST).as_posix())
        print(f"zipped {sum(1 for _ in DIST.rglob('*') if _.is_file())} files")

        deployment = aws("amplify", "create-deployment", "--app-id", APP_ID, "--branch-name", BRANCH)
        job_id = deployment["jobId"]

        request = urllib.request.Request(
            deployment["zipUploadUrl"],
            data=archive.read_bytes(),
            method="PUT",
            headers={"Content-Type": "application/zip"},
        )
        with urllib.request.urlopen(request) as response:
            if response.status != 200:
                print(f"upload failed: HTTP {response.status}", file=sys.stderr)
                return 1

    aws("amplify", "start-deployment", "--app-id", APP_ID, "--branch-name", BRANCH, "--job-id", job_id)

    import time

    for _ in range(30):
        job = aws("amplify", "get-job", "--app-id", APP_ID, "--branch-name", BRANCH, "--job-id", job_id)
        status = job["job"]["summary"]["status"]
        print(f"job {job_id}: {status}")
        if status == "SUCCEED":
            print(f"live: https://{BRANCH}.{APP_ID}.amplifyapp.com/")
            return 0
        if status in {"FAILED", "CANCELLED"}:
            return 1
        time.sleep(5)

    print("timed out waiting for the deployment", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
