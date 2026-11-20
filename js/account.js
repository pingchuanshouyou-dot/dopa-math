/* Dopa-Math アカウント：ログイン中の人と記録の読み込み、新規登録・ログイン画面、ログアウト */

/* ---------- アカウントと記録 ---------- */
// ニックネームだけのモード（js/config.js の APP.account）。パスワードも Firebase も使わず、端末の外に何も送らない
const NICK=APP.account==="nickname"||(APP.account==="auto"&&IN_APP);
let me=null,myRecs=[],myProg={},loadP=null;
// 新しい人に切り替わったら記録を読み込む。同じ人なら読み込み中の約束を返す
function setUser(u){
  if(u&&me&&u.id===me.id){if(u.name)me.name=u.name;return loadP}
  me=u;myRecs=[];myXp=0;myProg={};
  loadP=u?Promise.all([cloud.listRecords(),cloud.getProfile()]).then(([l,p])=>{
    if(me!==u)return;
    myRecs=l;myProg=p.prog||{};
    // XPを持っていない人は、今までの記録から計算して保存しておく
    let x=p.xp;if(x==null){x=l.reduce((t,r)=>t+xpOf(r),0);cloud.setXp(x).catch(e=>console.error(e))}
    myXp=x;
    // 遊べる中でいちばん先のワールドをマップに出す
    mapW=0;while(mapW<WORLDS.length-1&&unlocked(mapW+1,0))mapW++;
  }).catch(e=>console.error(e)):Promise.resolve();
  return loadP.then(()=>{applySkin();opening()});
}
window.onAuth=setUser;

let authMode;
// m: "reg"（新規登録）・"login"（ログイン）・"start"（ニックネームを決める）・"rename"（ニックネームを変える）
function openAuth(m){
  authMode=m;
  if(NICK){
    $("#authT").textContent=m==="rename"?"ニックネームを変える":"はじめまして！";
    $("#aGo").textContent=m==="rename"?"変える":"はじめる";
    $("#aErr").textContent="";$("#aName").value=m==="rename"?me.name:"";
    screen("auth");$("#aName").focus();
    return;
  }
  const reg=m==="reg";
  $("#authT").textContent=reg?"新規登録":"ログイン";
  $("#aGo").textContent=reg?"登録してはじめる":"ログインしてはじめる";
  $("#authSwap").textContent=reg?"もう登録してる人はこちら（ログイン）":"はじめての人はこちら（新規登録）";
  $("#aPw").autocomplete=reg?"new-password":"current-password";
  $("#aErr").textContent="";$("#aPw").value="";showPw(false);
  screen("auth");$("#aName").focus();
}
const ERR={
  "auth/email-already-in-use":"その名前はもう使われています。別の名前にしてね",
  "auth/invalid-credential":"名前かパスワードがちがいます",
  "auth/wrong-password":"名前かパスワードがちがいます",
  "auth/user-not-found":"名前かパスワードがちがいます",
  "auth/invalid-email":"名前かパスワードがちがいます",
  "auth/too-many-requests":"失敗が続いたので少し待ってからためしてね",
  "auth/network-request-failed":"ネットにつながっていません"
};
$("#authF").onsubmit=async e=>{
  e.preventDefault();
  const name=$("#aName").value.trim(),pw=$("#aPw").value,reg=authMode==="reg";
  if(NICK){
    if(!name){$("#aErr").textContent="ニックネームを入れてね";return}
    const u=await(authMode==="rename"?cloud.rename(name):cloud.register(name));
    await setUser(u);goMap();return;
  }
  const bad=!name?"名前を入れてね":pw.length<6?"パスワードは6文字以上にしてね":"";
  if(bad){$("#aErr").textContent=bad;return}
  $("#aErr").textContent="";$("#aGo").disabled=true;
  try{
    const u=await(reg?cloud.register(name,pw):cloud.login(name,pw));
    await setUser(u);goMap();
  }catch(err){console.error(err);$("#aErr").textContent=ERR[err.code]||"うまくいきませんでした。もう一度ためしてね"}
  finally{$("#aGo").disabled=false}
};
// 👁️ で入力中のパスワードを見せる（確認用の2回目の入力のかわり）
function showPw(on){$("#aPw").type=on?"text":"password";$("#aEye").setAttribute("aria-pressed",on);$("#aEye").setAttribute("aria-label",on?"パスワードをかくす":"パスワードを表示")}
$("#aEye").onclick=()=>{showPw($("#aPw").type==="password");$("#aPw").focus()};
$("#goReg").onclick=()=>openAuth(NICK?"start":"reg");
$("#goLogin").onclick=()=>openAuth("login");
$("#goSwitch").onclick=()=>openAuth("login");
$("#authSwap").onclick=()=>openAuth(authMode==="reg"?"login":"reg");
$("#authBack").onclick=()=>authMode==="rename"?goMap():screen("open");
$("#goPlay").onclick=()=>{audio();goMap()};

$("#mOut").onclick=async()=>{
  if(NICK){openAuth("rename");return}
  if(!confirm(`${me.name} からログアウトしますか？`))return;
  await cloud.logout();await setUser(null);screen("open");
};

// ニックネームだけのモードでは、ログイン・パスワード・ログアウトのボタンや欄を出さない
if(NICK){
  $("#goReg").textContent="▶ はじめる";$("#goLogin").hidden=true;$("#goSwitch").hidden=true;
  $("#aNameT").textContent="ニックネーム";$("#aPwL").hidden=true;$("#authSwap").hidden=true;$("#aNote").hidden=false;
  $("#aName").maxLength=10;$("#aName").autocomplete="nickname";
  $("#mOut").textContent="✏️ ニックネームを変える";$("#mOut").classList.remove("out");
}
