// 保護者メニュー：保護者ゲートと、遊びすぎ対策（1日の目安時間・休憩の声かけ・演出をひかえめに）
const assert = require("assert");

const Y = new Date().getFullYear();
async function openParent(t, year = Y - 40) {
  await t.page.click("#who"); await t.page.click("#mParent");
  await t.page.fill("#gateA", String(year)); await t.page.click("#gateGo");
}
// 今日、これだけ遊んだことにする（秒）
const played = (t, sec) => t.ev(sec => { myRecs.push({ ...(myRecs[0] || { st: "1-1", n: 1, ok: 1, miss: 0, sec: 1, combo: 1, score: 10, clear: true, stars: 3 }), at: Date.now(), play: sec }); }, sec);

exports.modes = ["local"];
exports.tests = [
  { name: "保護者ゲート：子どもの年の生まれ年では入れず、大人なら入れる。5分間はもう聞かない", fn: async t => {
    await t.register();
    await openParent(t, Y - 13);
    assert.ok(await t.page.isVisible("#gate"));
    assert.match(await t.page.textContent("#gateErr"), /保護者の方だけ/);
    await t.page.fill("#gateA", "abcd"); await t.page.click("#gateGo");
    assert.match(await t.page.textContent("#gateErr"), /保護者の方だけ/);
    await t.page.fill("#gateA", String(Y - 40)); await t.page.click("#gateGo");
    assert.strictEqual(await t.visible(), "parent");
    assert.match(await t.page.textContent("#pToday"), /今日の学習時間：\d+分/);
    await t.page.click("#parentBack");
    await t.page.click("#who"); await t.page.click("#mParent");
    assert.strictEqual(await t.visible(), "parent", "2回目はゲートなし");
  }},
  { name: "「やめる」でゲートを閉じると保護者メニューは開かない", fn: async t => {
    await t.register();
    await t.page.click("#who"); await t.page.click("#mParent"); await t.page.click("#gateX");
    assert.ok(await t.page.isHidden("#gate"));
    assert.strictEqual(await t.visible(), "map");
  }},
  { name: "標準は「目安30分・休憩15分ごと・演出ふつう」で、設定は再読み込みしても残る", fn: async t => {
    await t.register();
    await openParent(t);
    assert.deepStrictEqual(await t.ev(() => [$("#pDaily").value, $("#pHard").checked, $("#pBreak").value, $("#pCalm").checked]), ["30", false, "15", false]);
    await t.page.selectOption("#pDaily", "45"); await t.page.selectOption("#pBreak", "10"); await t.page.check("#pHard");
    await t.page.reload(); await t.page.waitForFunction(() => document.querySelector("#opLoad").hidden);
    assert.deepStrictEqual(await t.ev(() => parentSet()), { daily: 45, hard: true, brk: 10, calm: false });
  }},
  { name: "続けて15分遊ぶと、結果画面で休憩の声かけが出る", fn: async t => {
    await t.register();
    await t.ev(() => startStage(0, 0)); await t.page.waitForTimeout(200);
    await t.ev(() => { sinceBreak = 15 * 60; });
    await t.clearAll();
    assert.ok(await t.page.isVisible("#rCare"));
    assert.match(await t.page.textContent("#rCare"), /休憩しよう/);
    assert.ok(await t.page.isVisible("#nextSt"), "休憩の声かけだけなら次へ進める");
  }},
  { name: "目安時間をこえると声をかける。「遊べないようにする」なら次のステージを出さず、始めようとすると休みの画面", fn: async t => {
    await t.register();
    await played(t, 31 * 60);
    await t.ev(() => startStage(0, 0)); await t.page.waitForTimeout(200);
    await t.clearAll();
    assert.match(await t.page.textContent("#rCare"), /目安時間（30分）/);
    assert.ok(await t.page.isVisible("#nextSt"), "標準（こえても遊べる）なら次へ進める");
    await t.page.click("#toMap");
    await openParent(t); await t.page.check("#pHard"); await t.page.click("#parentBack");
    await t.page.click('.node[data-s="0"]'); await t.page.click("#shGo");
    assert.strictEqual(await t.visible(), "rest");
    assert.match(await t.page.textContent("#restMsg"), /目安時間（30分）/);
    assert.strictEqual(await t.ev(() => running), false);
    await t.page.click("#restBack");
    assert.strictEqual(await t.visible(), "map");
  }},
  { name: "目安時間を「なし」にすると、何分遊んでも止めない", fn: async t => {
    await t.register();
    await t.ev(() => saveParent({ daily: 0, hard: true }));
    await played(t, 300 * 60);
    await t.ev(() => startStage(0, 0)); await t.page.waitForTimeout(200);
    assert.strictEqual(await t.ev(() => running), true);
  }},
  { name: "演出をひかえめにすると、フィーバーの虹色・ゆれ・紙吹雪が止まる", fn: async t => {
    await t.register();
    await openParent(t); await t.page.check("#pCalm"); await t.page.click("#parentBack");
    assert.ok(await t.ev(() => document.body.classList.contains("calm")));
    await t.ev(() => { startStage(0, 0); fever = 3; }); await t.page.waitForTimeout(200);
    await t.ev(() => document.body.classList.add("fever"));
    assert.strictEqual(await t.ev(() => getComputedStyle(document.body).animationName), "none");
    await t.solve(30);
    assert.strictEqual(await t.ev(() => document.querySelectorAll(".p").length), 0, "紙吹雪が出ない");
    await t.ev(() => fx($("#stage"), "shake"));
    assert.strictEqual(await t.ev(() => getComputedStyle($("#stage")).animationName), "none");
  }},
  { name: "記録に遊んだ時間（play）が入る", fn: async t => {
    await t.register();
    await t.ev(() => startStage(0, 0)); await t.page.waitForTimeout(1200);
    await t.clearAll();
    const r = await t.ev(() => myRecs[0]);
    assert.ok(Number.isInteger(r.play) && r.play >= 1, JSON.stringify(r));
  }}
];
