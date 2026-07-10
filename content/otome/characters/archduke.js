/** @type {import('../../types.js').CharacterDefinition} */
export default {
  id: "archduke",

  persona: {
    name: "Archduke Vesper",
    jp: "ヴェスパー",
    title: "The Scheming Archduke",
    tagline: "The Court Puppeteer",
    bio: "He operates in the shadows, three steps ahead of everyone. You are either his pawn — or his queen.",
    tone: ""
  },

  /* edge-tts synthesis settings (used by the audio generator, not the browser) */
  voice: { ttsVoice: "ja-JP-KeitaNeural", rate: "-16%", dir: "archduke" },

  sprites: { default: "./sprites/crius.png", poses: {} },

  colors: { accent: "#9B6FE8", accent2: "#DCCBF8" },

  icon: "🦂",
  forms: ["caus","ba","tara","vol"],

  yells: [
    {jp:"おやおや、その程度ですか？",en:"Oh my. Is that really all?"},
    {jp:"盤面を乱さないでください。",en:"Do not disturb my board."},
    {jp:"あなたには期待しているのですよ。",en:"I have expectations of you, you know."}
  ],

  route: {
    intro: [
      {scene:"study"},
      {who:"n",say:"A candlelit study, deep in the palace. Maps, letters, and a chessboard mid-game. The Archduke smiles like a man who has already won."},
      {who:"archduke",say:"ようこそ。ちょうど、王の話をしていたところです。",en:"Welcome. We were just discussing the King."},
      {quiz:{form:"caus",word:"する",jp:"王には、退位を＿＿。",en:"I will make the King abdicate. (する → causative)"}},
      {who:"archduke",say:"Every contract has its terms. Yours are simple—"},
      {quiz:{form:"ba",word:"きる",jp:"この紋章を＿＿、君は私の側の人間だ。",en:"If you wear this crest, you are one of mine. (着る → ば conditional)"}},
      {who:"archduke",say:"And when the moment arrives… we do not hesitate."},
      {quiz:{form:"tara",word:"くる",jp:"その時が＿＿、動くとしよう。",en:"When the time comes, we make our move. (来る → たら conditional)"}},
      {who:"archduke",say:"(He turns the black queen between his fingers, and smiles at you.)"},
      {quiz:{form:"vol",word:"あそぶ",jp:"さあ——彼らと少し＿＿か。",en:"Now then — shall we play with them a little? (遊ぶ → volitional)"}}
    ],
    trouble: [
      {scene:"storm"},
      {who:"n",say:"The door bursts open — the King's inquisitors, ledgers in hand. Someone sold the Archduke's scheme. Every candle gutters at once."},
      {who:"archduke",say:"…予定より早い。 Apprentice — the wards. Prove you belong at my side of the board."},
      {spell:0},
      {who:"archduke",say:"Elegant. The second — before they reach the letters."},
      {spell:1},
      {who:"n",say:"Darkness swallows the study; when the candles relight, the letters are ash and the Archduke is pouring two glasses of wine, entirely unbothered."}
    ],
    endings: {
      love: [
        {scene:"rose"},
        {who:"archduke",say:"完璧。読み通り…いえ、読み以上です。",en:"Flawless. As predicted… no. Beyond prediction."},
        {who:"archduke",say:"I planned for every piece on this board. You are the one move I never saw coming. Stay. Not as my pawn — as my queen."},
        {who:"n",say:"💘 The Scheming Archduke has fallen for you. (This was NOT in his plans.)"}
      ],
      friend: [
        {scene:"study"},
        {who:"archduke",say:"Adequate. A few blunders, but the board survived."},
        {who:"archduke",say:"I keep useful people close. Consider yourself… kept close."},
        {who:"n",say:"🤝 The Archduke names you a trusted associate."}
      ],
      fail: [
        {scene:"study"},
        {who:"archduke",say:"…A piece that cannot hold its square endangers the whole board."},
        {who:"archduke",say:"I dislike wasting potential. One more game, apprentice. Do not disappoint me twice."},
        {who:"n",say:"💔 The Archduke returns to his chessboard. (One more chance remains.)"}
      ]
    }
  }
};
