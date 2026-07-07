/* ============================================================
   game-content.js — ALL narrative content for Crystal Academy.
   This file is the "script engine" data. To extend the game you
   only ever edit this file:
     • add a character  → push into OTOME.characters
     • change a story   → edit intro/trouble/endings scene arrays
     • add art          → set char.img / bg entries to a PNG/JPG path
     • add music        → set OTOME.assets.music[id].src to an mp3
   Scene node types the engine understands:
     {bg:"id"}                         switch background
     {music:"id"}                      switch music loop (null = stop)
     {who:"prince"|"teacher"|"you"|"n", say:"…", en:"…"}   dialogue
     {quiz:{form,word,jp,en}}          conjugation question in-story
                                       (jp contains ＿＿ for the blank;
                                        word = kana reading from app lists;
                                        form = any form id, plus "dict"
                                        and "aplain" for plain forms)
     {spell:0|1}                       battle: write route kanji #0/#1
   ============================================================ */
export const OTOME = {

assets: {
  /* backgrounds: css gradient fallback; set img:"assets/xxx.jpg" to use art */
  bg: {
    academy:  { css:"linear-gradient(168deg,#120D1F 0%,#241B36 48%,#57431E 135%)", img:"./bg/magic-training.png" },
    ballroom: { css:"linear-gradient(160deg,#3a2455 0%,#7b4b8f 50%,#d9a0c0 100%)", img:null },
    garden:   { css:"linear-gradient(165deg,#1f4d43 0%,#4e8a6a 55%,#c9e6b8 100%)", img:"./bg/magic-green-forest.png" },
    night:    { css:"linear-gradient(170deg,#0A0814 0%,#1B1738 55%,#3A3168 110%)", img:"./bg/magic-forest-night.png" },
    storm:    { css:"linear-gradient(165deg,#20142e 0%,#5e2445 55%,#a63c52 100%)", img:"./bg/magic-forest-night.png" },
    rose:     { css:"linear-gradient(160deg,#5e2445 0%,#b0507e 55%,#f7c8d8 100%)", img:"./bg/park-moonlight.png" },
    study:    { css:"linear-gradient(165deg,#09090b,#181510)", img:"./bg/crown-prince-study.png" }
  },
  /* music loops: drop mp3 paths in src; engine skips nulls gracefully */
  music: {
    academy: { src:null }, waltz: { src:null }, tension: { src:null }, love: { src:null }
  }
},

teacher: {
  name:"Archmage Corvina", jp:"コルヴィナ導師", icon:"🧙‍♀️", img:"./sprites/teacher.png",   /* drop a sprite path into img, e.g. "assets/teacher.png" */
  yells: [
    {jp:"集中！魔力が乱れていますよ。", en:"Focus! Your mana is wavering."},
    {jp:"筆順は詠唱と同じ。順番を守りなさい。", en:"Stroke order is an incantation — keep the sequence."},
    {jp:"もう一度。杖ではなく、心で書くのです。", en:"Again. Write with your heart, not your wand."}
  ],
  train: {
    introK:"The practice hall is yours, apprentice. Each sign you cast feeds the arcana — it remembers what you forget, and will bring those back to you.",
    introF:"Declaration practice. Speak as the court speaks — I will conjure their very words. The arcana favors the forms you are about to forget.",
    done:"Enough for now. The arcana has recorded everything… rest your wand, apprentice."
  },
  /* {CHAR} is replaced with the chosen love interest's name */
  intro: [
    "Welcome back to Crystal Academy, apprentice. The court is restless today…",
    "Before you may walk beside {CHAR}, you must arm yourself with today's spell-signs.",
    "Two kanji. Learn their strokes as if your heart depended on it — because it does."
  ],
  watch:   "Watch closely. A spell mis-stroked is a spell miscast.",
  trace:   "Now trace it over my guide. Order and direction, apprentice!",
  recall:  "The guide is gone. Cast it from memory alone.",
  retry:   ["Again. Precision is devotion.","Once more — feel the stroke, don't guess it.","Steady your hand. Again."],
  done:    "Well cast. The spell-signs are yours… now go. {CHAR} is waiting."
},

characters: [
{
  id:"prince", name:"Prince Alberich", jp:"アルベリヒ", title:"The Crown Prince",
  tagline:"The Flawless Heir", icon:"👑",
  accent:"#7EA6FF", accent2:"#C9DAFF", img:"./sprites/conrad.png",
  bio:"Dignified, proper, always composed. He deals only in courtly manners and absolute truths.",
  forms:["masu","dict","aplain"],
  yells: [
    {jp:"落ち着いて。あなたならできます。", en:"Compose yourself. You are capable of this."},
    {jp:"それは王命です。正しく書きなさい。", en:"That is a royal decree. Write it correctly."},
    {jp:"私の前で諦めることは許しません。", en:"I do not permit surrender in my presence."}
  ],
  intro: [
    {bg:"ballroom"},{music:"waltz"},
    {who:"n", say:"The grand ball of the winter court. Chandeliers of enchanted ice. Every eye turns as the Crown Prince crosses the floor — toward you."},
    {who:"prince", say:"今夜、あなたに会えて光栄です。", en:"It is an honor to see you tonight."},
    {who:"prince", say:"Court speech is armor, apprentice. Polite form — always. Say it with me:"},
    {quiz:{form:"masu", word:"はなす", jp:"今夜は、ゆっくり＿＿。", en:"Tonight, let us talk at leisure. (話す → polite)"}},
    {who:"prince", say:"見事です。 A prince, however, also speaks in decrees. Plain. Absolute."},
    {quiz:{form:"dict", word:"いく", jp:"王命だ。私は前へ＿＿。", en:"It is a royal decree. I go forward. (行く → plain)"}},
    {bg:"garden"},
    {who:"prince", say:"…Away from the crowd, my words may be simpler. And truer.", },
    {quiz:{form:"aplain", word:"きれい", jp:"今夜の君は、本当に＿＿だ。", en:"Tonight you are truly beautiful. (きれい → plain)"}},
    {who:"prince", say:"Do not blush. A truth plainly stated is still a truth."}
  ],
  trouble: [
    {bg:"storm"},{music:"tension"},
    {who:"n", say:"A crash of glass — the chandelier's ice spirits break free and swirl toward the Prince!"},
    {who:"prince", say:"守りの陣を！ Your spell-signs, now — I shall not lose you to a draft of bad weather."},
    {spell:0},
    {who:"prince", say:"Hold the line! One sign remains—"},
    {spell:1},
    {who:"n", say:"Light floods the hall. The spirits dissolve into harmless snow that settles, gently, on his shoulders."}
  ],
  endings: {
    love: [
      {bg:"rose"},{music:"love"},
      {who:"prince", say:"完璧でした。…いや、あなたが、です。", en:"That was flawless. …No — you are."},
      {who:"prince", say:"A crown means nothing beside a steady heart. Dance with me — not as my subject. As my equal."},
      {who:"n", say:"💘 The Crown Prince has fallen for you."}
    ],
    friend: [
      {bg:"ballroom"},
      {who:"prince", say:"You fought admirably. A few strokes wide of perfect — but admirably."},
      {who:"prince", say:"Walk with me sometime. The court could use more people I actually trust."},
      {who:"n", say:"🤝 The Crown Prince considers you a trusted friend."}
    ],
    fail: [
      {bg:"night"},
      {who:"prince", say:"…You were not ready. And a prince cannot afford unready allies."},
      {who:"prince", say:"Study, apprentice. Perhaps the court will look kinder on you another night."},
      {who:"n", say:"💔 The Crown Prince turns away. (He will grant you one more chance.)"}
    ]
  }
},
{
  id:"knight", name:"Sir Gareth", jp:"ガレス", title:"The Devoted Knight",
  tagline:"The Loyal Protector", icon:"🛡️",
  accent:"#6FBF9B", accent2:"#CDEBD9", img:"./sprites/lucien.png",
  bio:"Your personal guard, who has loved you from afar. His vows, your shared past, your safety — that is his whole world.",
  forms:["ta","tai","apast","ate"],
  yells: [
    {jp:"下がって！私が盾になる！", en:"Stay back! I will be your shield!"},
    {jp:"大丈夫、君なら書ける！", en:"It's alright — I know you can write it!"},
    {jp:"あの日の誓いを思い出して！", en:"Remember the oath from that day!"}
  ],
  intro: [
    {bg:"garden"},{music:"academy"},
    {who:"n", say:"The old estate garden. Sir Gareth stands watch by the roses, as he has since you were both children."},
    {who:"knight", say:"あの日、この庭で君に＿＿…ああ、いや。声に出ていたか。", en:"(He murmurs about the day he met you here…)"},
    {quiz:{form:"ta", word:"あう", jp:"あの日、この庭で君に＿＿。", en:"That day, I met you in this garden. (会う → plain past)"}},
    {who:"knight", say:"I swore an oath that day. Every word of it, I remember."},
    {quiz:{form:"apast", word:"たのしい", jp:"あの夏は、本当に＿＿。", en:"That summer was truly fun. (楽しい → past)"}},
    {bg:"night"},
    {who:"knight", say:"…Forgive me. A knight should not say this. But if my facade must crack, let it crack honestly—"},
    {quiz:{form:"tai", word:"いく", jp:"君とどこまでも＿＿。", en:"I want to go anywhere with you. (行く → want-to)"}},
    {who:"knight", say:"You are… how do the poets chain their praises? Ah—"},
    {quiz:{form:"ate", word:"おもしろい", jp:"君は＿＿、そして強い。", en:"You are fascinating, and strong. (面白い → te-form)"}}
  ],
  trouble: [
    {bg:"storm"},{music:"tension"},
    {who:"n", say:"Steel rings in the dark — masked assailants vault the garden wall, blades drawn at the knight's back!"},
    {who:"knight", say:"背中は任せた！ Your spell-signs — light the garden, I'll do the rest!"},
    {spell:0},
    {who:"knight", say:"One more! For the oath!"},
    {spell:1},
    {who:"n", say:"The wards blaze. The assailants scatter into the night, and Gareth lowers his sword, breathing hard — watching only you."}
  ],
  endings: {
    love: [
      {bg:"rose"},{music:"love"},
      {who:"knight", say:"完璧だった。…もう、あの日の子どもじゃないんだな。", en:"That was perfect. …You're not the child from that day anymore."},
      {who:"knight", say:"Then hear a new oath: not as your guard. As your own. 君を、愛している。"},
      {who:"n", say:"💘 The Devoted Knight has fallen for you."}
    ],
    friend: [
      {bg:"garden"},
      {who:"knight", say:"You fought well. A few missteps — I'll drill you at dawn, same as always."},
      {who:"knight", say:"It's… enough, for now. To stand beside you."},
      {who:"n", say:"🤝 The Devoted Knight remains your steadfast friend."}
    ],
    fail: [
      {bg:"night"},
      {who:"knight", say:"…I couldn't protect you and the spell both. That's on me. But you weren't ready either."},
      {who:"knight", say:"Train. Please. I can't lose you to a night like this."},
      {who:"n", say:"💔 The Knight bows and withdraws. (He will grant you one more chance.)"}
    ]
  }
},
{
  id:"earl", name:"Earl Cassius", jp:"カシウス", title:"The Arrogant Earl",
  tagline:"The Tsundere Rival", icon:"🎩",
  accent:"#E0577E", accent2:"#F8CBD8", img:"./sprites/tyril.png",
  bio:"A wealthy, prideful noble of a rival house. Constantly flustered by you, hiding every blush behind haughty commands.",
  forms:["nai","imp","apneg","aadv"],
  yells: [
    {jp:"ば、バカ！そうじゃない！", en:"Y-you fool! Not like that!"},
    {jp:"べ、別に心配してないんだからな！", en:"I-it's not like I'm worried about you!"},
    {jp:"僕の前で恥をかかせるな！", en:"Don't embarrass me in front of everyone!"}
  ],
  intro: [
    {bg:"ballroom"},{music:"waltz"},
    {who:"n", say:"The rival house's salon. Earl Cassius pointedly does not look at you. He has been pointedly not looking for ten straight minutes."},
    {who:"earl", say:"な、なんだ、その顔は。", en:"W-what's with that look?"},
    {quiz:{form:"nai", word:"みる", jp:"き、君なんか＿＿！", en:"I-I'm not looking at you or anything! (見る → plain negative)"}},
    {who:"earl", say:"Hmph. Since you're here, you may as well be useful—"},
    {quiz:{form:"imp", word:"まつ", jp:"おい、どこへ行く。＿＿！", en:"Hey, where are you going? Wait! (待つ → imperative)"}},
    {bg:"garden"},
    {who:"earl", say:"…About the carriage ride last week. Don't misunderstand."},
    {quiz:{form:"apneg", word:"たのしい", jp:"あの旅は、べつに＿＿…！", en:"That trip wasn't even fun…! (楽しい → past negative)"}},
    {who:"earl", say:"(His ears are bright red.) Enough! People are staring—"},
    {quiz:{form:"aadv", word:"はやい", jp:"＿＿歩け！", en:"Walk faster! (早い → adverb)"}}
  ],
  trouble: [
    {bg:"storm"},{music:"tension"},
    {who:"n", say:"A rival house's hex snakes across the salon floor — vines of black glass, coiling toward the Earl's ankles!"},
    {who:"earl", say:"く…！ 助けなんて要らな—— いや、要る！早く！", en:"I don't need help— fine, I NEED IT, hurry!"},
    {spell:0},
    {who:"earl", say:"The second sign, NOW! …p-please."},
    {spell:1},
    {who:"n", say:"The hex shatters into harmless petals. Cassius straightens his cravat as if nothing happened. His hands are shaking slightly."}
  ],
  endings: {
    love: [
      {bg:"rose"},{music:"love"},
      {who:"earl", say:"か、完璧だったな。当然だ、僕が見込んだ相手だ。", en:"I-it was flawless. Naturally — I chose you, after all."},
      {who:"earl", say:"…Don't laugh. Fine! I like you! There, I said it! DON'T make me repeat it."},
      {who:"n", say:"💘 The Arrogant Earl has (very loudly) fallen for you."}
    ],
    friend: [
      {bg:"ballroom"},
      {who:"earl", say:"Passable. Barely. For a commoner-taught apprentice."},
      {who:"earl", say:"…You may sit at my table. Sometimes. If you insist."},
      {who:"n", say:"🤝 The Earl grudgingly declares you his 'acquaintance'. (He means friend.)"}
    ],
    fail: [
      {bg:"night"},
      {who:"earl", say:"Hmph. I expected better. My house does not associate with sloppy spellwork."},
      {who:"earl", say:"…Come back when you can keep up with me. I'll be waiting. N-not that I'll be waiting!"},
      {who:"n", say:"💔 The Earl storms off. (He will grant you one more chance. Obviously.)"}
    ]
  }
},
{
  id:"archduke", name:"Archduke Vesper", jp:"ヴェスパー", title:"The Scheming Archduke",
  tagline:"The Court Puppeteer", icon:"🦂",
  accent:"#9B6FE8", accent2:"#DCCBF8", img:"./sprites/crius.png",
  bio:"He operates in the shadows, three steps ahead of everyone. You are either his pawn — or his queen.",
  forms:["caus","ba","tara","vol"],
  yells: [
    {jp:"おやおや、その程度ですか？", en:"Oh my. Is that really all?"},
    {jp:"盤面を乱さないでください。", en:"Do not disturb my board."},
    {jp:"あなたには期待しているのですよ。", en:"I have expectations of you, you know."}
  ],
  intro: [
    {bg:"study"},{music:"tension"},
    {who:"n", say:"A candlelit study, deep in the palace. Maps, letters, and a chessboard mid-game. The Archduke smiles like a man who has already won."},
    {who:"archduke", say:"ようこそ。ちょうど、王の話をしていたところです。", en:"Welcome. We were just discussing the King."},
    {quiz:{form:"caus", word:"する", jp:"王には、退位を＿＿。", en:"I will make the King abdicate. (する → causative)"}},
    {who:"archduke", say:"Every contract has its terms. Yours are simple—"},
    {quiz:{form:"ba", word:"きる", jp:"この紋章を＿＿、君は私の側の人間だ。", en:"If you wear this crest, you are one of mine. (着る → ば conditional)"}},
    {who:"archduke", say:"And when the moment arrives… we do not hesitate."},
    {quiz:{form:"tara", word:"くる", jp:"その時が＿＿、動くとしよう。", en:"When the time comes, we make our move. (来る → たら conditional)"}},
    {who:"archduke", say:"(He turns the black queen between his fingers, and smiles at you.)"},
    {quiz:{form:"vol", word:"あそぶ", jp:"さあ——彼らと少し＿＿か。", en:"Now then — shall we play with them a little? (遊ぶ → volitional)"}}
  ],
  trouble: [
    {bg:"storm"},
    {who:"n", say:"The door bursts open — the King's inquisitors, ledgers in hand. Someone sold the Archduke's scheme. Every candle gutters at once."},
    {who:"archduke", say:"…予定より早い。 Apprentice — the wards. Prove you belong at my side of the board."},
    {spell:0},
    {who:"archduke", say:"Elegant. The second — before they reach the letters."},
    {spell:1},
    {who:"n", say:"Darkness swallows the study; when the candles relight, the letters are ash and the Archduke is pouring two glasses of wine, entirely unbothered."}
  ],
  endings: {
    love: [
      {bg:"rose"},{music:"love"},
      {who:"archduke", say:"完璧。読み通り…いえ、読み以上です。", en:"Flawless. As predicted… no. Beyond prediction."},
      {who:"archduke", say:"I planned for every piece on this board. You are the one move I never saw coming. Stay. Not as my pawn — as my queen."},
      {who:"n", say:"💘 The Scheming Archduke has fallen for you. (This was NOT in his plans.)"}
    ],
    friend: [
      {bg:"study"},
      {who:"archduke", say:"Adequate. A few blunders, but the board survived."},
      {who:"archduke", say:"I keep useful people close. Consider yourself… kept close."},
      {who:"n", say:"🤝 The Archduke names you a trusted associate."}
    ],
    fail: [
      {bg:"study"},
      {who:"archduke", say:"…A piece that cannot hold its square endangers the whole board."},
      {who:"archduke", say:"I dislike wasting potential. One more game, apprentice. Do not disappoint me twice."},
      {who:"n", say:"💔 The Archduke returns to his chessboard. (One more chance remains.)"}
    ]
  }
},
{
  id:"duchess", name:"Duchess Seraphina", jp:"セラフィナ", title:"The Defiant Duchess",
  tagline:"The Fierce Warrior", icon:"⚔️",
  accent:"#E8A13C", accent2:"#F8E3C0", img:"./sprites/anastasia.png",
  bio:"A brilliant woman who wields a sword in a ballgown and refuses to be anyone's pawn. Fiercely protective of you.",
  forms:["pot","te","pass","aneg"],
  yells: [
    {jp:"顔を上げなさい！まだ終わってない！", en:"Chin up! It's not over yet!"},
    {jp:"私が隣にいる。恐れるな！", en:"I am beside you. Do not be afraid!"},
    {jp:"その手、止めるんじゃない！", en:"Don't you dare stop that hand!"}
  ],
  intro: [
    {bg:"ballroom"},{music:"waltz"},
    {who:"n", say:"The dueling court adjoining the ballroom. The Duchess stands in full gown, rapier drawn, three noblemen already disarmed."},
    {who:"duchess", say:"彼らは『代役を立てろ』と言った。笑わせる。", en:"They told me to appoint a champion. Laughable."},
    {quiz:{form:"pot", word:"する", jp:"この決闘、私一人で＿＿！", en:"I can do this duel myself! (する → potential)"}},
    {who:"duchess", say:"You there — apprentice. The floor is chaos and you're standing in it."},
    {quiz:{form:"te", word:"とる", jp:"私の手を＿＿、ついて来て！", en:"Take my hand and follow me! (取る → te-form)"}},
    {bg:"night"},
    {who:"duchess", say:"They call women like me 'pieces to be placed'. Listen well to my answer—"},
    {quiz:{form:"pass", word:"つかう", jp:"私は駒のように＿＿つもりはない！", en:"I have no intention of being used like a pawn! (使う → passive)"}},
    {who:"duchess", say:"And if anyone calls my resolve small—"},
    {quiz:{form:"aneg", word:"ちいさい", jp:"私の覚悟は＿＿！", en:"My resolve is not small! (小さい → negative)"}}
  ],
  trouble: [
    {bg:"storm"},{music:"tension"},
    {who:"n", say:"A conjured duelist — all mirror-glass and malice — materializes behind the Duchess, blade falling toward her unguarded back!"},
    {who:"duchess", say:"背後か——！ apprentice, your signs! I'll carve the opening, you seal it!"},
    {spell:0},
    {who:"duchess", say:"Beautiful! Again — full strength!"},
    {spell:1},
    {who:"n", say:"Her rapier and your sign strike as one. The mirror-duelist bursts into a thousand harmless sparks that rain over the court like confetti."}
  ],
  endings: {
    love: [
      {bg:"rose"},{music:"love"},
      {who:"duchess", say:"完璧。…あなた、私と互角に戦えるのね。", en:"Perfect. …You can actually fight at my side as an equal."},
      {who:"duchess", say:"I have refused every hand offered to me. Yours is the first I want to take. Well? Keep up with me — for good."},
      {who:"n", say:"💘 The Defiant Duchess has fallen for you."}
    ],
    friend: [
      {bg:"ballroom"},
      {who:"duchess", say:"Not bad. Sloppy footwork on a couple of signs — we'll fix that."},
      {who:"duchess", say:"Train with me at dawn. I don't offer that to just anyone."},
      {who:"n", say:"🤝 The Duchess claims you as her sparring partner — and friend."}
    ],
    fail: [
      {bg:"night"},
      {who:"duchess", say:"…You froze. On a battlefield, freezing kills the person beside you."},
      {who:"duchess", say:"I don't abandon recruits. One more chance. Earn it."},
      {who:"n", say:"💔 The Duchess sheathes her blade and walks away. (One more chance remains.)"}
    ]
  }
}
]};
