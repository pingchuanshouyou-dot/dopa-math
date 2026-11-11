/* Dopa-Math 出題エンジン。画面には一切さわらない（ブラウザなしでもテストできるように） */
/* ---------- 出題エンジン（式の木を作って、計算・表示・ヒント・弱体化に使う） ---------- */
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));

// 分数で正確に計算する（小数も分数として持つので誤差が出ない）
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b)[a,b]=[b,a%b];return a||1};
const lcm=(a,b)=>a/gcd(a,b)*b;
const Q=(n,d=1)=>{if(d<0){n=-n;d=-d}const g=gcd(n,d);return{n:n/g,d:d/g}};
const QOP={"+":(a,b)=>Q(a.n*b.d+b.n*a.d,a.d*b.d),"−":(a,b)=>Q(a.n*b.d-b.n*a.d,a.d*b.d),"×":(a,b)=>Q(a.n*b.n,a.d*b.d),"÷":(a,b)=>Q(a.n*b.d,a.d*b.n)};
const qpow=(a,e)=>Q(a.n**e,a.d**e);

// 式の木。n=数 b=二項演算 p=かっこ w=累乗 u=先頭のマイナス（−4² の −）
const I=(v,plus)=>({t:"n",v:Q(v),f:"i",plus:!!plus&&v>0});
const S=v=>I(v,true);                       // 正の数にも＋を付ける（(+3) 表記）
const Ib=v=>({...I(v),bare:true});           // 式や（）の先頭のマイナスはカッコなしで書く（−4 + 7）
const D=(t,den=10)=>({t:"n",v:Q(t,den),f:"d"});  // 小数。D(12)=1.2
const F=(n,d)=>{const v=Q(n,d);return v.d===1?I(v.n):{t:"n",v,f:"f"}};
const FQ=q=>F(q.n,q.d);
const Fb=(n,d)=>({...F(n,d),bare:true});
const B=(op,l,r)=>({t:"b",op,l,r});
const P=e=>({t:"p",e});
const W=(b,e)=>({t:"w",b,e});
const U=e=>({t:"u",e});
const add=(l,r)=>B("+",l,r),sub=(l,r)=>B("−",l,r),mul=(l,r)=>B("×",l,r),div=(l,r)=>B("÷",l,r);

function ev(x){
  switch(x.t){
    case "n":return x.v;
    case "b":{const r=ev(x.r);if(x.op==="÷"&&r.n===0)throw new Error("÷0");return QOP[x.op](ev(x.l),r)}
    case "p":return ev(x.e);
    case "w":return qpow(ev(x.b),x.e);
    case "u":{const v=ev(x.e);return Q(-v.n,v.d)}
  }
}

// 見た目どおりに計算されるよう、必要な所にだけかっこを足す。ついでに番号を振る
const prec=x=>x.t==="b"?(x.op==="+"||x.op==="−"?1:2):9;
function norm(x,ctr={i:0}){
  let y;
  if(x.t==="b"){
    let l=norm(x.l,ctr),r=norm(x.r,ctr);
    if(prec(l)<prec(x))l=wrap(l,ctr);
    if(prec(r)<prec(x)||(prec(r)===prec(x)&&(x.op==="−"||x.op==="÷"))||lead(r).t==="u")r=wrap(r,ctr);
    y={...x,l,r};
  }else if(x.t==="p")y={...x,e:norm(x.e,ctr)};
  else if(x.t==="w"){let b=norm(x.b,ctr);if(b.t==="b"||b.t==="u")b=wrap(b,ctr);y={...x,b}}
  else if(x.t==="u")y={...x,e:norm(x.e,ctr)};
  else y={...x};
  y.id=ctr.i++;return y;
}
const lead=x=>x.t==="b"?lead(x.l):x;  // 式のいちばん左にあるもの
const wrap=(e,ctr)=>({t:"p",e,id:ctr.i++});

// 小数の表示。分母が10・100…で割り切れる形に直して小数点を入れる
const decStr=q=>{let k=0;while(10**k%q.d&&k<6)k++;const s=String(Math.abs(q.n)*(10**k/q.d)).padStart(k+1,"0");
  return (q.n<0?"-":"")+(k?s.slice(0,-k)+"."+s.slice(-k):s)};

