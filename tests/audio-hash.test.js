// Locks the JS↔Python FNV-1a hash sync: every pre-generated mp3 filename in
// audio-manifest.json must equal audioId(text) from the runtime lookup code.
// If audioId ever drifts (or generate_audio_edge.py's fnv1a64 does), all 1,230
// voice clips silently 404 into the TTS fallback — this test makes that loud.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { audioId } from '@core/audio/voice.js';

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../audio-manifest.json', import.meta.url)), 'utf8')
);

describe('audio-manifest hash sync', () => {
  it('has items', () => {
    expect(manifest.items.length).toBeGreaterThan(1000);
  });

  it('audioId(text) + ".mp3" matches every manifest filename', () => {
    const mismatches = [];
    for (const { text, file } of manifest.items) {
      const base = file.split('/').pop(); // per-character clips live in audio/<dir>/
      if (audioId(text) + '.mp3' !== base) mismatches.push({ text, file, got: audioId(text) });
    }
    expect(mismatches).toEqual([]);
  });
});
