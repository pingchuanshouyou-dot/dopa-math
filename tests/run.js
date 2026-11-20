// テストをまとめて動かす。node tests/run.js [ファイル名の一部]
// e2e のテストは「端末に保存」と「ニセFirebase」の両方のモードで、1つずつ新しいブラウザで動かす
const fs = require("fs");
const path = require("path");
const { open } = require("./helpers");

const only = process.argv[2] || "";
const files = ["engine.test.js", "plus.test.js", ...fs.readdirSync(path.join(__dirname, "e2e")).filter(f => f.endsWith(".test.js")).map(f => "e2e/" + f)]
  .filter(f => f.includes(only));

(async () => {
  let pass = 0, fail = 0;
  for (const f of files) {
    // path: どのアプリを開くか（ドパマス＋のテストは "plus/"）
    // init: ページの読み込み前に入れるスクリプト（例：ニセの Capacitor）
    const { tests, modes = ["local", "firebase"], path = "", init } = require("./" + f);
    for (const mode of modes) for (const { name, fn } of tests) {
      const t = await open(mode, { path, init });
      const label = `${f} [${mode}] ${name}`;
      try {
        await fn(t);
        if (t.errors.length) throw new Error("ページでエラー: " + t.errors.join(" / "));
        pass++; console.log("✅", label);
      } catch (e) {
        fail++; console.log("❌", label, "\n   ", e.message.split("\n").slice(0, 4).join("\n    "));
      } finally { await t.close(); }
    }
  }
  console.log(`\n${pass} 件成功 / ${fail} 件失敗`);
  process.exit(fail ? 1 : 0);
})();