// 表示用HTML。全部の文字を .tk で包んで、ヒントで光らせたり暗くしたりできるようにする
function html(x){
  const tk=(s,c="")=>`<span class="tk${c}">${s}</span>`;
  const nd=(x,inner)=>`<span class="nd" data-i="${x.id}">${inner}</span>`;
  switch(x.t){
    case "n":{
      const a=Math.abs(x.v.n),body=x.f==="f"?`<span class="tk fr"><span>${a}</span><span>${x.v.d}</span></span>`:tk(x.f==="d"?decStr(Q(a,x.v.d)):a);
      if(x.v.n<0)return nd(x,x.bare?tk("−"," sg")+body:tk("(")+tk("−"," sg")+body+tk(")"));
      if(x.plus)return nd(x,tk("(")+tk("+"," sg")+body+tk(")"));
      return nd(x,body);
    }
    case "b":return nd(x,html(x.l)+`<span class="tk op" data-o="${x.id}">${x.op}</span>`+html(x.r));
    case "p":return nd(x,tk("(")+html(x.e)+tk(")"));
    case "w":{const b=x.b,fr=b.t==="n"&&b.f==="f"&&b.v.n>0&&!b.plus;
      return nd(x,(fr?tk("("):"")+html(b)+(fr?tk(")"):"")+`<sup class="tk">${x.e}</sup>`)}
    case "u":return nd(x,tk("−"," sg")+html(x.e));
  }
}
function text(x){
  switch(x.t){
    case "n":{const a=Math.abs(x.v.n),body=x.f==="f"?a+"/"+x.v.d:x.f==="d"?decStr(Q(a,x.v.d)):String(a);
      return x.v.n<0?(x.bare?"−"+body:"(−"+body+")"):x.plus?"(+"+body+")":body}
    case "b":return text(x.l)+" "+x.op+" "+text(x.r);
    case "p":return "("+text(x.e)+")";
    case "w":{const b=x.b,fr=b.t==="n"&&b.f==="f"&&b.v.n>0&&!b.plus;return (fr?"("+text(b)+")":text(b))+"^"+x.e}
    case "u":return "−"+text(x.e);
  }
}

// ヒント：最初に計算すべき塊（かっこ → 累乗 → 乗除 → 左の加減）と、ぶつかっている符号
const kids=x=>x.t==="b"?[x.l,x.r]:x.t==="p"||x.t==="u"?[x.e]:x.t==="w"?[x.b]:[];
const hasOp=x=>x.t==="b"||x.t==="w"||x.t==="u";
function findPar(x){if(x.t==="p"&&hasOp(x.e))return findPar1(x.e)||x;return findPar1(x)}
function findPar1(x){for(const c of kids(x)){const r=findPar(c);if(r)return r}return null}
function findPow(x){if(x.t==="w")return x;for(const c of kids(x)){const r=findPow(c);if(r)return r}return null}
function findMul(x,inMul){const m=x.t==="b"&&(x.op==="×"||x.op==="÷");if(m&&!inMul)return x;for(const c of kids(x)){const r=findMul(c,m);if(r)return r}return null}
function findAdd(x){if(x.t!=="b")return null;return findAdd(x.l)||x}
function chunk(root){
  const p=findPar(root);
  if(p)return chunk(p.e)||p;  // かっこの中にも順番があれば、中の最初の塊まで絞る
  const c=findPow(root)||findMul(root,false)||findAdd(root);
  return c&&c!==root?c:null;
}
function clashes(x,out=[]){
  if(x.t==="b"&&(x.op==="+"||x.op==="−")&&x.r.t==="n"&&(x.r.v.n<0||x.r.plus))out.push([x.id,x.r.id]);
  kids(x).forEach(c=>clashes(c,out));return out;
}

