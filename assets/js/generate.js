/* =========================================================
   HAP//GEN — 生成ロジック（AIなし・決定的）
   パターンDB（window.HP.*）の組み合わせから、
   「ゲーム生成プロンプト」「イラスト生成プロンプト」を組み立てる。
   実際の生成はユーザーの生成AIサービスに依存（APIは呼ばない）。
   ========================================================= */
window.HP_GEN = (function(){
'use strict';

/* ---------- シード付き乱数（mulberry32） ---------- */
function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickN(rng, arr, n){
  const a = (arr||[]).slice(); const out = [];
  while(out.length < n && a.length){ out.push(a.splice(Math.floor(rng()*a.length),1)[0]); }
  return out;
}

function hpById(id){ return (window.HP.HAPPI||[]).find(x=>x.id===id); }
function genreById(id){ return (window.HP.GENRES||[]).find(x=>x.id===id); }
function tasteById(id){ return (window.HP.TASTES||[]).find(x=>x.id===id); }
function illustById(id){ return (window.HP.ILLUST||[]).find(x=>x.id===id); }
function variantsOf(gid){ return (window.HP.VARIANTS||[]).filter(v=>v.genre_id===gid); }

/* 本文キーワード → ハプニング種別の自動判定 */
function detectHappening(text){
  const t = String(text||'');
  for(const h of (window.HP.HAPPI||[])){
    if(h.id==='HP00') continue;
    if(h.kw.some(k=>t.indexOf(k)>=0)) return h.id;
  }
  return 'HP00';
}

/* ---------- 抽選（ジャンル/バリエーション/ツイスト/オノマトペ） ---------- */
function roll(sel, seed){
  const rng = mulberry32(seed);
  const cfg = window.HP.CFG || {};
  const hp = hpById(sel.pack) || hpById('HP00') || (window.HP.HAPPI||[])[0];

  let genre;
  if(sel.genre === 'omakase'){
    const gs = window.HP.GENRES || [];
    genre = gs[Math.floor(rng()*gs.length)] || gs[0];
  }else{
    genre = genreById(sel.genre) || (window.HP.GENRES||[])[0];
  }
  const vs = variantsOf(genre.id);
  const variant = vs.length ? vs[Math.floor(rng()*vs.length)] : null;
  const twists = pickN(rng, window.HP.TWISTS, 1 + (rng()<0.4 ? 1 : 0));
  const onoGame = pickN(rng, hp.ono, Math.min(3, (hp.ono||[]).length));
  return { hp, genre, variant, twists, onoGame, onoIllust: onoGame[0]||'', cfg };
}

function bl(label, text){ return '- ' + label + '：' + text; }

/* ---------- ゲーム生成プロンプト ---------- */
function buildGamePrompt(sel, seed){
  const r = roll(sel, seed);
  const cfg = r.cfg;
  const min = cfg.game_min_sec || '30', max = cfg.game_max_sec || '90';
  const L = [];
  L.push('# 目的');
  L.push('「' + (cfg.event_name||'笑える子育てハプニングミュージアム') + '」（' + (cfg.venue||'') + '・12月イベント）に展示・実装可能な、' + min + '秒〜' + max + '秒で遊べる直感的でユーモラスなWebミニゲームを、単一のHTMLファイルとして作成してください。');
  L.push('ゲームは区民から投稿された子育てハプニングを題材に、コミカルに表現します。子育てを笑いに変える「あるある」の共感がテーマです。');
  L.push('');
  L.push('# 投稿ハプニング（テーマ）');
  L.push(bl('タイトル', sel.title));
  L.push(bl('エピソード', sel.story));
  L.push(bl('投稿者', sel.author || '区民投稿'));
  L.push(bl('ハプニング種別', r.hp.label + '（' + r.hp.id + '）'));
  L.push(bl('ゲーム化のヒント', r.hp.gameHook));
  L.push(bl('舞台の描写', r.hp.scene));
  L.push(bl('フキダシ用オノマトペ候補', r.onoGame.join(' / ')));
  L.push(bl('ゲーム内アイテム候補（よいもの）', r.hp.good.join(' ')));
  L.push(bl('障害物候補（悪いもの）', r.hp.bad.join(' ')));
  L.push('');
  L.push('# ゲームジャンルとゲームデザイン');
  L.push(bl('ジャンル', r.genre.name + ' — ' + r.genre.goal));
  if(r.variant) L.push(bl('実装パターン', r.variant.name + ' — ' + r.variant.desc));
  if(r.twists.length) L.push(bl('ツイスト（ひとひねり）', r.twists.map(t=>t.text).join(' ／ ')));
  L.push(bl('操作体系（PC）', r.genre.controlsPC));
  L.push(bl('操作体系（スマホ）', r.genre.controlsSP));
  L.push(bl('ゲームサイクル', 'タイトル画面（操作説明含む）→ メインゲーム → リザルト画面（スコア・ランク判定・再挑戦ボタン）。'));
  L.push(bl('ループ', r.genre.loop));
  L.push(bl('スコア', r.genre.score));
  L.push(bl('成功条件', r.genre.win));
  L.push(bl('失敗条件', r.genre.lose));
  L.push(bl('プレイ時間', r.genre.duration + '秒（' + min + '〜' + max + '秒の範囲で設計）'));
  L.push(bl('トーン＆マナー', '子育てを否定・バカにせず、当事者も笑える「共感のある笑い」。不快・危険な表現は避ける。'));
  L.push('');
  const t = tasteById(sel.gt) || (window.HP.TASTES||[])[0];
  L.push('# ビジュアル＆UI要件（テイスト：' + t.name + '）');
  L.push('1. スタイル：' + t.style);
  L.push('2. 配色：' + t.palette);
  L.push('3. フォント：' + t.font);
  L.push('4. 背景：' + t.bg);
  L.push('5. 画面ジュース（エフェクト）：' + t.effect);
  L.push('');
  L.push('# サウンド要件（Web Audio APIのみで完結、外部アセット不要）');
  L.push('1. ループBGM（必須実装）：' + t.bgm);
  L.push('2. 効果音（SE）：' + t.se);
  L.push('');
  L.push('# 出力形式');
  L.push('- 外部画像や外部音声ファイルのリンクに依存せず、アイコンや図形はCanvas APIまたはSVG、CSSで完全描画すること。');
  L.push('- <!DOCTYPE html> から </html> まで、そのままブラウザで開けば動作する完全なコードとして出力すること。');
  L.push('- 縦持ちスマートフォン画面を前提とし、PC（キーボード矢印/WASD、マウスドラッグ/クリック）およびスマートフォン（画面内タッチボタン、スワイプ/ドラッグ）の両方で破綻なく操作できるレスポンシブ設計にすること。');
  return { text: L.join('\n'), roll: r };
}

/* ---------- イラスト生成プロンプト（展示パネル用1コマ） ---------- */
function buildIllustPrompt(sel, seed){
  const r = roll(sel, seed);
  const cfg = r.cfg;
  const t = illustById(sel.it) || (window.HP.ILLUST||[])[0];
  const L = [];
  L.push('# 目的');
  L.push('「' + (cfg.event_name||'笑える子育てハプニングミュージアム') + '」（' + (cfg.venue||'') + '）の展示パネル用 1コマイラストを作成してください。テーマは次の子育てハプニングです。');
  L.push('');
  L.push('# 投稿ハプニング（テーマ）');
  L.push(bl('タイトル', sel.title));
  L.push(bl('エピソード', sel.story));
  L.push(bl('投稿者', sel.author || '区民投稿'));
  L.push(bl('ハプニング種別', r.hp.label + '（' + r.hp.id + '）'));
  L.push(bl('1コマの構図ヒント', r.hp.illustIdea));
  L.push(bl('舞台の描写', r.hp.scene));
  L.push(bl('フキダシ用オノマトペ候補', r.onoIllust));
  L.push('');
  L.push('# イラストテイスト（' + t.name + '）');
  L.push('1. スタイル：' + t.style);
  L.push('2. 配色：' + t.palette);
  L.push('3. 質感：' + t.texture);
  L.push('');
  L.push('# 構図要件');
  L.push('- 縦長1コマ（比率' + (cfg.illust_ratio||'4:5') + '・目安' + (cfg.illust_size||'1080x1350') + 'px）。パネル印刷（' + (cfg.panel_print||'A4縦') + '想定）に耐える解像度。');
  L.push('- ' + t.composition);
  L.push('- 上部にタイトル帯：ハプニングタイトル（' + sel.title + '）を太字で。');
  L.push('- フキダシ1個にオノマトペ（例：' + r.onoIllust + '）。');
  L.push('- 下部に帯：エピソード本文（20字以内×7行程度に折り返し）＋「投稿：' + (sel.author||'区民投稿') + '」＋イベント名（' + (cfg.event_name||'') + '）。');
  L.push('- 文字は最小限（タイトルとオノマトペのみ）。日本語文字が破綻しやすい場合は文字なしで出力し、あとからパネルに文字を重ねる前提でもよい。');
  L.push('');
  L.push('# 注意事項');
  L.push('- ' + t.ng);
  L.push('- 子育てを否定する表現ではなく、当事者も笑える共感のある描写にする。');
  L.push('');
  L.push('# 出力形式');
  L.push('- 縦長比率' + (cfg.illust_ratio||'4:5') + '。高解像度。背景透過なし。');
  return { text: L.join('\n'), roll: r };
}

/* ---------- UI用サマリー ---------- */
function summary(sel, r){
  const t = tasteById(sel.gt); const it = illustById(sel.it);
  return {
    hp: r.hp.label + '（' + r.hp.id + '）',
    genre: r.genre.name,
    variant: r.variant ? (r.variant.name + ' — ' + r.variant.desc) : '—',
    twists: r.twists.map(x=>x.text),
    gtheme: t ? t.name : '',
    itaste: it ? it.name : ''
  };
}

return { detectHappening, roll, buildGamePrompt, buildIllustPrompt, summary };
})();
