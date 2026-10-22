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
const ip2 = gen.buildIllustPrompt(sel, 1);
assert(gp.text.indexOf('今回の種になるハプニングエピソードはこちら。') === 0, 'game prompt must open with episode-first declaration');
assert(ip2.text.indexOf('今回の種になるハプニングエピソードはこちら。') === 0, 'illust prompt must open with episode-first declaration');
assert(gp.text.indexOf('こちらを表現するユニークなゲームを生成する。') >= 0, 'unique-game declaration missing (game)');
assert(ip2.text.indexOf('こちらを表現する1コマイラストを生成する。') >= 0, 'unique-illust declaration missing (illust)');
['牛乳を全部こぼされた朝','3歳児パパ'].forEach(k=>{ assert(gp.text.indexOf(k) >= 0 && ip2.text.indexOf(k) >= 0, 'episode block missing at top: ' + k); });
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
assert(rn.text.indexOf('エピソード本文から読み取') >= 0, 'story-first fallback missing when no place in story');
assert(rn.text.indexOf('玩具の海') < 0, 'DB sample scene leaked into illust prompt for thin story');
const gn = gen.buildGamePrompt(noneSel, 5);
assert(gn.text.indexOf('玩具の海') < 0, 'DB sample scene leaked into game prompt for thin story');

// 7) お迎えバス×ママチャリの例（種別判定と題材の一本化）
const busSel = { title:'幼稚園のお迎えバス', story:'幼稚園のお迎えバスをママチャリで追いかけた。信号ごとに差が開き、曲がり角でようやく追いついた。', author:'', pack:gen.detectHappening('幼稚園のお迎えバスをママチャリで追いかける'), genre:'action', gtheme:'pop', it:'pop' };
assert(busSel.pack === 'HP08', 'bus episode detected as ' + busSel.pack);
const bg = gen.buildGamePrompt(busSel, 9);
const bi = gen.buildIllustPrompt(busSel, 9);
['ママチャリ','お迎え','バス','幼稚園','信号','曲がり角'].forEach(k=>{ assert(bg.text.indexOf(k) >= 0, 'bus prompt missing: ' + k); });
['おもちゃ箱','玩具の海','玩具箱','米びつ'].forEach(k=>{ assert(bg.text.indexOf(k) < 0, 'bus prompt must not use DB example: ' + k); });
// DBサンプルエピソード由来のシチュエーションが漏れないこと（入力に無い語）
['テールランプ','尾灯','舞い上がる','猛烈にこぐ','バスのドア','ドアまで'].forEach(k=>{
  assert(bg.text.indexOf(k) < 0, 'game prompt leaks DB sample situation: ' + k);
  assert(bi.text.indexOf(k) < 0, 'illust prompt leaks DB sample situation: ' + k);
});
assert(bg.text.indexOf('構図ヒント') < 0, 'DB illust idea still in game prompt');
assert(bi.text.indexOf('構図ヒント') < 0, 'DB illust idea still in illust prompt');
assert(bg.text.indexOf('題材は上のエピソード') >= 0, 'episode-first statement missing');

// 8) 新DB種別（ネット実例ベース）の判定
[['静かだと思ったら米びつ','HP09'],['レジで大泣き','HP11'],['げっきょくさんと言い間違い','HP12'],['添い寝で寝返り','HP04'],['お風呂で泡だらけ','HP06']].forEach(pair=>{
  assert(gen.detectHappening(pair[0]) === pair[1], 'detect "' + pair[0] + '" → ' + gen.detectHappening(pair[0]) + ' (want ' + pair[1] + ')');
});

