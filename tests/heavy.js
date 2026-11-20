// 重いテスト：ふだんの npm test の何百倍もの問題を作って、答えの正しさを確かめる（数分かかる）
//   node tests/heavy.js [何倍か（標準 1）]   … npm run test:heavy
// ドパマス：表示どおりに分数で計算し直した値と一致するか／ドパマス＋：数値微分・数値積分で確かめる
// どちらも、弱体化した問題・全ステージの出題（makeQ）・表示（html）・読み上げ（spoken）も通す
const { open } = require("./helpers");
const X = +process.argv[2] || 1;
const APPS = [
  { name: "ドパマス", path: "", survey: require("./engine.test.js").survey, N: 4000 * X },
  { name: "ドパマス＋", path: "plus/", survey: require("./plus.test.js").survey, N: 2000 * X }
];

(async () => {
  let fail = 0;
  for (const A of APPS) {
    const t = await open("local", { path: A.path });
    const t0 = Date.now();
    // 1) 各型・各レベルで N 問ずつ（弱体化した問題も）
    const d = await A.survey(t, A.N);
    let n = 0;
    for (const [k, r] of Object.entries(d)) {
      n += r.n;
      const bad = [...r.bad, ...r.weakBad];
      if (bad.length) { fail++; console.log(`❌ ${A.name} ${k}: ${bad.length} 問ずれている。例: ${bad.slice(0, 3).join(" / ")}`); }
    }
    // 2) 全ステージを、ゲームと同じ順・同じレベルで出題して、答えが整数でテンキーで打てるか、表示・読み上げでエラーが出ないか
    const s = await t.ev(R => {
      const out = { n: 0, bad: [] };
      WORLDS.forEach((W, w) => W.st.forEach((st, i) => {
        const boss = i === 3 || i === 6, N = boss ? 30 : 12;
        for (let run = 0; run < R; run++) {
          const seen = new Set();
          for (let k = 0; k < N; k++) {
            const L = Math.min(2, (boss ? Math.floor(k / N * 3) + (i === 6 ? 1 : 0) : (k < 4 ? 0 : k < 8 ? 1 : 2)) + (st.L || 0));
            const q = makeQ(st.alt ? [st.t[k % st.t.length]] : st.t, L, seen);
            seen.add(q.text); out.n++;
            try {
              if (!Number.isInteger(q.ans) || String(q.ans).length > 4) throw "テンキーで打てない答え " + q.ans;
              html(q.ast); spoken(q.text);
            } catch (e) { out.bad.push(`${w + 1}-${i + 1} ${q.text}: ${e}`); }
          }
        }
      }));
      return out;
    }, 300 * X);
    if (s.bad.length) { fail++; console.log(`❌ ${A.name} ステージの出題: ${s.bad.length} 問。例: ${s.bad.slice(0, 3).join(" / ")}`); }
    if (t.errors.length) { fail++; console.log(`❌ ${A.name} ページでエラー: ${t.errors.join(" / ")}`); }
    console.log(`${A.name}: 型ごと ${n.toLocaleString()} 問 ＋ ステージの出題 ${s.n.toLocaleString()} 問（${Math.round((Date.now() - t0) / 1000)}秒）`);
    await t.close();
  }
  console.log(fail ? `\n❌ ${fail} 件の問題が見つかった` : "\n✅ すべて正しい");
  process.exit(fail ? 1 : 0);
})();
