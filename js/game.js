/* Dopa-Math プレイ画面：ゲームの状態、出題、制限時間、ヒント、弱体化、演出、回答の判定、テンキー、ステージの開始と結果 */

const $=s=>document.querySelector(s);
let runId=0,sw=0,ss=0,kind,stg,qn,pts,seen,q,typed="",t0=0,tSum=0,score,combo,maxCombo,done,okN,misses,fever,busy,running=false,
    weakLeft,hlOn,tRaf,tplMiss,hp,hpMax,hearts,muted=false,bi=0,bgT;

/* ---------- 出題 ---------- */
const sid=(w,s)=>`${w+1}-${s+1}`;
function level(){
  const base=kind==="normal"?(done<4?0:done<8?1:2):Math.floor((1-hp/hpMax)*3)+(kind==="big"?1:0);
  return Math.min(2,base+(stg.L||0));
}
function nextQ(){
  // alt のステージは型を順番に交互で出す（例：マイナスを引く計算 → 掛け算 → …）
  q=makeQ(stg.alt?[stg.t[qn%stg.t.length]]:stg.t,level(),seen);seen.add(q.text);qn++;
  showQ();enter();
}
function showQ(){
  typed="";hlOn=false;
  const el=$("#eqQ");el.className=q.text.length>26?"xs":q.text.length>15?"s":"";
  el.innerHTML=html(q.ast);
  $("#eqR").className="";draw();
  $("#weak").disabled=weakLeft<=0||q.weak;$("#weakN").textContent=weakLeft;
  $("#hint").textContent=q.weak?"🧪 弱体化中！ルールは同じ、数字だけ小さくしたよ":"答えを打つだけ。エンター不要！";
  t0=performance.now();
}
const show=t=>t.replace("-","−");
function draw(){$("#eqR").innerHTML="= "+(typed?show(typed):`<span class="ph">?</span>`)}

/* ---------- 制限時間：3秒でヒント、時間切れでハートが減って次の問題へ ---------- */
function tick(){
  if(!running)return;
  tRaf=requestAnimationFrame(tick);
  if(busy)return;
  const lim=LIMIT[sw],dt=(performance.now()-t0)/1000,left=Math.max(0,1-dt/lim),bar=$("#tBar");
  bar.style.transform=`scaleX(${left})`;
  bar.className=dt<QUICK?"":left>.25?"mid":"low";
  if(dt>=QUICK&&!typed)showHint();
  if(dt>=lim)timeUp();
}

/* ---------- 救済①：3秒入力がなければ、最初に計算する塊とぶつかる符号を光らせる ---------- */
// 光らせた場所に合わせて、何から計算すればいいかを一言で
function hintText(c,cl){
  if(!c)return "水色の符号に注目！ ＋と−がぶつかってるよ";
  if(c.t==="p")return "💡 光っているカッコの中から計算してみて！";
  if(c.t==="w")return "💡 光っている2乗から計算してみて！";
  if(c.op==="×"||c.op==="÷")return "💡 光っている掛け算・割り算から先に計算してみて！";
  return "💡 光っている左の2つから計算してみて！";
}
function showHint(){
  if(!running||busy||hlOn)return;
  hlOn=true;
  if(kind!=="normal")say(SAY.idle);
  const c=chunk(q.ast),cl=clashes(q.ast),el=$("#eqQ");
  if(!c&&!cl.length)return;
  el.classList.add("dim");
  if(c)el.querySelector(`[data-i="${c.id}"]`).classList.add("hl");
  $("#hint").textContent=hintText(c,cl);
  // 塊（ピンク）があるときは、その中でぶつかる符号だけ水色にして、目線がばらけないようにする
  const box=c&&el.querySelector(`[data-i="${c.id}"]`);
  cl.forEach(([o,l])=>{const op=el.querySelector(`[data-o="${o}"]`);if(box&&!box.contains(op))return;
    op.classList.add("hs");el.querySelector(`[data-i="${l}"] .sg`).classList.add("hs")});
  sfxHint();
}