// 9) 笑い設計（無邪気ハプニングのコミカル表現）
assert(gp.text.indexOf('# 笑い設計') >= 0, 'comedy design section missing (game)');
assert(gp.text.indexOf('悪意のない無邪気な事象') >= 0, 'innocence rule missing (game)');
assert(gp.text.indexOf('罰する演出もしない') >= 0, 'no-punishment rule missing (game)');
assert(ip.text.indexOf('悪意のない無邪気な事象') >= 0, 'innocence rule missing (illust)');
assert(gp.text.indexOf('笑いの演出パターン') >= 0, 'comedy pattern list missing (game)');
// 子ども無邪気顔の必須要件
assert(gp.text.indexOf('【必須】子どもの無邪気な顔をゲーム画面に表示') >= 0, 'child innocent face requirement missing (game)');
assert(gp.text.indexOf('きょとん') >= 0 && gp.text.indexOf('ドヤ顔') >= 0, 'expression mapping missing (game)');
assert(ip.text.indexOf('【必須】子どもの無邪気な顔を1コマの中心') >= 0, 'child innocent face requirement missing (illust)');
assert(gp.text.indexOf('親だけが必死') >= 0, 'contrast rule missing (game)');
// 単独プレイ必須（交互・同時プレイ禁止）
assert(gp.text.indexOf('【必須】プレイヤーは1人') >= 0, 'single-player requirement missing');
assert(gp.text.indexOf('交互プレイ・協力プレイ・2人同時操作') >= 0, 'no-alternating-play rule missing');
// バリエーション拡充（仕掛けセクション・組み合わせ数）
assert(gp.text.indexOf('# ゲーム内仕掛け') >= 0, 'gimmicks section missing');
assert(gp.roll.gimmicks.length >= 1, 'no gimmick picked');
assert(gp.roll.twists.length >= 2, 'twists should pick 2-3');
assert(gp.roll.comedy.length >= 2, 'comedy should pick 2-3');
const combos = gen.comboCount ? gen.comboCount() : 0;
assert(combos > 1000000, 'combo count too small: ' + combos);
assert(gp.text.indexOf('undefined') < 0, 'undefined in bus prompt');

// 11) アーケード基盤必須
assert(gp.text.indexOf('# ゲーム基盤（アーケード型・必須）') >= 0, 'arcade base section missing');
assert(gp.roll.arcade && gp.roll.arcade.name, 'no arcade base picked');
assert(gp.text.indexOf('基盤型「') >= 0, 'arcade base line missing');
const arcSel = { title:'テスト', story:'テスト。', author:'', pack:'HP05', genre:'omakase', gtheme:'pop', it:'pop' };
const cg3 = gen.buildGamePrompt(arcSel, 21);
assert(cg3.text.indexOf('# ゲーム基盤（アーケード型・必須）') >= 0, 'arcade base missing for crayon');
assert(cg3.roll.arcade, 'no arcade for crayon');

// 12) 操作キャラクター（かわいいキャラ必須）
assert(gp.text.indexOf('# 操作キャラクター（最重要・かわいいキャラで作る）') >= 0, 'char section missing');
assert(gp.text.indexOf('【必須】プレイヤーが操作する対象は、上のかわいいキャラクター') >= 0, 'cute-char requirement missing');
assert(gp.text.indexOf('記号（●▲■）') >= 0, 'no-symbol rule missing');
assert(gp.roll.ch && gp.roll.ch.name, 'no char picked');
const mamaSel = { title:'朝の大バタバタ', story:'ママが朝の支度で走り回っていたら、子どもが牛乳をこぼした。', author:'', pack:'HP01', genre:'omakase', gtheme:'pop', it:'pop' };
const mp = gen.buildGamePrompt(mamaSel, 33);
assert(mp.roll.ch.id === 'CC01', 'mama story should prefer CC01 mama char, got ' + mp.roll.ch.id);
const bikeSel = { title:'幼稚園のお迎えバス', story:'ママチャリで園バスを追いかけた。', author:'', pack:'HP08', genre:'omakase', gtheme:'pop', it:'pop' };
const bp2 = gen.buildGamePrompt(bikeSel, 33);
assert(['CC01','CC06'].indexOf(bp2.roll.ch.id) >= 0, 'bike story should prefer mama or mamachari, got ' + bp2.roll.ch.id);
assert(bp2.text.indexOf('ママチャリ') >= 0, 'mamachari keyword missing from bike prompt');
// 追加キャラ（じいじばあば/三輪車/ハムスター）の本文連動
const giiSel = { title:'じいじの大活躍', story:'じいじとばあばがお迎えに来てくれた。', author:'', pack:'HP00', genre:'omakase', gtheme:'pop', it:'pop' };
const gp4 = gen.buildGamePrompt(giiSel, 33);
assert(gp4.roll.ch.id === 'CC09', 'grandparents story should prefer CC09, got ' + gp4.roll.ch.id);
assert(gp4.text.indexOf('じいじ') >= 0 && gp4.text.indexOf('ばあば') >= 0, 'grandparent keywords missing');
const triSel = { title:'三輪車の初出走', story:'三輪車で初めての公園デビュー。', author:'', pack:'HP00', genre:'omakase', gtheme:'pop', it:'pop' };
const tp2 = gen.buildGamePrompt(triSel, 33);
assert(tp2.roll.ch.id === 'CC10', 'tricycle story should prefer CC10, got ' + tp2.roll.ch.id);
const hamSel = { title:'ハムスター脱走事件', story:'ハムスターがケージから脱走して、部屋のすきまに入ってしまった。', author:'', pack:'HP00', genre:'omakase', gtheme:'pop', it:'pop' };
const hp2b = gen.buildGamePrompt(hamSel, 33);
assert(hp2b.roll.ch.id === 'CC11', 'hamster story should prefer CC11, got ' + hp2b.roll.ch.id);
assert(window.HP.CHARS.length === 11, 'char DB should have 11 entries, got ' + window.HP.CHARS.length);

