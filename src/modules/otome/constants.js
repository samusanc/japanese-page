/**
 * Otome engine constants — thin views over content/balance.js and
 * content/theme.js so gameplay numbers are tuned in content, not code.
 */
import { BALANCE } from '@content/balance.js';
import { THEME } from '@content/theme.js';

const B = BALANCE.otome;

export const LIVES = B.lives;
export const QUIZ_POINTS = B.points.quiz;
export const SPELL_POINTS = B.points.spell;
export const CLASSROOM_POINTS = B.points.classroomStep;
export const WRITING = B.writing;
export const DAY_CAPS = B.dayCaps;
export const ROSTER_SIZE = B.route.rosterSize;
export const ROUTE_KANJI_LEVELS = B.route.kanjiLevels;
export const OUTCOME_RULE = B.route.outcome;
export const TYPEWRITER_MS = B.typewriterMs;
export const SRS_INTERVALS_MS = B.srsIntervalsMs;

export const PLATE_INK = THEME.plateInk;
export const OTOME_WRITER_STYLE = THEME.hanzi;
export const SPARKLE = THEME.particles;
