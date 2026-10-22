/**
 * HAP//GEN — tools/sheet_export.gs
 * Google スプレッドシート（happening_db.xlsx をインポートしたもの）を
 * 公開CSVとして Google ドライブに書き出す。csv/ フォルダの更新用。
 *
 * 使い方:
 *  1. happening_db.xlsx を Google スプレッドシートとして開く
 *  2. 拡張機能 → Apps Script でこのコードを貼る
 *  3. exportAll() を実行 → ドライブの HAPGEN_CSV フォルダに CSV ができる
 *  4. 各CSVを「リンクを知っている全員」に公開し、URLを config.js の CSV_BASE か
 *     csv/ フォルダに反映する
 */

var SHEETS = [
  '設定','マスタ_ハプニング','パターン_ジャンル','バリエーション','ツイスト','パターン_テイスト','パターン_イラスト'
];
var FOLDER_NAME = 'HAPGEN_CSV';

function exportAll(){
  var folder = getFolder();
  SHEETS.forEach(function(name){
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(name);
    if(!sheet){ Logger.log('シートがありません: ' + name); return; }
    var csv = toCsv(sheet.getDataRange().getValues());
    var file = folder.getFilesByName(name + '.csv');
    if(file.hasNext()){ file.next().setContent(csv); }
    else { folder.createFile(name + '.csv', csv, 'text/csv'); }
    Logger.log('exported: ' + name);
  });
}

function getFolder(){
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function toCsv(values){
  return values.map(function(row){
    return row.map(function(cell){
      var s = String(cell == null ? '' : cell);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\r\n');
}
