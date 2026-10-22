// node tools/verify_arcade.js — アーケード基盤14種それぞれでプロンプトを生成し、
// 題材がエピソード内容に置き換わっているかを検証してレポートを出力する。
global.window = {};
require('../assets/js/data.js');
require('../assets/js/db.js');
window.HP = window.HP_DB.build(window.HP_DATA);
require('../assets/js/generate.js');
const gen = window.HP_GEN;
const fs = require('fs');
const path = require('path');

let fails = 0;
const assert = (c, m) => { if(!c){ console.error('FAIL:', m); fails++; } };

/* 検証用エピソード（お迎えバス）: 固有語がはっきりしている */
const EP = {
  title: '幼稚園のお迎えバス',
  story: '幼稚園のお迎えバスをママチャリで追いかけた。信号ごとに差が開いていく。曲がり角でようやく追いついたら、子どもは平然と「もう来ないかと思った」と言った。',
  author: '3歳児ママ', pack: 'HP08', genre: 'omakase', gtheme: 'pop', it: 'pop'
};
/* エピソード固有語（プロンプトに必ず入るはず） */
const EP_KEYS = ['幼稚園','ママチャリ','信号','曲がり角','お迎えバス','もう来ないかと思った'];
/* DBサンプル語（入ってはいけない） */
const LEAK_KEYS = ['テールランプ','尾灯','舞い上がる','猛烈にこぐ','バスのドアまでたどり着く'];

/* 全14基盤をシード走査でカバー */
const bases = window.HP.ARCADE.map(a=>a.name);
const found = {};
for(let seed=1; seed<=800 && found.length===undefined || Object.keys(found).length<bases.length; seed++){
  const p = gen.buildGamePrompt(EP, seed);
  const m = p.text.match(/基盤型「(.+?)」/);
  if(m && !found[m[1]]) found[m[1]] = { seed, roll: p.roll, text: p.text };
  if(seed>=800) break;
  if(Object.keys(found).length === bases.length) break;
}

let report = '# アーケード基盤14種 生成検証レポート\n\n';
report += '- 検証エピソード：『' + EP.title + '』（' + EP.story.slice(0,40) + '…）\n';
report += '- 検証日：2026-10-23\n';
report += '- 判定基準：①基盤型の指定行がある ②エピソード固有語6種がすべて反映 ③DBサンプル語が混入しない ④基盤×エピソードの融合指示がある\n\n';
report += '| # | 基盤型 | 専用テンプレート | 固有語反映 | サンプル語混入 | 判定 |\n|---|---|---|---|---|---|\n';

bases.forEach((name, i)=>{
  const f = found[name];
  assert(f, 'base not covered by seed scan: ' + name);
  if(!f){ report += '| ' + (i+1) + ' | ' + name + ' | — | — | — | ❌ 生成されず |\n'; return; }
  const t = f.text;
  const hasBase = t.indexOf('基盤型「' + name + '」') >= 0;
  const missing = EP_KEYS.filter(k=>t.indexOf(k) < 0);
  const leaked = LEAK_KEYS.filter(k=>t.indexOf(k) >= 0);
  const fusion = t.indexOf('基盤は「型」であって') >= 0;
  assert(hasBase, 'base line missing for ' + name);
  assert(missing.length === 0, name + ': episode keys missing: ' + missing.join(','));
  assert(leaked.length === 0, name + ': DB sample leaked: ' + leaked.join(','));
  assert(fusion, name + ': fusion instruction missing');
  const ok = hasBase && missing.length===0 && leaked.length===0 && fusion;
  report += '| ' + (i+1) + ' | ' + name + ' | ' + (f.roll.tpl ? f.roll.tpl.name : '—') + ' | ' + (missing.length===0 ? '6/6 ✓' : '欠け: '+missing.join('・')) + ' | ' + (leaked.length===0 ? 'なし ✓' : leaked.join('・')) + ' | ' + (ok ? '✅ 合格' : '❌') + ' |\n';
});

/* 融合の実例抽出（各基盤の「基盤型」行をレポート末尾に掲載） */
report += '\n## 各基盤の指定行（生成されたプロンプトから抜粋）\n\n';
bases.forEach(name=>{
  const f = found[name];
  if(!f) return;
  const line = f.text.split('\n').find(l=>l.indexOf('基盤型「'+name+'」')>=0);
  report += '- **' + name + '**（seed ' + f.seed + '）：' + line.replace(/^- /,'') + '\n';
});

report += '\n## 判定\n\n';
report += fails === 0
  ? '全14基盤で「①〜④」をすべて満たしました。題材はどの基盤でもエピソード内容に置き換わっています。\n'
  : '**' + fails + '件の失敗があります。上のログを確認してください。**\n';

fs.writeFileSync(path.join(__dirname,'..','検証_アーケード14種.md'), report);
console.log('covered bases:', Object.keys(found).length, '/', bases.length);
console.log(fails === 0 ? 'ARCADBE VERIFY ALL OK' : fails + ' failures');
process.exit(fails === 0 ? 0 : 1);
