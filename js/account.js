/* Dopa-Math アカウント：ログイン中の人と記録の読み込み、新規登録・ログイン画面、ログアウト */

/* ---------- アカウントと記録 ---------- */
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
function openAuth(m){
  authMode=m;const reg=m==="reg";
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
$("#goReg").onclick=()=>openAuth("reg");
$("#goLogin").onclick=()=>openAuth("login");
$("#goSwitch").onclick=()=>openAuth("login");
$("#authSwap").onclick=()=>openAuth(authMode==="reg"?"login":"reg");
$("#authBack").onclick=()=>screen("open");
$("#goPlay").onclick=()=>{audio();goMap()};

$("#mOut").onclick=async()=>{
  if(!confirm(`${me.name} からログアウトしますか？`))return;
  await cloud.logout();await setUser(null);screen("open");
};
