/**
 * scenes.js — Scene configurations for the Otome Game Engine.
 * Defines dialogues, backgrounds, portraits, and question prompt templates.
 */

export const INTRO_SCENES = {
  daily: [
    {
      speaker: "先生 · Sensei",
      text_ja: "あら、今日の練習パートナーは{partnerName}さんですね。",
      text_en: "Ah, it seems {partnerName} will be your partner for today's practice.",
      png: "./placeholder.png",
      bg: "bg-classroom",
      sound: ""
    },
    {
      speaker: "先生 · Sensei",
      text_ja: "文法の活用をマスターすることは、言葉の絆を深める第一歩ですよ。",
      text_en: "Mastering grammar conjugations is the first step to deepening your linguistic bond.",
      png: "./placeholder.png",
      bg: "bg-classroom",
      sound: ""
    },
    {
      speaker: "先生 · Sensei",
      text_ja: "焦らず、正確に。彼らの期待に応えて見せましょう！",
      text_en: "Stay calm, be precise. Let's show them what you're capable of!",
      png: "./placeholder.png",
      bg: "bg-classroom",
      sound: ""
    },
    {
      speaker: "先生 · Sensei",
      text_ja: "準備はよろしいですか？それでは…始めますよ！",
      text_en: "Are you ready? Now... let us begin!",
      png: "./placeholder.png",
      bg: "bg-classroom",
      sound: ""
    }
  ],
  practice: [
    {
      speaker: "先生 · Sensei",
      text_ja: "自主練習の時間ですね。基本をしっかり身につけましょう。",
      text_en: "Time for self-directed practice. Let's build a solid foundation.",
      png: "./placeholder.png",
      bg: "bg-classroom",
      sound: ""
    },
    {
      speaker: "先生 · Sensei",
      text_ja: "準備はよろしいですか？それでは…始めますよ！",
      text_en: "Are you ready? Now... let us begin!",
      png: "./placeholder.png",
      bg: "bg-classroom",
      sound: ""
    }
  ]
};

export const QUESTION_PROMPTS = {
  hana: {
    name: "Hana",
    png: "./placeholder.png",
    bg: "bg-garden",
    prompts: [
      {
        text_ja: "ねえ、{wordDisplay}（意味: 「{mean}」）を<span class=\"otome-form\">{formJp}</span>（{formEn}）にしてくれる？{typeDisplay}",
        text_en: "Hey, can you help me conjugate {wordDisplayEn} (\"{mean}\") into the <span class=\"otome-form\">{formJp}</span> ({formEn})?{typeDisplayEn}"
      },
      {
        text_ja: "{wordDisplay}（意味: 「{mean}」）の<span class=\"otome-form\">{formJp}</span>（{formEn}）形が分からないんだ。教えて！{typeDisplay}",
        text_en: "I'm stuck on this one! What is {wordDisplayEn} (\"{mean}\") in the <span class=\"otome-form\">{formJp}</span> ({formEn})?{typeDisplayEn}"
      },
      {
        text_ja: "{wordDisplay}（意味: 「{mean}」）の<span class=\"otome-form\">{formJp}</span>（{formEn}）形、知ってる？{typeDisplay}",
        text_en: "Do you know the <span class=\"otome-form\">{formJp}</span> ({formEn}) form of {wordDisplayEn} (\"{mean}\")?{typeDisplayEn}"
      },
      {
        text_ja: "{wordDisplay}（意味: 「{mean}」）を<span class=\"otome-form\">{formJp}</span>（{formEn}）形に活用してみよう！{typeDisplay}",
        text_en: "Let's see if we can conjugate {wordDisplayEn} (\"{mean}\") to the <span class=\"otome-form\">{formJp}</span> ({formEn})!{typeDisplayEn}"
      }
    ]
  },
  ren: {
    name: "Ren",
    png: "./placeholder.png",
    bg: "bg-dojo",
    prompts: [
      {
        text_ja: "おい、{wordDisplay}（意味: 「{mean}」）を<span class=\"otome-form\">{formJp}</span>（{formEn}）にしてみろ。どうなる？{typeDisplay}",
        text_en: "Hey, conjugate {wordDisplayEn} (\"{mean}\") into the <span class=\"otome-form\">{formJp}</span> ({formEn}). What is it?{typeDisplayEn}"
      },
      {
        text_ja: "{wordDisplay}（意味: 「{mean}」）の<span class=\"otome-form\">{formJp}</span>（{formEn}）形、教えてくれないか。{typeDisplay}",
        text_en: "Would you teach me the <span class=\"otome-form\">{formJp}</span> ({formEn}) form of {wordDisplayEn} (\"{mean}\")?{typeDisplayEn}"
      },
      {
        text_ja: "この{wordDisplay}（意味: 「{mean}」）の<span class=\"otome-form\">{formJp}</span>（{formEn}）形、知っているか？頼む。{typeDisplay}",
        text_en: "Do you know the <span class=\"otome-form\">{formJp}</span> ({formEn}) form of this {wordDisplayEn} (\"{mean}\")? I'm counting on you.{typeDisplayEn}"
      },
      {
        text_ja: "{wordDisplay}（意味: 「{mean}」）を<span class=\"otome-form\">{formJp}</span>（{formEn}）形にしてみてくれ。俺たちの力を見せるぞ。{typeDisplay}",
        text_en: "Let's conjugate {wordDisplayEn} (\"{mean}\") to the <span class=\"otome-form\">{formJp}</span> ({formEn}) form. Let's show them our power.{typeDisplayEn}"
      }
    ]
  },
  sora: {
    name: "Sora",
    png: "./placeholder.png",
    bg: "bg-shrine",
    prompts: [
      {
        text_ja: "ねえ、{wordDisplay}（意味: 「{mean}」）の<span class=\"otome-form\">{formJp}</span>（{formEn}）形、教えてくれる…？{typeDisplay}",
        text_en: "Hey, could you tell me the <span class=\"otome-form\">{formJp}</span> ({formEn}) form of {wordDisplayEn} (\"{mean}\")...?{typeDisplayEn}"
      },
      {
        text_ja: "{wordDisplay}（意味: 「{mean}」）を<span class=\"otome-form\">{formJp}</span>（{formEn}）にしてみて。どうなるかしら？{typeDisplay}",
        text_en: "Try conjugating {wordDisplayEn} (\"{mean}\") into the <span class=\"otome-form\">{formJp}</span> ({formEn}). I wonder what happens?{typeDisplayEn}"
      },
      {
        text_ja: "{wordDisplay}（意味: 「{mean}」）の<span class=\"otome-form\">{formJp}</span>（{formEn}）形、知ってる？気になるな…{typeDisplay}",
        text_en: "Do you know the <span class=\"otome-form\">{formJp}</span> ({formEn}) form of {wordDisplayEn} (\"{mean}\")? I'm curious...{typeDisplayEn}"
      },
      {
        text_ja: "ふふ、{wordDisplay}（意味: 「{mean}」）の<span class=\"otome-form\">{formJp}</span>（{formEn}）形、一緒に考えてみて。{typeDisplay}",
        text_en: "Heh, let's think about the <span class=\"otome-form\">{formJp}</span> ({formEn}) form of {wordDisplayEn} (\"{mean}\") together.{typeDisplayEn}"
      }
    ]
  }
};
