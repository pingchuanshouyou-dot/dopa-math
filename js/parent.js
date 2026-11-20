/* Dopa-Math 保護者メニュー：保護者ゲートと、遊びすぎ対策（1日の目安時間・休憩の声かけ・演出をひかえめに） */

/* ---------- 設定（この端末に1つ。だれが遊んでも同じ） ---------- */
const PARENT_KEY=APP.key+"-parent";
const PARENT_DEF={daily:30,hard:false,brk:15,calm:false};  // 目安30分（こえても遊べる）・15分ごとに休憩の声かけ
function parentSet(){try{return {...PARENT_DEF,...JSON.parse(Store.get(PARENT_KEY))}}catch(e){return {...PARENT_DEF}}}
function saveParent(v){Store.set(PARENT_KEY,JSON.stringify({...parentSet(),...v}));applyCalm()}

/* ---------- 保護者ゲート ----------
   生まれた年（西暦）を入れてもらい、20歳以上なら通す。1回通ったら5分間は聞かない。
   保護者向けの操作だとわかるようにするためのもので、子どもが本気で通ろうとすれば通れる */
let gatePass=0,gateNext=null;
function needParent(next){
  if(Date.now()-gatePass<5*60e3){next();return}
  gateNext=next;$("#gateA").value="";$("#gateErr").textContent="";$("#gate").hidden=false;$("#gateA").focus();
}
$("#gateF").onsubmit=e=>{
  e.preventDefault();
  const y=+$("#gateA").value,age=new Date().getFullYear()-y;
  if(!/^\d{4}$/.test($("#gateA").value)||age<20||age>100){$("#gateErr").textContent="この操作は、保護者の方だけができます";return}
  gatePass=Date.now();$("#gate").hidden=true;const n=gateNext;gateNext=null;n&&n();
};
$("#gateX").onclick=()=>{$("#gate").hidden=true;gateNext=null};

/* ---------- 遊んだ時間 ----------
   1ステージごとに、始めてから終わるまでの時間（秒）を記録の play に入れる。
   休憩の声かけは、続けて遊んだ時間で数える（5分以上あいたら休憩したとみなす） */
let stageT0=0,sinceBreak=0,lastEnd=0;
function playStart(){stageT0=Date.now();if(Date.now()-lastEnd>5*60e3)sinceBreak=0}
function playEnd(){const s=Math.round((Date.now()-stageT0)/1000);sinceBreak+=s;lastEnd=Date.now();return s}
// 今日遊んだ時間（秒）。記録より前のもの（play がない）は、計算時間で代わりに数える
const todayPlay=()=>todays().reduce((t,r)=>t+(r.play??r.sec??0),0)+(running?Math.round((Date.now()-stageT0)/1000):0);
const overDaily=()=>{const d=parentSet().daily;return d>0&&todayPlay()>=d*60};

// ステージを始める前：目安時間をこえていて「遊べないようにする」設定なら、休みの画面を出す
function mayStart(){
  if(!(overDaily()&&parentSet().hard))return true;
  $("#restMsg").textContent=`今日の目安時間（${parentSet().daily}分）になりました。また明日あそぼう！`;
  screen("rest");return false;
}
// 結果画面のひとこと：目安時間をこえた・休憩しよう
function careNote(){
  const p=parentSet();
  if(overDaily())return {t:`🌙 今日の目安時間（${p.daily}分）になったよ。今日はここまでにしよう`,stop:p.hard};
  if(p.brk>0&&sinceBreak>=p.brk*60){sinceBreak=0;return {t:"👀 ちょっと休憩しよう。遠くを見て、のびをしてね",stop:false}}
  return null;
}

/* ---------- 演出をひかえめに ----------
   フィーバーの虹色・画面のゆれ・赤い点滅・紙吹雪を止める。端末の「視差効果を減らす」がオンなら自動でオン */
const calm=()=>parentSet().calm||matchMedia("(prefers-reduced-motion: reduce)").matches;
function applyCalm(){document.body.classList.toggle("calm",calm())}

/* ---------- 保護者メニュー ---------- */
function drawParent(){
  const p=parentSet(),m=Math.floor(todayPlay()/60);
  $("#pToday").textContent=`今日の学習時間：${m}分`;
  $("#pDaily").value=p.daily;$("#pHard").checked=p.hard;$("#pBreak").value=p.brk;$("#pCalm").checked=p.calm;
}
$("#mParent").onclick=()=>{$("#umenu").hidden=true;needParent(()=>{drawParent();screen("parent")})};
$("#pDaily").onchange=e=>saveParent({daily:+e.target.value});
$("#pHard").onchange=e=>saveParent({hard:e.target.checked});
$("#pBreak").onchange=e=>saveParent({brk:+e.target.value});
$("#pCalm").onchange=e=>saveParent({calm:e.target.checked});
$("#parentBack").onclick=()=>goMap();
$("#restBack").onclick=()=>goMap();
applyCalm();
