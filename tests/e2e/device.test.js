// iPhone アプリ（Capacitor）の中での動き。ニセの Capacitor を入れて、
// 振動・共有・保存がネイティブ側を通ることを確かめる（ブラウザでの動きは、ほかのテスト全部で確かめている）
const assert = require("assert");

// ニセの Capacitor。呼ばれた記録を __native に残す。保存は sessionStorage に入れて、再読み込みしても残るようにする
exports.init = `(()=>{
  const log=window.__native=[];
  const P=JSON.parse(sessionStorage.getItem("fakePrefs")||"{}"),save=()=>sessionStorage.setItem("fakePrefs",JSON.stringify(P));
  window.__vibrate=0;navigator.vibrate=()=>{window.__vibrate++;return true};
  window.Capacitor={isNativePlatform:()=>true,Plugins:{
    Haptics:{impact:o=>{log.push("impact:"+o.style);return Promise.resolve()},notification:o=>{log.push("notification:"+o.type);return Promise.resolve()}},
    Share:{share:o=>{log.push("share:"+o.text);return Promise.resolve()}},
    Preferences:{keys:async()=>({keys:Object.keys(P)}),get:async({key})=>({value:key in P?P[key]:null}),
      set:async({key,value})=>{P[key]=value;save()},remove:async({key})=>{delete P[key];save()}}
  }};
})();`;
exports.modes = ["local"];

const log = t => t.ev(() => window.__native.slice());

exports.tests = [
  { name: "キーを押す・正解・まちがい・クリティカルで、ネイティブの振動を使う（ブラウザの振動は使わない）", fn: async t => {
    await t.register();
    await t.ev(() => startStage(0, 3)); await t.page.waitForTimeout(200);
    await t.ev(() => { window.__native.length = 0; });
    await t.solve(170);
    let l = await log(t);
    assert.ok(l.includes("impact:LIGHT"), "キーを押したとき: " + l);
    assert.ok(l.includes("impact:MEDIUM"), "正解したとき: " + l);
    await t.wrong(); await t.page.waitForTimeout(450);
    assert.ok((await log(t)).includes("notification:ERROR"), "まちがえたとき");
    // FEVER 中の正解はクリティカル
    await t.ev(() => { fever = 3; }); await t.solve(170);
    assert.ok((await log(t)).includes("impact:HEAVY"), "クリティカルのとき");
    assert.strictEqual(await t.ev(() => window.__vibrate), 0);
  }},
  { name: "学習レポートは iOS の共有シートで送る", fn: async t => {
    await t.register("まひろ");
    await t.ev(() => startStage(0, 0)); await t.page.waitForTimeout(200);
    await t.clearAll();
    await t.page.click("#share"); await t.page.waitForTimeout(100);
    const l = await log(t);
    assert.ok(l.some(x => x.startsWith("share:【Dopa-Math 学習報告】")), l.join(" / "));
  }},
  { name: "記録はアプリ内の保存場所に入り、ブラウザの localStorage には入らない。再読み込みしても残る", fn: async t => {
    await t.register("まひろ");
    await t.ev(() => startStage(0, 0)); await t.page.waitForTimeout(200);
    await t.clearAll();
    const p = await t.ev(() => JSON.parse(sessionStorage.getItem("fakePrefs")));
    assert.ok(p["dopamath-local-users"] && p["dopamath-local-me"], Object.keys(p).join(","));
    assert.strictEqual(await t.ev(() => localStorage.getItem("dopamath-local-users")), null);
    await t.page.reload(); await t.page.waitForFunction(() => document.querySelector("#opLoad").hidden);
    assert.match(await t.page.textContent("#opWho"), /まひろ/);
    await t.page.click("#goPlay");
    assert.strictEqual(await t.ev(() => myProg["1-1"]), 3);
  }},
  { name: "音が止まっている間（アプリが裏にいる間）は音を作らない", fn: async t => {
    const r = await t.ev(async () => {
      audio(); await ac.resume();
      let n = 0; const orig = ac.createOscillator.bind(ac); ac.createOscillator = () => { n++; return orig(); };
      const out = { running: ac.state };
      await ac.suspend(); tone(440, .1, "sine", .1); out.whileSuspended = n;
      await ac.resume(); tone(440, .1, "sine", .1); out.afterResume = n;
      return out;
    });
    assert.deepStrictEqual(r, { running: "running", whileSuspended: 0, afterResume: 1 });
  }},
  { name: "着せ替えもアプリ内の保存場所に入る", fn: async t => {
    await t.register();
    await t.ev(() => saveSkin({ skin: "base" }));
    const p = await t.ev(() => JSON.parse(sessionStorage.getItem("fakePrefs")));
    assert.ok(Object.keys(p).some(k => k.startsWith("dopamath-skin:")), Object.keys(p).join(","));
  }}
];