// 10) 種別専用テンプレート（落書き→おもちゃの仕分け 問題の修正）
const allTpl = window.HP.TPL || [];
window.HP.HAPPI.forEach(h=>{
  const n = allTpl.filter(t=>t.hpId===h.id).length;
  assert(n >= 3, 'not enough templates for ' + h.id + ': ' + n);
});
const crayonSel = { title:'壁に家族の似顔絵美術館', story:'トイレに行って戻ると、白い壁にクレヨンで家族全員の似顔絵が完成していた。犬には首輪まで描かれていた。', author:'', pack:gen.detectHappening('白い壁にクレヨンで似顔絵を描かれた'), genre:'omakase', gtheme:'pop', it:'pop' };
assert(crayonSel.pack === 'HP05', 'crayon detected as ' + crayonSel.pack);
const cg2 = gen.buildGamePrompt(crayonSel, 21);
assert(cg2.text.indexOf('# ゲームコア設計') >= 0, 'core template section missing');
assert(cg2.roll.tpl && cg2.roll.tpl.hpId === 'HP05', 'crayon must use crayon-specific template, got ' + (cg2.roll.tpl && cg2.roll.tpl.hpId));
assert(cg2.text.indexOf('仕分け箱') < 0, 'generic toy-sort variant leaked into crayon prompt');
assert(cg2.text.indexOf('おもちゃの砦') < 0, 'HP17 toy-fort leaked into crayon prompt');
['壁','クレヨン','似顔絵'].forEach(k=>{ assert(cg2.text.indexOf(k) >= 0, 'crayon prompt missing story keyword: ' + k); });
// 全種別でテンプレが主軸になり、汎用バリアントが消えること
['HP01','HP05','HP08','HP12','HP19'].forEach(hp=>{
  const s2 = { title:'テスト', story:'テスト。', author:'', pack:hp, genre:'omakase', gtheme:'pop', it:'pop' };
  const p2 = gen.buildGamePrompt(s2, 5);
  assert(p2.text.indexOf('# ゲームコア設計') >= 0, 'core section missing for ' + hp);
  assert(p2.text.indexOf('仕分け箱') < 0, 'generic variant leaked for ' + hp);
});
const rg2 = gen.buildGamePrompt(reflectSel, 3);
const cg = gen.buildIllustPrompt(reflectSel, 3);
assert(rg2.text.indexOf('笑い設計') >= 0 && cg.text.indexOf('無邪気') >= 0, 'comedy sections missing for other input');

// 6) サンプル列の確認
window.HP.HAPPI.forEach(h=>{ assert(!!h.sample && !!h.sampleTitle, 'sample missing: ' + h.id); });

if(fails){ console.error(fails + ' failures'); process.exit(1); }
console.log('ALL OK');
// サンプル出力を書き出す（配布確認用）
const fs = require('fs');
fs.writeFileSync(__dirname + '/../sample_ゲーム生成プロンプト.md', gp.text + '\n');
fs.writeFileSync(__dirname + '/../sample_イラスト生成プロンプト.md', ip.text + '\n');
console.log('sample prompts written');
