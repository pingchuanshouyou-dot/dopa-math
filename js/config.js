/* Dopa-Math の設定。ゲームバランスの数字と、保存先（Firebase）の設定はここだけ見ればいい */

/* ---------- アプリ ----------
   name: 画面や学習レポートの文面に出る名前
   key:  この端末に保存するときの名前の頭（アプリごとに変えて、記録が混ざらないようにする）
   db:   Firebase に保存する場所の名前
   account: "login"（名前＋パスワード、Firebase も使える）／"nickname"（ニックネームだけ。端末の外に何も送らない）／
            "auto"（iPhone アプリの中では nickname、ブラウザでは login） */
const APP={name:"Dopa-Math",key:"dopamath",db:"users",account:"auto"};
// ランクの称号（ランク1〜10、11〜20、…、91〜100）
const TIERS=["計算デビュー🐣","ゆる計算ちゃん🌱","マイナスなかよし🫧","カッコ攻略中🎀","九九ガチ勢🌶️","計算ちょい盛れ✨","四則インフルエンサー📱","分数マスター🔮","計算のカリスマ💎","計算の女神👑"];

/* ---------- ゲームバランス ---------- */
const NORMAL_N=12,BOSS_HP=[100,150],HEARTS=7,WEAK=3,DAILY=50;  // DAILY = ごほうびゲージが満タンになるポイント（正解1つで1、FEVER中は2）
const LIMIT=[12,10,9,9,10];  // ワールドごとの1問の制限時間（秒）。慣れるまでの序盤は長め
const QUICK=3;             // この秒数までに答えるとスコアとダメージが1.5倍。過ぎるとヒントが光る
const BASE_DMG=8;          // ボスへの基本ダメージ。コンボ1つごとに+10%、FEVER中は2倍
// 星は残りハートで決まる（❤️5〜4で★3、3〜2で★2、1〜0で★1）
const STAR3=5,STAR2=3;  // 残りハートがこの数以上で★3・★2

/* ---------- 保存先（Firebase） ----------
   Firebaseコンソールの「プロジェクトの設定 → マイアプリ」にある firebaseConfig をここに貼る。
   apiKey が空のあいだは Firebase を使わず、遊んでいる端末の中に保存する */
const FIREBASE_CONFIG={
  apiKey:"",
  authDomain:"",
  projectId:"",
  appId:""
};
