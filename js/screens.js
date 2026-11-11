/* Dopa-Math プレイ以外の画面：マップ、連続記録、画面の切りかえ、ランク、名前メニュー、着せ替え、記録 */

/* ---------- ワールドマップ ---------- */
const PTS=[[22,86],[52,79],[80,66],[52,53],[20,40],[48,26],[76,13]];
const DECO=["🌷🍓🐣🌼","🎀🍬🗝️🌀","🌶️🍉🔥✨","🧁🍭🎪🍩","🦄🌙🔮💜"];
let mapW=0;
const cleared=id=>(myProg[id]||0)>0;
// 通常ステージは★2以上で次が開く。ボスは倒せば次が開く
function unlocked(w,s){if(w===0&&s===0)return true;const ps=s>0?s-1:6,p=s>0?sid(w,s-1):sid(w-1,6);return (myProg[p]||0)>=(ps===3||ps===6?1:2)}
/* ---------- 🔥 連続記録：遊んだ日が今日（または昨日）までつながっている日数 ---------- */
const dayKey=t=>new Date(t).toDateString();
function streak(){
  const days=new Set(myRecs.map(r=>dayKey(r.at)));
  const d=new Date();d.setHours(12,0,0,0);
  const today=days.has(dayKey(d));
  if(!today)d.setDate(d.getDate()-1);   // 今日まだでも、昨日までの記録は切れていない
  let n=0;while(days.has(dayKey(d))){n++;d.setDate(d.getDate()-1)}
  return {days:n,today};
}
function drawStreak(){
  const {days,today}=streak(),e=$("#streak");
  e.textContent=!days?"🔥 今日から連続記録！":today?`🔥 ${days}日連続！`:`🔥 ${days}日連続 ⏳今日まだ`;
  e.classList.toggle("cold",!today);
}
$("#streak").onclick=()=>{const {days,today}=streak();pop(today?`${days}日連続えらすぎ✨`:"今日も1ステージで記録キープ！","#pop")};
function goMap(){
  drawRank();$("#umenu").hidden=true;$("#sheet").hidden=true;$("#skinSheet").hidden=true;
  screen("map");drawOya("M");drawMap();drawStreak();
}
function drawMap(){
  const W=WORLDS[mapW];
  $("#wNo").textContent=`WORLD ${mapW+1}`;$("#wName").textContent=`${W.emo} ${W.name}`;$("#wDesc").textContent=W.desc;
  $("#wPrev").disabled=mapW===0;$("#wNext").disabled=mapW===WORLDS.length-1;
  const nowS=[0,1,2,3,4,5,6].find(s=>unlocked(mapW,s)&&!cleared(sid(mapW,s)));
  let h=`<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${PTS.map(p=>p.join(",")).join(" ")}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.6" stroke-dasharray="3 2.4" stroke-linecap="round" vector-effect="non-scaling-stroke" style="stroke-width:6px"/></svg>`;
  [...DECO[mapW]].forEach((e,i)=>{h+=`<span class="deco" style="left:${[6,82,10,84][i]}%;top:${[8,30,62,84][i]}%">${e}</span>`});
  PTS.forEach(([x,y],s)=>{
    const id=sid(mapW,s),un=unlocked(mapW,s),st=myProg[id]||0,boss=s===3?"mid":s===6?"big":"";
    const label=!un?"🔒":boss?W.boss[s===3?0:1].e:id;
    h+=`<button class="node ${boss} ${un?st?"done":"":"lock"} ${s===nowS?"now":""}" style="left:${x}%;top:${y}%" data-s="${s}" aria-label="ステージ${id}${un?"":"（まだ遊べません）"}">${label}${st?`<span class="st">${"★".repeat(st)}${"☆".repeat(3-st)}</span>`:""}</button>`;
  });
  if(!unlocked(mapW,0))h+=`<div class="wlock">🔒 WORLD ${mapW}のボスをたおすと解放</div>`;
  const box=$("#mapbox");box.innerHTML=h;box.style.background=`linear-gradient(170deg,${W.c2},${W.c1})`;
}
$("#wPrev").onclick=()=>{if(mapW>0){mapW--;drawMap()}};
$("#wNext").onclick=()=>{if(mapW<WORLDS.length-1){mapW++;drawMap()}};
let pick=null;
$("#mapbox").onclick=e=>{
  const b=e.target.closest(".node");if(!b)return;
  const s=+b.dataset.s;if(!unlocked(mapW,s))return;
  audio();pick=[mapW,s];
  const id=sid(mapW,s),st=myProg[id]||0,boss=s===3||s===6,W=WORLDS[mapW];
  $("#shNo").textContent=`STAGE ${id}`+(boss?(s===3?"　中ボス":"　大ボス"):"");
  $("#shEmo").textContent=boss?W.boss[s===3?0:1].e:"";$("#shEmo").hidden=!boss;
  $("#shName").textContent=stageName(mapW,s);
  const ex=makeQ(W.st[s].t,0,new Set()).text.replace(/\^2/g,"²").replace(/\^3/g,"³");
  $("#shDesc").textContent=(boss?`「${stageTopic(mapW,s)}」で勝負！正解するとダメージ！コンボが続くほど強くなって、5コンボのFEVER中はクリティカル（2倍）。まちがえると❤️が減るよ。`:"")+`例：${ex}`;
  $("#shInfo").textContent=(boss?`ボスHP ${BOSS_HP[s===3?0:1]}`:`${NORMAL_N}問`)+`　❤️×${HEARTS}　⏱${LIMIT[mapW]}秒　🧪×${WEAK}　`+(st?"★".repeat(st)+"☆".repeat(3-st):boss?"まだ倒してないよ":"★2で次が開くよ");
  $("#sheet").hidden=false;
};
$("#shGo").onclick=()=>{$("#sheet").hidden=true;startStage(...pick)};
$("#shX").onclick=()=>$("#sheet").hidden=true;
$("#sheet").onclick=e=>{if(e.target.id==="sheet")$("#sheet").hidden=true};

