/** @type {import('../../types.js').CharacterDefinition} */
export default {
  id: "knight",

  persona: {
    name: "Sir Gareth",
    jp: "ガレス",
    title: "The Devoted Knight",
    tagline: "The Loyal Protector",
    bio: "Your personal guard, who has loved you from afar. His vows, your shared past, your safety — that is his whole world.",
    tone: ""
  },

  /* edge-tts synthesis settings (used by the audio generator, not the browser) */
  voice: { ttsVoice: "ja-JP-KeitaNeural", rate: "-4%", dir: "knight" },

  sprites: { default: "./sprites/lucien.png", poses: {} },

  colors: { accent: "#6FBF9B", accent2: "#CDEBD9" },

  icon: "🛡️",
  forms: ["ta","tai","apast","ate"],

  yells: [
    {jp:"下がって！私が盾になる！",en:"Stay back! I will be your shield!"},
    {jp:"大丈夫、君なら書ける！",en:"It's alright — I know you can write it!"},
    {jp:"あの日の誓いを思い出して！",en:"Remember the oath from that day!"}
  ],

  route: {
    intro: [
      {scene:"garden"},
      {who:"n",say:"The old estate garden. Sir Gareth stands watch by the roses, as he has since you were both children."},
      {who:"knight",say:"あの日、この庭で君に＿＿…ああ、いや。声に出ていたか。",en:"(He murmurs about the day he met you here…)"},
      {quiz:{form:"ta",word:"あう",jp:"あの日、この庭で君に＿＿。",en:"That day, I met you in this garden. (会う → plain past)"}},
      {who:"knight",say:"I swore an oath that day. Every word of it, I remember."},
      {quiz:{form:"apast",word:"たのしい",jp:"あの夏は、本当に＿＿。",en:"That summer was truly fun. (楽しい → past)"}},
      {scene:"night"},
      {who:"knight",say:"…Forgive me. A knight should not say this. But if my facade must crack, let it crack honestly—"},
      {quiz:{form:"tai",word:"いく",jp:"君とどこまでも＿＿。",en:"I want to go anywhere with you. (行く → want-to)"}},
      {who:"knight",say:"You are… how do the poets chain their praises? Ah—"},
      {quiz:{form:"ate",word:"おもしろい",jp:"君は＿＿、そして強い。",en:"You are fascinating, and strong. (面白い → te-form)"}}
    ],
    trouble: [
      {scene:"storm"},
      {who:"n",say:"Steel rings in the dark — masked assailants vault the garden wall, blades drawn at the knight's back!"},
      {who:"knight",say:"背中は任せた！ Your spell-signs — light the garden, I'll do the rest!"},
      {spell:0},
      {who:"knight",say:"One more! For the oath!"},
      {spell:1},
      {who:"n",say:"The wards blaze. The assailants scatter into the night, and Gareth lowers his sword, breathing hard — watching only you."}
    ],
    endings: {
      love: [
        {scene:"rose"},
        {who:"knight",say:"完璧だった。…もう、あの日の子どもじゃないんだな。",en:"That was perfect. …You're not the child from that day anymore."},
        {who:"knight",say:"Then hear a new oath: not as your guard. As your own. 君を、愛している。"},
        {who:"n",say:"💘 The Devoted Knight has fallen for you."}
      ],
      friend: [
        {scene:"garden"},
        {who:"knight",say:"You fought well. A few missteps — I'll drill you at dawn, same as always."},
        {who:"knight",say:"It's… enough, for now. To stand beside you."},
        {who:"n",say:"🤝 The Devoted Knight remains your steadfast friend."}
      ],
      fail: [
        {scene:"night"},
        {who:"knight",say:"…I couldn't protect you and the spell both. That's on me. But you weren't ready either."},
        {who:"knight",say:"Train. Please. I can't lose you to a night like this."},
        {who:"n",say:"💔 The Knight bows and withdraws. (He will grant you one more chance.)"}
      ]
    }
  }
};
