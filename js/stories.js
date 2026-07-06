export const CHARACTERS = {
  prince: {
    id: "prince",
    name: "Alistair",
    fullName: "Crown Prince Alistair",
    title: "The Flawless Heir",
    emoji: "👑",
    avatar: "👦",
    color: "#E2B842",
    personality: "dignified",
    forms: ["masu", "dict", "apres"],
    yells: {
      wrong: "「不甲斐ないところを見せないでください。あなたならできるはずです」",
      fail: "「これが限界、ということですか…」"
    },
    endings: {
      neglect: "Prince Alistair looks at you with polite disappointment. 'Perhaps we are not suited for each other's company...'",
      friend: "He smiles warmly, bowing politely. 'You fought bravely. I value you as a trusted confidant at court.'",
      love: "He takes your hand and kisses it. 'Tonight, you have captured my heart completely. Be mine forever.'"
    }
  },
  knight: {
    id: "knight",
    name: "Gideon",
    fullName: "Sir Gideon",
    title: "The Loyal Protector",
    emoji: "🛡️",
    avatar: "⚔️",
    color: "#4A6EAA",
    personality: "devoted",
    forms: ["ta", "tai", "apast", "ate"],
    yells: {
      wrong: "「危ない！私が盾になります、諦めないで！」",
      fail: "「私の力が足りず…申し訳ありません…！」"
    },
    endings: {
      neglect: "Sir Gideon looks down, his hands trembling. 'I will always protect you from afar, even if my feelings never reach you...'",
      friend: "He smiles reassuringly. 'As long as you are safe, my heart is at peace. I stand by you as your protector.'",
      love: "He drops his sword and holds you close. 'No more vows. I cannot hide it anymore. I want to hold you and never let go.'"
    }
  },
  earl: {
    id: "earl",
    name: "Valerius",
    fullName: "Earl Valerius",
    title: "The Arrogant Earl",
    emoji: "🍷",
    avatar: "🦊",
    color: "#D9333F",
    personality: "tsundere",
    forms: ["nai", "imp", "apneg", "aadv"],
    yells: {
      wrong: "「バカ！何をもたもたしてるんだ！しっかりしろ！」",
      fail: "「もういい！私がどうにかするから、そこで見てろ！」"
    },
    endings: {
      neglect: "He turns away, blushing angrily. 'Don't flatter yourself. I didn't care anyway...'",
      friend: "He crosses his arms. 'Hmph. You're not completely useless. I suppose we can be... friends.'",
      love: "He pulls you close, blushing deeply. 'Don't go looking at anyone else! You belong with me!'"
    }
  },
  archduke: {
    id: "archduke",
    name: "Nicholas",
    fullName: "Archduke Nicholas",
    title: "The Court Puppeteer",
    emoji: "🕷️",
    avatar: "🕸️",
    color: "#7D53C6",
    personality: "scheming",
    forms: ["caus", "ba", "tara", "vol"],
    yells: {
      wrong: "「おやおや、私の計画を狂わせないでくださいね？」",
      fail: "「チェックメイト、ですか。面白い盤面になりましたね」"
    },
    endings: {
      neglect: "Archduke Nicholas sighs softly. 'A broken pawn is of no use to my board. Farewell.'",
      friend: "He smiles mysteriously. 'An interesting ally. Let us see what alliances we can forge next.'",
      love: "He wraps his arms around your waist. 'You have outplayed me completely. The winner takes the board... and my heart.'"
    }
  },
  duchess: {
    id: "duchess",
    name: "Beatrice",
    fullName: "Duchess Beatrice",
    title: "The Defiant Duchess",
    emoji: "🌹",
    avatar: "🛡️",
    color: "#2AA876",
    personality: "defiant",
    forms: ["pot", "te", "pass", "aneg"],
    yells: {
      wrong: "「立ち止まらないで！私たちの力を見せてやるわよ！」",
      fail: "「ふん、この程度で倒れる私じゃないわ！」"
    },
    endings: {
      neglect: "She looks at you with a heavy sigh. 'A true warrior needs strength. Do not slow me down.'",
      friend: "She laughs heartily, clapping your shoulder. 'A fine combat partner! Let's shake this kingdom together!'",
      love: "She looks into your eyes, smiling softly. 'I refuse to let anyone control me... except you. Walk by my side.'"
    }
  }
};

