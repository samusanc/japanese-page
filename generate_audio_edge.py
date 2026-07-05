#!/usr/bin/env python3
"""
generate_audio_edge.py — batch-synthesize every audio clip for 活用! Katsuyo
using Microsoft Edge's free TTS service (ja-JP-NanamiNeural — same neural voice).
Requires no API keys or subscription.

Usage:
  1. pip install edge-tts
  2. python generate_audio_edge.py
"""
import json
import os
import sys
import time
import pathlib
import asyncio
import edge_tts

VOICE = os.environ.get("AZURE_TTS_VOICE", "ja-JP-NanamiNeural")
RATE  = os.environ.get("AZURE_TTS_RATE", "-8%")

HERE = pathlib.Path(__file__).parent.resolve()
OUT  = HERE / "audio"
OUT.mkdir(exist_ok=True)

def fnv1a64(text: str) -> str:
    """MUST match audioId() in index.html — do not change."""
    h = 0xcbf29ce484222325
    for b in text.encode("utf-8"):
        h ^= b
        h = (h * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF
    return format(h, "016x")

async def process_item(sem, item, i, total, stats):
    file_name = item["file"]
    text = item["text"]
    path = OUT / file_name

    # Skip files that already exist and are not empty
    if path.exists() and path.stat().st_size > 0:
        stats["skipped"] += 1
        return

    async with sem:
        for attempt in range(4):
            try:
                communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
                await communicate.save(str(path))
                if path.exists() and path.stat().st_size > 0:
                    stats["done"] += 1
                    break
                else:
                    raise ValueError("Empty file generated")
            except Exception as e:
                if attempt < 3:
                    await asyncio.sleep(1 * (attempt + 1))
                else:
                    print(f"\n  ! Failed to generate {text!r}: {e}")
                    stats["failed"] += 1

    progress = stats["done"] + stats["skipped"] + stats["failed"]
    if progress % 50 == 0 or progress == total:
        print(f"  ... {stats['done']} synthesized, {stats['skipped']} skipped, {stats['failed']} failed ({progress}/{total})")

async def main():
    manifest_path = HERE / "audio-manifest.json"
    if not manifest_path.exists():
        sys.exit(f"Error: Could not find audio-manifest.json at {manifest_path}")

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except Exception as e:
        sys.exit(f"Error loading manifest: {e}")

    items = manifest.get("items", [])
    total = len(items)
    print(f"Loaded {total} items from manifest.")

    # sanity: manifest hashes must match our hash function
    for it in items[:5]:
        assert it["file"] == fnv1a64(it["text"]) + ".mp3", "hash mismatch — check hashing logic"

    sem = asyncio.Semaphore(15)
    stats = {"done": 0, "skipped": 0, "failed": 0}

    print("Generating audio files, please wait...")
    tasks = [process_item(sem, item, i, total, stats) for i, item in enumerate(items)]
    await asyncio.gather(*tasks)

    total_kb = sum(f.stat().st_size for f in OUT.glob("*.mp3")) // 1024
    print(f"\nDone: {stats['done']} new, {stats['skipped']} already existed, {stats['failed']} failed.")
    print(f"audio/ now holds {len(list(OUT.glob('*.mp3')))} clips (~{total_kb//1024} MB).")

if __name__ == "__main__":
    asyncio.run(main())
