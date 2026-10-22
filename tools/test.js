// node tools/test.js — 生成ロジックの検証（AIなし・決定的の確認）
global.window = {};
require('../assets/js/data.js');
require('../assets/js/db.js');
window.HP = window.HP_DB.build(window.HP_DATA);
require('../assets/js/generate.js');
const gen = window.HP_GEN;

let fails = 0;
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); fails++; } }

// 1) 全組み合わせで空プロンプト/undefined がないか
const genres = ['action','puzzle','match','omakase'];
const gthemes = ['pop','pixel'];
const itastes = ['gekiga','pop','photo'];
for(const g of genres) for(const gt of gthemes) for(const it of itastes){
  const sel = { title:'テスト', story:'テスト用エピソードです。', author:'', pack:'HP00', genre:g, gtheme:gt, it:it };
  const gp = gen.buildGamePrompt(sel, 42);
  const ip = gen.buildIllustPrompt(sel, 42);
  assert(gp.text.length > 800, 'game prompt too short: ' + g + '/' + gt + '/' + it + ' len=' + gp.text.length);
  assert(ip.text.length > 500, 'illust prompt too short: ' + g + '/' + gt + '/' + it + ' len=' + ip.text.length);
  assert(gp.text.indexOf('undefined') < 0, 'undefined in game prompt ' + g + '/' + gt + '/' + it);
  assert(ip.text.indexOf('undefined') < 0, 'undefined in illust prompt ' + g + '/' + gt + '/' + it);
}

// 2) 必須セクション
const sel = { title:'牛乳を全部こぼされた朝', story:'洗濯から戻ったら、リビングで牛乳パックを握りつぶしていた。', author:'3歳児パパ', pack:'HP01', genre:'action', gtheme:'pop', it:'pop' };
const gp = gen.buildGamePrompt(sel, 1);
['# 目的','# 投稿ハプニング（テーマ）','# ゲームジャンルとゲームデザイン','# ビジュアル＆UI要件','# サウンド要件','# 出力形式'].forEach(s=>{
  assert(gp.text.indexOf(s) >= 0, 'game section missing: ' + s);
});
const ip = gen.buildIllustPrompt(sel, 1);
['# 目的','# 投稿ハプニング（テーマ）','# イラストテイスト','# 構図要件','# 注意事項','# 出力形式'].forEach(s=>{
  assert(ip.text.indexOf(s) >= 0, 'illust section missing: ' + s);
});

// 3) キーワード自動判定
[['牛乳こぼし','HP01'],['トイレ','HP02'],['離乳食','HP03'],['お昼寝','HP04'],['クレヨン','HP05'],['お風呂','HP06'],['スマホ','HP07'],['xyz','HP00']].forEach(pair=>{
  assert(gen.detectHappening(pair[0]) === pair[1], 'detect "' + pair[0] + '" → ' + gen.detectHappening(pair[0]) + ' (want ' + pair[1] + ')');
});

// 4) シードでバリエーションが変わる（おまかせ時）
const om = { title:'テスト', story:'エピソード。', author:'', pack:'HP00', genre:'omakase', gtheme:'pop', it:'pop' };
const texts = new Set();
for(let s=1; s<=12; s++){ texts.add(gen.buildGamePrompt(om, s).text); }
assert(texts.size > 1, 'omakase variants do not change with seed');
// 同一シードなら同一（決定的）
assert(gen.buildGamePrompt(sel, 7).text === gen.buildGamePrompt(sel, 7).text, 'same seed must produce same prompt');

// 5) サンプル列の確認
window.HP.HAPPI.forEach(h=>{ assert(!!h.sample && !!h.sampleTitle, 'sample missing: ' + h.id); });

if(fails){ console.error(fails + ' failures'); process.exit(1); }
console.log('ALL OK');
// サンプル出力を書き出す（配布確認用）
const fs = require('fs');
fs.writeFileSync(__dirname + '/../sample_ゲーム生成プロンプト.md', gp.text + '\n');
fs.writeFileSync(__dirname + '/../sample_イラスト生成プロンプト.md', ip.text + '\n');
console.log('sample prompts written');