function screen(id){document.querySelectorAll(".ov").forEach(o=>o.hidden=o.id!==id)}
function opening(){
  $("#opLoad").hidden=true;$("#opGuest").hidden=!!me;$("#opUser").hidden=!me;
  if(me)$("#opWho").textContent=`${me.name} としてログイン中`;
  $("#opNote").textContent=cloud.mode==="local"?"※ Firebaseが未設定なので、いまはこの端末の中だけに保存しています":"";
}

/* ---------- ランク（1〜100） ----------
   XP = スコア × ワールドの重さ × 正解率。スコアには速さボーナス・フィーバー・クリアボーナスが入っている */
const TIERS=["計算デビュー🐣","ゆる計算ちゃん🌱","マイナスなかよし🫧","カッコ攻略中🎀","九九ガチ勢🌶️","計算ちょい盛れ✨","四則インフルエンサー📱","分数マスター🔮","計算のカリスマ💎","計算の女神👑"];
const need=r=>Math.round(30*Math.pow(r-1,1.9));  // ランクrになるのに必要な合計XP。100で約18.6万
const rankOf=x=>{let r=1;while(r<100&&x>=need(r+1))r++;return r};
const COURSE_W={basic:1,mid:1.5,high:2};  // ワールド制より前の記録用
function xpOf(r){
  const w=r.st?1+(+r.st.split("-")[0]-1)*.25:COURSE_W[r.c]||1,m=r.miss??(r.n-r.ok);
  return Math.round(r.score*w*(r.ok+m?r.ok/(r.ok+m):0));
}
let myXp=0;
function drawRank(){
  const r=rankOf(myXp);
  $("#whoN").textContent="👤 "+me.name;$("#whoR").textContent="ランク"+r;
  $("#mRank").textContent=r;$("#mTitle").textContent=TIERS[Math.floor((r-1)/10)];
  const a=need(r),b=need(r+1);
  $("#mBar").style.width=(r>=100?100:(myXp-a)/(b-a)*100)+"%";
  $("#mNext").textContent=r>=100?`最高ランク！ 合計 ${myXp.toLocaleString()} XP`:`次のランクまで ${(b-myXp).toLocaleString()} XP`;
}