/* ---------- 救済②：弱体化。式の形はそのまま、数字だけ小さく ---------- */
$("#weak").onclick=()=>{
  if(!running||busy||weakLeft<=0||q.weak)return;
  audio();
  const w=weaken(q);
  if(!w){pop("もう最弱だよ🧪");return}  // もとから一番小さい数のときは回数を使わない
  weakLeft--;q=w;
  card.classList.remove("weakfx");void card.offsetWidth;card.classList.add("weakfx");
  tone(500,.15,"sine",.12);tone(300,.25,"sine",.1,.1);
  pop("🧪 弱体化！");showQ();
};

/* ---------- 演出 ---------- */
const card=$("#card");
function enter(){
  card.style.transition="none";
  card.style.transform="translateY(40px) scale(.94)";card.style.opacity="0";
  void card.offsetWidth;
  card.style.transition="transform .12s ease-out,opacity .12s";
  card.style.transform="";card.style.opacity="1";
  card.classList.remove("hit","miss");
}
function burst(){
  const r=card.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  const em=fever>0?["🔥","⭐","✨"]:["✨","⭐","💥"];
  for(let i=0;i<14;i++){
    const e=document.createElement("span");e.className="p";
    e.textContent=em[i%em.length];e.style.left=cx+"px";e.style.top=cy+"px";
    const a=Math.random()*6.28,d=80+Math.random()*120;
    e.style.setProperty("--dx",Math.cos(a)*d+"px");e.style.setProperty("--dy",Math.sin(a)*d+"px");
    document.body.appendChild(e);setTimeout(()=>e.remove(),750);
  }
}
const WORDS=["天才すぎ✨","神！！","えぐい🔥","優勝🏆","それな💯","しか勝たん💕","沼る〜🫠","ガチ盛れ📸","最強かよ👑"];
function pop(t,id){const p=$(id||"#pop");p.textContent=t;p.classList.remove("go");void p.offsetWidth;p.classList.add("go")}
// ステージ中の「◯秒後に次へ」用。やめた後や別のステージを始めた後には動かない
function later(f,ms){const id=runId;setTimeout(()=>{if(running&&id===runId)f()},ms)}
/* ---------- ボスのセリフ（吹き出し） ---------- */
let foe=null,sayT;
const SAY={
  hurt:["ぴえん🥺","計算はやすぎ…！","ちょ、待って😵","いたっ💦","それ反則でしょ…"],
  crit:["クリティカルはずるい😭","FEVERやめて〜🔥","まぶしっ…！✨"],
  taunt:["ざんね〜ん😜","そこ間違えるんだ〜？","ふふん、効いてないよ"],
  idle:"あれ〜？手が止まってるよ？😏",lose:"覚えてなさいよ〜😭",win:"勝っちゃった〜✌️"
};
const pick1=a=>a[rnd(0,a.length-1)];
function say(t,ms=1700){const e=$("#say");e.textContent=t;fx(e,"on");clearTimeout(sayT);sayT=setTimeout(()=>e.classList.remove("on"),ms)}
function fx(el,c){el.classList.remove(c);void el.offsetWidth;el.classList.add(c)}
// ダメージや攻撃の動きが終わったら、いつものふわふわに戻す
$("#bEmo").addEventListener("animationend",e=>{if(e.animationName!=="bob")e.target.classList.remove("hit","atk")});
function hud(){
  $("#sc").textContent=score;
  $("#cb").textContent=combo>1?combo+" COMBO":"";
  document.body.classList.toggle("fever",fever>0);
  $("#fev").hidden=!(fever>0);
  const h="❤️".repeat(hearts)+"🤍".repeat(HEARTS-hearts);
  if(kind==="normal"){$("#pBar").style.width=done/NORMAL_N*100+"%";$("#pTxt").textContent=`${done} / ${NORMAL_N}`;$("#heartsP").textContent=h}
  else{$("#bHp").style.width=Math.max(0,hp/hpMax*100)+"%";$("#hearts").textContent=h}
  drawOya("P");
}

