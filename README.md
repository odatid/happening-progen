# HAP//GEN — 子育てハプニング→ゲーム&イラスト 生成プロンプトツール

「笑える子育てハプニングミュージアム」（江戸川区メタバース区役所・12月イベント）で、
区民から投稿されたハプニングをミニゲーム＆展示パネル1コマにするための
**生成AI用プロンプト**を作る静的Webツール。

- 生成AIのAPIは**呼ばない**。ツールは「パターンDBの組み合わせ」からプロンプトを作るまで。
- 実際のゲーム/イラストの生成は、ユーザー各自の生成AIサービス（ChatGPT / Gemini / 画像生成AI など）で行う。
- 構造は **ピコ太郎版 PK//PROTO（PikoProgen）** と同じ系譜：パターンDB＋組み合わせ生成・プロンプト出力。

## つかいかた

1. ハプニングのタイトルとエピソードを入力（種別は本文から自動判定、手動変更も可）
2. ジャンル（アクション / パズル / 絵合わせ / おまかせ）、ゲームテイスト（アメコミPOP風 / 16ビットドット）、イラストテイスト（劇画調 / アメコミPOP調 / 実写風）を選択
3. 「生成する」→ **ゲーム生成プロンプト** と **イラスト生成プロンプト** が出る
4. コピー or `.md`ダウンロード → 生成AIに貼って生成

- **バリエーション**（実装パターン・ツイスト演出）はパターンDBからの抽選。「バリエーションを変える」で引き直せる（おまかせ時はジャンルも抽選）。
- **本文の反映**：入力したエピソードを解析し、場所・時間帯・登場人物・小物・出来事を抽出して「舞台・背景」「登場人物」「小物」「見どころ（引用）」としてプロンプトに反映。生成結果カードにも「本文から抽出」チップで見える化。場所の記載がないエピソードはDB既定＋フォールバック文言で補う。
- **SESSION チップ**でセッションリンクをコピー → 別の端末で同じ入力状態を再開できる。
- **サンプルを入れる**でDB内のお題サンプルをフォームに入れられる（デモ・説明会用）。入力画面のまま内容を確認でき、そのまま編集も可能。生成は「生成する」を押したときだけ行う。
- 入力はブラウザ内のみ（localStorage / URLハッシュ）。どこにも送信しない。

## ディレクトリ構成

```
happening-progen/
├── index.html              # シェル（ヘッダー/フォーム/出力）
├── assets/
│   ├── css/style.css       # コミック調デザイン
│   └── js/
│       ├── config.js       # DBモード設定（ここだけ書き換え）
│       ├── data.js         # 同梱パターンDB（build_data.js が自動生成・予備）
│       ├── db.js           # DBローダ（csv / api / local → window.HP.*）
│       ├── generate.js     # 生成ロジック（AIなし・決定的）
│       └── app.js          # UI結線（フォーム/コピー/ダウンロード/セッション）
├── csv/                    # パターンDB（正・スプレッドシートで編集可）
│   ├── 設定.csv
│   ├── マスタ_ハプニング.csv   # 種別ごとのキーワード/アイテム/構図ヒント/オノマトペ
│   ├── パターン_ジャンル.csv   # ジャンル別のゲームデザイン要件
│   ├── バリエーション.csv      # ジャンル別の実装パターン（抽選）
│   ├── ツイスト.csv           # ひとひねり演出（抽選）
│   ├── パターン_テイスト.csv   # ゲームテイスト別のビジュアル/サウンド要件
│   └── パターン_イラスト.csv   # イラストテイスト別のスタイル/構図要件
├── tools/
│   ├── build_data.js       # csv → data.js
│   ├── build_xlsx.py       # csv → happening_db.xlsx
│   ├── sheet_export.gs     # スプレッドシート → CSV書き出し
│   └── test.js             # 生成ロジックの検証（node tools/test.js）
├── build.js                # offline.html（1枚結合版）のビルド
└── offline.html            # 生成物（1ファイル配布・検証用）
```

## パターンDBの編集

- **正は `csv/*.csv`**（スプレッドシートでも開ける）。
- 編集後は必ず: `node tools/build_data.js`（同梱 data.js を更新）→ `python3 tools/build_xlsx.py`（xlsx更新）→ `node build.js`（offline.html更新）。
- スプレッドシート運用: `happening_db.xlsx` を Google スプレッドシートにインポート → `tools/sheet_export.gs` でCSV書き出し → `csv/` に反映。
- 行を足すだけで抽選候補が増える（バリエーション/ツイスト/ハプニング種別）。
- ハプニング種別（HP01〜HP19）のサンプルエピソードは、公開記事の実例（[ていねい通販](https://www.teinei.co.jp/column/typical-story-of-child-raising/)／[CHEER!days](https://cheerdays.fcoop.or.jp/childcare/d03yQ)／[HugKum](https://hugkum.sho.jp/144991)／[自己肯定感ラボ](https://ac-jikokoutei.com/labo/parenting/2033/)／[cozre](https://feature.cozre.jp/79617)）を元に、種別・キーワード・演出ヒントに整理したもの。

## GitHub Pages デプロイ

```bash
git init
git add .
git commit -m "HAP//GEN 初版"
git remote add origin https://github.com/<user>/happening-progen.git
git push -u origin main
```

1. GitHub のリポジトリ → **Settings → Pages** → Source: *Deploy from a branch* / *main* / *`(root)`*
2. `https://<user>.github.io/happening-progen/` を開く
3. 右上の DB チップが **CSV** になれば `csv/` 読み込みOK（`LOCAL(FALLBACK)` なら csv/ の配置・公開設定を確認）

## DBモード（assets/js/config.js）

| MODE | 読み込み先 | 用途 |
|------|-----------|------|
| `csv`（既定） | `csv/` フォルダ or 公開CSV URL | GitHub Pagesだけで完結 |
| `api` | Google Apps Script の Web App | 非公開シートで運用 |
| `local` | 同梱 `data.js` | オフライン・予備 |

読めなかったときは `FALLBACK: true` により同梱 data.js で動き続ける（イベント当日を止めない）。

## オフライン用1枚

```bash
node build.js   # → offline.html（CSS/JSを1ファイルに結合）
```

配布・検証はこの1枚だけでも動く（DBは同梱 data.js で起動）。

## チェック

デプロイ前は `CHECKLIST.md` を参照。生成ロジックの自動検証は `node tools/test.js`。

## クレジット

- 企画：笑える子育てハプニングミュージアム（仮）／東京情報デザイン専門職大学 大舘研究室
- 会場：江戸川区メタバース区役所（2026年12月上旬 開催予定）
- 構造の原型：ピコ太郎版 ゲーム企画具体化ツール（PK//PROTO / PikoProgen）
