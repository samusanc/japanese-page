/** @type {import('../../types.js').CharacterDefinition} */
export default {
  id: "duchess",

  persona: {
    name: "Duchess Seraphina",
    jp: "セラフィナ",
    title: "The Defiant Duchess",
    tagline: "The Fierce Warrior",
    bio: "A brilliant woman who wields a sword in a ballgown and refuses to be anyone's pawn. Fiercely protective of you.",
    tone: ""
  },

  /* edge-tts synthesis settings (used by the audio generator, not the browser) */
  voice: { ttsVoice: "ja-JP-NanamiNeural", rate: "-6%", dir: "duchess" },

  sprites: { default: "./sprites/anastasia.png", poses: {} },

  colors: { accent: "#E8A13C", accent2: "#F8E3C0" },

  icon: "⚔️",
  forms: ["pot","te","pass","aneg"],

  yells: [
    {jp:"顔を上げなさい！まだ終わってない！",en:"Chin up! It's not over yet!"},
    {jp:"私が隣にいる。恐れるな！",en:"I am beside you. Do not be afraid!"},
    {jp:"その手、止めるんじゃない！",en:"Don't you dare stop that hand!"}
  ],

  route: {
    intro: [
      {scene:"ballroom"},
      {who:"n",say:"The dueling court adjoining the ballroom. The Duchess stands in full gown, rapier drawn, three noblemen already disarmed."},
      {who:"duchess",say:"彼らは『代役を立てろ』と言った。笑わせる。",en:"They told me to appoint a champion. Laughable."},
      {quiz:{form:"pot",word:"する",jp:"この決闘、私一人で＿＿！",en:"I can do this duel myself! (する → potential)"}},
      {who:"duchess",say:"You there — apprentice. The floor is chaos and you're standing in it."},
      {quiz:{form:"te",word:"とる",jp:"私の手を＿＿、ついて来て！",en:"Take my hand and follow me! (取る → te-form)"}},
      {scene:"night"},
      {who:"duchess",say:"They call women like me 'pieces to be placed'. Listen well to my answer—"},
      {quiz:{form:"pass",word:"つかう",jp:"私は駒のように＿＿つもりはない！",en:"I have no intention of being used like a pawn! (使う → passive)"}},
      {who:"duchess",say:"And if anyone calls my resolve small—"},
      {quiz:{form:"aneg",word:"ちいさい",jp:"私の覚悟は＿＿！",en:"My resolve is not small! (小さい → negative)"}}
    ],
    trouble: [
      {scene:"storm"},
      {who:"n",say:"A conjured duelist — all mirror-glass and malice — materializes behind the Duchess, blade falling toward her unguarded back!"},
      {who:"duchess",say:"背後か——！ apprentice, your signs! I'll carve the opening, you seal it!"},
      {spell:0},
      {who:"duchess",say:"Beautiful! Again — full strength!"},
      {spell:1},
      {who:"n",say:"Her rapier and your sign strike as one. The mirror-duelist bursts into a thousand harmless sparks that rain over the court like confetti."}
    ],
    endings: {
      love: [
        {scene:"rose"},
        {who:"duchess",say:"完璧。…あなた、私と互角に戦えるのね。",en:"Perfect. …You can actually fight at my side as an equal."},
        {who:"duchess",say:"I have refused every hand offered to me. Yours is the first I want to take. Well? Keep up with me — for good."},
        {who:"n",say:"💘 The Defiant Duchess has fallen for you."}
      ],
      friend: [
        {scene:"ballroom"},
        {who:"duchess",say:"Not bad. Sloppy footwork on a couple of signs — we'll fix that."},
        {who:"duchess",say:"Train with me at dawn. I don't offer that to just anyone."},
        {who:"n",say:"🤝 The Duchess claims you as her sparring partner — and friend."}
      ],
      fail: [
        {scene:"night"},
        {who:"duchess",say:"…You froze. On a battlefield, freezing kills the person beside you."},
        {who:"duchess",say:"I don't abandon recruits. One more chance. Earn it."},
        {who:"n",say:"💔 The Duchess sheathes her blade and walks away. (One more chance remains.)"}
      ]
    }
  }
};
