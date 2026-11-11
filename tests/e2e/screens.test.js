// マップ・結果・記録・着せ替え・連続記録・ランク・LINEの文面
const assert = require("assert");

async function clear11(t) {
  await t.register("まひろ");
  await t.page.click('.node[data-s="0"]'); await t.page.click("#shGo"); await t.page.waitForTimeout(200);
  await t.clearAll();
}

exports.tests = [
  { name: "結果の認定証カードに名前・称号・反射神経ランク・連続日数が出る", fn: async t => {
    await clear11(t);
    const p = t.page;
    assert.match(await p.textContent("#cStage"), /STAGE 1-1/);
    assert.strictEqual(await p.textContent("#cName"), "まひろ");
    assert.strictEqual(await p.textContent("#cTitle"), "計算デビュー🐣");
    assert.match(await p.textContent("#cBadge"), /反射神経ランク (SSS|SS|S|A|B)/);
    assert.match(await p.textContent("#cStreak"), /1日連続/);
    assert.match(await p.textContent("#rR"), /XP/);
  }},
  { name: "TikTok解禁ゲージはパーセントだけ表示", fn: async t => {
    await clear11(t);
    assert.match(await t.page.textContent("#rM"), /\d+%$/);
    await t.page.click("#toMap");
    assert.match(await t.page.textContent("#oyaTxtM"), /^\d+%$/);
  }},
  { name: "LINE の文面は親向けの学習報告", fn: async t => {
    await clear11(t);
    const s = await t.ev(() => shareText());
    assert.match(s, /^【Dopa-Math 学習報告】\n本日のトレーニング（12問・正解率100%）を完了しました💮/);
  }},
  { name: "記録画面に遊んだステージが出る", fn: async t => {
    await clear11(t);
    await t.page.click("#toMap"); await t.page.click("#who"); await t.page.click("#mRec");
    assert.strictEqual(await t.page.locator(".rec").count(), 1);
    assert.match(await t.page.textContent(".rec .tag"), /1-1 答えがマイナスになる引き算 ✓/);
  }},
  { name: "連続記録：今日まだのときも、昨日までの日数を出す", fn: async t => {
    await clear11(t);
    await t.page.click("#toMap");
    assert.strictEqual(await t.page.textContent("#streak"), "🔥 1日連続！");
    await t.ev(() => { const d = Date.now(), r = myRecs[0]; myRecs.push({ ...r, at: d - 864e5 }, { ...r, at: d - 2 * 864e5 }, { ...r, at: d - 4 * 864e5 }); drawStreak(); });
    assert.strictEqual(await t.page.textContent("#streak"), "🔥 3日連続！");
    await t.ev(() => { myRecs = myRecs.filter(r => new Date(r.at).toDateString() !== new Date().toDateString()); drawStreak(); });
    assert.strictEqual(await t.page.textContent("#streak"), "🔥 2日連続 ⏳今日まだ");
  }},
  { name: "着せ替え：星が足りないと選べず、集めると選べて再読み込み後も残る", fn: async t => {
    await t.register();
    const p = t.page;
    await p.click("#who"); await p.click("#mSkin");
    assert.ok(await p.isDisabled('.skin[data-k="cafe"]'));
    await t.ev(async () => { for (const id of ["1-1", "1-2"]) { myProg[id] = id === "1-1" ? 3 : 2; await cloud.saveProg(id, myProg[id]); } drawSkins(); });
    await p.click('.skin[data-k="cafe"]');
    assert.strictEqual(await t.ev(() => document.documentElement.dataset.skin), "cafe");
    await p.reload(); await p.waitForFunction(() => document.querySelector("#opLoad").hidden);
    assert.strictEqual(await t.ev(() => document.documentElement.dataset.skin), "cafe");
    await p.click("#goPlay"); await p.click("#who"); await p.click("#mOut"); await p.waitForTimeout(300);
    assert.strictEqual(await t.ev(() => document.documentElement.dataset.skin), undefined, "ログアウトで元に戻る");
  }},
  { name: "星が5つになった瞬間に「着せ替え解放」のお知らせが出る", fn: async t => {
    await t.register();
    await t.ev(() => { myProg = { "1-1": 2, "1-2": 2 }; startStage(0, 2); });
    await t.clearAll();
    assert.match(await t.page.textContent("#rR"), /韓国カフェ風ラテ☕」が解放/);
  }},
  { name: "ランク100の称号は「計算の女神👑」", fn: async t => {
    await t.register();
    await t.ev(() => { myXp = need(100); drawRank(); });
    assert.strictEqual(await t.page.textContent("#mTitle"), "計算の女神👑");
  }},
  { name: "全ステージの説明シートが開き、例題が出る", fn: async t => {
    await t.register();
    const bad = await t.ev(() => {
      const out = [];
      for (let w = 0; w < WORLDS.length; w++) for (let s = 0; s < 7; s++) { myProg[sid(w, s)] = 3; }
      for (let w = 0; w < WORLDS.length; w++) { mapW = w; drawMap(); for (let s = 0; s < 7; s++) { $(`.node[data-s="${s}"]`).click(); if (!/^「?.*例：/.test($("#shDesc").textContent) && !/例：/.test($("#shDesc").textContent)) out.push(sid(w, s)); } }
      return out;
    });
    assert.deepStrictEqual(bad, []);
  }}
];
