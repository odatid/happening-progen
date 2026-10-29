/* =========================================================
   HAP//GEN — tools/build_data.js
   csv/*.csv（正） から assets/js/data.js（同梱予備）を自動生成する。
   使い方: node tools/build_data.js
   ========================================================= */
const fs = require('fs');
const path = require('path');

const SHEETS = ['設定','マスタ_ハプニング','パターン_ジャンル','バリエーション','アーケード型','ゲームテンプレート','操作キャラ','ツイスト','コメディ','ゲーム内仕掛け','江戸川区ローカル','パターン_テイスト','パターン_イラスト'];
const csvDir = path.join(__dirname, '..', 'csv');
const outFile = path.join(__dirname, '..', 'assets', 'js', 'data.js');

let out = '/* 自動生成ファイル: node tools/build_data.js で csv/*.csv から出力。\n   直接編集しない。編集は csv/*.csv を行い、再実行する。 */\nwindow.HP_DATA = {};\n';

for(const s of SHEETS){
  const f = path.join(csvDir, s + '.csv');
  if(!fs.existsSync(f)){ console.error('CSVがありません: ' + f); process.exit(1); }
  const t = fs.readFileSync(f, 'utf8');
  out += 'window.HP_DATA[' + JSON.stringify(s) + '] = ' + JSON.stringify(t) + ';\n';
}
fs.writeFileSync(outFile, out);
console.log('data.js を出力しました (' + (fs.statSync(outFile).size/1024).toFixed(1) + 'KB)');
