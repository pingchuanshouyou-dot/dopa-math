// 問題づくりのテスト。ページの中で大量に問題を作って、表示どおりに計算し直した答えと比べる
const assert = require("assert");

// 表示された式（text）を読み直して分数で計算する。かっこの付け忘れがあると答えがずれて見つかる
const PARSE = `(s)=>{
  const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a||1};
  const Q=(n,d=1)=>{if(d<0){n=-n;d=-d}const g=gcd(n,d);return{n:n/g,d:d/g}};
  const op={"+":(a,b)=>Q(a.n*b.d+b.n*a.d,a.d*b.d),"−":(a,b)=>Q(a.n*b.d-b.n*a.d,a.d*b.d),"×":(a,b)=>Q(a.n*b.n,a.d*b.d),"÷":(a,b)=>Q(a.n*b.d,a.d*b.n)};
  const tk=s.match(/\\d+(\\.\\d+)?(\\/\\d+)?|[()+−×÷^]/g);let i=0;
  const num=t=>{if(t.includes("/")){const [a,b]=t.split("/");return Q(+a,+b)}if(t.includes(".")){const k=t.split(".")[1].length;return Q(Math.round(+t*10**k),10**k)}return Q(+t)};
  function atom(){const t=tk[i++];if(t==="("){
      if((tk[i]==="−"||tk[i]==="+")&&/^\\d/.test(tk[i+1])&&tk[i+2]===")"){const sg=tk[i]==="−"?-1:1,v=num(tk[i+1]);i+=3;return Q(sg*v.n,v.d)}
      const v=expr();if(tk[i++]!==")")throw "かっこが閉じていない";return v}
    if(/^\\d/.test(t))return num(t);throw "読めない: "+t}
  function power(){let v=atom();while(tk[i]==="^"){i++;const e=+tk[i++];v=Q(v.n**e,v.d**e)}return v}
  function unary(){if(tk[i]==="−"){i++;const v=power();return Q(-v.n,v.d)}return power()}
  function term(){let v=unary();while(tk[i]==="×"||tk[i]==="÷"){const o=tk[i++];v=op[o](v,unary())}return v}
  function expr(){let v=term();while(tk[i]==="+"||tk[i]==="−"){const o=tk[i++];v=op[o](v,term())}return v}
  const v=expr();if(i!==tk.length)throw "余りがある";return v}`;

// 各型・各レベルで N 問ずつ作って、結果をまとめて返す
async function survey(t, N) {
  return t.ev(([P, N]) => {
    const parse = eval(P), out = {};
    const nums = s => s.match(/\d+/g).map(Number);
    for (const k of Object.keys(T)) {
      const r = out[k] = { bad: [], weakBad: [], shapeMiss: 0, avg: [], noMinus: 0, noFrac: 0, n: 0 };
      for (const L of [0, 1, 2]) {
        let sum = 0;
        for (let i = 0; i < N; i++) {
          const q = build(k, L); r.n++;
          const v = parse(q.text);
          if (v.d !== 1 || v.n !== q.ans) r.bad.push(q.text + " = " + q.ans);
          html(q.ast); chunk(q.ast); clashes(q.ast);   // 表示とヒントの計算でエラーが出ないこと
          sum += Math.max(...nums(q.text));
          if (!q.text.includes("−")) r.noMinus++;
          if (!q.text.includes("/")) r.noFrac++;
          const w = weaken(q);
          if (w) {
            const wv = parse(w.text);
            if (wv.d !== 1 || wv.n !== w.ans) r.weakBad.push(w.text);
            if (shape(w.text) !== shape(q.text)) r.shapeMiss++;
          }
        }
        r.avg.push(sum / N);
      }
    }
    return out;
  }, [PARSE, N]);
}

let data;
const get = async t => data || (data = await survey(t, 800));

exports.modes = ["local"];
exports.tests = [
  { name: "答えはいつも整数で、表示どおりに計算した値と一致する", fn: async t => {
    const d = await get(t);
    for (const [k, r] of Object.entries(d)) {
      assert.deepStrictEqual(r.bad.slice(0, 3), [], `${k} の答えがずれている`);
      assert.deepStrictEqual(r.weakBad.slice(0, 3), [], `${k} の弱体化後の答えがずれている`);
    }
  }},
  { name: "弱体化しても式の形（符号やかっこの並び）が変わらない", fn: async t => {
    const d = await get(t);
    for (const [k, r] of Object.entries(d)) assert.ok(r.shapeMiss <= r.n * 0.01, `${k} で形が変わった問題が ${r.shapeMiss} 問`);
  }},
  { name: "ステージ後半（L2）は前半（L0）より大きい数が出る", fn: async t => {
    const d = await get(t);
    for (const [k, r] of Object.entries(d)) assert.ok(r.avg[2] >= r.avg[0], `${k}: L0=${r.avg[0].toFixed(1)} L2=${r.avg[2].toFixed(1)}`);
  }},
  { name: "World 1〜2 は最後まで1桁", fn: async t => {
    const max = await t.ev(() => { let m = 0; for (const k of Object.keys(T).filter(k => /^a[12]_/.test(k))) for (let i = 0; i < 2000; i++) m = Math.max(m, ...build(k, 2).text.match(/\d+/g).map(Number)); return m; });
    assert.ok(max <= 9, `最大 ${max}`);
  }},
  { name: "正負の掛け算・割り算には必ずマイナスが入る", fn: async t => {
    const d = await get(t);
    for (const k of ["a2_mul1", "a2_mul2", "a3_mul1", "a3_mul2", "a3_div"]) assert.strictEqual(d[k].noMinus, 0, k);
  }},
  { name: "World 5 の分数の問題には必ず分数が入り、分子は12以下", fn: async t => {
    const d = await get(t);
    for (const k of ["a5_fplus", "a5_fminus", "a5_fmul", "a5_fdiv"]) assert.strictEqual(d[k].noFrac, 0, k);
    const big = await t.ev(() => { let n = 0; for (let i = 0; i < 3000; i++) if (Math.max(...build("a5_fdiv", 2).text.match(/\d+/g).map(Number)) > 12) n++; return n; });
    assert.strictEqual(big, 0);
  }},
  { name: "1回のステージで同じ式は出ない（通常12問・ボスは最長30問を50回ずつ）", fn: async t => {
    // ボスは大ボスでも正解19回＋時間切れ7回で26問ほどなので、余裕をみて30問
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
      return out;
    });
    assert.deepStrictEqual(dup.slice(0, 5), []);
  }},
  { name: "ヒント：掛け算があれば掛け算を、カッコがあればカッコの中を光らせる", fn: async t => {
    const r = await t.ev(() => {
      const c = s => { for (let i = 0; i < 500; i++) { const q = build(s, 1); const h = chunk(q.ast); if (h) return [q.text, text(h)]; } };
      return { mul: c("a4_mulplus"), par: c("a4_par"), pow: (() => { for (let i = 0; i < 500; i++) { const q = build("a3_pow", 1); if (q.text[0] === "−") return [q.text, text(chunk(q.ast))]; } })() };
    });
    assert.ok(/×/.test(r.mul[1]) && !/[+−] \(?−?\d+\)?$/.test(r.mul[1]), `掛け算: ${r.mul}`);
    assert.ok(r.par[1].startsWith("("), `カッコ: ${r.par}`);
    assert.ok(!r.pow[1].startsWith("−"), `−4² は 4² を光らせる: ${r.pow}`);
  }}
];
