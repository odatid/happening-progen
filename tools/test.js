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

// 5) 本文がプロンプトに反映されるか（最重要）
const reflectSel = { title:'えんぴつ風船', story:'スーパーのレジで待っている間に、妹がカーテンをぶち破って全裸で脱走を始めた。パパが撮影に夢中になり、家の犬が追いかけた。', author:'', pack:'HP00', genre:'puzzle', gtheme:'pixel', it:'gekiga' };
const rg = gen.buildGamePrompt(reflectSel, 3);
const ri = gen.buildIllustPrompt(reflectSel, 3);
['スーパー','妹','カーテン','全裸','パパ','犬','撮影','脱走'].forEach(k=>{
  assert(rg.text.indexOf(k) >= 0, 'game prompt does not reflect story keyword: ' + k);
  assert(ri.text.indexOf(k) >= 0, 'illust prompt does not reflect story keyword: ' + k);
});
assert(rg.text.indexOf('物語の反映') >= 0, 'story reflection section missing (game)');
assert(ri.text.indexOf('物語の反映') >= 0, 'story reflection section missing (illust)');
assert(rg.text.indexOf('見どころ（エピソード引用）') >= 0, 'highlight quote missing (game)');
// 時間帯の反映
const morningSel = { title:'朝の大惨事', story:'朝の出勤前に、リビングで牛乳を全部こぼされた。', author:'', pack:'HP01', genre:'action', gtheme:'pop', it:'pop' };
const rm = gen.buildGamePrompt(morningSel, 5);
assert(rm.text.indexOf('朝') >= 0, 'time-of-day not reflected');
assert(rm.text.indexOf('リビング') >= 0, 'place not reflected');
// 場所がないエピソードはDB既定＋フォールバック文言
const noneSel = { title:'あるある', story:'とにかく大変だった。', author:'', pack:'HP00', genre:'match', gtheme:'pop', it:'pop' };
const rn = gen.buildIllustPrompt(noneSel, 5);
assert(rn.text.indexOf('フォールバック') >= 0, 'fallback note missing when no place in story');

// 7) お迎えバス×ママチャリの例（種別判定と題材の一本化）
const busSel = { title:'幼稚園のお迎えバス', story:'幼稚園のお迎えバスをママチャリで追いかけた。信号ごとに差が開き、曲がり角でようやく追いついた。', author:'', pack:gen.detectHappening('幼稚園のお迎えバスをママチャリで追いかける'), genre:'action', gtheme:'pop', it:'pop' };
assert(busSel.pack === 'HP08', 'bus episode detected as ' + busSel.pack);
const bg = gen.buildGamePrompt(busSel, 9);
['ママチャリ','お迎え','バス','幼稚園','信号','曲がり角'].forEach(k=>{ assert(bg.text.indexOf(k) >= 0, 'bus prompt missing: ' + k); });
['おもちゃ箱','玩具の海','玩具箱','米びつ'].forEach(k=>{ assert(bg.text.indexOf(k) < 0, 'bus prompt must not use DB example: ' + k); });
assert(bg.text.indexOf('題材は上のエピソード') >= 0, 'episode-first statement missing');

// 8) 新DB種別（ネット実例ベース）の判定
[['静かだと思ったら米びつ','HP09'],['レジで大泣き','HP11'],['げっきょくさんと言い間違い','HP12'],['添い寝で寝返り','HP04'],['お風呂で泡だらけ','HP06']].forEach(pair=>{
  assert(gen.detectHappening(pair[0]) === pair[1], 'detect "' + pair[0] + '" → ' + gen.detectHappening(pair[0]) + ' (want ' + pair[1] + ')');
});

// 6) サンプル列の確認
window.HP.HAPPI.forEach(h=>{ assert(!!h.sample && !!h.sampleTitle, 'sample missing: ' + h.id); });

if(fails){ console.error(fails + ' failures'); process.exit(1); }
console.log('ALL OK');
// サンプル出力を書き出す（配布確認用）
const fs = require('fs');
fs.writeFileSync(__dirname + '/../sample_ゲーム生成プロンプト.md', gp.text + '\n');
fs.writeFileSync(__dirname + '/../sample_イラスト生成プロンプト.md', ip.text + '\n');
console.log('sample prompts written');
