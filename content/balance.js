/**
 * Gameplay tunables — every gameplay number lives here, not in engine code.
 * @typedef {import('./types.js').SceneDefinition} SceneDefinition
 */
export const BALANCE = {
  otome: {
    lives: 2,

    points: {
      quiz: 50,
      /** Battle spell-writing: revealed outline = flat value; else base − perMistake·mistakes, floored. */
      spell: { revealed: 30, base: 100, perMistake: 15, min: 40 },
      /** Classroom trace/recall step: flawless vs with-mistakes. */
      classroomStep: { clean: 15, sloppy: 8 }
    },

    /** Daily additive caps when a route's points land on the day record. */
    dayCaps: { grammar: 6000, writing: 1000 },

    writing: {
      missesBeforeReveal: 3,
      attemptsPerStep: 5,
      /** Stroke-match forgiveness (1 = hanzi-writer default) — raised so
       *  drawing smaller/bigger than the template still counts. */
      battleLeniency: 1.5,
      traceLeniency: 1.5,
      /** Misses on ONE stroke before its soft guide animation plays. */
      hintAfterMisses: 3
    },

    route: {
      rosterSize: 3,
      /** One route kanji drawn per JLPT level, in order. */
      kanjiLevels: [5, 4],
      /**
       * Route outcome from mistakes made.
       * @param {number} fails  wrong quizzes + failed battle spells
       * @param {number} total  quiz count + battle spell count
       */
      outcome(fails, total) {
        if (fails === 0) return "love";
        if (fails >= Math.ceil(total / 2)) return "fail";
        return "friend";
      }
    },

    typewriterMs: 15,

    srsIntervalsMs: [
      4 * 3600000, 86400000, 3 * 86400000, 7 * 86400000, 14 * 86400000, 30 * 86400000
    ]
  },

  audio: {
    volumes: { voice: 1, music: 0.35, ambience: 0.5, sfx: 1 },
    musicFadeMs: 800,
    /** Defaults for the offline TTS generator when no per-character voice is set. */
    defaultTtsVoice: "ja-JP-NanamiNeural",
    defaultRate: "-8%"
  }
};
