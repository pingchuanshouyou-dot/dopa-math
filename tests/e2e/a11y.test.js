// 読み上げ（VoiceOver）など：式を日本語で読む、正解・まちがいを伝える、ボタンに名前がある、拡大できる
const assert = require("assert");
const { open } = require("../helpers");

const start = async t => { await t.register("まひろ"); await t.ev(() => startStage(0, 0)); await t.page.waitForTimeout(200); };

exports.modes = ["local"];
exports.tests = [
  { name: "式の読み方：記号を日本語にする", fn: async t => {
    await t.register();
    const r = await t.ev(() => ["(−3) × (−4) + 5", "−8 − 2", "(−4)^2 − 3 ÷ (−1)", "14/5 + (−4/5)"].map(spoken));
    assert.deepStrictEqual(r, [
      "かっこ マイナス3 かっことじ かける かっこ マイナス4 かっことじ たす 5",
      "マイナス8 ひく 2",
      "かっこ マイナス4 かっことじ の2乗 ひく 3 わる かっこ マイナス1 かっことじ",
      "5ぶんの14 たす かっこ マイナス5ぶんの4 かっことじ"]);
  }},
  { name: "問題が出たら読み上げ、正解・まちがいも伝える", fn: async t => {
    await start(t);
    assert.match(await t.page.getAttribute("#eq", "aria-label"), /イコール？$/);
    assert.match(await t.page.textContent("#sr"), /^問題。/);
    const wrong = await t.ev(() => String(q.ans).startsWith("9") ? "8" : "9");
    await t.ev(k => press(k), wrong);
    assert.match(await t.page.textContent("#sr"), /^ちがうよ。/);
    await t.page.waitForTimeout(400);
    const a = await t.ev(() => String(q.ans));
    for (const c of a) await t.ev(k => press(k), c);
    assert.match(await t.page.textContent("#sr"), /正解|^問題。/);
  }},
  { name: "ハートとごほうびゲージに読み上げ用の名前と値がある", fn: async t => {
    await start(t);
    assert.strictEqual(await t.page.getAttribute("#heartsP", "aria-label"), "ハート のこり7こ（7こ中）");
    await t.solve();
    assert.match(await t.page.getAttribute("#oyaP", "aria-valuenow"), /^\d+$/);
  }},
  { name: "テンキーは click だけでも打てる（VoiceOver のダブルタップ）。指で押したときは二重にならない", fn: async t => {
    await start(t);
    await t.ev(() => { q.ans = 55; showQ(); });
    await t.ev(() => $('.key[data-k="5"]').click());
    assert.strictEqual(await t.ev(() => typed), "5");
    await t.page.click('.key[data-k="C"]');
    assert.strictEqual(await t.ev(() => typed), "", "指で押したら1回だけ");
  }},
  { name: "見えているボタンと入力欄にはすべて名前がある", fn: async t => {
    const names = async () => t.ev(() => [...document.querySelectorAll("button,input,select")].filter(e => e.offsetParent)
      .filter(e => !(e.getAttribute("aria-label") || e.textContent.trim() || e.labels?.[0]?.textContent.trim())).map(e => e.id || e.outerHTML.slice(0, 60)));
    assert.deepStrictEqual(await names(), [], "はじめの画面");
    await t.register();
    assert.deepStrictEqual(await names(), [], "マップ");
    await t.ev(() => startStage(0, 0)); await t.page.waitForTimeout(200);
    assert.deepStrictEqual(await names(), [], "遊ぶ画面");
  }},
  { name: "画面の拡大（ピンチ）を止めていない", fn: async t => {
    const v = await t.page.getAttribute('meta[name="viewport"]', "content");
    assert.ok(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\D|$)/.test(v), v);
  }},
  { name: "ドパマス＋：積分の式も読み上げる", fn: async t => {
    const p = await open("local", { path: "plus/" });
    try {
      assert.deepStrictEqual(await p.ev(() => ["∫ 4x³ dx = □x⁴ + C", "∫(0→π) 2sin x dx = □", "∫ e²ˣ⁺⁷ dx = (1/□)e²ˣ⁺⁷ + C"].map(spoken)), [
        "積分 4xの3乗 ディーエックス イコール しかく xの4乗 たす C",
        "0からパイまでの積分 2 サイン x ディーエックス イコール しかく",
        "積分 eの2xプラス7乗 ディーエックス イコール かっこ 1 わる しかく かっことじ eの2xプラス7乗 たす C"]);
      await p.register("まひろ");
      await p.ev(() => startStage(0, 0)); await p.page.waitForTimeout(200);
      assert.match(await p.page.textContent("#sr"), /^問題。積分.*しかくに入る数は？$/);
      if (p.errors.length) throw new Error(p.errors.join(" / "));
    } finally { await p.close(); }
  }}
];
