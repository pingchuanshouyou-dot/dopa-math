/* Dopa-Math＋ 出題エンジン（積分）。画面には一切さわらない。
   答えの式に1つだけ穴 □ をあけ、穴に入る整数を打たせる。ドパマスと同じ関数名（build・makeQ・weaken・html・chunk…）を用意して、
   プレイ画面のコード（../js/game.js など）をそのまま使えるようにしている */
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));

/* ---------- 問題の書き方 ----------
   T の各型は、次の短い記法で式を書く。render() が画面用のHTMLと、文字だけの版（重複チェックや例題用）に変換する
     x        → 斜体の x
     ^3 ^{..} → 右上の小さい数字（べき乗）
     {a/b}    → 分数
     []       → 答えを入れる穴 □
     <<..>>   → ヒントで光らせる所
     ⟦..⟧     → 途中で改行しないかたまり（log|..| など）
     ∫[a|b]   → 下端 a・上端 b の定積分 */
const SUP={"0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","+":"⁺","−":"⁻","x":"ˣ","(":"⁽",")":"⁾"," ":""};
const close=(s,i,o,c)=>{let d=0;for(let j=i;j<s.length;j++){if(s[j]===o)d++;else if(s[j]===c&&--d===0)return j}throw new Error("閉じていない: "+s)};
// 分数の中の「/」（中にある {} の外のもの）
const slash=s=>{let d=0;for(let j=0;j<s.length;j++){if(s[j]==="{")d++;else if(s[j]==="}")d--;else if(s[j]==="/"&&!d)return j}throw new Error("分数に / がない: "+s)};
// 分数・べき乗・積分の端の中身。ここでは文字を1つずつ包まない（ヒントで暗くするのは外側の箱ごと）
function inner(s){
  let h="",t="";
  for(let i=0;i<s.length;){
    if(s.startsWith("[]",i)){h+='<b class="bl">□</b>';t+="□";i+=2}
    else if(s[i]==="^"){let e;if(s[i+1]==="{"){const j=close(s,i+1,"{","}");e=s.slice(i+2,j);i=j+1}else{e=s[i+1];i+=2}
      const r=inner(e);h+=`<sup>${r.h}</sup>`;t+=supText(r.t)}
    else if(s[i]==="x"){h+="<i>x</i>";t+="x";i++}
    else{h+=s[i];t+=s[i];i++}
  }
  return{h,t};
}
const supText=t=>[...t].every(c=>c in SUP)?[...t].map(c=>SUP[c]).join(""):"^("+t+")";
function render(s){
  let h="",t="",run="";
  const tk=x=>`<span class="tk">${x}</span>`;
  const flush=()=>{if(run){h+=tk(run);t+=run;run=""}};
  for(let i=0;i<s.length;){
    if(s.startsWith("<<",i)){flush();h+='<span class="nd" data-i="1">';i+=2}
    else if(s[i]==="⟦"){flush();h+='<span class="nw">';i++}
    else if(s[i]==="⟧"){flush();h+="</span>";i++}
    else if(s.startsWith(">>",i)){flush();h+="</span>";i+=2}
    else if(s.startsWith("[]",i)){flush();h+=tk('<b class="bl">□</b>');t+="□";i+=2}
    else if(s.startsWith("∫[",i)){flush();const j=s.indexOf("]",i),[lo,hi]=s.slice(i+2,j).split("|").map(inner);
      h+=`<span class="tk int">∫<span class="lim"><span>${hi.h}</span><span>${lo.h}</span></span></span>`;t+=`∫(${lo.t}→${hi.t})`;i=j+1}
    else if(s[i]==="{"){flush();const j=close(s,i,"{","}"),b=s.slice(i+1,j),k=slash(b),n=inner(b.slice(0,k)),d=inner(b.slice(k+1));
      h+=`<span class="tk fr"><span>${n.h}</span><span>${d.h}</span></span>`;t+=`(${n.t}/${d.t})`;i=j+1}
    else if(s[i]==="^"){flush();let e;if(s[i+1]==="{"){const j=close(s,i+1,"{","}");e=s.slice(i+2,j);i=j+1}else{e=s[i+1];i+=2}
      const r=inner(e);h+=`<sup class="tk">${r.h}</sup>`;t+=supText(r.t)}
    else if(s[i]==="x"){flush();h+=tk("<i>x</i>");t+="x";i++}
    else{run+=s[i];i++}
  }
  flush();
  return{h,t:t.replace(/\s+/g," ").trim(),key:s.includes("<<")};
}

