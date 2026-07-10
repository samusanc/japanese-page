/**
 * JSDoc typedefs for all game content. Pure documentation — no runtime code.
 * content/ files import nothing from src/ and use only relative imports,
 * so they stay loadable from plain node scripts (e.g. the audio generator).
 */

/* ---------------- Scenes ---------------- */

/**
 * A scene is the full audiovisual state of the VN stage. Everything except
 * `bg` is optional; absent fields fall back to defaults in content/theme.js.
 * @typedef {Object} SceneDefinition
 * @property {string}  bg           CSS gradient fallback backdrop (required)
 * @property {?string} [img]        Background art path; wins over `bg` when set
 * @property {SceneAudio}     [audio]     Declarative audio for the scene
 * @property {string}         [filter]    CSS filter for the backdrop, e.g. "saturate(.7) brightness(.85)"
 * @property {string}         [vignette]  CSS background overlaid on the backdrop (e.g. radial-gradient)
 * @property {ParticleConfig} [particles] Ambient sparkle overrides; null disables
 */

/**
 * @typedef {Object} SceneAudio
 * @property {?string} [music]       Track id in otome/audio.js MUSIC; null = stop; undefined = keep current
 * @property {?string} [ambience]    Loop id in otome/audio.js AMBIENCE; null = stop; undefined = keep
 * @property {string}  [enterSfx]    One-shot sfx id played once when the scene is entered
 * @property {number}  [musicFadeMs] Crossfade override for this transition
 */

/**
 * @typedef {Object} ParticleConfig
 * @property {string}   [color]   e.g. "#E9C868"
 * @property {string[]} [glyphs]  e.g. ["✦","✧","·"]
 * @property {number}   [max]     max simultaneous ambient particles
 * @property {number}   [intervalMs] spawn interval for ambient particles
 */

/* ---------------- Characters ---------------- */

/**
 * @typedef {Object} CharacterDefinition
 * @property {string} id
 * @property {{name:string, jp:string, title:string, tagline:string, bio:string, tone:string}} persona
 * @property {VoiceConfig} voice
 * @property {{default:?string, poses:Object<string,string>}} sprites
 * @property {{accent:string, accent2:string, plateInk?:string, particle?:string}} colors
 * @property {string} icon      Emoji fallback when the sprite is missing
 * @property {string[]} forms   Grammar form ids this route features
 * @property {Array<{jp:string, en:string}>} yells   Scold lines on mistakes
 * @property {RouteScript} route
 */

/**
 * edge-tts synthesis settings — consumed by scripts/build-audio-manifest.mjs
 * and generate_audio_edge.py, never by the browser.
 * @typedef {Object} VoiceConfig
 * @property {string} ttsVoice  e.g. "ja-JP-KeitaNeural" / "ja-JP-NanamiNeural"
 * @property {string} [rate]    e.g. "-8%"
 * @property {string} [pitch]   e.g. "-5Hz"
 * @property {string} [dir]     mp3 folder under audio/ (defaults to the character id)
 */

/**
 * @typedef {Object} TeacherDefinition
 * @property {string} name
 * @property {string} jp
 * @property {string} icon
 * @property {?string} img
 * @property {VoiceConfig} voice
 * @property {Array<{jp:string, en:string}>} yells
 * @property {{introK:string, introF:string, done:string}} train
 * @property {string[]} intro   `{CHAR}` is replaced with the love interest's name
 * @property {string} watch
 * @property {string} trace
 * @property {string} recall
 * @property {string[]} retry
 * @property {string} done
 */

/* ---------------- Route script nodes ---------------- */

/**
 * @typedef {Object} RouteScript
 * @property {SceneNode[]} intro
 * @property {SceneNode[]} trouble
 * @property {{love:SceneNode[], friend:SceneNode[], fail:SceneNode[]}} endings
 */

/**
 * Discriminated union — exactly one discriminant key per node.
 * New node kinds: add a typedef line here, a handler via registerNode() in
 * src/modules/otome/route.js, and a case in content/validate.js NODE_KINDS.
 *
 * @typedef {SceneChangeNode|SayNode|QuizNode|SpellNode|SfxNode|MusicNode} SceneNode
 *
 * @typedef {{scene:string}} SceneChangeNode   Full scene swap (bg + audio + filter + particles)
 * @typedef {{who?:string, say:string, en?:string}} SayNode   who: char id | "teacher" | "you" | "n" (narrator, default)
 * @typedef {{quiz:{form:string, word:string, jp:string, en:string}}} QuizNode   jp contains ＿＿; word = kana reading in VERBS/ADJS
 * @typedef {{spell:number}} SpellNode          Index into today's route kanji
 * @typedef {{sfx:string}} SfxNode              One-shot sound (id in otome/audio.js SFX)
 * @typedef {{music:?string}} MusicNode         Imperative mid-scene sting; null stops. Prefer scene audio.
 */

export {};
