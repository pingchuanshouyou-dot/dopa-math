/* Dopa-Math 保存先：Firebase（js/config.js の FIREBASE_CONFIG が入っているとき）か、この端末の中（localStorage）。
   ダブルクリック（file://）でも開けるように普通の script にして、Firebase は中から import() で読み込む */
(async()=>{
"use strict";
const V="https://www.gstatic.com/firebasejs/10.12.2/";
// 名前は大文字小文字や全角半角の違いを同じ人として扱う
const norm=n=>n.normalize("NFKC").toLowerCase();
async function sha(t){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
const fail=code=>Object.assign(new Error(code),{code});
let cloud;
if(FIREBASE_CONFIG.apiKey){
  const [{initializeApp},A,F]=await Promise.all(["firebase-app","firebase-auth","firebase-firestore"].map(m=>import(V+m+".js")));
  const app=initializeApp(FIREBASE_CONFIG),auth=A.getAuth(app),db=F.getFirestore(app);
  // Firebaseはメールアドレスでしか登録できないので、名前から決まった形のアドレスを作る
  const mail=async n=>"u"+(await sha(norm(n))).slice(0,40)+"@users.dopa-math.app";
  const who=u=>u&&{id:u.uid,name:u.displayName||""};
  const recs=()=>F.collection(db,"users",auth.currentUser.uid,"records");
  const prof=()=>F.doc(db,"users",auth.currentUser.uid);
  cloud={
    mode:"firebase",
    async register(name,pw){const c=await A.createUserWithEmailAndPassword(auth,await mail(name),pw);await A.updateProfile(c.user,{displayName:name});return who(c.user)},
    async login(name,pw){return who((await A.signInWithEmailAndPassword(auth,await mail(name),pw)).user)},
    logout:()=>A.signOut(auth),
    addRecord:r=>F.addDoc(recs(),r),
    async listRecords(){return (await F.getDocs(F.query(recs(),F.orderBy("at","desc"),F.limit(300)))).docs.map(d=>d.data())},
    async getProfile(){const d=await F.getDoc(prof()),x=d.exists()?d.data():{};return {xp:x.xp??null,prog:x.prog||{}}},
    setXp:x=>F.setDoc(prof(),{xp:x},{merge:true}),
    addXp:x=>F.setDoc(prof(),{xp:F.increment(x)},{merge:true}),
    saveProg:(id,stars)=>F.setDoc(prof(),{prog:{[id]:stars}},{merge:true})
  };
  window.cloud=cloud;
  A.onAuthStateChanged(auth,u=>onAuth(who(u)));
}else{
  const UK="dopamath-local-users",MK="dopamath-local-me";
  const load=()=>{try{return JSON.parse(localStorage.getItem(UK))||{}}catch(e){return {}}};
  const keep=u=>localStorage.setItem(UK,JSON.stringify(u));
  const who=k=>{const u=load()[k];return u&&{id:k,name:u.name}};
  const edit=f=>{const u=load(),k=localStorage.getItem(MK);f(u[k]);keep(u)};
  cloud={
    mode:"local",
    async register(name,pw){const u=load(),k=norm(name);if(u[k])throw fail("auth/email-already-in-use");const salt=crypto.randomUUID();u[k]={name,salt,pw:await sha(salt+pw),recs:[]};keep(u);localStorage.setItem(MK,k);return who(k)},
    async login(name,pw){const k=norm(name),x=load()[k];if(!x||x.pw!==await sha(x.salt+pw))throw fail("auth/invalid-credential");localStorage.setItem(MK,k);return who(k)},
    async logout(){localStorage.removeItem(MK)},
    async addRecord(r){edit(x=>{x.recs.unshift(r);x.recs=x.recs.slice(0,300)})},
    async listRecords(){return [...(load()[localStorage.getItem(MK)]?.recs||[])]},
    async getProfile(){const x=load()[localStorage.getItem(MK)]||{};return {xp:x.xp??null,prog:x.prog||{}}},
    async setXp(v){edit(x=>x.xp=v)},
    async addXp(v){edit(x=>x.xp=(x.xp||0)+v)},
    async saveProg(id,stars){edit(x=>{x.prog=x.prog||{};x.prog[id]=stars})}
  };
  window.cloud=cloud;
  onAuth(who(localStorage.getItem(MK))||null);
}
})();
