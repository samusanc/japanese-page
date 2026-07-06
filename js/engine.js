import { VERBS, ADJS, FORM } from './data.js';
import { shuffle, pick } from './helpers.js';

const ROW_A = { "う": "わ", "く": "か", "ぐ": "が", "す": "さ", "つ": "た", "ぬ": "な", "ぶ": "ば", "む": "ま", "る": "ら" };
const ROW_I = { "う": "い", "く": "き", "ぐ": "ぎ", "す": "し", "つ": "ち", "ぬ": "に", "ぶ": "び", "む": "み", "る": "り" };
const ROW_E = { "う": "え", "く": "け", "ぐ": "げ", "す": "せ", "つ": "て", "ぬ": "ね", "ぶ": "べ", "む": "め", "る": "れ" };
const ROW_O = { "う": "お", "く": "こ", "ぐ": "ご", "す": "そ", "つ": "と", "ぬ": "の", "ぶ": "ぼ", "む": "も", "る": "ろ" };

export function godanTe(r, iku) {
  const last = r.slice(-1), stem = r.slice(0, -1);
  if (iku) return stem + "って";
  if ("うつる".includes(last)) return stem + "って";
  if ("むぶぬ".includes(last)) return stem + "んで";
  if (last === "く") return stem + "いて";
  if (last === "ぐ") return stem + "いで";
  return stem + "して";
}

export function teToTa(te) {
  return te.slice(0, -1) + (te.slice(-1) === "て" ? "た" : "だ");
}

export function vconj(r, t, f, iku) {
  const last = r.slice(-1), stem = r.slice(0, -1);
  if (t === "s") {
    const b = r.slice(0, -2);
    const M = { te: "して", ta: "した", nai: "しない", masu: "します", tai: "したい", pot: "できる", vol: "しよう", ba: "すれば", tara: "したら", imp: "しろ", pass: "される", caus: "させる" };
    return b + M[f];
  }
  if (t === "k") {
    const M = { te: "きて", ta: "きた", nai: "こない", masu: "きます", tai: "きたい", pot: "こられる", vol: "こよう", ba: "くれば", tara: "きたら", imp: "こい", pass: "こられる", caus: "こさせる" };
    return M[f];
  }
  if (t === "i") {
    const M = { te: stem + "て", ta: stem + "た", nai: stem + "ない", masu: stem + "ます", tai: stem + "たい", pot: stem + "られる", vol: stem + "よう", ba: stem + "れば", tara: stem + "たら", imp: stem + "ろ", pass: stem + "られる", caus: stem + "させる" };
    return M[f];
  }
  switch (f) {
    case "te": return godanTe(r, iku);
    case "ta": return teToTa(godanTe(r, iku));
    case "tara": return teToTa(godanTe(r, iku)) + "ら";
    case "nai": return stem + ROW_A[last] + "ない";
    case "masu": return stem + ROW_I[last] + "ます";
    case "tai": return stem + ROW_I[last] + "たい";
    case "pot": return stem + ROW_E[last] + "る";
    case "vol": return stem + ROW_O[last] + "う";
    case "ba": return stem + ROW_E[last] + "ば";
    case "imp": return stem + ROW_E[last];
    case "pass": return stem + ROW_A[last] + "れる";
    case "caus": return stem + ROW_A[last] + "せる";
  }
}

export function aconj(r, t, f) {
  if (t === "ia") {
    const stem = (r === "いい") ? "よ" : r.slice(0, -1);
    const M = { aneg: stem + "くない", apast: stem + "かった", apneg: stem + "くなかった", ate: stem + "くて", aadv: stem + "く" };
    return M[f];
  }
  const M = { aneg: r + "じゃない", apast: r + "だった", apneg: r + "じゃなかった", ate: r + "で" };
  return M[f];
}

export function answer(item, fid) {
  return FORM[fid].kind === "v" ? vconj(item.r, item.t, fid, item.x) : aconj(item.r, item.t, fid);
}