/* ---------- 乱数係：弱体化のとき、形の選び方は同じまま数字だけ小さくする ---------- */
function Gen(L,replay){
  const ch=[];let i=0;
  return{
    L,ch,weak:!!replay,
    c(k){const v=replay?(i<replay.length?replay[i++]:0)%k:rnd(0,k-1);if(!replay)ch.push(v);return v},
    s(){return this.c(2)?-1:1},
    op(){return this.c(2)?"−":"+"},
    pick(a){return a[this.c(a.length)]},
    k(...a){return a[Math.min(L,a.length-1)]},
    n(lo,hi){if(replay){const l=Math.min(lo,2);return rnd(l,Math.max(l,Math.min(hi,2)))}return rnd(lo,Math.max(lo,hi))}  // 弱体化は1か2だけ
  };
}
const nzd=(g,lo,hi,d)=>{let t=g.n(lo,hi);while(gcd(t,d)>1)t+=1;return t};  // d と約分できない数（分数がきれいに残るように）
const opj=(op,l,r)=>B(op,l,r);
const nb=(g,lo,hi)=>Ib(g.s()*g.n(lo,hi));  // 先頭用：マイナスならカッコなし
const sgn=(g,lo,hi)=>I(g.s()*g.n(lo,hi));   // 2つ目以降：マイナスならカッコ付き
// 必ずマイナスが入る掛け算。one=true なら片方だけ、false なら両方マイナスもある
const negPair=(g,one)=>[[-1,1],[1,-1],[-1,-1]][g.c(one?2:3)];
const big=g=>g.k(5,7,9);  // 1桁の中での上限。最初は5まで、ステージ後半やボスのHPが減ると7、9まで解禁
function mul99(g,one){const [sa,sb]=negPair(g,one);return mul(I(sa*g.n(2,big(g))),I(sb*g.n(2,big(g))))}
// World 4 用の小さい掛け算（1〜4の段）と割り算
const mulS=g=>mul(sgn(g,2,g.k(3,4,4)),sgn(g,1,g.k(3,4,4)));
const divS=g=>{const b=g.s()*g.n(2,g.k(3,4,4)),q=g.s()*g.n(1,g.k(3,4,4));return div(I(b*q),I(b))};

/* 暗算の重さで手が止まらないよう、World 1〜2 は最後まで1桁、World 3〜5 も小さい数だけ。
   そのかわり L（0→1→2）で使う数の上限を上げて、ステージの後半ほど手応えが出るようにする */
