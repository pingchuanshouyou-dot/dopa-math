// ボス戦：ダメージ計算、セリフ、GAME OVER
const assert = require("assert");

async function boss(t, s = 3) {
  await t.register();
  await t.ev(s => startStage(0, s), s);
  await t.page.waitForTimeout(200);
}

exports.tests = [
  { name: "3秒以内の正解のダメージは 8×(1+0.1×(コンボ−1))×1.5、FEVER中は×2", fn: async t => {
    await boss(t);
    assert.strictEqual(await t.ev(() => hpMax), 100);
    const dmg = [];
    while (await t.ev(() => running && hp > 0)) { const h = await t.ev(() => hp); await t.solve(170); dmg.push(h - await t.ev(() => hp)); }
    assert.deepStrictEqual(dmg, [12, 13, 14, 16, 17, 36]);
    await t.page.waitForTimeout(1200);
    assert.strictEqual(await t.page.textContent("#rH"), "BOSS撃破！");
  }},
  { name: "3秒をすぎて答えるとボーナスなしの8ダメージ", fn: async t => {
    await boss(t, 6);
    assert.strictEqual(await t.ev(() => hpMax), 150);
    await t.page.waitForTimeout(3300);
    const h = await t.ev(() => hp); await t.solve(150);
    assert.strictEqual(h - await t.ev(() => hp), 8);
  }},
  { name: "ボスがしゃべる（登場・ダメージ・まちがい・手が止まる）", fn: async t => {
    await boss(t);
    await t.page.waitForTimeout(700);
    assert.strictEqual(await t.page.textContent("#say"), await t.ev(() => WORLDS[0].boss[0].hi));
    await t.solve(150);
    assert.ok((await t.page.textContent("#say")).length > 0);
    await t.ev(() => { q = build("a1_rush", 0); showQ(); });
    await t.page.waitForTimeout(3400);
    assert.match(await t.page.textContent("#say"), /手が止まってる/);
  }},
  { name: "ハートが0になったら GAME OVER とリトライ", fn: async t => {
    await boss(t);
    while (await t.ev(() => running && hearts > 0)) { await t.wrong(); await t.page.waitForTimeout(450); }
    await t.page.waitForTimeout(900);
    assert.strictEqual(await t.visible(), "res");
    assert.strictEqual(await t.page.textContent("#rH"), "GAME OVER");
    assert.strictEqual(await t.page.textContent("#again"), "🔁 リトライ");
  }},
  { name: "2-7 は「マイナスを引く計算」と「掛け算」が交互に出る", fn: async t => {
    await t.register();
    await t.ev(() => startStage(1, 6)); await t.page.waitForTimeout(200);
    const seq = [];
    for (let i = 0; i < 4; i++) { seq.push(await t.ev(() => q.tpl)); await t.solve(170); }
    assert.deepStrictEqual(seq, ["a2_subneg", "a2_mul2", "a2_subneg", "a2_mul2"]);
  }}
];
