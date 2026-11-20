// ニックネームだけのモード（iPhone アプリの中の標準）。ニセの Capacitor を入れてアプリの中として開く
const assert = require("assert");

exports.init = require("./device.test.js").init;
// ニセ Firebase のモードでも、ニックネームのモードでは Firebase を使わないことを確かめる
exports.modes = ["local", "firebase"];

async function start(t, name = "まひろ") {
  await t.page.click("#goReg");
  await t.page.fill("#aName", name); await t.page.click("#aGo");
  await t.page.waitForTimeout(300);
}

exports.tests = [
  { name: "アプリの中ではニックネームだけで始められ、パスワードも Firebase も使わない", fn: async t => {
    const p = t.page;
    assert.strictEqual(await t.ev(() => cloud.mode), "local", "Firebase の設定があっても使わない");
    assert.strictEqual(await p.textContent("#goReg"), "▶ はじめる");
    assert.ok(await p.isHidden("#goLogin"));
    await p.click("#goReg");
    assert.strictEqual(await p.textContent("#authT"), "はじめまして！");
    assert.ok(await p.isHidden("#aPwL"), "パスワードの欄はない");
    assert.ok(await p.isVisible("#aNote"), "端末の外に送らないことを書いている");
    await p.click("#aGo");
    assert.match(await p.textContent("#aErr"), /ニックネームを入れて/);
    await p.fill("#aName", "まひろ"); await p.click("#aGo"); await p.waitForTimeout(300);
    assert.strictEqual(await t.visible(), "map");
    assert.match(await p.textContent("#who"), /まひろ/);
  }},
  { name: "遊んだ記録は再読み込みしても残り、オープニングは「◯◯ で遊ぶ」", fn: async t => {
    await start(t);
    await t.ev(() => startStage(0, 0)); await t.page.waitForTimeout(200);
    await t.clearAll();
    assert.strictEqual(await t.page.textContent("#cName"), "まひろ");
    await t.page.reload(); await t.page.waitForFunction(() => document.querySelector("#opLoad").hidden);
    assert.strictEqual(await t.page.textContent("#opWho"), "まひろ で遊ぶ");
    assert.match(await t.page.textContent("#opNote"), /この端末の中だけ/);
    assert.ok(await t.page.isHidden("#goSwitch"));
    await t.page.click("#goPlay");
    assert.strictEqual(await t.ev(() => myProg["1-1"]), 3);
  }},
  { name: "メニューは「ニックネームを変える」になり、変えても記録は残る", fn: async t => {
    await start(t);
    await t.ev(() => startStage(0, 0)); await t.page.waitForTimeout(200);
    await t.clearAll();
    await t.page.click("#toMap"); await t.page.click("#who");
    assert.strictEqual(await t.page.textContent("#mOut"), "✏️ ニックネームを変える");
    await t.page.click("#mOut");
    assert.strictEqual(await t.page.inputValue("#aName"), "まひろ", "今のニックネームが入っている");
    await t.page.fill("#aName", "ひろ"); await t.page.click("#aGo"); await t.page.waitForTimeout(300);
    assert.strictEqual(await t.visible(), "map");
    assert.match(await t.page.textContent("#who"), /ひろ/);
    assert.strictEqual(await t.ev(() => myProg["1-1"]), 3);
    assert.strictEqual(await t.ev(() => myRecs.length), 1);
    // もどるボタンはマップへ
    await t.page.click("#who"); await t.page.click("#mOut"); await t.page.click("#authBack");
    assert.strictEqual(await t.visible(), "map");
  }}
];
