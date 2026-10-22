# デプロイ前チェックリスト（HAP//GEN）

## ローカル

- [ ] `node tools/test.js` — 生成ロジック検証が ALL OK
- [ ] `node tools/build_data.js` — csv 変更後は必ず再実行（data.js 更新）
- [ ] `python3 tools/build_xlsx.py` — xlsx も更新
- [ ] `node build.js` — offline.html 再生成

## ブラウザ

- [ ] index.html を開く → 右上の DB チップ確認（**CSV** または **LOCAL(FALLBACK)**）
- [ ] 「サンプルを入れる」→ サンプルが入力情報として採用され、プロンプト2種が即表示される
- [ ] 「バリエーションを変える」→ 実装パターン / ツイストが変わる
- [ ] コピー / `.md`ダウンロード → 生成AIに貼って意図どおり生成されるか
- [ ] SESSION リンク → 別タブで同じ入力状態が復元される
- [ ] スマホ幅（375px など）でレイアウトが崩れない
- [ ] 印刷 / PDF保存 → 出力だけが印刷される

## GitHub Pages

- [ ] push 後、Settings → Pages → Source: main / (root)
- [ ] `https://<user>.github.io/<repo>/` で DB チップ = **CSV**
- [ ] スマホ実機で一連の操作を確認
- [ ] パターンDB更新手順（README「パターンDBの編集」）をチームで共有
