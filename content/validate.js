/**
 * Content validator — pure function, no DOM, never throws. Runs at dev boot
 * (src/main.js, surfaces in the console/Vite overlay) AND in CI
 * (tests/content-schema.test.js), so broken content fails loudly in both.
 *
 * Every message is path-addressed, e.g.
 *   characters[earl].route.intro[7].quiz: word "はやい" not found in VERBS/ADJS
 */

/** Node kinds and their expected payloads — extend alongside types.js + registerNode(). */
const NODE_KINDS = ["scene", "say", "quiz", "spell", "sfx", "music", "bg"];

const SPECIALS = new Set(["dict", "aplain"]);

/**
 * @param {object} content   the OTOME_CONTENT root (characters, teacher, scenes, music, ambience, sfx)
 * @param {object} deps
 * @param {Array}  deps.VERBS
 * @param {Array}  deps.ADJS
 * @param {object} deps.FORM        id → form definition
 * @param {(item:object, form:string)=>string} [deps.answerFor]  conjugator (throws/returns falsy on failure)
 * @param {(p:string)=>boolean} [deps.pathExists]  asset existence check (warnings only)
 * @returns {{errors:string[], warnings:string[]}}
 */
export function validateContent(content, deps) {
  const errors = [];
  const warnings = [];
  const { VERBS, ADJS, FORM, answerFor, pathExists } = deps;
  const { characters, teacher, scenes, music, ambience, sfx } = content;

  const charIds = new Set();
  const whoIds = new Set(["teacher", "you", "n"]);

  const checkPath = (p, where) => {
    if (!p || !pathExists) return;
    try {
      if (!pathExists(p)) warnings.push(`${where}: asset not found: ${p}`);
    } catch (e) { /* path check is best-effort */ }
  };

  const findWord = r => VERBS.find(v => v.r === r) || ADJS.find(a => a.r === r);

  function checkNodes(nodes, where) {
    if (!Array.isArray(nodes)) {
      errors.push(`${where}: expected an array of scene nodes`);
      return;
    }
    nodes.forEach((n, i) => {
      const at = `${where}[${i}]`;
      const kinds = NODE_KINDS.filter(k => k in n);
      if (kinds.length !== 1) {
        errors.push(`${at}: node must have exactly one of ${NODE_KINDS.join("/")} — got keys {${Object.keys(n).join(",")}}`);
        return;
      }
      const kind = kinds[0];
      if (kind === "scene" || kind === "bg") {
        if (!scenes[n[kind]]) errors.push(`${at}: unknown scene id "${n[kind]}"`);
        if (kind === "bg") warnings.push(`${at}: legacy {bg} node — use {scene:"${n.bg}"}`);
      }
      if (kind === "music" && n.music !== null && !music[n.music]) {
        errors.push(`${at}: unknown music id "${n.music}"`);
      }
      if (kind === "sfx" && !sfx[n.sfx]) {
        errors.push(`${at}: unknown sfx id "${n.sfx}"`);
      }
      if (kind === "say" && n.who && !whoIds.has(n.who)) {
        errors.push(`${at}: unknown speaker "${n.who}"`);
      }
      if (kind === "spell" && (typeof n.spell !== "number" || n.spell < 0)) {
        errors.push(`${at}: spell index must be a non-negative number`);
      }
      if (kind === "quiz") {
        const q = n.quiz;
        if (!q.jp || !q.jp.includes("＿＿")) errors.push(`${at}.quiz: jp must contain the ＿＿ blank`);
        if (!SPECIALS.has(q.form) && !FORM[q.form]) errors.push(`${at}.quiz: unknown form "${q.form}"`);
        const item = findWord(q.word);
        if (!item) {
          errors.push(`${at}.quiz: word "${q.word}" not found in VERBS/ADJS`);
        } else if (answerFor && !SPECIALS.has(q.form)) {
          try {
            const a = answerFor(item, q.form);
            if (!a) errors.push(`${at}.quiz: conjugator produced no answer for ${q.word} + ${q.form}`);
          } catch (e) {
            errors.push(`${at}.quiz: conjugator threw for ${q.word} + ${q.form}: ${e}`);
          }
        }
      }
    });
  }

  // characters
  characters.forEach(c => {
    const at = `characters[${c.id}]`;
    if (charIds.has(c.id)) errors.push(`${at}: duplicate character id`);
    charIds.add(c.id);
    whoIds.add(c.id);
    for (const f of ["persona", "voice", "sprites", "colors", "route"]) {
      if (!c[f]) errors.push(`${at}: missing required field "${f}"`);
    }
    if (c.persona) for (const f of ["name", "title", "tagline"]) {
      if (!c.persona[f]) errors.push(`${at}.persona: missing "${f}"`);
    }
    if (c.colors && !/^#[0-9a-fA-F]{6}$/.test(c.colors.accent || "")) {
      errors.push(`${at}.colors.accent: expected a #rrggbb color, got "${c.colors?.accent}"`);
    }
    (c.forms || []).forEach(f => {
      if (!SPECIALS.has(f) && !FORM[f]) errors.push(`${at}.forms: unknown form id "${f}"`);
    });
    if (!Array.isArray(c.yells) || !c.yells.length) errors.push(`${at}: needs at least one yell`);
    if (c.sprites) checkPath(c.sprites.default, `${at}.sprites.default`);
  });

  // second pass now that all character ids are known speakers
  characters.forEach(c => {
    const at = `characters[${c.id}]`;
    if (!c.route) return;
    checkNodes(c.route.intro, `${at}.route.intro`);
    checkNodes(c.route.trouble, `${at}.route.trouble`);
    const endings = c.route.endings || {};
    for (const k of ["love", "friend", "fail"]) {
      if (!endings[k]) errors.push(`${at}.route.endings: missing "${k}"`);
      else checkNodes(endings[k], `${at}.route.endings.${k}`);
    }
    const spellCount = (c.route.trouble || []).filter(n => "spell" in n).length;
    (c.route.trouble || []).forEach((n, i) => {
      if ("spell" in n && n.spell >= 2) {
        warnings.push(`${at}.route.trouble[${i}]: spell index ${n.spell} but routes draw 2 kanji`);
      }
    });
    if (spellCount === 0) warnings.push(`${at}.route.trouble: no {spell} battles`);
  });

  // teacher
  if (!teacher?.name) errors.push("teacher: missing name");
  if (!teacher?.train?.introK) errors.push("teacher.train: missing introK");
  checkPath(teacher?.img, "teacher.img");

  // scenes
  Object.entries(scenes).forEach(([id, sc]) => {
    const at = `scenes[${id}]`;
    if (!sc.bg) errors.push(`${at}: missing bg gradient fallback`);
    checkPath(sc.img, `${at}.img`);
    const a = sc.audio || {};
    if (a.music != null && !music[a.music]) errors.push(`${at}.audio.music: unknown track "${a.music}"`);
    if (a.ambience != null && !ambience[a.ambience]) errors.push(`${at}.audio.ambience: unknown loop "${a.ambience}"`);
    if (a.enterSfx != null && !sfx[a.enterSfx]) errors.push(`${at}.audio.enterSfx: unknown sfx "${a.enterSfx}"`);
  });

  // audio registries
  Object.entries({ music, ambience }).forEach(([kind, reg]) => {
    Object.entries(reg).forEach(([id, t]) => {
      if (t.src) checkPath(t.src, `${kind}[${id}].src`);
    });
  });
  Object.entries(sfx).forEach(([id, t]) => {
    if (!t.src && !t.beep) errors.push(`sfx[${id}]: needs either src or a beep recipe`);
    if (t.src) checkPath(t.src, `sfx[${id}].src`);
  });

  return { errors, warnings };
}