/* ---------- 親黙らせ（TikTok解禁）ゲージ：今日の正解数 ---------- */
const today=()=>new Date().toDateString();
const todays=()=>myRecs.filter(r=>new Date(r.at).toDateString()===today());
// 残り問題数は見せずにパーセントだけ。FEVER中の正解は2ポイントでゲージがぐんぐん伸びる
function oyaPct(){const t=todays().reduce((t,r)=>t+(r.pts??r.ok),0)+(running?pts:0);return Math.min(100,Math.floor(t/DAILY*100))}
function drawOya(k){
  const p=oyaPct();
  $("#oyaBar"+k).style.width=p+"%";
  $("#oyaTxt"+k).textContent=p>=100?"解禁🎉":p+"%";
  $("#oya"+k).classList.toggle("full",p>=100);
}

/* ---------- 回答（テンキー・エンター不要の即判定） ---------- */
function press(k){
  if(busy||!running)return;
  audio();
  if(k==="C"){typed="";draw();return}
  if(k==="-"){if(typed)return;typed="-"}else typed+=k;
  const want=String(q.ans);
  if(!want.startsWith(typed)){miss();return}  // 1文字でもズレたら即ミス
  tone(900,.04,"sine",.07);
  if(typed===want)correct();else draw();
}
function correct(){
  busy=true;draw();card.classList.add("hit");
  const dt=(performance.now()-t0)/1000,quick=dt<=QUICK,sp=quick?1.5:1;
  okN++;done++;pts+=fever>0?2:1;combo++;maxCombo=Math.max(maxCombo,combo);tSum+=dt;
  // FEVER中に正解した分がクリティカル（2倍）
  const crit=fever>0;
  score+=Math.round((crit?20:10)*sp);
  if(quick)pop(`⚡ ${dt.toFixed(1)}秒！ ×1.5`,"#spd");
  if(kind!=="normal"){
    const dmg=Math.round(BASE_DMG*(1+.1*(combo-1))*(crit?2:1)*sp);
    hp-=dmg;fx($("#bEmo"),"hit");
    const d=$("#dmg");d.textContent=(crit?"CRITICAL!! ":"")+"−"+dmg;d.classList.toggle("crit",crit);fx(d,"go");
    if(crit){fx($("#app"),"bigshake");sfxCrit();if(navigator.vibrate)navigator.vibrate([20,20,40])}
    if(hp>0)say(crit?pick1(SAY.crit):pick1([foe.ow,...SAY.hurt]));
  }
  if(combo%5===0){fever=5;pop("FEVER!!")}else{if(fever>0)fever--;if(!crit||kind==="normal")pop(WORDS[rnd(0,WORDS.length-1)])}
  if(kind!=="normal"&&hp<=0){hud();sfxOk(combo);burst();$("#bEmo").classList.add("dead");pop("撃破！！");say(SAY.lose,1200);later(()=>finish("clear"),900);return}
  sfxOk(combo);burst();
  if(navigator.vibrate)navigator.vibrate(12);
  hud();
  later(()=>{if(kind==="normal"&&done>=NORMAL_N){finish("clear");return}nextQ();busy=false},100);
}
// まちがい・時間切れの共通処理。ハートが1つ減ってコンボが切れる。ボス戦で0になったら負け
function hurt(){
  misses++;tplMiss[q.tpl]=(tplMiss[q.tpl]||0)+1;
  combo=0;fever=0;hearts=Math.max(0,hearts-1);sfxNg();
  card.classList.remove("hit");card.classList.add("miss");
  fx($("#stage"),"shake");if(navigator.vibrate)navigator.vibrate([30,30,30]);
  if(kind!=="normal"){fx($("#bEmo"),"atk");fx($("#flash"),"go");say(hearts>0?pick1(SAY.taunt):SAY.win)}
  hud();
  if(kind!=="normal"&&hearts<=0){later(()=>finish("lose"),700);return true}
  return false;
}
function miss(){
  busy=true;
  if(hurt())return;
  // まちがえた最後の1文字だけ消す。合っていた所（−1 など）は残して、そこから打ち直せる
  typed=typed.slice(0,-1);
  // 答えは見せない。時間内なら同じ問題にもう一度チャレンジ
  later(()=>{draw();card.classList.remove("miss");busy=false},350);
}
function timeUp(){
  busy=true;
  if(hurt())return;
  pop("⏰ 時間切れ！");
  $("#eqR").className="rev";$("#eqR").textContent="答えは "+show(String(q.ans));done++;
  later(()=>{if(kind==="normal"&&done>=NORMAL_N){finish("clear");return}nextQ();busy=false},1100);
}

