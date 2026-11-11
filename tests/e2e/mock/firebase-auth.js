// テスト用のニセFirebase。本物と同じ形の関数を、ブラウザの localStorage を使って動かす
const L=()=>JSON.parse(localStorage.getItem("mockAuth")||'{"users":{},"cur":null}'),S=x=>localStorage.setItem("mockAuth",JSON.stringify(x));
const err=c=>Object.assign(new Error(c),{code:c});let ls=[];
const auth={get currentUser(){const d=L();return d.cur?{uid:d.cur,displayName:d.users[d.cur].name}:null}};
const fire=()=>setTimeout(()=>ls.forEach(f=>f(auth.currentUser)),0);
export const getAuth=()=>auth;
export const onAuthStateChanged=(a,f)=>{ls.push(f);setTimeout(()=>f(auth.currentUser),300)};
export async function createUserWithEmailAndPassword(a,email,pw){if(!/^u[0-9a-f]{40}@users\.dopa-math\.app$/.test(email))throw err("auth/invalid-email");const d=L();if(Object.values(d.users).some(u=>u.email===email))throw err("auth/email-already-in-use");const uid="U"+Object.keys(d.users).length;d.users[uid]={email,pw,name:null};d.cur=uid;S(d);fire();return{user:{uid,displayName:null}}}
export async function updateProfile(u,{displayName}){const d=L();d.users[u.uid].name=displayName;S(d);u.displayName=displayName}
export async function signInWithEmailAndPassword(a,email,pw){const d=L();const e=Object.entries(d.users).find(([k,u])=>u.email===email&&u.pw===pw);if(!e)throw err("auth/invalid-credential");d.cur=e[0];S(d);fire();return{user:auth.currentUser}}
export async function signOut(){const d=L();d.cur=null;S(d);fire()}
