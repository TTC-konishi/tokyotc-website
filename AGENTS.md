# TTC Website Agent Rules

このリポジトリで Codex / Claude Code / その他のエージェントが作業するときの共通ルールです。作業前に必ずこのファイルを読み、ここに書かれたローカル正本を基準にしてください。

## 1. ローカル正本

- 本番公開用リポジトリの正本は `/Users/hkonishi/Projects/tokyotc-website` です。
- GitHub remote は `git@github.com:TTC-website/tokyotc-website.git` です。
- Netlify は `main` ブランチへの push をトリガーに `npm run build` を実行し、`dist` を公開します。
- `/Users/hkonishi/Documents/New project/ttc-retro-ab` は制作・検証用の素材置き場として参照することがありますが、本番へ push する正本ではありません。

## 2. 体験メニューの配置

- 体験メニュートップ: `public/experience/index.html`
- アマネム個別: `public/experience/amanemu/index.html`
- Dialog in the Dark 外苑前: `public/experience/dialog-in-the-dark-gaien/index.html`
- Dialog in the Dark 竹芝: `public/experience/dialog-in-the-dark-takeshiba/index.html`
- ロードバイク: `public/experience/road-bike/index.html`
- 東京都現代美術館と100本のスプーン: `public/experience/mot-family-day/index.html`

各個別ページの画像は、原則としてそのページ配下の `assets/` に置きます。体験メニュートップで使う共通画像は `public/experience/assets/` に置きます。

## 3. 現在の体験メニュー方針

体験メニューの思想は、旧方針の「見抜く / 組み替える / 渡す」から、一般読者向けの「気づく / 変える / つなぐ」に移行しています。

- 世界観: 扉ではなく、種。
- トーン: 教える、導く、評価するではなく、共有する、気づく、育つ、つながる。
- 避ける表現: 説教、正解の提示、上から目線、「すべき」。
- 残したい印象: 「教えられた」ではなく、「なんだか少しやってみたくなった」。

## 4. 共同作業時の競合防止

- CodexとClaude Codeに同じ編集作業を同時に頼まないでください。片方が作業中のとき、もう片方はレビュー・相談だけにします。
- 作業前に `git status --short --branch` を確認し、未コミット変更と未pushコミットを把握します。
- 自分が触っていない変更を戻さないでください。
- 別エージェントの作業内容が不明な場合は、まず対象ファイルを読み、差分を確認してから編集します。
- 本番へ反映する前に `npm run build` を実行してください。

## 5. 作業手順

1. `pwd` で `/Users/hkonishi/Projects/tokyotc-website` にいることを確認する。
2. `git status --short --branch` で未コミット変更を確認する。
3. 対象ファイルと画像の配置を確認する。
4. HTML / CSS / 画像を編集する。
5. `npm run build` を実行する。
6. 必要に応じて `npm run preview` で確認する。
7. 変更内容をコミットし、`main` を `origin` に push する。