/* ---------- 数の書き方 ---------- */
const num=v=>v<0?"−"+(-v):String(v);
const cf=k=>k===1?"":k===-1?"−":num(k);              // 文字の前の係数（1は書かない）
const sgn=v=>v<0?" − ":" + ";                          // 2つ目以降の項の符号
const term=(c,p)=>p===0?String(Math.abs(c)):(Math.abs(c)===1?"":Math.abs(c))+"x"+(p>1?"^"+p:"");
const lin=(a,b)=>`${cf(a)}x${b?sgn(b)+Math.abs(b):""}`; // ax + b

/* ---------- 乱数係：弱体化のとき、形の選び方は同じまま数字だけ小さくする ---------- */
function Gen(L,replay){
  const ch=[];let i=0;
  return{
    L,ch,weak:!!replay,
    c(k){const v=replay?(i<replay.length?replay[i++]:0)%k:rnd(0,k-1);if(!replay)ch.push(v);return v},
    s(){return this.c(2)?-1:1},
    k(...a){return a[Math.min(L,a.length-1)]},
    n(lo,hi){if(replay){const l=Math.min(lo,2);return rnd(l,Math.max(l,Math.min(hi,2)))}return rnd(lo,Math.max(lo,hi))}  // 弱体化は1か2だけ
  };
}

/* ---------- 問題の型 ----------
   f(g) は { d: 式, ans: 穴に入る整数, f: 積分する関数, F: 穴に A を入れたときの積分の結果 } を返す。
   定積分は F のかわりに { lo, hi: 端（数）, val: 穴に A を入れたときの値 } を持つ。
   f・F・val はテストで「微分すると元にもどるか」「数値で積分した値と合うか」を確かめるためのもの
   h はヒントの一言（答えそのものは言わない） */
