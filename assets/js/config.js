/* =========================================================
   HAP//GEN — DB接続設定
   GitHub Pages に上げる前に、ここだけ書き換える。
   ========================================================= */
window.HP_CONFIG = {
  /* 'csv'   : 公開したスプレッドシートのCSV / 同じリポジトリの csv/ を読む（GitHub Pages だけで完結）
     'api'   : Google Apps Script の Web App から JSON を受け取る（非公開シートも可）
     'local' : 同梱の data.js を使う（オフライン・予備） */
  MODE: 'csv',

  /* MODE='api' のとき：Apps Script をデプロイして出た URL を貼る
     例）https://script.google.com/macros/s/AKfycb..../exec */
  API_URL: '',

  /* MODE='csv' のとき：公開CSVの置き場所（末尾スラッシュあり）
     tools/sheet_export.gs の exportCsv() で Google ドライブに書き出した公開URL、
     または同じリポジトリに置いた csv/ フォルダ */
  CSV_BASE: 'csv/',

  /* 起動時にDBが読めなかったとき、同梱の data.js で動かす（イベント当日を止めない） */
  FALLBACK: true,

  /* 読み込みログをコンソールに出す */
  DEBUG: true
};
