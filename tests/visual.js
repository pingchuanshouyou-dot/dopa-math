// 見た目のチェック。スマホサイズ（375×667）で主な画面の写真を撮り、前の写真と1ピクセル単位で比べる
//   写真を撮る:   node tests/visual.js shot <保存先フォルダ>
//   2回分を比べる: node tests/visual.js compare <フォルダA> <フォルダB>
// 乱数と日時を固定し、アニメーションを止めて撮るので、コードの見た目が同じなら写真もまったく同じになる
const fs = require("fs");
const path = require("path");
const { open } = require("./helpers");

// Math.random を、毎回同じ数を出す乱数に置きかえる
const SEED = `(()=>{let a=20261111;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})();`;

async function shot(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const t = await open("local", { init: SEED });
  const p = t.page;
  await p.clock.setFixedTime(new Date("2026-11-11T10:00:00"));
  const snap = async name => { await p.waitForTimeout(150); await p.screenshot({ path: path.join(dir, name + ".png"), animations: "disabled", caret: "hide" }); };
  // プレイ中はタイマーの長さが毎回ちがうので、止めて同じ長さにしてから撮る
  const freeze = () => t.ev(() => { running = false; cancelAnimationFrame(tRaf); clearTimeout(bgT); $("#tBar").style.transform = "scaleX(.6)"; $("#tBar").className = "mid"; });

  await snap("01-open");
  await p.click("#goReg"); await p.fill("#aName", "まひろ"); await p.fill("#aPw", "secret1"); await snap("02-register");
  await p.click("#aGo"); await p.waitForTimeout(400); await snap("03-map");
  await p.click("#who"); await snap("04-menu");
  await p.click("#mSkin"); await snap("05-skins");
  await p.click("#skinX");
  await p.click('.node[data-s="0"]'); await snap("06-sheet");
  await p.click("#shGo"); await p.waitForTimeout(200);
  await t.key("C"); await freeze(); await snap("07-play");
  await t.ev(() => { running = true; startStage(3, 0); q = build("a4_mulplus", 1); showQ(); t0 -= 3500; });
  await p.waitForTimeout(100); await freeze(); await snap("08-hint");
  await t.ev(() => startStage(0, 3)); await p.waitForTimeout(800); await freeze(); await snap("09-boss");
  await t.ev(() => { running = true; startStage(0, 0); }); await p.waitForTimeout(200);
  await t.clearAll(); await snap("10-result");
  await p.click("#toMap"); await p.click("#who"); await p.click("#mRec"); await snap("11-records");
  await p.click("#recBack");
  await t.ev(() => { for (let w = 0; w < 5; w++) for (let s = 0; s < 7; s++) myProg[sid(w, s)] = 3; saveSkin({ skin: "neon" }); goMap(); });
  await snap("12-neon-map");
  await t.ev(() => { mapW = 4; drawMap(); }); await snap("13-world5");
  await t.ev(() => { startStage(4, 0); q = build("a5_fminus", 1); showQ(); }); await freeze(); await snap("14-fraction");
  if (t.errors.length) throw new Error(t.errors.join("\n"));
  await t.close();
  console.log(`${fs.readdirSync(dir).length} 枚撮影 → ${dir}`);
}

function compare(a, b) {
  const names = fs.readdirSync(a).filter(f => f.endsWith(".png"));
  const diff = names.filter(n => !fs.existsSync(path.join(b, n)) || !fs.readFileSync(path.join(a, n)).equals(fs.readFileSync(path.join(b, n))));
  names.forEach(n => console.log(diff.includes(n) ? "❌ ちがう" : "✅ 同じ  ", n));
  console.log(diff.length ? `\n${diff.length} 枚の見た目が変わっています` : `\n${names.length} 枚すべて同じ見た目です`);
  process.exit(diff.length ? 1 : 0);
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === "shot" && a) shot(path.resolve(a)).catch(e => { console.error(e); process.exit(1); });
else if (cmd === "compare" && a && b) compare(path.resolve(a), path.resolve(b));
else console.log("使い方: node tests/visual.js shot <フォルダ> ／ node tests/visual.js compare <フォルダA> <フォルダB>");