const T={
  // World 1 べき乗の草原：基本の関数
  w1_pow:{n:"xⁿ の不定積分",h:"💡 xⁿ を積分すると、次数が1つ上がって、その次数で割った形になるよ",f:g=>{
    const n=g.n(2,g.k(3,4,5)),k=g.s()*g.n(1,g.k(3,5,7)),a=k*(n+1);
    return{d:`∫ ${cf(a)}<<x^${n}>> dx = []x^${n+1} + C`,ans:k,f:x=>a*x**n,F:(x,A)=>A*x**(n+1)}}},
  w1_poly:{n:"多項式の不定積分",h:"💡 項ごとに積分すればOK。光っている項の係数に注目",f:g=>{
    const p=g.n(2,g.k(2,3,4)),q=p-1,d1=g.s()*g.n(1,g.k(3,4,5)),d2=g.s()*g.n(1,g.k(3,4,5)),c1=d1*(p+1),c2=d2*(q+1),b=g.c(2);
    const t1=(c1<0?"−":"")+term(c1,p),t2=sgn(c2)+term(c2,q);
    const ig=b?`(${t1}<<${t2}>>)`:`(<<${t1}>>${t2})`;
    const r=b?`${cf(d1)}x^${p+1} + []x^${q+1}`:`[]x^${p+1}${sgn(d2)}${term(d2,q+1)}`;
    return{d:`∫ ${ig} dx = ${r} + C`,ans:b?d2:d1,f:x=>c1*x**p+c2*x**q,
      F:(x,A)=>b?d1*x**(p+1)+A*x**(q+1):A*x**(p+1)+d2*x**(q+1)}}},
  w1_trig:{n:"三角関数の不定積分",h:"💡 sin と cos、微分するとどっちに変わる？ 符号にも注意",f:g=>{
    const a=g.s()*g.n(1,g.k(3,5,9));
    return g.c(2)?{d:`∫ ${cf(a)}<<sin x>> dx = [] cos x + C`,ans:-a,f:x=>a*Math.sin(x),F:(x,A)=>A*Math.cos(x)}
                 :{d:`∫ ${cf(a)}<<cos x>> dx = [] sin x + C`,ans:a,f:x=>a*Math.cos(x),F:(x,A)=>A*Math.sin(x)}}},
  w1_exp:{n:"eˣ と 1/x の不定積分",h:"💡 eˣ は積分しても eˣ のまま。1/x を積分すると log|x|",f:g=>{
    const a=g.s()*g.n(1,g.k(3,5,9));
    return g.c(2)?{d:`∫ ${cf(a)}<<e^x>> dx = []e^x + C`,ans:a,f:x=>a*Math.exp(x),F:(x,A)=>A*Math.exp(x)}
                 :{d:`∫ ${a<0?"−":""}<<{${Math.abs(a)}/x}>> dx = [] ⟦log|x|⟧ + C`,ans:a,f:x=>a/x,F:(x,A)=>A*Math.log(Math.abs(x))}}},
  w1_root:{n:"分数・ルートの不定積分",h:"💡 1/x² は x⁻²、√x は x^(1/2) と書きかえてから積分しよう",f:g=>{
    if(g.c(2)){const a=g.s()*g.n(1,g.k(3,5,7));
      return{d:`∫ ${a<0?"−":""}<<{${Math.abs(a)}/x^2}>> dx = {[]/x} + C`,ans:-a,f:x=>a/x**2,F:(x,A)=>A/x}}
    const k=g.s()*g.n(1,g.k(2,3,4)),a=3*k;
    return{d:`∫ ${cf(a)}<<√x>> dx = []x√x + C`,ans:2*k,f:x=>a*Math.sqrt(x),F:(x,A)=>A*x**1.5}}},
  // World 2 合成の渓谷：(ax+b) のかたまりごと積分
  w2_pow:{n:"(ax+b)ⁿ の不定積分",h:"💡 カッコの中を1つの文字だと思って積分し、中身の微分（x の係数）で割ろう",f:g=>{
    const a=g.n(2,g.k(2,3,4)),b=g.s()*g.n(1,g.k(3,5,7)),n=g.n(2,g.k(3,4,5)),u=lin(a,b);
    return{d:`∫ (<<${u}>>)^${n} dx = {1/[]}(${u})^${n+1} + C`,ans:a*(n+1),f:x=>(a*x+b)**n,F:(x,A)=>(a*x+b)**(n+1)/A}}},
  w2_exp:{n:"e^(ax+b) の不定積分",h:"💡 e のかたまりはそのまま。肩の中身の微分で割ろう",f:g=>{
    const a=g.n(2,g.k(3,4,5)),b=g.s()*g.n(1,g.k(3,5,7)),u=lin(a,b);
    return{d:`∫ <<e^{${u}}>> dx = {1/[]}e^{${u}} + C`,ans:a,f:x=>Math.exp(a*x+b),F:(x,A)=>Math.exp(a*x+b)/A}}},
  w2_trig:{n:"sin(ax+b)・cos(ax+b) の不定積分",h:"💡 sin・cos の入れかわりと符号、それから中身の微分で割るのを忘れずに",f:g=>{
    const a=g.n(2,g.k(3,5,7)),b=g.s()*g.n(1,g.k(2,3,5)),u=lin(a,b);
    return g.c(2)?{d:`∫ cos(<<${u}>>) dx = {1/[]} sin(${u}) + C`,ans:a,f:x=>Math.cos(a*x+b),F:(x,A)=>Math.sin(a*x+b)/A}
                 :{d:`∫ sin(<<${u}>>) dx = −{1/[]} cos(${u}) + C`,ans:a,f:x=>Math.sin(a*x+b),F:(x,A)=>-Math.cos(a*x+b)/A}}},
  w2_recip:{n:"1/(ax+b) の不定積分",h:"💡 log|ax+b| の形。微分すると中身の微分が前に出てくるよ",f:g=>{
    const a=g.n(2,g.k(3,5,7)),b=g.s()*g.n(1,g.k(3,5,7)),u=lin(a,b);
    return{d:`∫ <<{1/${u}}>> dx = {1/[]} ⟦log|${u}|⟧ + C`,ans:a,f:x=>1/(a*x+b),F:(x,A)=>Math.log(Math.abs(a*x+b))/A}}},
  w2_root:{n:"√(ax+b) の不定積分",h:"💡 √ は ½ 乗。½+1 = 3/2 乗にして、3/2 と中身の微分で割ろう",f:g=>{
    const a=g.n(2,g.k(3,4,5)),b=g.n(1,g.k(3,5,7)),u=lin(a,b);
    return{d:`∫ √(<<${u}>>) dx = {2/[]}(${u})√(${u}) + C`,ans:3*a,f:x=>Math.sqrt(a*x+b),F:(x,A)=>2/A*(a*x+b)**1.5}}},
  // World 3 置換の森：中身を t とおく
  w3_poly:{n:"置換積分（x²+c）",h:"💡 x²+c を t とおくと、光っている所がまるごと dt の仲間になるよ",f:g=>{
    const n=g.n(2,g.k(3,4,5)),c=g.n(1,g.k(5,6,7)),two=g.c(2),u=`x^2 + ${c}`;
    return{d:`∫ ${two?"2":""}x(<<${u}>>)^${n} dx = {1/[]}(${u})^${n+1} + C`,ans:two?n+1:2*(n+1),
      f:x=>(two?2:1)*x*(x*x+c)**n,F:(x,A)=>(x*x+c)**(n+1)/A}}},
  w3_exp:{n:"置換積分（e の肩が xⁿ）",h:"💡 e の肩を t とおこう。光っている所が dt の材料",f:g=>{
    const m=g.n(2,g.k(2,3,3)),k=g.n(1,g.k(3,4,5)),b=g.c(2),pre=m===2?"x":`x^${m-1}`;
    return{d:`∫ ${cf(k)}<<${pre}>>e^{x^${m}} dx = ${b?`{[]/${m}}`:`{${k}/[]}`}e^{x^${m}} + C`,ans:b?k:m,
      f:x=>k*x**(m-1)*Math.exp(x**m),F:(x,A)=>(b?A/m:k/A)*Math.exp(x**m)}}},
  w3_trig:{n:"置換積分（sinⁿx cos x など）",h:"💡 sin x（または cos x）を t とおくと、残りの三角関数が dt になるよ",f:g=>{
    const n=g.n(2,g.k(3,4,5)),b=g.c(2),m=g.n(1,g.k(2,3,4));
    if(g.c(2)){
      return b?{d:`∫ <<sin^${n}x>> cos x dx = {1/[]}sin^${n+1}x + C`,ans:n+1,f:x=>Math.sin(x)**n*Math.cos(x),F:(x,A)=>Math.sin(x)**(n+1)/A}
              :{d:`∫ ${m*(n+1)}<<sin^${n}x>> cos x dx = []sin^${n+1}x + C`,ans:m,f:x=>m*(n+1)*Math.sin(x)**n*Math.cos(x),F:(x,A)=>A*Math.sin(x)**(n+1)}}
    return b?{d:`∫ <<cos^${n}x>> sin x dx = −{1/[]}cos^${n+1}x + C`,ans:n+1,f:x=>Math.cos(x)**n*Math.sin(x),F:(x,A)=>-(Math.cos(x)**(n+1))/A}
            :{d:`∫ ${m*(n+1)}<<cos^${n}x>> sin x dx = −[]cos^${n+1}x + C`,ans:m,f:x=>m*(n+1)*Math.cos(x)**n*Math.sin(x),F:(x,A)=>-A*Math.cos(x)**(n+1)}}},
  w3_log:{n:"分子が分母の微分になっている積分",h:"💡 分母を微分すると分子になっている！ そういうときは log|分母|",f:g=>{
    const p=g.s()*g.n(1,g.k(3,4,5)),q=g.s()*g.n(1,g.k(3,5,7)),k=g.s()*g.n(1,g.k(2,3,5));
    const den=`x^2${sgn(p)}${term(p,1)}${sgn(q)}${Math.abs(q)}`,top=`2x${sgn(p)}${Math.abs(p)}`,K=Math.abs(k);
    return{d:`∫ ${k<0?"−":""}<<{${K===1?top:`${K}(${top})`}/${den}}>> dx = [] ⟦log|${den}|⟧ + C`,ans:k,
      f:x=>k*(2*x+p)/(x*x+p*x+q),F:(x,A)=>A*Math.log(Math.abs(x*x+p*x+q))}}},
  w3_lnpow:{n:"置換積分（log x・eˣ をまとめて t）",h:"💡 光っている所を t とおくと、残りがちょうど dt になるよ",f:g=>{
    const n=g.n(2,g.k(3,4,5));
    if(g.c(2)){const c=g.n(1,g.k(3,4,5));
      return{d:`∫ <<e^x>>(e^x + ${c})^${n} dx = {1/[]}(e^x + ${c})^${n+1} + C`,ans:n+1,f:x=>Math.exp(x)*(Math.exp(x)+c)**n,F:(x,A)=>(Math.exp(x)+c)**(n+1)/A}}
    return{d:`∫ <<{(log x)^${n}/x}>> dx = {1/[]}(log x)^${n+1} + C`,ans:n+1,f:x=>Math.log(x)**n/x,F:(x,A)=>Math.log(x)**(n+1)/A}}},
  // World 4 部分の洞窟：部分積分
  w4_xexp:{n:"部分積分（x と eˣ）",h:"💡 光っている所を微分する側に。∫f g′ = f g − ∫f′ g",f:g=>{
    if(g.c(2)){const k=g.s()*g.n(1,g.k(3,5,7));
      return{d:`∫ (<<x${sgn(k)}${Math.abs(k)}>>)e^x dx = (x + [])e^x + C`,ans:k-1,f:x=>(x+k)*Math.exp(x),F:(x,A)=>(x+A)*Math.exp(x)}}
    const a=g.n(2,g.k(2,3,4));
    return{d:`∫ <<x>>e^{${a}x} dx = {1/[]}(${a}x − 1)e^{${a}x} + C`,ans:a*a,f:x=>x*Math.exp(a*x),F:(x,A)=>(a*x-1)*Math.exp(a*x)/A}}},
  w4_xtrig:{n:"部分積分（x と sin・cos）",h:"💡 光っている所を微分する側に。sin・cos の積分の符号に注意",f:g=>{
    const k=g.s()*g.n(1,g.k(4,6,8)),u=`x${sgn(k)}${Math.abs(k)}`;
    return g.c(2)?{d:`∫ (<<${u}>>) cos x dx = (x + []) sin x + cos x + C`,ans:k,f:x=>(x+k)*Math.cos(x),F:(x,A)=>(x+A)*Math.sin(x)+Math.cos(x)}
                 :{d:`∫ (<<${u}>>) sin x dx = −(x + []) cos x + sin x + C`,ans:k,f:x=>(x+k)*Math.sin(x),F:(x,A)=>-(x+A)*Math.cos(x)+Math.sin(x)}}},
  w4_log:{n:"部分積分（log x）",h:"💡 log x は微分する側に。微分すると 1/x になってスッキリするよ",f:g=>{
    if(g.c(2)){const k=g.s()*g.n(1,g.k(3,5,7));
      return{d:`∫ ${cf(k)}<<log x>> dx = ${cf(k)}x log x + []x + C`,ans:-k,f:x=>k*Math.log(x),F:(x,A)=>k*x*Math.log(x)+A*x}}
    const n=g.n(1,g.k(2,3,4)),xn=n===1?"x":`x^${n}`;
    return{d:`∫ ${xn} <<log x>> dx = {1/${n+1}}x^${n+1} log x − {1/[]}x^${n+1} + C`,ans:(n+1)**2,
      f:x=>x**n*Math.log(x),F:(x,A)=>x**(n+1)*Math.log(x)/(n+1)-x**(n+1)/A}}},
  w4_x2exp:{n:"部分積分を2回（x² eˣ）",h:"💡 部分積分を2回。x² → 2x → 2 と微分していくよ",f:g=>{
    const p=g.s()*g.n(1,g.k(4,6,8)),B=p-2,C0=2-p,b=g.c(2);
    const ig=`(<<x^2${sgn(p)}${term(p,1)}>>)e^x`;
    const r=b?`(x^2 + []x${C0?sgn(C0)+Math.abs(C0):""})e^x`:`(x^2${B?sgn(B)+term(B,1):""} + [])e^x`;
    return{d:`∫ ${ig} dx = ${r} + C`,ans:b?B:C0,f:x=>(x*x+p*x)*Math.exp(x),
      F:(x,A)=>b?(x*x+A*x+C0)*Math.exp(x):(x*x+B*x+A)*Math.exp(x)}}},
  w4_exptrig:{n:"部分積分（eˣ と sin・cos）",h:"💡 部分積分を2回すると、元の積分がもう一度出てくる。それを移項しよう",f:g=>{
    const a=g.n(1,g.k(2,2,3)),b=g.n(1,g.k(2,3,3)),E=a===1?"e^x":`e^{${a}x}`,S=`sin ${b===1?"":b}x`,Co=`cos ${b===1?"":b}x`,A1=a===1?"":a,B1=b===1?"":b;
    return g.c(2)?{d:`∫ <<${E}>> ${S} dx = {1/[]}${E}(${A1}${S} − ${B1}${Co}) + C`,ans:a*a+b*b,
        f:x=>Math.exp(a*x)*Math.sin(b*x),F:(x,A)=>Math.exp(a*x)*(a*Math.sin(b*x)-b*Math.cos(b*x))/A}
      :{d:`∫ <<${E}>> ${Co} dx = {1/[]}${E}(${A1}${Co} + ${B1}${S}) + C`,ans:a*a+b*b,
        f:x=>Math.exp(a*x)*Math.cos(b*x),F:(x,A)=>Math.exp(a*x)*(a*Math.cos(b*x)+b*Math.sin(b*x))/A}}},
  // World 5 定積分の天空城：答えが整数になる定積分
  w5_poly:{n:"多項式の定積分",h:"💡 不定積分を出してから、上端の値 − 下端の値",f:g=>{
    const p=g.n(1,g.k(2,2,3)),d1=g.s()*g.n(1,g.k(2,3,3)),d2=g.s()*g.n(1,g.k(3,4,5)),c1=d1*(p+1),c2=d2*p,lo=g.n(1,2)-1,hi=lo+g.n(1,g.k(2,2,3));
    const F=x=>d1*x**(p+1)+d2*x**p;
    return{d:`∫[${lo}|${hi}] (<<${(c1<0?"−":"")+term(c1,p)}${sgn(c2)}${term(c2,p-1)}>>) dx = []`,ans:F(hi)-F(lo),
      f:x=>c1*x**p+c2*x**(p-1),lo,hi,val:A=>A}}},
  w5_basic:{n:"三角関数・1/x の定積分",h:"💡 不定積分を出してから端の値を入れよう。sin 0、cos π、log e の値は覚えてる？",f:g=>{
    const a=g.s()*g.n(1,g.k(3,5,9));
    switch(g.c(3)){
      case 0:return{d:`∫[0|π] ${cf(a)}<<sin x>> dx = []`,ans:2*a,f:x=>a*Math.sin(x),lo:0,hi:Math.PI,val:A=>A};
      case 1:return{d:`∫[0|π/2] ${cf(a)}<<cos x>> dx = []`,ans:a,f:x=>a*Math.cos(x),lo:0,hi:Math.PI/2,val:A=>A};
      default:{const m=g.n(1,g.k(2,3,3));
        return{d:`∫[1|${m===1?"e":`e^${m}`}] ${a<0?"−":""}<<{${Math.abs(a)}/x}>> dx = []`,ans:a*m,f:x=>a/x,lo:1,hi:Math.exp(m),val:A=>A}}}}},
  w5_sub:{n:"答えが分数になる定積分",h:"💡 置換したら端も t の値に変わるよ。x = 0 なら t = ?",f:g=>{
    const n=g.n(2,g.k(4,6,8));
    switch(g.c(3)){
      case 0:return{d:`∫[0|π/2] <<sin^${n}x>> cos x dx = {1/[]}`,ans:n+1,f:x=>Math.sin(x)**n*Math.cos(x),lo:0,hi:Math.PI/2,val:A=>1/A};
      case 1:return{d:`∫[0|π/2] <<cos^${n}x>> sin x dx = {1/[]}`,ans:n+1,f:x=>Math.cos(x)**n*Math.sin(x),lo:0,hi:Math.PI/2,val:A=>1/A};
      default:return{d:`∫[0|1] <<x^${n}>> dx = {1/[]}`,ans:n+1,f:x=>x**n,lo:0,hi:1,val:A=>1/A}}}},
  w5_parts:{n:"部分積分の定積分",h:"💡 部分積分の f g の部分にも、端の値を入れるのを忘れずに",f:g=>{
    const k=g.s()*g.n(1,g.k(3,5,9));
    switch(g.c(3)){
      case 0:return{d:`∫[0|π] ${cf(k)}<<x>> sin x dx = []π`,ans:k,f:x=>k*x*Math.sin(x),lo:0,hi:Math.PI,val:A=>A*Math.PI};
      case 1:return{d:`∫[0|1] ${cf(k)}<<x>>e^x dx = []`,ans:k,f:x=>k*x*Math.exp(x),lo:0,hi:1,val:A=>A};
      default:return{d:`∫[1|e] ${cf(k)}<<log x>> dx = []`,ans:k,f:x=>k*Math.log(x),lo:1,hi:Math.E,val:A=>A}}}}
};

