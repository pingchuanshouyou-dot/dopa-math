// 新規登録・ログイン・ログアウト
const assert = require("assert");

exports.tests = [
  { name: "テストのモードどおりの保存先で動いている", fn: async t => {
    assert.strictEqual(await t.ev(() => cloud.mode), t.mode);
  }},
  { name: "名前とパスワードだけで登録でき、👁️でパスワードが見える", fn: async t => {
    const p = t.page;
    await p.click("#goReg");
    assert.strictEqual(await p.locator("#aPw2").count(), 0, "確認用の欄はない");
    await p.fill("#aName", "まひろ"); await p.fill("#aPw", "secret1");
    await p.click("#aEye");
    assert.strictEqual(await p.getAttribute("#aPw", "type"), "text");
    await p.click("#aEye");
    assert.strictEqual(await p.getAttribute("#aPw", "type"), "password");
    await p.click("#aGo"); await p.waitForTimeout(400);
    assert.strictEqual(await t.visible(), "map");
    assert.match(await p.textContent("#who"), /まひろ/);
  }},
  { name: "短いパスワード・同じ名前・まちがったパスワードは止める", fn: async t => {
    const p = t.page;
    await p.click("#goReg"); await p.fill("#aName", "まひろ"); await p.fill("#aPw", "abc"); await p.click("#aGo");
    assert.match(await p.textContent("#aErr"), /6文字以上/);
    await p.fill("#aPw", "secret1"); await p.click("#aGo"); await p.waitForTimeout(400);
    await p.click("#who"); await p.click("#mOut"); await p.waitForTimeout(300);
    // 全角・大文字ちがいも同じ名前として扱う
    await p.click("#goReg"); await p.fill("#aName", "まひろ"); await p.fill("#aPw", "secret2"); await p.click("#aGo"); await p.waitForTimeout(300);
    assert.match(await p.textContent("#aErr"), /もう使われています/);
    await p.click("#authSwap"); await p.fill("#aName", "まひろ"); await p.fill("#aPw", "wrong!!"); await p.click("#aGo"); await p.waitForTimeout(300);
    assert.match(await p.textContent("#aErr"), /ちがいます/);
  }},
  { name: "ログアウトしてログインし直すと、記録と星が残っている", fn: async t => {
    const p = t.page;
    await t.register("まひろ");
    await p.click('.node[data-s="0"]'); await p.click("#shGo"); await p.waitForTimeout(200);
    await t.clearAll();
    await p.click("#toMap");
    await p.click("#who"); await p.click("#mOut"); await p.waitForTimeout(300);
    assert.strictEqual(await t.visible(), "open");
    await p.click("#goLogin");
    assert.strictEqual(await p.getAttribute("#aPw", "type"), "password", "開き直したら隠れている");
    await p.fill("#aName", "まひろ"); await p.fill("#aPw", "secret1"); await p.click("#aGo"); await p.waitForTimeout(400);
    assert.strictEqual(await t.ev(() => myProg["1-1"]), 3);
    assert.strictEqual(await t.ev(() => myRecs.length), 1);
    // 再読み込みしてもログインしたまま
    await p.reload(); await p.waitForFunction(() => document.querySelector("#opLoad").hidden);
    assert.match(await p.textContent("#opWho"), /まひろ/);
  }}
];