export const STORIES = {
  prince: {
    classroomIntro: "Welcome, student of the Royal Magic Academy. Under my guidance, you will study the sacred Kanji runes today. Focus your mind.",
    scenes: [
      {
        bg: "ballroom",
        text: "The grand ballroom is alight with chandeliers. Crown Prince Alistair stands before you, holding a glass of sparkling water.",
        dialogue: "「今夜の舞踏会は、実に美しいですね。私と踊っていただけますか？」",
        dialogueEn: "The ballroom tonight is truly beautiful. Would you dance with me?",
        prompt: {
          word: "踊る",
          form: "masu",
          correct: "踊ります"
        }
      },
      {
        bg: "balcony",
        text: "You step out onto the terrace. The cool night breeze rustles the rose garden.",
        dialogue: "「私は王家としての運命を自分で決める。それが私の覚悟です」",
        dialogueEn: "I will decide my destiny as royalty myself. That is my resolve.",
        prompt: {
          word: "決める",
          form: "dict",
          correct: "決める"
        }
      },
      {
        bg: "garden",
        text: "He looks up at the stars, then turns his quiet gaze to you.",
        dialogue: "「君のその横顔は、どの宝石よりも美しい」",
        dialogueEn: "Your profile is more beautiful than any gem.",
        prompt: {
          word: "美しい",
          form: "apres",
          correct: "美しい"
        }
      }
    ],
    battle: {
      text: "Suddenly, a wild fire dragon breaks through the palace gardens! Alistair draws his sword, but the beast is too powerful.",
      dialogue: "「下がってください！私が奴を抑えます。その隙に魔法を！」",
      dialogueEn: "Step back! I will hold it off. Cast your magic in the meantime!",
      kanjiPrompts: [
        "Draw the spell of **{kanji1}** to summon a protective barrier!",
        "Draw the spell of **{kanji2}** to extinguish the dragon's flames!"
      ]
    }
  },
  knight: {
    classroomIntro: "Instructor's orders, my Lady. I will assist you in learning the magic runes today. Rest assured, I will protect you from any magical backlash.",
    scenes: [
      {
        bg: "training",
        text: "Sir Gideon stands at attention in the courtyard, sword sheathed.",
        dialogue: "「私はあの日、あなたを生涯守ると誓った。その誓いは今も変わりません」",
        dialogueEn: "On that day, I swore to protect you for life. That oath remains unchanged.",
        prompt: {
          word: "守る",
          form: "ta",
          correct: "守った"
        }
      },
      {
        bg: "forest",
        text: "Taking shelter under a tree during a sudden rainstorm, his armor feels cold.",
        dialogue: "「本当は……任務など忘れて、君を抱きしめたい。だが、それは許されない……」",
        dialogueEn: "In truth... I want to forget my duty and hold you. But, that is forbidden...",
        prompt: {
          word: "抱きしめる",
          form: "tai",
          correct: "抱きしめたい"
        }
      },
      {
        bg: "palace",
        text: "Looking at an old painting of your family home, he smiles gently.",
        dialogue: "「私たちが領地で過ごしたあの頃、君はまだ本当に幼かったですね」",
        dialogueEn: "Back when we spent time at the estate, you were still truly young.",
        prompt: {
          word: "幼い",
          form: "apast",
          correct: "幼かった"
        }
      },
      {
        bg: "garden",
        text: "He picks a blue rose and hands it to you, his eyes intensely devoted.",
        dialogue: "「君は誰よりも優しくて、だからこそ私はあなたのために命を捧げられる」",
        dialogueEn: "You are kinder than anyone, which is why I can dedicate my life to you.",
        prompt: {
          word: "優しい",
          form: "ate",
          correct: "優しくて"
        }
      }
    ],
    battle: {
      text: "While patrolling the borders, rogue gargoyles attack from the sky! Sir Gideon stands in front of you, raising his shield.",
      dialogue: "「下がっていてください！敵の数が多すぎます。その魔法で援護を！」",
      dialogueEn: "Please stay back! There are too many enemies. Support me with your magic!",
      kanjiPrompts: [
        "Draw the spell of **{kanji1}** to reinforce Gideon's steel shield!",
        "Draw the spell of **{kanji2}** to slash the gargoyles down!"
      ]
    }
  },
  earl: {
    classroomIntro: "Hmph. If you can't even write basic magic runes, you'll disgrace your family. Fine, I'll watch you practice. Don't make a fool of yourself.",
    scenes: [
      {
        bg: "parlor",
        text: "Earl Valerius sits across from you in the library, crossing his arms and scoffing.",
        dialogue: "「勘違いするな！お前が他の男と話していても、俺は絶対に妬まない！」",
        dialogueEn: "Don't get the wrong idea! Even if you talk to other guys, I absolutely won't get jealous!",
        prompt: {
          word: "妬む",
          form: "nai",
          correct: "妬まない"
        }
      },
      {
        bg: "ballroom",
        text: "The music starts. He reaches out a gloved hand, turning his blushing face away.",
        dialogue: "「おい、ぼさっとするな。ほら、手を出せ！俺と踊れ！」",
        dialogueEn: "Hey, don't stand there dazed. Come on, put out your hand! Dance with me!",
        prompt: {
          word: "踊る",
          form: "imp",
          correct: "踊れ"
        }
      },
      {
        bg: "carriage",
        text: "Sitting next to you in the carriage, he turns away, muttering under his breath.",
        dialogue: "「あの馬車での移動？べ、別にお前と一緒で楽しくなかったぞ！」",
        dialogueEn: "That carriage ride? I-It wasn't even fun being with you!",
        prompt: {
          word: "楽しい",
          form: "apneg",
          correct: "楽しくなかった"
        }
      },
      {
        bg: "garden",
        text: "He walks briskly ahead, then slows down, waiting for you to catch up.",
        dialogue: "「おい、早く歩け！周りの連中がジロジロ見ているだろうが！」",
        dialogueEn: "Hey, walk fast! The people around are staring at us, you know!",
        prompt: {
          word: "早い",
          form: "aadv",
          correct: "早く"
        }
      }
    ],
    battle: {
      text: "A dark beast ambushes your carriage in the forest! Valerius steps forward, brandishing his rapier, but is caught off guard.",
      dialogue: "「くそっ、囲まれたか！おい、お前の魔法で奴らの動きを止めろ！」",
      dialogueEn: "Damn, are we surrounded?! Hey, stop their movements with your magic!",
      kanjiPrompts: [
        "Draw the spell of **{kanji1}** to distract the beast!",
        "Draw the spell of **{kanji2}** to freeze the beast in its tracks!"
      ]
    }
  },
  archduke: {
    classroomIntro: "Runes are the language of control, my dear. To write a rune is to bind reality. Let me show you how to write them correctly.",
    scenes: [
      {
        bg: "office",
        text: "Archduke Nicholas smiles warmly, holding a letter sealed with wax.",
        dialogue: "「愚者共には、私の計画に完璧に従わせる。それが最も効率的ですからね」",
        dialogueEn: "I will make the fools obey my plans perfectly. That is the most efficient way, you see.",
        prompt: {
          word: "従う",
          form: "caus",
          correct: "従わせる"
        }
      },
      {
        bg: "library",
        text: "He traces the edge of a heavy ancient tome, leaning closer to you.",
        dialogue: "「私と契約を結べば、あなたの望む未来をすべて与えて差し上げましょう」",
        dialogueEn: "If you sign a contract with me, I shall give you all of the future you desire.",
        prompt: {
          word: "結ぶ",
          form: "ba",
          correct: "結べば"
        }
      },
      {
        bg: "terrace",
        text: "He looks down at the city gates, holding a pocket watch.",
        dialogue: "「この戦いが終わったら、私たちの本当の取引を始めましょう」",
        dialogueEn: "Once this battle ends, let us begin our real transaction.",
        prompt: {
          word: "終わる",
          form: "tara",
          correct: "終わったら"
        }
      },
      {
        bg: "chess",
        text: "He moves a black queen on the chess table, a dangerous gleam in his eyes.",
        dialogue: "「ふふ、彼らの退屈な陰謀ごと、この盤面を全て壊そうではありませんか」",
        dialogueEn: "Hehe, shall we ruin this entire board along with their boring conspiracies?",
        prompt: {
          word: "壊す",
          form: "vol",
          correct: "壊そう"
        }
      }
    ],
    battle: {
      text: "Assassins surround the dark library to silence you! Nicholas smiles calmly, adjusting his monocle.",
      dialogue: "「困りましたね。ですがこれも想定内です。あなたの魔法で逃げ道を！」",
      dialogueEn: "We are in trouble. But this is also within expectations. Create an escape with your magic!",
      kanjiPrompts: [
        "Draw the spell of **{kanji1}** to trigger a smoke screen trap!",
        "Draw the spell of **{kanji2}** to unlock the hidden escape gate!"
      ]
    }
  },
  duchess: {
    classroomIntro: "A magic academy is just another battlefield. Spells are weapons. Grab your stylus and let's master these runes. No slacking off.",
    scenes: [
      {
        bg: "dueling",
        text: "Duchess Beatrice twirls her wooden training sword with fierce elegance.",
        dialogue: "「男どもの助けなど不要よ。この決闘、私一人で十分に勝てるわ！」",
        dialogueEn: "No need for support from men. I can win this duel on my own perfectly!",
        prompt: {
          word: "勝つ",
          form: "pot",
          correct: "勝てる"
        }
      },
      {
        bg: "ballroom",
        text: "Alarms blare. She grabs your arm, pulling you past the fleeing aristocrats.",
        dialogue: "「ぼさっとしないで、私の手を強く掴んでついてきなさい！」",
        dialogueEn: "Don't stand there dazed, grab my hand tightly and follow me!",
        prompt: {
          word: "掴む",
          form: "te",
          correct: "掴んで"
        }
      },
      {
        bg: "parlor",
        text: "She throws a royal decree into the fireplace, watching it burn with a sneer.",
        dialogue: "「家柄や結婚なんて退屈な鎖に、私は一生縛られるつもりはないわ」",
        dialogueEn: "I have no intention of being bound by boring chains like family status or marriage my whole life.",
        prompt: {
          word: "縛る",
          form: "pass",
          correct: "縛られる"
        }
      },
      {
        bg: "armory",
        text: "She straps on her gauntlets, looking back at you with a confident grin.",
        dialogue: "「私はドレスを着ていても決して弱くない。それを証明してあげるわ」",
        dialogueEn: "I am never weak even when wearing a dress. I will prove that to you.",
        prompt: {
          word: "弱い",
          form: "aneg",
          correct: "弱くない"
        }
      }
    ],
    battle: {
      text: "A rogue stone golem wakes up in the practice arena! Beatrice unsheathes her steel sword, standing side-by-side with you.",
      dialogue: "「さあ、いくわよ！私が前線を抑えるから、お前の魔法で核を狙いなさい！」",
      dialogueEn: "Here we go! I will hold the front line, so aim at the core with your magic!",
      kanjiPrompts: [
        "Draw the spell of **{kanji1}** to weaken the golem's joints!",
        "Draw the spell of **{kanji2}** to shatter the golem's core!"
      ]
    }
  }
};