/* ---------- ワールドとステージ ---------- */
// st: n=ステージ名 t=出る問題の型 L=難しさの上乗せ alt=型を交互に出す
const ALL1=["w1_pow","w1_poly","w1_trig","w1_exp","w1_root"],ALL2=["w2_pow","w2_exp","w2_trig","w2_recip","w2_root"],
      ALL3=["w3_poly","w3_exp","w3_trig","w3_log","w3_lnpow"],ALL4=["w4_xexp","w4_xtrig","w4_log","w4_x2exp","w4_exptrig"];
const WORLDS=[
  {name:"べき乗の草原",emo:"🌷",desc:"xⁿ・三角関数・eˣ・1/x など、基本の関数の不定積分",c1:"#3ccf8e",c2:"#c8f7a6",
    boss:[{n:"インテグラひよこ",e:"🐣",hi:"∫ってヘビじゃないぴよ🐣",ow:"ぴよ〜っ🥺"},{n:"プラスシーアルパカ",e:"🦙",hi:"+C を忘れたら許さないパカ🦙",ow:"Cまで書いてるパカ…"}],
    st:[{n:"xⁿ の不定積分",t:["w1_pow"]},{n:"多項式の不定積分",t:["w1_poly"]},{n:"三角関数の不定積分",t:["w1_trig"]},
        {n:"べき乗と三角関数のミックス",t:["w1_pow","w1_poly","w1_trig"]},
        {n:"eˣ と 1/x の不定積分",t:["w1_exp"]},{n:"分数・ルートの不定積分",t:["w1_root"]},
        {n:"基本の関数の総まとめ",t:ALL1}]},
  {name:"合成の渓谷",emo:"🏞️",desc:"(ax+b) のかたまりごと積分して、中身の微分で割る",c1:"#a46bff",c2:"#f3c4ff",
    boss:[{n:"カッコキツネ",e:"🦊",hi:"カッコの中身、ちゃんと見てるコン？🦊",ow:"コ、コーン…"},{n:"ナカミクジラ",e:"🐋",hi:"中身の微分で割れるかな〜？🐋",ow:"潮ふいちゃう〜💦"}],
    st:[{n:"(ax+b)ⁿ の不定積分",t:["w2_pow"]},{n:"e^(ax+b) の不定積分",t:["w2_exp"]},{n:"sin(ax+b)・cos(ax+b)",t:["w2_trig"]},
        {n:"合成関数ミックス",t:["w2_pow","w2_exp","w2_trig"]},
        {n:"1/(ax+b) の不定積分",t:["w2_recip"]},{n:"√(ax+b) の不定積分",t:["w2_root"]},
        {n:"合成関数の総まとめ",t:ALL2}]},
  {name:"置換の森",emo:"🌲",desc:"中身を t とおいて、dx を dt に置きかえる",c1:"#ff6f61",c2:"#ffd36e",
    boss:[{n:"オキカエフクロウ",e:"🦉",hi:"t とおく勇気、ある？ホッホー🦉",ow:"置きかえられた…"},{n:"ヘンスウクマ",e:"🐻",hi:"dx を dt にできなきゃ通さないクマ🐻",ow:"クマった〜🥺"}],
    st:[{n:"置換積分（x²+c）",t:["w3_poly"]},{n:"置換積分（e の肩が xⁿ）",t:["w3_exp"]},{n:"置換積分（sinⁿx cos x）",t:["w3_trig"]},
        {n:"置換積分ミックス",t:["w3_poly","w3_exp","w3_trig"]},
        {n:"分子が分母の微分",t:["w3_log"]},{n:"log x・eˣ をまとめて t",t:["w3_lnpow"]},
        {n:"置換積分の総まとめ",t:ALL3}]},
  {name:"部分の洞窟",emo:"🕳️",desc:"∫f g′ dx = f g − ∫f′ g dx。微分する側をうまく選ぶ",c1:"#5b8cff",c2:"#9ee7ff",
    boss:[{n:"ブブンコウモリ",e:"🦇",hi:"どっちを微分するか、迷ったら負けキー🦇",ow:"キーッ、見破られた…"},{n:"ニカイメドラゴン",e:"🐉",hi:"部分積分は2回やってこそだドラ🐉",ow:"2回目で…負けた…"}],
    st:[{n:"部分積分（x と eˣ）",t:["w4_xexp"]},{n:"部分積分（x と sin・cos）",t:["w4_xtrig"]},{n:"部分積分（log x）",t:["w4_log"]},
        {n:"部分積分ミックス",t:["w4_xexp","w4_xtrig","w4_log"]},
        {n:"部分積分を2回（x² eˣ）",t:["w4_x2exp"]},{n:"eˣ と sin・cos",t:["w4_exptrig"]},
        {n:"部分積分の総まとめ",t:ALL4}]},
  {name:"定積分の天空城",emo:"☁️",desc:"ここまでの全部をまぜて、最後は定積分で決着",c1:"#8b5cf6",c2:"#ff8fd8",
    boss:[{n:"テイセキエンジェル",e:"👼",hi:"上端 − 下端、順番まちがえないでね👼",ow:"天に召されちゃう…"},{n:"魔王インテグラル",e:"😈",hi:"よく来たな…最後の積分だ😈",ow:"ば、ばかな…積分はやすぎ…！"}],
    st:[{n:"多項式の定積分",t:["w5_poly"]},{n:"三角関数・1/x の定積分",t:["w5_basic"]},{n:"答えが分数になる定積分",t:["w5_sub"]},
        {n:"定積分ミックス",t:["w5_poly","w5_basic","w5_sub"]},
        {n:"部分積分の定積分",t:["w5_parts"]},{n:"不定積分の総まとめ",t:["w1_poly","w2_pow","w2_trig","w3_poly","w3_trig","w4_xexp","w4_log"]},
        {n:"積分の総まとめ",t:["w5_poly","w5_basic","w5_sub","w5_parts","w2_pow","w3_log","w4_x2exp","w4_exptrig"]}]}
];
const stageName=(w,s)=>s===3?WORLDS[w].boss[0].n:s===6?WORLDS[w].boss[1].n:WORLDS[w].st[s].n;
const stageTopic=(w,s)=>WORLDS[w].st[s].n;

