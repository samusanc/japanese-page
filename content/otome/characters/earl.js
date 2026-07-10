/** @type {import('../../types.js').CharacterDefinition} */
export default {
  id: "earl",

  persona: {
    name: "Earl Cassius",
    jp: "カシウス",
    title: "The Arrogant Earl",
    tagline: "The Tsundere Rival",
    bio: "A wealthy, prideful noble of a rival house. Constantly flustered by you, hiding every blush behind haughty commands.",
    tone: ""
  },

  /* edge-tts synthesis settings (used by the audio generator, not the browser) */
  voice: { ttsVoice: "ja-JP-KeitaNeural", rate: "-8%", dir: "earl" },

  sprites: { default: "./sprites/tyril.png", poses: {} },

  colors: { accent: "#E0577E", accent2: "#F8CBD8" },

  icon: "🎩",
  forms: ["nai","imp","apneg","aadv"],

  yells: [
    {jp:"ば、バカ！そうじゃない！",en:"Y-you fool! Not like that!"},
    {jp:"べ、別に心配してないんだからな！",en:"I-it's not like I'm worried about you!"},
    {jp:"僕の前で恥をかかせるな！",en:"Don't embarrass me in front of everyone!"}
  ],

  route: {
    intro: [
      {scene:"ballroom"},
      {who:"n",say:"The rival house's salon. Earl Cassius pointedly does not look at you. He has been pointedly not looking for ten straight minutes."},
      {who:"earl",say:"な、なんだ、その顔は。",en:"W-what's with that look?"},
      {quiz:{form:"nai",word:"みる",jp:"き、君なんか＿＿！",en:"I-I'm not looking at you or anything! (見る → plain negative)"}},
      {who:"earl",say:"Hmph. Since you're here, you may as well be useful—"},
      {quiz:{form:"imp",word:"まつ",jp:"おい、どこへ行く。＿＿！",en:"Hey, where are you going? Wait! (待つ → imperative)"}},
      {scene:"garden"},
      {who:"earl",say:"…About the carriage ride last week. Don't misunderstand."},
      {quiz:{form:"apneg",word:"たのしい",jp:"あの旅は、べつに＿＿…！",en:"That trip wasn't even fun…! (楽しい → past negative)"}},
      {who:"earl",say:"(His ears are bright red.) Enough! People are staring—"},
      {quiz:{form:"aadv",word:"はやい",jp:"＿＿歩け！",en:"Walk faster! (早い → adverb)"}}
    ],
    trouble: [
      {scene:"storm"},
      {who:"n",say:"A rival house's hex snakes across the salon floor — vines of black glass, coiling toward the Earl's ankles!"},
      {who:"earl",say:"く…！ 助けなんて要らな—— いや、要る！早く！",en:"I don't need help— fine, I NEED IT, hurry!"},
      {spell:0},
      {who:"earl",say:"The second sign, NOW! …p-please."},
      {spell:1},
      {who:"n",say:"The hex shatters into harmless petals. Cassius straightens his cravat as if nothing happened. His hands are shaking slightly."}
    ],
    endings: {
      love: [
        {scene:"rose"},
        {who:"earl",say:"か、完璧だったな。当然だ、僕が見込んだ相手だ。",en:"I-it was flawless. Naturally — I chose you, after all."},
        {who:"earl",say:"…Don't laugh. Fine! I like you! There, I said it! DON'T make me repeat it."},
        {who:"n",say:"💘 The Arrogant Earl has (very loudly) fallen for you."}
      ],
      friend: [
        {scene:"ballroom"},
        {who:"earl",say:"Passable. Barely. For a commoner-taught apprentice."},
        {who:"earl",say:"…You may sit at my table. Sometimes. If you insist."},
        {who:"n",say:"🤝 The Earl grudgingly declares you his 'acquaintance'. (He means friend.)"}
      ],
      fail: [
        {scene:"night"},
        {who:"earl",say:"Hmph. I expected better. My house does not associate with sloppy spellwork."},
        {who:"earl",say:"…Come back when you can keep up with me. I'll be waiting. N-not that I'll be waiting!"},
        {who:"n",say:"💔 The Earl storms off. (He will grant you one more chance. Obviously.)"}
      ]
    }
  }
};
