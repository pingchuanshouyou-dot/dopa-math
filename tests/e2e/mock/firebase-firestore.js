// テスト用のニセFirebase。本物と同じ形の関数を、ブラウザの localStorage を使って動かす
const L=()=>JSON.parse(localStorage.getItem("mockFs")||"{}");
export const getFirestore=()=>({});
export const collection=(db,...p)=>p.join("/");
export const orderBy=(f,d)=>({f,d});export const limit=n=>n;
export const query=(c,o,l)=>({c,o,l});
export async function addDoc(c,r){const d=L();(d[c]=d[c]||[]).push(r);localStorage.setItem("mockFs",JSON.stringify(d))}
export async function getDocs(q){const l=[...(L()[q.c]||[])].sort((a,b)=>b[q.o.f]-a[q.o.f]).slice(0,q.l);return{docs:l.map(x=>({data:()=>x}))}}
export const doc=(db,...p)=>p.join("/");
export const increment=n=>({__inc:n});
export async function getDoc(k){const v=L()["doc:"+k];return{exists:()=>!!v,data:()=>v}}
export async function setDoc(k,v,o){const d=L(),cur=d["doc:"+k]||{};for(const [f,x] of Object.entries(v))cur[f]=x&&x.__inc!=null?(cur[f]||0)+x.__inc:x&&typeof x==="object"?{...(cur[f]||{}),...x}:x;d["doc:"+k]=cur;localStorage.setItem("mockFs",JSON.stringify(d))}
