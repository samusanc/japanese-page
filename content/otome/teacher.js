/** @type {import('../types.js').TeacherDefinition} */
export const TEACHER = {
  name: "Archmage Corvina",
  jp: "コルヴィナ導師",
  icon: "🧙‍♀️",
  img: "./sprites/teacher.png",

  /* edge-tts synthesis settings (used by the audio generator, not the browser) */
  voice: { ttsVoice: "ja-JP-NanamiNeural", rate: "-8%", dir: "teacher" },

  yells: [
    {jp:"集中！魔力が乱れていますよ。",en:"Focus! Your mana is wavering."},
    {jp:"筆順は詠唱と同じ。順番を守りなさい。",en:"Stroke order is an incantation — keep the sequence."},
    {jp:"もう一度。杖ではなく、心で書くのです。",en:"Again. Write with your heart, not your wand."}
  ],

  train: {
    introK: "The practice hall is yours, apprentice. Each sign you cast feeds the arcana — it remembers what you forget, and will bring those back to you.",
    introF: "Declaration practice. Speak as the court speaks — I will conjure their very words. The arcana favors the forms you are about to forget.",
    done: "Enough for now. The arcana has recorded everything… rest your wand, apprentice."
  },

  /* {CHAR} is replaced with the chosen love interest's name */
  intro: [
      "Welcome back to Crystal Academy, apprentice. The court is restless today…",
      "Before you may walk beside {CHAR}, you must arm yourself with today's spell-signs.",
      "Two kanji. Learn their strokes as if your heart depended on it — because it does."
  ],
  watch: "Watch closely. A spell mis-stroked is a spell miscast.",
  trace: "Now trace it over my guide. Order and direction, apprentice!",
  recall: "The guide is gone. Cast it from memory alone.",
  retry: [
      "Again. Precision is devotion.",
      "Once more — feel the stroke, don't guess it.",
      "Steady your hand. Again."
  ],
  done: "Well cast. The spell-signs are yours… now go. {CHAR} is waiting."
};