export function verbDistractors(item, fid, correct) {
  const r = item.r, out = new Set();
  const naive = { te: "て", ta: "た", nai: "ない", masu: "ます", tai: "たい", pot: "られる", vol: "よう", ba: "れば", tara: "たら", imp: "ろ", pass: "られる", caus: "させる" };
  const add = v => { if (v && v !== correct) out.add(v); };
  if (item.t === "g") {
    if (r.slice(-1) === "る") add(vconj(r, "i", fid));
    const mstem = vconj(r, "g", "masu").slice(0, -2);
    add(mstem + naive[fid]);
    if (["te", "ta", "tara"].includes(fid)) {
      const stem = r.slice(0, -1);
      ["って", "んで", "いて", "して"].forEach(e => {
        let v = stem + e; if (fid !== "te") v = teToTa(v) + (fid === "tara" ? "ら" : ""); add(v);
      });
    }
    if (fid === "nai") add(r.slice(0, -1) + ROW_I[r.slice(-1)] + "ない");
    if (fid === "masu" || fid === "tai") add(r + (fid === "masu" ? "ます" : "たい"));
    if (fid === "pot") add(r.slice(0, -1) + ROW_E[r.slice(-1)] + "られる");
    const SUF = { masu: "ます", tai: "たい", nai: "ない", pot: "る", vol: "う", ba: "ば", imp: "", pass: "れる", caus: "せる" };
    if (SUF[fid] !== undefined) {
      const st0 = r.slice(0, -1), la = r.slice(-1);
      [ROW_A, ROW_I, ROW_E, ROW_O].forEach(R => add(st0 + R[la] + SUF[fid]));
    }
  } else if (item.t === "i") {
    add(vconj(r, "g", fid));
    const stem = r.slice(0, -1);
    if (fid === "nai") add(stem + "らない");
    if (fid === "te") add(stem + "んで");
    if (fid === "ba") add(stem + "ば");
    if (fid === "pot") add(stem + "れる");
    if (fid === "masu") add(r + "ます");
    if (fid === "pass") { add(stem + "れる"); add(stem + "される"); add(stem + "らされる"); }
    if (fid === "caus") { add(stem + "される"); add(stem + "せる"); }
    if (fid === "vol") add(stem + "ろう");
    if (fid === "tai") add(r + "たい");
    add(r + naive[fid]);
    if (fid === "ta") add(stem + "んだ");
    if (fid === "te") add(stem + "して");
  } else if (item.t === "s") {
    const b = r.slice(0, -2);
    const wrong = {
      te: ["すて", "すって"], ta: ["すった", "しだ"], nai: ["すない", "さない"], masu: ["するます", "すります"],
      tai: ["するたい", "すりたい"], pot: ["すれる", "しられる"], vol: ["するよう", "そう"], ba: ["しれば", "するば"],
      tara: ["すったら", "するたら"], imp: ["すれ", "せろ"], pass: ["しられる", "すられる"], caus: ["しさせる", "すさせる"]
    };
    (wrong[fid] || []).forEach(w => add(b + w));
  } else if (item.t === "k") {
    const wrong = {
      te: ["くて", "きって", "こて"], ta: ["くった", "こた"], nai: ["くない", "きない"], masu: ["くます", "こます"],
      tai: ["くたい", "こたい"], pot: ["これる", "きられる"], vol: ["くろう", "きよう"], ba: ["これば", "きれば"],
      tara: ["くったら", "こたら"], imp: ["くれ", "きろ"], pass: ["きられる", "くられる"], caus: ["こらせる", "きさせる"]
    };
    (wrong[fid] || []).forEach(w => add(w));
  }
  return [...out];
}

export function adjDistractors(item, fid, correct) {
  const r = item.r, out = new Set(), add = v => { if (v && v !== correct) out.add(v); };
  if (item.t === "ia") {
    const stem = r.slice(0, -1);
    if (r === "いい") {
      const II = { aneg: "いくない", apast: "いかった", apneg: "いくなかった", ate: "いくて", aadv: "いく" };
      add(II[fid]);
      add("いい" + ({ aneg: "じゃない", apast: "だった", apneg: "じゃなかった", ate: "で", aadv: "に" }[fid]));
    }
    const M = {
      aneg: [r + "じゃない", stem + "ない", r + "くない"], apast: [r + "だった", stem + "った", r + "かった"],
      apneg: [r + "じゃなかった", stem + "くないかった"], ate: [r + "で", stem + "て", stem + "くで"], aadv: [r + "に", stem + "に", stem + "くに"]
    };
    (M[fid] || []).forEach(add);
  } else {
    const M = {
      aneg: [r + "くない", r + "ない", r.slice(0, -1) + "くない"], apast: [r + "かった", r + "った"],
      apneg: [r + "くなかった", r + "じゃないかった"], ate: [r + "くて", r + "て", r + "だて"]
    };
    (M[fid] || []).forEach(add);
  }
  return [...out];
}

export function buildQuestion(item, fid, rnd) {
  const correct = answer(item, fid);
  let d = (FORM[fid].kind === "v" ? verbDistractors(item, fid, correct) : adjDistractors(item, fid, correct)).filter(x => x && x !== correct);
  d = [...new Set(d)];
  const muts = [
    correct.replace("られ", "れ"), correct.replace(/れ/, "られ"), correct.replace("っ", ""),
    correct.replace(/て/, "で"), correct.replace(/で/, "て"), correct.replace(/た$/, "だ"),
    correct.replace(/ない$/, "あない"), correct.slice(0, -1) + "っ" + correct.slice(-1)
  ];
  for (const m of muts) { if (d.length >= 3) break; if (m && m !== correct && !d.includes(m)) d.push(m); }
  d = shuffle(d, rnd).slice(0, 3);
  return { item, fid, correct, options: shuffle([correct, ...d], rnd) };
}

export function makePool(formIds, n, rnd) {
  const qs = [];
  for (let i = 0; i < n; i++) {
    const fid = pick(formIds, rnd), f = FORM[fid];
    const words = f.kind === "v" ? VERBS : (f.iaOnly ? ADJS.filter(a => a.t === "ia") : ADJS);
    qs.push(buildQuestion(pick(words, rnd), fid, rnd));
  }
  return qs;
}
