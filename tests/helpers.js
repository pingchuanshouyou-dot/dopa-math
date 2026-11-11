// テストの共通部品：リポジトリを小さなサーバーで配信して、スマホサイズのブラウザで開く
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const MOCK = path.join(__dirname, "e2e", "mock");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".png": "image/png" };

// GitHub Pages と同じように http で配信する（分割後の css/ js/ もそのまま読める）
function serve() {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = path.join(ROOT, p.endsWith("/") ? p + "index.html" : p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(0, "127.0.0.1", () => ok({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}

// mode: "local"（Firebase未設定＝端末に保存） / "firebase"（ニセFirebaseにつなぐ）
async function open(mode = "local", opts = {}) {
  const { server, url } = await serve();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, ...opts.context });
  if (mode === "firebase") {
    // 設定の apiKey を入れて Firebase モードにし、Firebase の読み込みをニセモノに差しかえる
    await ctx.route(/127\.0\.0\.1:\d+\/.*\.(html|js)(\?.*)?$|127\.0\.0\.1:\d+\/(\?.*)?$/, async r => {
      const res = await r.fetch();
      r.fulfill({ response: res, body: (await res.text()).replace('apiKey:""', 'apiKey:"test"') });
    });
    await ctx.route(/gstatic\.com\/firebasejs\/.*\/(firebase-[a-z]+)\.js/, r => {
      const m = r.request().url().match(/(firebase-[a-z]+)\.js/)[1];
      r.fulfill({ contentType: "application/javascript", body: fs.readFileSync(path.join(MOCK, m + ".js"), "utf8") });
    });
  }
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/auth\/|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on("dialog", d => d.accept());
  await page.goto(url);
  // 保存先の準備ができて、オープニングのボタンが出るまで待つ
  await page.waitForFunction(() => window.cloud && document.querySelector("#opLoad").hidden, null, { timeout: 5000 });

  const ev = (f, a) => page.evaluate(f, a);
  const key = k => page.click(`.key[data-k="${k}"]`);
  const t = {
    page, ev, key, errors, mode,
    // 正解を打つ。wait はステージが次へ進むのを待つ時間
    async solve(wait = 200) { const a = await ev(() => String(q.ans)); for (const ch of a) await key(ch); await page.waitForTimeout(wait); },
    // 1文字目からまちがえる
    async wrong() { const a = await ev(() => String(q.ans)); await key(a[0] === "-" ? "1" : "-"); },
    async register(name = "テスト", pw = "secret1") {
      await page.click("#goReg"); await page.fill("#aName", name); await page.fill("#aPw", pw); await page.click("#aGo");
      await page.waitForTimeout(400);
    },
    // ステージを最後まで正解で進める
    async clearAll() { while (await ev(() => running)) await t.solve(); await page.waitForTimeout(300); },
    visible: () => ev(() => [...document.querySelectorAll(".ov")].filter(o => !o.hidden).map(o => o.id).join(",")),
    async close() { await browser.close(); server.close(); }
  };
  return t;
}

module.exports = { open, serve, ROOT };
