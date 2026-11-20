// 画面の大きさ：iPhone の小さい画面から iPad まで、いちばん長い式・テンキー・マップがはみ出さない
const assert = require("assert");
const { open } = require("../helpers");

const VP = [[320, 568], [375, 667], [390, 844], [430, 932], [744, 1133], [820, 1180], [1180, 820], [1024, 1366]];

async function check(t) {
  await t.register("まひろ");
  for (const [w, h] of VP) {
    await t.page.setViewportSize({ width: w, height: h });
    const bad = await t.ev(() => {
      const pageX = () => document.documentElement.scrollWidth > innerWidth + 1, out = [];
      goMap();
      if (pageX()) out.push("マップが横にはみ出す");
      // いちばん長い式（各型 L2 で100問ずつ作り、文字数が最大のもの）
      let worst = null;
      for (const k of Object.keys(T)) for (let i = 0; i < 100; i++) { const x = build(k, 2); if (x && (!worst || x.text.length > worst.text.length)) worst = x; }
      startStage(0, 0); q = worst; showQ();
      const c = $("#card").getBoundingClientRect(), e = $("#eqQ"), eb = e.getBoundingClientRect(), rb = $("#eqR").getBoundingClientRect(), pad = $("#pad").getBoundingClientRect();
      if (e.scrollWidth > e.clientWidth + 1) out.push("式が横にはみ出す");
      if (eb.top < c.top || rb.bottom > c.bottom + 1 || eb.left < c.left - 1 || eb.right > c.right + 1) out.push("式がカードからはみ出す: " + worst.text);
      if (pad.bottom > innerHeight + 1) out.push("テンキーが画面の下で切れる");
      if (pageX()) out.push("遊ぶ画面が横にはみ出す");
      running = false; return out;
    });
    assert.deepStrictEqual(bad, [], `${w}x${h}`);
  }
}

exports.modes = ["local"];
exports.tests = [
  { name: "ドパマス：320×568〜iPad で、いちばん長い式・テンキー・マップがはみ出さない", fn: check },
  { name: "ドパマス＋：320×568〜iPad で、いちばん長い式・テンキー・マップがはみ出さない", fn: async t => {
    const p = await open("local", { path: "plus/" });
    try { await check(p); if (p.errors.length) throw new Error(p.errors.join(" / ")); } finally { await p.close(); }
  }},
  { name: "ドパマス＋：log|..| のかたまりは途中で改行しない", fn: async t => {
    const p = await open("local", { path: "plus/" });
    try {
      await p.register("まひろ");
      await p.page.setViewportSize({ width: 320, height: 568 });
      const r = await p.ev(() => { startStage(0, 0); do q = build("w3_log", 2); while (!q); showQ(); const n = $("#eqQ .nw"); const res = n && { text: n.textContent, lines: Math.round(n.getBoundingClientRect().height / parseFloat(getComputedStyle($("#eqQ")).lineHeight)) }; running = false; return res; });
      assert.ok(r && /^log\|.+\|$/.test(r.text), JSON.stringify(r));
      assert.strictEqual(r.lines, 1);
    } finally { await p.close(); }
  }}
];