const T={
  // World 1 マイナスの草原：カッコなし・1桁
  a1_negans:{n:"答えがマイナスになる引き算",f:g=>{const a=g.n(1,g.k(4,6,8));return sub(I(a),I(g.n(a+1,Math.max(a+1,big(g)))))}},
  a1_negstart:{n:"マイナスから始まる計算",f:g=>opj(g.op(),Ib(-g.n(1,big(g))),I(g.n(1,big(g))))},
  a1_rush:{n:"2つの数の加減ラッシュ",f:g=>opj(g.op(),nb(g,1,big(g)),I(g.n(2,big(g))))},
  a1_three:{n:"3つの数の加減",f:g=>opj(g.op(),opj(g.op(),I(g.n(1,big(g))),I(g.n(1,big(g)))),I(g.n(1,big(g))))},
  a1_threeneg:{n:"マイナスから始まる3つの数の加減",f:g=>opj(g.op(),opj(g.op(),Ib(-g.n(1,big(g))),I(g.n(1,big(g)))),I(g.n(1,big(g))))},
  a1_long:{n:"3つの数の加減ラッシュ",f:g=>{const h=g.k(4,5,6);return opj(g.op(),opj(g.op(),nb(g,1,h),I(g.n(1,h))),I(g.n(1,h)))}},
  // World 2 カッコの迷宮：1桁。教科書どおり正の数も (+4) と書く
  a2_same:{n:"同じ符号のカッコ付き足し算",f:g=>{const s=g.s();return add(S(s*g.n(1,big(g))),S(s*g.n(1,big(g))))}},
  a2_diff:{n:"ちがう符号のカッコ付き足し算",f:g=>{const s=g.s();return add(S(s*g.n(1,big(g))),S(-s*g.n(1,big(g))))}},
  a2_addsub:{n:"カッコ付きの足し算・引き算",f:g=>{const k=g.c(3),x=S(g.s()*g.n(1,big(g))),y=g.n(1,big(g));
    return k===0?add(x,S(y)):k===1?add(x,I(-y)):sub(x,S(y))}},
  a2_subneg:{n:"マイナスを引く計算",f:g=>sub(sgn(g,1,big(g)),I(-g.n(1,big(g))))},
  a2_mul1:{n:"カッコ付きの掛け算（片方がマイナス）",f:g=>{const a=g.n(2,g.k(3,4,5)),b=g.n(2,g.k(3,4,5));return g.c(2)?mul(I(-a),I(b)):mul(I(b),I(-a))}},
  a2_mul2:{n:"カッコ付きの掛け算（1〜5の段）",f:g=>{const [sa,sb]=negPair(g,false);return mul(I(sa*g.n(2,g.k(3,4,5))),I(sb*g.n(2,g.k(3,4,5))))}},
  // World 3 反転の火山
  a3_mul1:{n:"正負の掛け算（片方がマイナス）",f:g=>mul99(g,true)},
  a3_mul2:{n:"正負の掛け算（九九ぜんぶ）",f:g=>mul99(g,false)},
  a3_div:{n:"九九の逆で解く割り算",f:g=>{const [sd,sb]=negPair(g,false),b=g.n(2,big(g));return div(I(sd*b*g.n(2,big(g))),I(sb*b))}},  // 割られる数か割る数に必ずマイナス
  a3_md0:{n:"掛け算・割り算のミックスと0",f:g=>{switch(g.c(5)){
    case 0:case 1:return mul99(g,false);
    case 2:case 3:{const b=g.s()*g.n(2,big(g)),q=g.s()*g.n(1,big(g));return div(I(b*q),I(b))}
    default:switch(g.c(3)){case 0:return div(I(0),sgn(g,2,big(g)));case 1:return mul(I(0),sgn(g,2,big(g)));default:return mul(sgn(g,2,big(g)),I(0))}}}},  // 0の計算は5回に1回くらい
  a3_pow:{n:"2乗の基礎",f:g=>{const a=g.n(2,g.k(3,4,5));switch(g.c(3)){case 0:return W(I(-a),2);case 1:return U(W(I(a),2));default:return W(I(a),2)}}},
  a3_three:{n:"簡単な3つの掛け算",f:g=>{const h=g.k(2,3,3);return mul(mul(sgn(g,1,h),sgn(g,2,h)),sgn(g,2,h))}},
  // World 4 四則の要塞：掛け算は1〜4の段、足し引きは1〜5。計算の順番だけに集中
  a4_mulplus:{n:"掛け算が先頭（足し算つき）",f:g=>add(mulS(g),sgn(g,1,g.k(3,4,5)))},
  a4_mulminus:{n:"掛け算が先頭（引き算つき）",f:g=>sub(mulS(g),sgn(g,1,g.k(3,4,5)))},
  a4_mulback:{n:"掛け算が後ろの混合式",f:g=>opj(g.op(),sgn(g,1,g.k(3,4,5)),mulS(g))},
  a4_div:{n:"割り算が先頭の混合式",f:g=>opj(g.op(),divS(g),sgn(g,1,g.k(3,4,5)))},
  a4_divback:{n:"割り算が後ろの混合式",f:g=>opj(g.op(),sgn(g,1,g.k(3,4,5)),divS(g))},
  a4_par:{n:"カッコの中を先に計算する四則混合",f:g=>{const op=g.op(),a=nb(g,1,g.k(3,4,5));let b=g.n(1,g.k(3,4,5));
    if(a.v.n===(op==="−"?b:-b))b+=1;  // カッコの中が0にならないように
    const inner=P(opj(op,a,I(b))),m=sgn(g,2,g.k(3,4,4));
    return g.c(2)?mul(inner,m):mul(m,inner)}},
  // World 5 魔王の城：分母は2〜5だけ
  a5_fplus:{n:"同じ分母の分数の足し算",f:g=>{const d=g.n(2,g.k(3,4,5)),a=nzd(g,1,d-1,d),R=g.n(1,g.k(1,2,2));
    return g.c(2)?add(F(R*d+a,d),F(-a,d)):add(Fb(-a,d),F(R*d+a,d))}},          // 7/2 + (−3/2) ／ −1/3 + 4/3
  a5_fminus:{n:"同じ分母の分数の引き算",f:g=>{const d=g.n(2,g.k(3,4,5)),a=nzd(g,1,d-1,d),R=g.n(1,g.k(1,2,2));
    return g.c(2)?sub(Fb(-a,d),F(R*d-a,d)):sub(F(R*d+a,d),F(a,d))}},          // −1/3 − 5/3 ／ 7/3 − 1/3
  a5_fmul:{n:"分母がスパッと消える分数の掛け算",f:g=>{const d=g.n(2,g.k(3,4,5)),a=nzd(g,1,g.k(2,3,4),d),f=F(g.s()*a,d),N=I(g.s()*d*g.n(1,g.k(1,2,2)));
    return g.c(2)?mul(f,N):mul(N,f)}},
  a5_fdiv:{n:"逆数にして約分する分数の割り算",f:g=>{const d=g.n(2,g.k(3,4,5)),a=nzd(g,2,g.k(3,4,4),d);
    if(g.c(2))return div(I(g.s()*a*g.n(1,g.k(1,2,2))),F(g.s()*a,d));   // (−4) ÷ 2/3
    const R=g.s()*(a>3?2:g.n(2,g.k(2,3,3))),f2=Q(g.s()*a,d);  // 分子が12をこえないように
    return div(FQ(QOP["×"](Q(R),f2)),FQ(f2))}},  // (−4/5) ÷ (−2/5)
  a5_final:{n:"全ワールドのまとめ",f:g=>{const a=g.n(2,g.k(3,4,4)),pw=g.c(2)?W(I(-a),2):U(W(I(a),2)),m=mulS(g);
    return g.c(2)?opj(g.op(),pw,m):opj(g.op(),m,pw)}}                  // (−2)² − (−3) × 2
};