/* ---------- 出題 ---------- */
const LEAD='<b class="bl">□</b> = ';  // 答えの行は「□ = 2」の形
function build(tpl,L,replay){
  const g=Gen(L,replay),p=T[tpl].f(g);
  if(!Number.isInteger(p.ans)||Math.abs(p.ans)>999)return null;
  const r=render(p.d);
  return{tpl,L,ch:g.ch,ast:r,text:r.t,ans:p.ans,lead:LEAD,weak:!!replay,math:p};
}
function makeQ(tpls,L,seen){
  for(let i=0;i<80;i++){
    const t=tpls[i<40?rnd(0,tpls.length-1):i%tpls.length];
    let q=null;try{q=build(t,L)}catch(e){}
    if(q&&!seen.has(q.text))return q;
  }
  return build(tpls[0],L);
}
// 数字（右上の小さい数字も）を消した骨組み。符号やかっこの並びが同じかどうかを比べる。
// 「#」に置きかえずに消すのは、係数が1になると書かなくなる（2x³ → x³）ので、それも同じ形とみなすため
const shape=t=>t.replace(/[\d⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,"");
function weaken(q){
  let any=null;
  for(let i=0;i<80;i++){let w=null;try{w=build(q.tpl,q.L,q.ch)}catch(e){}
    if(!w||w.text===q.text)continue;if(shape(w.text)===shape(q.text))return w;any=any||w}
  return any;
}

/* ---------- プレイ画面から呼ばれるもの ---------- */
const html=a=>a.h;
const text=a=>a.t;
const chunk=a=>a.key?{id:1}:null;   // ヒントで光らせる所（<<..>> で囲んだ所）
const clashes=()=>[];               // 符号のぶつかりは使わない
const hintFor=q=>T[q.tpl].h;        // ヒントの一言は型ごとに決めてある
