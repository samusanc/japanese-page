/** @type {import('../../types.js').CharacterDefinition} */
export default {
  id: "prince",

  persona: {
    name: "Prince Alberich",
    jp: "アルベリヒ",
    title: "The Crown Prince",
    tagline: "The Flawless Heir",
    bio: "Dignified, proper, always composed. He deals only in courtly manners and absolute truths.",
    tone: ""
  },

  /* edge-tts synthesis settings (used by the audio generator, not the browser) */
  voice: { ttsVoice: "ja-JP-KeitaNeural", rate: "-12%", dir: "prince" },

  sprites: { default: "./sprites/conrad.png", poses: {} },

  colors: { accent: "#7EA6FF", accent2: "#C9DAFF" },

  icon: "👑",
  forms: ["masu","dict","aplain"],

  yells: [
    {jp:"落ち着いて。あなたならできます。",en:"Compose yourself. You are capable of this."},
    {jp:"それは王命です。正しく書きなさい。",en:"That is a royal decree. Write it correctly."},
    {jp:"私の前で諦めることは許しません。",en:"I do not permit surrender in my presence."}
  ],

  route: {
    intro: [
      {scene:"ballroom"},
      {who:"n",say:"The grand ball of the winter court. Chandeliers of enchanted ice. Every eye turns as the Crown Prince crosses the floor — toward you."},
      {who:"prince",say:"今夜、あなたに会えて光栄です。",en:"It is an honor to see you tonight."},
      {who:"prince",say:"Court speech is armor, apprentice. Polite form — always. Say it with me:"},
      {quiz:{form:"masu",word:"はなす",jp:"今夜は、ゆっくり＿＿。",en:"Tonight, let us talk at leisure. (話す → polite)"}},
      {who:"prince",say:"見事です。 A prince, however, also speaks in decrees. Plain. Absolute."},
      {quiz:{form:"dict",word:"いく",jp:"王命だ。私は前へ＿＿。",en:"It is a royal decree. I go forward. (行く → plain)"}},
      {scene:"garden"},
      {who:"prince",say:"…Away from the crowd, my words may be simpler. And truer."},
      {quiz:{form:"aplain",word:"きれい",jp:"今夜の君は、本当に＿＿だ。",en:"Tonight you are truly beautiful. (きれい → plain)"}},
      {who:"prince",say:"Do not blush. A truth plainly stated is still a truth."}
    ],
    trouble: [
      {scene:"storm"},
      {who:"n",say:"A crash of glass — the chandelier's ice spirits break free and swirl toward the Prince!"},
      {who:"prince",say:"守りの陣を！ Your spell-signs, now — I shall not lose you to a draft of bad weather."},
      {spell:0},
      {who:"prince",say:"Hold the line! One sign remains—"},
      {spell:1},
      {who:"n",say:"Light floods the hall. The spirits dissolve into harmless snow that settles, gently, on his shoulders."}
    ],
    endings: {
      love: [
        {scene:"rose"},
        {who:"prince",say:"完璧でした。…いや、あなたが、です。",en:"That was flawless. …No — you are."},
        {who:"prince",say:"A crown means nothing beside a steady heart. Dance with me — not as my subject. As my equal."},
        {who:"n",say:"💘 The Crown Prince has fallen for you."}
      ],
      friend: [
        {scene:"ballroom"},
        {who:"prince",say:"You fought admirably. A few strokes wide of perfect — but admirably."},
        {who:"prince",say:"Walk with me sometime. The court could use more people I actually trust."},
        {who:"n",say:"🤝 The Crown Prince considers you a trusted friend."}
      ],
      fail: [
        {scene:"night"},
        {who:"prince",say:"…You were not ready. And a prince cannot afford unready allies."},
        {who:"prince",say:"Study, apprentice. Perhaps the court will look kinder on you another night."},
        {who:"n",say:"💔 The Crown Prince turns away. (He will grant you one more chance.)"}
      ]
    }
  }
};
