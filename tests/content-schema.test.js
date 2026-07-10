// Validates all game content against the schema — the same validateContent()
// that runs at dev boot, here with a filesystem-backed asset check so CI
// catches broken sprite/bg/audio paths too.
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateContent } from '@content/validate.js';
import { OTOME_CONTENT } from '@content/otome/index.js';
import { VERBS, ADJS } from '@content/grammar/words.js';
import { FORM } from '@content/grammar/forms.js';
import { answer } from '@modules/conjugation/engine.js';

const pathExists = p =>
  existsSync(fileURLToPath(new URL('../public/' + p.replace(/^\.\//, ''), import.meta.url)));

describe('content schema', () => {
  const { errors, warnings } = validateContent(OTOME_CONTENT, {
    VERBS, ADJS, FORM, answerFor: answer, pathExists
  });

  it('has no errors', () => {
    expect(errors).toEqual([]);
  });

  it('has no warnings (missing assets, legacy nodes…)', () => {
    expect(warnings).toEqual([]);
  });
});
