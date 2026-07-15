#!/usr/bin/env python3
"""Fast integrity checks for the distributable project."""
from pathlib import Path
import json
import re
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
errors = []

manifest_path = ROOT / "public" / "sounds" / "manifest.json"
try:
    manifest = json.loads(manifest_path.read_text())
except Exception as exc:
    errors.append(f"manifest.json could not be read: {exc}")
    manifest = []

ids = set()
for entry in manifest:
    sample_id = entry.get("id")
    if not sample_id:
        errors.append("manifest entry missing id")
        continue
    if sample_id in ids:
        errors.append(f"duplicate sample id: {sample_id}")
    ids.add(sample_id)
    url = entry.get("url", "")
    path = ROOT / "public" / url.lstrip("/")
    if not path.exists():
        errors.append(f"missing sample file: {url}")
        continue
    try:
        with wave.open(str(path), "rb") as source:
            if source.getframerate() != 44100:
                errors.append(f"unexpected sample rate in {url}: {source.getframerate()}")
            if source.getnframes() <= 0:
                errors.append(f"empty WAV: {url}")
    except Exception as exc:
        errors.append(f"invalid WAV {url}: {exc}")

preset_source = (ROOT / "src" / "studio" / "data" / "instrumentPresets.js").read_text()
preset_ids = re.findall(r'"id":\s*"(preset-\d+)"', preset_source)
if len(preset_ids) < 150:
    errors.append(f"expected at least 150 factory presets, found {len(preset_ids)}")
if len(preset_ids) != len(set(preset_ids)):
    errors.append("duplicate factory preset ids")

required_files = [
    "src/App.js",
    "src/App.jsx",
    "src/site/router.jsx",
    "src/site/Site.css",
    "src/site/components/SiteChrome.jsx",
    "src/site/components/PageParts.jsx",
    "src/site/pages/HomePage.jsx",
    "src/site/pages/SynthPage.jsx",
    "src/site/pages/SoundsPage.jsx",
    "src/site/pages/WorkflowPage.jsx",
    "src/site/pages/InfoPages.jsx",
    "src/studio/audio/AudioEngine.js",
    "src/studio/audio/voices.js",
    "src/studio/audio/automation.js",
    "src/studio/components/SoundDesigner.jsx",
    "src/studio/components/AutomationEditor.jsx",
    "src/studio/components/Mixer.jsx",
    "src/studio/components/PianoRoll.jsx",
    "src/studio/components/Playlist.jsx",
    "src/studio/components/Mastering.jsx",
]
for relative in required_files:
    if not (ROOT / relative).exists():
        errors.append(f"missing required source module: {relative}")

lock_text = (ROOT / "package-lock.json").read_text()
if "applied-caas-gateway" in lock_text or "internal.api.openai.org" in lock_text:
    errors.append("package-lock.json contains a private registry URL")

if not (ROOT / "public" / "_redirects").exists():
    errors.append("missing Cloudflare SPA redirect file")

if errors:
    print("Validation failed:")
    for error in errors:
        print(f" - {error}")
    sys.exit(1)

print(f"Validated {len(manifest)} WAV assets, {len(preset_ids)} synth presets, and {len(required_files)} required website/workstation modules.")