/* ---------- ワールドとステージ ---------- */
// st: n=ステージ名 t=出る問題の型 L=難しさの上乗せ alt=型を交互に出す
const WORLDS=[
  {name:"マイナスの草原",emo:"🌷",desc:"カッコなしの足し算・引き算。数直線の移動と、3つの数",c1:"#3ccf8e",c2:"#c8f7a6",
    boss:[{n:"マイナスうさぴょん",e:"🐰",hi:"マイナスでバグらせてやるぴょん🐰",ow:"ぴょえ〜ん🥺"},{n:"ゆめかわユニコーン",e:"🦄",hi:"ゆめかわ計算でとかしてあげる🦄",ow:"ツノ折れたんだけど…🥺"}],
    st:[{n:"答えがマイナスになる引き算",t:["a1_negans"]},{n:"マイナスから始まる計算",t:["a1_negstart"]},{n:"2つの数の加減ミックス",t:["a1_negans","a1_negstart"]},
        {n:"2つの数の加減ラッシュ",t:["a1_rush"]},
        {n:"3つの数の加減",t:["a1_three"]},{n:"マイナスから始まる3つの数",t:["a1_threeneg","a1_three"]},
        {n:"3つの数の加減ラッシュ",t:["a1_long"]}]},
  {name:"カッコの迷宮",emo:"🎀",desc:"+(+) や −(−) の符号変換と、カッコ付きの掛け算の入門",c1:"#a46bff",c2:"#f3c4ff",
    boss:[{n:"カッコつけネコ",e:"😼",hi:"カッコの中から出られるかニャ？😼",ow:"ニャんで解けるの…"},{n:"ゆるふわモアイ",e:"🗿",hi:"………カッコ、ムズいよ？🗿",ow:"………（ヒビ）"}],
    st:[{n:"同じ符号のカッコ付き足し算",t:["a2_same"]},{n:"ちがう符号のカッコ付き足し算",t:["a2_diff"]},{n:"カッコ付きの足し算・引き算",t:["a2_addsub","a2_same","a2_diff"]},
        {n:"マイナスを引く計算",t:["a2_subneg"]},
        {n:"カッコ付きの掛け算入門",t:["a2_mul1"]},{n:"カッコ付きの掛け算（1〜5の段）",t:["a2_mul2"]},
        {n:"カッコの加減と掛け算のミックス",t:["a2_subneg","a2_mul2"],alt:true}]},
  {name:"反転の火山",emo:"🌋",desc:"九九フル活用の正負の掛け算・割り算と、2乗・3つの数の符号",c1:"#ff6f61",c2:"#ffd36e",
    boss:[{n:"はんてんトウガラシ",e:"🌶️",hi:"符号ひっくり返してピリ辛にしてやる🌶️",ow:"からっ…じゃなくてイタッ🥵"},{n:"ぴえんドラゴン",e:"🐲",hi:"ぴえん…じゃなくて、勝負だ🐲",ow:"ぴえん🥺🥺"}],
    st:[{n:"正負の掛け算（片方がマイナス）",t:["a3_mul1"]},{n:"正負の掛け算（九九ぜんぶ）",t:["a3_mul2"]},{n:"正負の掛け算ラッシュ",t:["a3_mul1","a3_mul2"]},
        {n:"九九の逆で解く割り算",t:["a3_div"]},
        {n:"掛け算・割り算のミックスと0",t:["a3_md0"]},{n:"割り算多めの乗除ミックス",t:["a3_md0","a3_div"]},
        {n:"2乗と3つの掛け算",t:["a3_pow","a3_three"]}]},
  {name:"四則の要塞",emo:"🏰",desc:"掛け算・割り算を先に計算するルールと、カッコの中から",c1:"#5b8cff",c2:"#9ee7ff",
    boss:[{n:"ジュンバンロボ子",e:"🤖",hi:"計算の順番、守れてる？ピピッ🤖",ow:"エラー…想定外の速さ…"},{n:"パフェ将軍",e:"🍨",hi:"四則の甘さ、思い知るがよい🍨",ow:"クリームがとける〜🫠"}],
    st:[{n:"掛け算が先頭（足し算つき）",t:["a4_mulplus"]},{n:"掛け算が先頭（引き算つき）",t:["a4_mulminus"]},{n:"掛け算が先頭ミックス",t:["a4_mulplus","a4_mulminus"]},
        {n:"掛け算が後ろの混合式（順序の罠）",t:["a4_mulback"]},
        {n:"割り算が先頭の混合式",t:["a4_div"]},{n:"割り算が後ろの混合式",t:["a4_divback","a4_mulback"]},
        {n:"カッコの中を先に計算",t:["a4_par"]}]},
  {name:"魔王の城",emo:"🔮",desc:"分数で約分の快感を味わって、最後は全ワールドの総まとめ",c1:"#8b5cf6",c2:"#ff8fd8",
    boss:[{n:"ブンスウおばけ",e:"👻",hi:"分数でうらめしや〜👻",ow:"成仏しそう…"},{n:"魔王ケイサン",e:"😈",hi:"よく来たな…最後の計算だ😈",ow:"ば、ばかな…計算はやすぎ…！"}],
    st:[{n:"同じ分母の足し算",t:["a5_fplus"]},{n:"同じ分母の引き算",t:["a5_fminus"]},{n:"同じ分母の足し算・引き算ミックス",t:["a5_fplus","a5_fminus"]},
        {n:"分母がスパッと消える掛け算",t:["a5_fmul"]},
        {n:"逆数にして約分する割り算",t:["a5_fdiv"]},{n:"分数の掛け算・割り算ミックス",t:["a5_fdiv","a5_fmul"]},
        {n:"全ワールドの総まとめ",t:["a5_final","a5_final","a1_long","a2_subneg","a3_div","a4_mulback","a4_par","a5_fmul","a5_fdiv"]}]}
];
const stageName=(w,s)=>s===3?WORLDS[w].boss[0].n:s===6?WORLDS[w].boss[1].n:WORLDS[w].st[s].n;
const stageTopic=(w,s)=>WORLDS[w].st[s].n;

// 1問つくる。答えが整数でなかったり、出たことのある式なら作り直す
function build(tpl,L,replay){
  const g=Gen(L,replay),raw=T[tpl].f(g),v=ev(raw);
  if(v.d!==1||Math.abs(v.n)>9999)return null;
  const ast=norm(raw);
  return{tpl,L,ch:g.ch,ast,text:text(ast),ans:v.n,weak:!!replay};
}
function makeQ(tpls,L,seen){
  for(let i=0;i<80;i++){
    const t=tpls[i<40?rnd(0,tpls.length-1):i%tpls.length];
    let q=null;try{q=build(t,L)}catch(e){}
    if(q&&!seen.has(q.text))return q;
  }
  return build(tpls[0],L);
}
// 数字だけ消した骨組み。符号やかっこの並びが同じかどうかを比べる
const shape=t=>t.replace(/\d+(\.\d+)?(\/\d+)?/g,"#");
function weaken(q){
  let any=null;
  for(let i=0;i<80;i++){let w=null;try{w=build(q.tpl,q.L,q.ch)}catch(e){}
    if(!w||w.text===q.text)continue;if(shape(w.text)===shape(q.text))return w;any=any||w}
  return any;
}
