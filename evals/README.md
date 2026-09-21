# Evaluation

Eval phải kiểm tra claim về AI và user outcome, không chỉ kiểm tra HTTP 200.

Sau khi solution được chốt:

1. Tạo 10–20 representative cases trong `evals/cases/`.
2. Ghi expected facts, forbidden claims và failure behavior.
3. Dùng cùng prompt/schema/model settings cho các lần so sánh.
4. Ghi model ID, prompt/schema version, sample size và test conditions.
5. Báo cả failure cases và limitations.

Metric tùy use case có thể gồm schema validity, task success, critical-fact recall, critical omissions, hallucination rate, correct-language rate, uncertainty handling, end-to-end latency, request success rate và estimated cost.

Không commit private user data hoặc ảnh chưa có quyền sử dụng.

## Local visual smoke and eval runner

`services/ai/scripts/visual_eval.py` exercises the real multipart image boundary
with image files or keyframes extracted from a video. Raw media remains local;
the JSONL output contains only structured responses and measurements.

Run the checked-in local manifest with the deterministic mock:

```powershell
cd services/ai
.\.venv\Scripts\python.exe scripts\visual_eval.py `
  --manifest ..\..\evals\cases\visual-local.json `
  --mode mock
```

This verifies image/video loading, ffmpeg keyframe extraction, request validation,
response schema validation and metric recording. It is not evidence of Gemini
visual quality because the mock does not inspect pixels.

For a live or deployed service, set `INTERNAL_SERVICE_TOKEN` in the current shell
and pass `--mode live --base-url <AI_SERVICE_URL>`. A case with
`allowExternalProvider: false` is skipped unless the caller explicitly adds
`--allow-external-assets`. Only do that after confirming consent and permission
for every frame, especially videos containing people or private workplaces.

After permission is confirmed, the local interactive launcher avoids storing or
printing secrets. It prompts for the Gemini API key, creates a temporary internal
token, starts the service on port `8011`, runs the authorized visual cases and
then stops the service and restores the previous environment:

```powershell
cd services/ai
.\scripts\run_live_visual_eval.ps1
```

Use `-Model` or `-Port` only when a different configured model or free local port
is required. The generated JSONL remains ignored under `evals/runs/`.

## Trigger-aware keyframe extraction

`services/ai/scripts/trigger_keyframes.py` treats each trigger timestamp as a
bookmark in a temporary guided-walk video. It extracts a short window around the
trigger, rejects dark or blurry candidates, groups near-duplicate frames using
cosine similarity and keeps at most three quality representatives. The default
mode does not call FastAPI and writes only structured selection metrics; all
extracted frames live in a temporary directory and are deleted after the run.

Run the local example without sending frames:

```powershell
cd services/ai
.\.venv\Scripts\python.exe scripts\trigger_keyframes.py `
  --video ..\..\image_video_test\4500263-hd_1920_1080_24fps.mp4 `
  --triggers ..\..\evals\cases\trigger-local.example.json
```

After permission is confirmed and a local/deployed FastAPI instance is ready,
set `INTERNAL_SERVICE_TOKEN` in the shell and add `--send --base-url <URL>`.
The script sends one multipart perception request per trigger and validates each
success/error response against AI-service v1.1. It never sends the whole video.

The default two-second window samples four candidates per second. The starting
quality/cosine thresholds are engineering defaults for the controlled demo and
must be calibrated on representative footage; they are not general visual
quality guarantees.

