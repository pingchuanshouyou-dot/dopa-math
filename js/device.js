/* Dopa-Math 端末の機能の窓口：振動・共有・保存・音の扱い。
   iPhone アプリ（Capacitor）の中ではネイティブの機能を、ブラウザではブラウザの機能を使う。
   ほかのファイルは navigator.vibrate や localStorage を直接さわらず、ここを通す。
   アプリにするときに入れるプラグイン: @capacitor/haptics・@capacitor/share・@capacitor/preferences */

// Capacitor のプラグイン（アプリの中で、そのプラグインが入っているときだけある）
const plugin=n=>window.Capacitor?.isNativePlatform?.()?window.Capacitor.Plugins?.[n]||null:null;

/* ---------- 振動 ----------
   tap: キーを押した  ok: 正解  ng: まちがい・時間切れ  crit: クリティカル
   iPhone のブラウザには振動の機能がないので、アプリの中ではネイティブの触覚フィードバックを使う */
const BUZZ={tap:null,ok:12,ng:[30,30,30],crit:[20,20,40]};  // ブラウザ（Android など）用。キーを押すたびの振動はブラウザではしない
function haptic(kind){
  const H=plugin("Haptics");
  if(H){
    const p=kind==="ng"?H.notification({type:"ERROR"}):H.impact({style:{tap:"LIGHT",ok:"MEDIUM",crit:"HEAVY"}[kind]});
    p?.catch?.(()=>{});
    return;
  }
  if(BUZZ[kind]&&navigator.vibrate)navigator.vibrate(BUZZ[kind]);
}

/* ---------- 共有 ----------
   アプリの中は iOS の共有シート、ブラウザは共有機能、それもなければ LINE を開く */
async function shareOut(text,title){
  const S=plugin("Share");
  if(S){try{await S.share({text,dialogTitle:title})}catch(e){}return}
  if(navigator.share){try{await navigator.share({text});return}catch(e){if(e.name==="AbortError")return}}
  window.open("https://line.me/R/msg/text/?"+encodeURIComponent(text),"_blank");
}

/* ---------- 保存 ----------
   アプリの中は Preferences（iOS が勝手に消さないアプリ内の保存場所）、ブラウザは localStorage。
   読むのはすぐ答えたいので、起動時に全部読み込んで手元に持っておき、書くときは両方を更新する */
const Store=(()=>{
  const mem=new Map();let readyP=null;
  const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
  return{
    // 起動時に1回。アプリの中なら Preferences から全部読み込む
    ready(){
      return readyP||(readyP=(async()=>{
        const P=plugin("Preferences");if(!P)return;
        try{const {keys}=await P.keys();for(const k of keys){const {value}=await P.get({key:k});if(value!=null)mem.set(k,value)}}catch(e){console.error(e)}
      })());
    },
    get(k){if(mem.has(k))return mem.get(k);return plugin("Preferences")?null:ls.get(k)},
    set(k,v){mem.set(k,v);const P=plugin("Preferences");if(P)P.set({key:k,value:v}).catch(e=>console.error(e));else ls.set(k,v)},
    remove(k){mem.delete(k);const P=plugin("Preferences");if(P)P.remove({key:k}).catch(e=>console.error(e));else ls.del(k)}
  };
})();

/* ---------- 音の扱い ----------
   効果音とBGMは、iPhone の消音スイッチ（マナーモード）に従い、ほかのアプリの音楽も止めない（ambient）。
   授業中や電車で急に鳴らないように。アプリの中では、ネイティブ側でも AVAudioSession を ambient にする */
try{if(navigator.audioSession)navigator.audioSession.type="ambient"}catch(e){}