$("#who").onclick=e=>{e.stopPropagation();$("#umenu").hidden=!$("#umenu").hidden};
$("#umenu").onclick=e=>e.stopPropagation();
document.addEventListener("click",()=>$("#umenu").hidden=true);
$("#mRec").onclick=()=>{$("#umenu").hidden=true;showRecs()};
/* ---------- 🎨 着せ替え：星の合計やランクで解放。選んだテーマはこの端末に人ごとに覚える ---------- */
const SKINS={
  base:{n:"ゆめかわピンク🎀",c:["#fff0f7","#ff2d8f","#ffb300"],need:null},
  cafe:{n:"韓国カフェ風ラテ☕",c:["#f7efe6","#c4865b","#e0ad62"],need:{stars:5}},
  sky:{n:"水色界隈・天使系🩵",c:["#eef8ff","#4fb3f0","#b49cff"],need:{stars:12}},
  neon:{n:"ネオンサイバー👾",c:["#0b0b1e","#ff2bd6","#00f0ff"],need:{stars:25}},
  oshi:{n:"推し色（メンカラ）💖",c:["#ff3b5c","#2f80ff","#ffd000"],need:{rank:10}}
};
const OSHI=["#ff3b5c","#ff8a00","#f5c400","#2ecc71","#00bcd4","#2f80ff","#8b5cf6","#ff5fa2"];
const starSum=()=>Object.values(myProg).reduce((t,v)=>t+v,0);
const skinOk=k=>{const n=SKINS[k].need;return !n||(n.stars?starSum()>=n.stars:rankOf(myXp)>=n.rank)};
const skinsOpen=()=>Object.keys(SKINS).filter(skinOk);
const skinKey=()=>"dopamath-skin:"+(me?me.id:"");
function loadSkin(){try{return JSON.parse(localStorage.getItem(skinKey()))||{}}catch(e){return {}}}
function applySkin(){
  const {skin,oshi}=me?loadSkin():{},k=skin&&SKINS[skin]&&skinOk(skin)?skin:"base",r=document.documentElement;
  if(k==="base")r.removeAttribute("data-skin");else r.dataset.skin=k;
  if(oshi)r.style.setProperty("--oshi",oshi);
}
function saveSkin(v){try{localStorage.setItem(skinKey(),JSON.stringify({...loadSkin(),...v}))}catch(e){}applySkin();drawSkins()}
function drawSkins(){
  const cur=loadSkin().skin||"base";
  $("#skins").innerHTML=Object.entries(SKINS).map(([k,v])=>{const ok=skinOk(k),n=v.need;
    return `<button class="skin ${k===cur?"sel":""}" data-k="${k}" ${ok?"":"disabled"}><span class="sw">${v.c.map(c=>`<i style="background:${c}"></i>`).join("")}</span>${v.n}<small>${ok?(k===cur?"使用中":""):n.stars?`★${n.stars}で解放（いま★${starSum()}）`:`ランク${n.rank}で解放`}</small></button>`}).join("");
  const o=$("#oshis");o.hidden=cur!=="oshi";
  o.innerHTML=OSHI.map(c=>`<button style="background:${c}" data-c="${c}" class="${loadSkin().oshi===c?"sel":""}" aria-label="推し色 ${c}"></button>`).join("");
}
$("#mSkin").onclick=()=>{$("#umenu").hidden=true;drawSkins();$("#skinSheet").hidden=false};
$("#skins").onclick=e=>{const b=e.target.closest(".skin");if(b&&!b.disabled)saveSkin({skin:b.dataset.k})};
$("#oshis").onclick=e=>{const b=e.target.closest("button");if(b)saveSkin({oshi:b.dataset.c})};
$("#skinX").onclick=()=>$("#skinSheet").hidden=true;
$("#skinSheet").onclick=e=>{if(e.target.id==="skinSheet")$("#skinSheet").hidden=true};

function saveRec(r){
  myRecs.unshift(r);
  const oops=e=>{console.error(e);$("#rW").textContent+="（記録の保存に失敗しました）"};
  cloud.addRecord(r).catch(oops);
  const g=xpOf(r),r0=rankOf(myXp);
  myXp+=g;cloud.addXp(g).catch(oops);
  const r1=rankOf(myXp);
  $("#rR").textContent=r1>r0?`🎉 RANK UP！ ランク${r0} → ${r1}（+${g} XP）`:`+${g} XP　ランク${r1}`;
  $("#rR").classList.toggle("up",r1>r0);
}
// オープニングで数字と記号をふわふわ流す
(()=>{const ch="0123456789+−×÷=";let h="";for(let i=0;i<18;i++)h+=`<span class="fl" style="left:${rnd(0,92)}%;font-size:${rnd(28,70)}px;animation-duration:${rnd(9,20)}s;animation-delay:-${rnd(0,20)}s">${ch[rnd(0,ch.length-1)]}</span>`;$("#fls").innerHTML=h})();
const z=x=>String(x).padStart(2,"0");
function when(t){const d=new Date(t);return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}（${"日月火水木金土"[d.getDay()]}） ${z(d.getHours())}:${z(d.getMinutes())}`}
const dur=s=>s<60?s.toFixed(1)+"秒":`${Math.floor(s/60)}分${z(Math.floor(s%60))}秒`;
const OLD={basic:"初級",mid:"中級",high:"上級"};
function recTag(r){
  if(!r.st)return `<span class="tag ${r.c}">${OLD[r.c]||""}</span>`;
  const [w,s]=r.st.split("-").map(Number);
  return `<span class="tag w${w}">${r.st} ${stageName(w-1,s-1)}${r.clear?" ✓":""}</span>`;
}
function showRecs(){
  const l=myRecs;
  $("#recs").innerHTML=l.length?l.map(r=>`<div class="rec"><div class="hd"><span>${when(r.at)}</span>${recTag(r)}</div><div class="row"><div><b>${r.n}</b><span>問題数</span></div><div><b>${dur(r.sec)}</b><span>計算時間</span></div><div><b>${r.combo}</b><span>最大コンボ</span></div><div><b>${r.score}</b><span>スコア</span></div></div></div>`).join(""):`<p>まだ記録がありません。<br>ステージを遊ぶと、ここに残ります。</p>`;
  screen("rec");$("#rec").scrollTop=0;
}
$("#recBack").onclick=goMap;
