// 通常ステージ：入力、ハート、制限時間、ヒント、弱体化、星と解放
const assert = require("assert");

async function start(t, w, s) {
  await t.register();
  await t.ev(([w, s]) => startStage(w, s), [w, s]);
  await t.page.waitForTimeout(200);
}

exports.tests = [
  { name: "全問正解で★3、次のステージが開く", fn: async t => {
    await t.register();
    await t.page.click('.node[data-s="0"]'); await t.page.click("#shGo"); await t.page.waitForTimeout(200);
    await t.clearAll();
    assert.strictEqual(await t.page.textContent("#rH"), "STAGE CLEAR!");
    assert.strictEqual(await t.ev(() => myProg["1-1"]), 3);
    assert.ok(await t.page.isVisible("#nextSt"));
  }},
  { name: "ハートは7個。まちがえると1つ減って、同じ問題のまま", fn: async t => {
    await start(t, 0, 0);
    assert.strictEqual(await t.page.textContent("#heartsP"), "❤️".repeat(7));
    const q0 = await t.ev(() => q.text);
    await t.wrong(); await t.page.waitForTimeout(450);
    assert.strictEqual(await t.ev(() => hearts), 6);
    assert.strictEqual(await t.ev(() => q.text), q0);
  }},
  { name: "2桁の答えで最後の1文字をまちがえると、その1文字だけ消える", fn: async t => {
    await start(t, 2, 0);
    await t.ev(() => { q = build("a3_mul1", 2); while (String(q.ans).length < 3) q = build("a3_mul1", 2); showQ(); });
    const a = await t.ev(() => String(q.ans));
    for (const ch of a.slice(0, -1)) await t.key(ch);
    await t.key(String((+a.slice(-1) + 1) % 10)); await t.page.waitForTimeout(450);
    assert.strictEqual(await t.ev(() => typed), a.slice(0, -1));
    await t.key(a.slice(-1)); await t.page.waitForTimeout(50);
    assert.strictEqual(await t.ev(() => okN), 1);
  }},
  { name: "C キーで打ちかけが消える", fn: async t => {
    await start(t, 0, 0);
    const a = await t.ev(() => String(q.ans));
    await t.key(a[0]); await t.key("C");
    assert.strictEqual(await t.ev(() => typed), "");
  }},
  { name: "3秒でヒントが光り、一言ガイドが出る", fn: async t => {
    await start(t, 3, 0);
    await t.ev(() => { q = build("a4_mulplus", 1); showQ(); });
    await t.page.waitForTimeout(3300);
    assert.ok(await t.ev(() => $("#eqQ").classList.contains("dim")));
    assert.match(await t.ev(() => $("#eqQ .hl").textContent), /×/);
    assert.match(await t.page.textContent("#hint"), /掛け算・割り算から/);
  }},
  { name: "時間切れでハートが減り、答えを見せて次の問題へ", fn: async t => {
    await start(t, 0, 0);
    const q0 = await t.ev(() => q.text), lim = await t.ev(() => LIMIT[0]);
    await t.page.waitForTimeout(lim * 1000 + 200);
    assert.match(await t.page.textContent("#eqR"), /答えは/);
    assert.strictEqual(await t.ev(() => hearts), 6);
    await t.page.waitForTimeout(1300);
    assert.notStrictEqual(await t.ev(() => q.text), q0);
  }},
  { name: "弱体化：数字が小さくなり、もう最小なら回数を使わない", fn: async t => {
    await start(t, 3, 0);
    await t.ev(() => { q = build("a4_mulplus", 2); while (!/[34]/.test(q.text)) q = build("a4_mulplus", 2); showQ(); });
    const before = await t.ev(() => q.text);
    await t.page.click("#weak"); await t.page.waitForTimeout(100);
    const after = await t.ev(() => q.text);
    assert.ok(Math.max(...after.match(/\d+/g).map(Number)) <= 2, `${before} → ${after}`);
    assert.strictEqual(await t.ev(() => weakLeft), 2);
    await t.ev(() => { running = false; startStage(2, 6); q = build("a3_pow", 0); while (!/^\(?−?2\)?\^2$/.test(q.text)) q = build("a3_pow", 0); showQ(); });
    await t.page.click("#weak"); await t.page.waitForTimeout(100);
    assert.match(await t.page.textContent("#pop"), /最弱/);
    assert.strictEqual(await t.ev(() => weakLeft), 3);
  }},
  { name: "ハートが2つ以下で★1、次のステージは開かずリトライを出す", fn: async t => {
    await start(t, 0, 0);
    for (let i = 0; i < 5; i++) { await t.wrong(); await t.page.waitForTimeout(450); }
    assert.strictEqual(await t.ev(() => hearts), 2);
    await t.clearAll();
    assert.strictEqual(await t.ev(() => myProg["1-1"]), 1);
    assert.ok(!(await t.page.isVisible("#nextSt")));
    assert.strictEqual(await t.page.textContent("#again"), "🔁 リトライ");
    assert.ok(await t.ev(() => !unlocked(0, 1)));
  }},
  { name: "やめた直後に別のステージを始めても、前のステージの予約が動かない", fn: async t => {
    await start(t, 2, 0);
    await t.solve(0);
    await t.ev(() => { running = false; startStage(3, 0); q = build("a4_mulplus", 0); showQ(); });
    const mine = await t.ev(() => q.text);
    await t.page.waitForTimeout(300);
    assert.strictEqual(await t.ev(() => q.text), mine);
  }}
];
