/**
 * Assembled otome content root — the only file the engine imports content
 * from. Engine code never mentions a specific character or scene id;
 * content files never import from src/.
 */
import { CHARACTERS } from './characters/index.js';
import { TEACHER } from './teacher.js';
import { SCENES } from './scenes.js';
import { MUSIC, AMBIENCE, SFX } from './audio.js';

export const OTOME_CONTENT = Object.freeze({
  characters: CHARACTERS,
  teacher: TEACHER,
  scenes: SCENES,
  music: MUSIC,
  ambience: AMBIENCE,
  sfx: SFX
});

/** id → character lookup. */
export const CHAR = Object.fromEntries(CHARACTERS.map(c => [c.id, c]));

export { CHARACTERS, TEACHER, SCENES, MUSIC, AMBIENCE, SFX };
