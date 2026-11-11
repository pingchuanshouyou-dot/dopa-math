/* Dopa-Math 効果音とBGM（Web Audio で音を作る。音声ファイルは使わない） */

/* ---------- 音 ---------- */
let ac;
function audio(){
  if(!ac){try{ac=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}
  if(ac&&ac.state==="suspended")ac.resume();
}
function tone(f,d,type,v,when){
  if(!ac||muted)return;
  const o=ac.createOscillator(),g=ac.createGain(),s=ac.currentTime+(when||0);
  o.type=type;o.frequency.value=f;
  g.gain.setValueAtTime(v,s);g.gain.exponentialRampToValueAtTime(.001,s+d);
  o.connect(g);g.connect(ac.destination);o.start(s);o.stop(s+d);
}
function sfxOk(c){
  const f=660*Math.pow(1.0595,Math.min(c,12));
  tone(f,.12,"triangle",.22);tone(f*1.5,.18,"sine",.18,.07);tone(f*2,.25,"square",.05,.14);
  if(c>0&&c%5===0){[1,1.25,1.5,2].forEach((m,i)=>tone(523*m,.3,"sawtooth",.07,i*.08))}
}
function sfxNg(){tone(160,.25,"sawtooth",.14);tone(110,.3,"sawtooth",.14,.12)}
function sfxCrit(){tone(90,.35,"square",.2);tone(1400,.15,"sawtooth",.08,.02);tone(1900,.2,"triangle",.1,.08)}
function sfxHint(){tone(1320,.08,"sine",.08);tone(1760,.12,"sine",.07,.07)}
function sfxWin(){[1,1.25,1.5,2,2.5].forEach((m,i)=>tone(523*m,.35,"triangle",.12,i*.1))}
const SC=[0,2,4,7,9,12,9,7];
function bgm(){
  clearTimeout(bgT);if(!running)return;
  const sh=Math.floor(bi/8)%2?5:0,boss=kind!=="normal";
  tone((boss?165:220)*Math.pow(2,(SC[bi%8]+sh+(fever>0?12:0))/12),.12,boss?"sawtooth":"triangle",boss?.035:.05);
  bi++;bgT=setTimeout(bgm,fever>0?120:boss?180:230);
}
