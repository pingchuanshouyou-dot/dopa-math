# Git運用ルール

機能ごとに「何を・なぜ変えたか」を記録に残すためのルールです。
GitHub Flow をベースに、公開用の `main` と開発用の `develop` を分けた形にしています。

## ブランチ

| ブランチ | 役割 | ルール |
|---|---|---|
| `main` | 公開中のアプリ（GitHub Pagesがこのブランチを配信） | 直接commitしない。`develop` からのプルリクエスト（PR）だけで更新する |
| `develop` | 次に公開する版に向けて機能を集める | 直接commitしない。作業ブランチからのPRで取り込む |
| `feature/<内容>` | 機能1つ分の作業 | `develop` から作り、取り込んだら消す |
| `fix/<内容>` | バグ1つ分の修正 | `develop` から作り、取り込んだら消す |
| `hotfix/<内容>` | 公開中のアプリの急ぎの修正 | `main` から作り、`main` と `develop` の両方に取り込む |

ブランチ名は半角英小文字とハイフンで、内容がわかる名前にします。

```
feature/boss-speech
feature/skin-theme
fix/timer-after-quit
hotfix/login-error
```

## 1つの機能を作る流れ

1. `develop` を最新にしてから、作業ブランチを作る
   ```
   git switch develop
   git pull
   git switch -c feature/boss-speech
   ```
2. 作業してcommitする（commitは細かくてOK）
3. 作業ブランチをpushして、`develop` に向けてPRを出す
4. PRの説明に「変更内容・理由・テスト結果・スクリーンショット」を書く（テンプレートが自動で入ります）
5. **Squash and merge** で `develop` に取り込む
   - `develop` の履歴が「1機能 = 1commit」の一覧になり、あとから見返しやすくなります
   - 途中のcommitや細かい経緯は、PRのページに残ります
6. 取り込んだ作業ブランチは消す

## 公開する流れ

1. `develop` で、`index.html` の中の `?v=` の番号（CSS・JSの読み込み10か所）を新しいバージョンに置きかえる
   - スマホに古いファイルが残って、新旧が混ざるのを防ぐため
2. Claudeのプレビューページで、作業中の版を本物のスマホで確かめる（README の「スマホで確認する」）
3. `develop` から `main` に向けてPRを出す（タイトル例: `release: v1.3.0`）
4. **Create a merge commit**（普通のマージ）で `main` に取り込む
5. `main` にバージョンのタグを付け、GitHubの「Releases」にその回の変更一覧を書く
6. GitHub Pagesが自動で新しい版を公開する（反映まで1〜2分）。公開ページをスマホで開いて最終確認する

### 積み重ねたPR（スタック）の取り込み方

前のPRの上に次のPRを積んで出すことがあります（例：`#4` の取り込み先が `#3` のブランチ）。

1. いちばん下のPR（取り込み先が `develop` のもの）から順に取り込む
2. 取り込んだら、そのPRのページの「Delete branch」でブランチを消す。すると、上に積んでいたPRの取り込み先が自動で `develop` に切り替わる
3. 次のPRも同じように取り込む

積み重ねたPRは **Create a merge commit** で取り込むと、上のPRに余計な差分が出ずにきれいに進みます。

### バージョン番号

`v<大>.<中>.<小>` の形にします。

| 変更 | 上げる番号 | 例 |
|---|---|---|
| 遊び方が大きく変わる、前のデータが使えなくなる | 大 | v1.3.0 → v2.0.0 |
| 機能を追加した（`feat` を含む） | 中 | v1.3.0 → v1.4.0 |
| バグ修正だけ（`fix` だけ） | 小 | v1.3.0 → v1.3.1 |

## commitメッセージ

[Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/) の形で、説明は日本語で書きます。

```
<種類>(<場所>): <何をしたか>

<必要なら、なぜ変えたかなどの詳しい説明>
```

### 種類

| 種類 | 使うとき |
|---|---|
| `feat` | 機能を追加した |
| `fix` | バグを直した |
| `style` | 見た目だけを変えた（動きは同じ） |
| `refactor` | 動きは同じまま、コードを整理した |
| `perf` | 速く・軽くした |
| `test` | テストを追加・修正した |
| `docs` | READMEなどの説明書きを変えた |
| `chore` | その他の雑用（設定ファイルなど） |

### 場所（かっこの中）

どこを触ったかを書きます。迷ったら省略してOKです。

| 場所 | 対象 |
|---|---|
| `engine` | 問題の作り方・計算・ヒント・弱体化 |
| `keypad` | テンキーと入力判定 |
| `timer` | 制限時間 |
| `boss` | ボス戦 |
| `map` | ワールドマップ・ステージ選択 |
| `result` | 結果画面・認定証カード |
| `rank` | ランク・称号・XP |
| `skin` | 着せ替え |
| `auth` | 新規登録・ログイン |
| `record` | 記録・連続記録・保存 |
| `share` | LINEシェア |

### 例

```
feat(boss): ボスがしゃべる吹き出しを追加
fix(timer): ステージを抜けた後に次の問題へ進むタイマーが動くバグを修正
style(result): 認定証カードのステージ名を省略表示に
docs: READMEとgit運用ルールを追加
```

## GitHubの設定（おすすめ）

- Settings → Branches で、`main` と `develop` に「PRを通さないと更新できない」保護ルールを付ける
- Settings → General → Pull Requests で「Automatically delete head branches」をオンにする（取り込んだ作業ブランチが自動で消える）