/* ---------- テンキー ---------- */
const KP=["💗","✨","⭐","🩷","💫"];
function kiss(x,y){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const e=document.createElement("span");e.className="kp";e.textContent=KP[rnd(0,KP.length-1)];
  e.style.left=x+"px";e.style.top=y+"px";e.style.setProperty("--dx",rnd(-24,24)+"px");
  document.body.appendChild(e);setTimeout(()=>e.remove(),720);
}
$("#pad").addEventListener("pointerdown",e=>{
  const b=e.target.closest(".key");if(!b)return;
  e.preventDefault();
  fx(b,"on");kiss(e.clientX,e.clientY);
  press(b.dataset.k);
});
document.addEventListener("keydown",e=>{
  if(!running)return;
  if(/^[0-9]$/.test(e.key))press(e.key);
  else if(e.key==="-")press("-");
  else if(["Backspace","Delete","Escape","c","C"].includes(e.key))press("C");
});

/* ---------- ステージ開始と結果 ---------- */
function startStage(w,s){
  runId++;sw=w;ss=s;kind=s===3?"mid":s===6?"big":"normal";stg=WORLDS[w].st[s];qn=0;
  audio();
  seen=new Set();tplMiss={};
  score=0;pts=0;tSum=0;combo=0;maxCombo=0;done=0;okN=0;misses=0;fever=0;busy=false;running=true;bi=0;weakLeft=WEAK;hearts=HEARTS;
  $("#stg").textContent=sid(w,s);
  $("#prog").hidden=kind!=="normal";$("#boss").hidden=kind==="normal";
  if(kind!=="normal"){
    const b=WORLDS[w].boss[kind==="mid"?0:1];
    hpMax=hp=BOSS_HP[kind==="mid"?0:1];
    $("#bEmo").textContent=b.e;$("#bName").textContent=b.n;$("#bEmo").className="bemo";
    foe=b;$("#say").classList.remove("on");later(()=>say(b.hi,2400),500);
  }
  $("#tMark").style.left=QUICK/LIMIT[w]*100+"%";
  screen("");hud();nextQ();bgm();cancelAnimationFrame(tRaf);tick();
  if(kind!=="normal")pop("BOSS BATTLE!");
}
function starsOf(clear){return clear?hearts>=STAR3?3:hearts>=STAR2?2:1:0}
const nextOf=(w,s)=>s<6?[w,s+1]:w<WORLDS.length-1?[w+1,0]:null;
let last;
function finish(how){
  running=false;busy=false;clearTimeout(bgT);cancelAnimationFrame(tRaf);document.body.classList.remove("fever");
  if(how==="quit"&&done===0&&okN===0){goMap();return}
  const clear=how==="clear",stars=starsOf(clear),id=sid(sw,ss);
  if(clear)score+={normal:30,mid:60,big:100}[kind];
  const r={at:Date.now(),st:id,n:done,ok:okN,pts,miss:misses,sec:Math.round(tSum*10)/10,combo:maxCombo,score,clear,stars};
  saveRec(r);
  const had=skinsOpen();
  if(clear&&stars>(myProg[id]||0)){myProg[id]=stars;cloud.saveProg(id,stars).catch(e=>console.error(e))}
  const fresh=skinsOpen().filter(k=>!had.includes(k));
  last={clear,id,w:sw,s:ss};
  $("#rH").textContent=clear?(kind==="normal"?"STAGE CLEAR!":"BOSS撃破！"):how==="lose"?"GAME OVER":"おつかれ！";
  $("#rH").className=clear?"win":"";
  const avg=okN?tSum/okN:0;
  $("#cStage").textContent=`STAGE ${id}　${stageName(sw,ss)}`;$("#cDate").textContent=when(Date.now()).split(" ")[0];
  $("#cName").textContent=me.name;
  $("#cTitle").textContent=TIERS[Math.floor((rankOf(myXp)-1)/10)];
  $("#cBadge").innerHTML=okN?`⚡ 反射神経ランク ${reflex(avg)}<small>正解までの平均 ${avg.toFixed(1)}秒</small>`:"⚡ 反射神経ランク ―<small>次は1問でも正解しよう！</small>";
  $("#cStreak").textContent=streak().days?`・🔥${streak().days}日連続`:"";
  $("#rS").innerHTML=clear?[1,2,3].map(i=>`<i class="${i>stars?"off":""}" style="animation-delay:${i*.15}s">★</i>`).join(""):"";
  $("#rN").textContent=done;
  $("#rA").textContent=(okN+misses?Math.round(okN/(okN+misses)*100):0)+"%";
  $("#rC").textContent=maxCombo;$("#rT").textContent=dur(tSum);
  const p=oyaPct();
  $("#rM").textContent=p>=100?"📱 TikTok解禁ゲージ 100%！今日はもう胸張っていいよ🎉":`📱 TikTok解禁ゲージ ${p}%`;$("#rB").style.width=p+"%";
  const w=Object.keys(tplMiss).sort((a,b)=>tplMiss[b]-tplMiss[a])[0];
  const gate=clear&&kind==="normal"&&stars<2;
  $("#rW").textContent=how==="lose"?"🧪 弱体化を使えば、数字が小さくなってボスに挑みやすくなるよ":gate?`❤️を${STAR2}つ以上残して★2を取ると、次のステージが開くよ！`:w?`次に伸ばせるのは「${T[w].n}」（ミス${tplMiss[w]}回）。手が止まると最初に計算する所が光るよ`:"ノーミス！天才すぎ✨";
  const nx=nextOf(sw,ss);$("#nextSt").hidden=!(nx&&unlocked(...nx));
  // 負けたときや★1のときは「リトライ」を大きく出す
  const retry=how==="lose"||gate;
  $("#again").className=retry?"cta":"cta alt";$("#again").textContent=retry?"🔁 リトライ":"もう一回";
  if(fresh.length)$("#rR").textContent+=`　🎨 着せ替え「${SKINS[fresh[0]].n}」が解放されたよ！`;
  if(clear)sfxWin();
  screen("res");
}
// 親に送って本当に通じる、まじめな学習報告の文面
// 反射神経ランク：正解までの平均時間が、そのワールドの制限時間の何割か
function reflex(avg){
  const r=avg/LIMIT[sw];
  return r<=.15?"SSS（神✨）":r<=.25?"SS（えぐい🔥）":r<=.4?"S（優勝🏆）":r<=.6?"A（いい感じ💕）":"B（のびしろ🌱）";
}
function shareText(){
  const l=todays(),n=l.reduce((t,r)=>t+r.n,0),ok=l.reduce((t,r)=>t+r.ok,0),ms=l.reduce((t,r)=>t+(r.miss??r.n-r.ok),0);
  const acc=ok+ms?Math.round(ok/(ok+ms)*100):0,{id,clear,w,s}=last;
  return `【Dopa-Math 学習報告】\n本日のトレーニング（${n}問・正解率${acc}%）を完了しました💮\n学習内容：ステージ${id}「${stageTopic(w,s)}」${clear?"クリア":"に取り組みました"}`+(oyaPct()>=100?"\n本日の目標を達成しました✅":"");
}
$("#share").onclick=async()=>{
  const t=shareText();
  if(navigator.share){try{await navigator.share({text:t});return}catch(e){}}
  window.open("https://line.me/R/msg/text/?"+encodeURIComponent(t),"_blank");
};
$("#again").onclick=()=>startStage(last.w,last.s);
$("#nextSt").onclick=()=>{const nx=nextOf(last.w,last.s);if(nx){mapW=nx[0];startStage(nx[0],nx[1])}};
$("#toMap").onclick=()=>goMap();
$("#quit").onclick=()=>{if(!running)return;if(confirm("マップにもどる？（ここまでの記録は残るよ）"))finish("quit")};
$("#mute").onclick=()=>{muted=!muted;$("#mute").textContent=muted?"🔇":"🔊"};
