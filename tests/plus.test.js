// ドパマス＋（積分）のテスト。数学の正しさは数値で確かめる
//   不定積分：穴に答えを入れた式を数値で微分して、元の関数と一致するか（答え＋1 では一致しないことも）
//   定積分：  数値積分（シンプソン法）の値と、穴に答えを入れた値が一致するか
const assert = require("assert");

exports.path = "plus/";

// 各型・各レベルで N 問ずつ作って、数学のチェックをページの中で行う
async function survey(t, N) {
  return t.ev(N => {
    const XS = [0.37, 0.81, 1.23, 1.66], h = 1e-5;
    const close = (a, b) => Math.abs(a - b) <= 1e-5 * (1 + Math.abs(a) + Math.abs(b));
    // 不定積分：F(x, A) を微分して f(x) になるか
    const okF = (m, A) => { let n = 0; for (const x of XS) { const d = (m.F(x + h, A) - m.F(x - h, A)) / (2 * h), y = m.f(x); if (!isFinite(d) || !isFinite(y) || Math.abs(y) > 1e7) continue; if (!close(d, y)) return false; n++; } return n >= 2; };
    const simpson = (f, a, b, n = 4000) => { const w = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * w); return s * w / 3; };
    const check = q => {
      const m = q.math;
      if (m.F) return okF(m, q.ans) && !okF(m, q.ans + 1) ? "" : "微分しても元にもどらない";
      const v = simpson(m.f, m.lo, m.hi);
      return close(v, m.val(q.ans)) && !close(v, m.val(q.ans + 1)) ? "" : `数値積分 ${v} と合わない`;
    };
    const out = {};
    for (const k of Object.keys(T)) {
      const r = out[k] = { bad: [], weakBad: [], shapeMiss: 0, weakSame: 0, avg: [], n: 0, hint: !!T[k].h };
      for (const L of [0, 1, 2]) {
        let sum = 0;
        for (let i = 0; i < N; i++) {
          const q = build(k, L);
          if (!q) continue;  // 答えが大きすぎるなどで作り直しになった（ゲームでは自動で別の問題を作る）
          r.n++;
          const e = check(q); if (e) r.bad.push(`${q.text}（答え ${q.ans}）: ${e}`);
          if (!chunk(q.ast)) r.bad.push(q.text + ": ヒントで光らせる所がない");
          // 右上の小さい数字（sin⁴x の 4 など）もふつうの数字にして、いちばん大きい数を測る
          sum += Math.max(...(q.text.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, c => "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)).match(/\d+/g) || [0]).map(Number));
          const w = weaken(q);
          if (!w) { r.weakSame++; continue; }
          const we = check(w); if (we) r.weakBad.push(`${w.text}（答え ${w.ans}）: ${we}`);
          if (shape(w.text) !== shape(q.text)) r.shapeMiss++;
        }
        r.avg.push(sum / Math.max(1, N));
      }
    }
    return out;
  }, N);
}
let data;
const get = async t => data || (data = await survey(t, 300));
exports.survey = survey;  // tests/heavy.js でも同じチェックを大量に回す

exports.modes = ["local"];
exports.tests = [
  { name: "全部の型で、穴に答えを入れると正しい積分になる（答え＋1では合わない）", fn: async t => {
    const d = await get(t);
    for (const [k, r] of Object.entries(d)) {
      assert.deepStrictEqual(r.bad.slice(0, 3), [], k);
      assert.deepStrictEqual(r.weakBad.slice(0, 3), [], k + "（弱体化後）");
    }
  }},
  { name: "弱体化しても式の形が変わらない", fn: async t => {
    const d = await get(t);
    // w4_x2exp（∫(x²+px)eˣ）は答えの係数が p−2 と 2−p で決まるので、数字を1〜2にすると符号や項の有無が
    // どうしても変わる（p=5 の (x²+3x−3)eˣ → p=1 の (x²−x+1)eˣ）。この型だけは形のチェックから外す
    const LINKED = ["w4_x2exp"];
    for (const [k, r] of Object.entries(d)) if (!LINKED.includes(k)) assert.ok(r.shapeMiss <= r.n * 0.01, `${k} で形が変わった問題が ${r.shapeMiss} 問`);
  }},
  { name: "ステージ後半（L2）は前半（L0）より大きい数が出る", fn: async t => {
    const d = await get(t);
    for (const [k, r] of Object.entries(d)) assert.ok(r.avg[2] >= r.avg[0], `${k}: L0=${r.avg[0].toFixed(1)} L2=${r.avg[2].toFixed(1)}`);
  }},
  { name: "全部の型にヒントの一言がある", fn: async t => {
    const d = await get(t);
    assert.deepStrictEqual(Object.keys(d).filter(k => !d[k].hint), []);
  }},
  { name: "1回のステージで同じ式は出ない（通常12問・ボスは最長30問を50回ずつ）", fn: async t => {
    const dup = await t.ev(() => {
      const out = [];
      WORLDS.forEach((W, w) => W.st.forEach((s, i) => {
        const boss = i === 3 || i === 6, N = boss ? 30 : 12;
        for (let run = 0; run < 50; run++) {
          const seen = new Set();
          for (let k = 0; k < N; k++) {
            const L = Math.min(2, (boss ? Math.floor(k / N * 3) + (i === 6 ? 1 : 0) : (k < 4 ? 0 : k < 8 ? 1 : 2)) + (s.L || 0));
            const q = makeQ(s.alt ? [s.t[k % s.t.length]] : s.t, L, seen);
            if (seen.has(q.text)) out.push(`${w + 1}-${i + 1} ${q.text}`);
            seen.add(q.text);
          }
        }
      }));
      return [...new Set(out)];
    });
    assert.deepStrictEqual(dup.slice(0, 8), []);
  }},
  { name: "1-1 を遊んでクリアでき、記録はドパマスと別の場所に保存される", fn: async t => {
    await t.register("まひろ");
    assert.strictEqual(await t.page.title(), "Dopa-Math＋");
    await t.page.click('.node[data-s="0"]'); await t.page.click("#shGo"); await t.page.waitForTimeout(200);
    assert.match(await t.page.innerHTML("#eqR"), /class="bl"/, "答えの行は「□ = 」");
    await t.clearAll();
    assert.strictEqual(await t.page.textContent("#rH"), "STAGE CLEAR!");
    assert.strictEqual(await t.ev(() => myProg["1-1"]), 3);
    const keys = await t.ev(() => Object.keys(localStorage));
    assert.ok(keys.includes("dopamathplus-local-users") && !keys.includes("dopamath-local-users"), keys.join(","));
    assert.match(await t.ev(() => shareText()), /^【Dopa-Math＋ 学習報告】/);
    assert.strictEqual(await t.page.textContent("#cTitle"), "積分デビュー🐣");
  }},
  { name: "8秒でヒントが光り、型ごとの一言が出る", fn: async t => {
    await t.register();
    await t.ev(() => { startStage(1, 0); t0 -= QUICK * 1000 + 100; });
    await t.page.waitForTimeout(200);
    assert.ok(await t.ev(() => !!$("#eqQ .hl")), "光っている所がある");
    assert.strictEqual(await t.page.textContent("#hint"), await t.ev(() => T.w2_pow.h));
  }},
  { name: "弱体化で数字が1〜2になり、答えも正しいまま", fn: async t => {
    await t.register();
    await t.ev(() => { startStage(1, 0); q = build("w2_pow", 2); showQ(); });
    const before = await t.ev(() => q.text);
    await t.page.click("#weak"); await t.page.waitForTimeout(100);
    const after = await t.ev(() => q.text);
    assert.notStrictEqual(after, before);
    await t.solve(150);
    assert.strictEqual(await t.ev(() => okN), 1, `${before} → ${after}`);
  }},
  { name: "ボスを倒せる", fn: async t => {
    await t.register();
    await t.ev(() => startStage(0, 3)); await t.page.waitForTimeout(200);
    while (await t.ev(() => running && hp > 0)) await t.solve(170);
    await t.page.waitForTimeout(1200);
    assert.strictEqual(await t.page.textContent("#rH"), "BOSS撃破！");
  }}
];
