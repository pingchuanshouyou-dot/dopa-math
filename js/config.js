/* Dopa-Math の設定。ゲームバランスの数字と、保存先（Firebase）の設定はここだけ見ればいい */

/* ---------- ゲームバランス ---------- */
const NORMAL_N=12,BOSS_HP=[100,150],HEARTS=7,WEAK=3,DAILY=50;  // DAILY = TikTok解禁ゲージが満タンになるポイント（正解1つで1、FEVER中は2）
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
