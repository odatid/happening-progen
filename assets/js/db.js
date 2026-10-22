/* =========================================================
   HAP//GEN — パターンDB ローダ
   読み込み先：公開CSV(csv) / Apps Script(api) / 同梱(local)
   どのモードでも、最終的に window.HP.* の形へ変換して差し替える。
   ========================================================= */
window.HP = window.HP || {};
(function(){
'use strict';

const SHEETS = [
  '設定','マスタ_ハプニング','パターン_ジャンル','バリエーション','アーケード型','ゲームテンプレート','操作キャラ','ツイスト','コメディ','ゲーム内仕掛け','パターン_テイスト','パターン_イラスト'
];

/* ---------------- CSV ---------------- */
function parseCSV(text){
  const rows=[]; let row=[], cell='', q=false;
  text = String(text||'').replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){
      if(c==='"'){ if(text[i+1]==='"'){cell+='"';i++;} else q=false; }
      else cell+=c;
    }else{
      if(c==='"') q=true;
      else if(c===','){ row.push(cell); cell=''; }
      else if(c==='\n'){ row.push(cell); rows.push(row); row=[]; cell=''; }
      else if(c==='\r'){ /* skip */ }
      else cell+=c;
    }
  }
  if(cell!==''||row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r=>r.some(x=>String(x).trim()!==''));
}
function toObjects(rows){
  if(!rows.length) return [];
  const head = rows[0].map(h=>String(h).trim());
  return rows.slice(1).map(r=>{
    const o={};
    head.forEach((h,i)=>{ if(h) o[h]= r[i]===undefined?'':String(r[i]).trim(); });
    return o;
  });
}
const list = v=> String(v||'').split(/[,、\s]+/).map(s=>s.trim()).filter(Boolean);

/* ---------------- 変換（シート → window.HP.*） ---------------- */
function build(S){
  const g = n => toObjects(parseCSV(S[n]||''));
  const out = {};

  const cfg = {};
  g('設定').forEach(r=>{ cfg[r.key]=r.value; });
  out.CFG = cfg;

  out.HAPPI = g('マスタ_ハプニング').map(r=>({
    id:r.id, label:r.label, keywords:r.keywords,
    kw:list(r.keywords), sample:r.sample_episode, sampleTitle:r.sample_title,
    scene:r.scene_hook, good:list(r.good_items), bad:list(r.bad_items),
    player:r.player, playerLabel:r.player_label,
    gameHook:r.game_hook, ono:list(r.onomatopoe), illustIdea:r.illust_idea
  }));

  out.GENRES = g('パターン_ジャンル').filter(r=>r.id).map(r=>({
    id:r.id, name:r.name, goal:r.goal_text,
    controlsPC:r.controls_pc, controlsSP:r.controls_sp,
    loop:r.loop_text, score:r.score_text, win:r.win_text, lose:r.lose_text,
    duration:Number(r.duration_sec)||60
  }));

  out.VARIANTS = g('バリエーション').filter(r=>r.id);

  out.TWISTS = g('ツイスト').filter(r=>r.id);

  out.COMEDY = g('コメディ').filter(r=>r.id).map(r=>({
    id:r.id, name:r.name, game:r.game_text, illust:r.illust_text
  }));

  out.GIMMICKS = g('ゲーム内仕掛け').filter(r=>r.id);

  out.TPL = g('ゲームテンプレート').filter(r=>r.id).map(r=>({
    id:r.id, hpId:r.hp_id, name:r.name, core:r.core
  }));

  out.ARCADE = g('アーケード型').filter(r=>r.id);

  out.CHARS = g('操作キャラ').filter(r=>r.id).map(r=>({
    id:r.id, name:r.name, profile:r.profile, visual:r.visual_guide
  }));

  out.TASTES = g('パターン_テイスト').filter(r=>r.id).map(r=>({
    id:r.id, name:r.name, style:r.style_text, palette:r.palette_text,
    font:r.font_text, bg:r.bg_text, effect:r.effect_text, bgm:r.bgm_text, se:r.se_text
  }));

  out.ILLUST = g('パターン_イラスト').filter(r=>r.id).map(r=>({
    id:r.id, name:r.name, style:r.style_text, palette:r.palette_text,
    texture:r.texture_text, composition:r.composition_text, ng:r.ng_text
  }));

  return out;
}

/* ---------------- 読み込み ---------------- */
async function loadCSV(){
  const S={};
  for(const name of SHEETS){
    const res = await fetch(window.HP_CONFIG.CSV_BASE + encodeURIComponent(name) + '.csv');
    if(!res.ok) throw new Error('csv '+name+' '+res.status);
    S[name] = await res.text();
  }
  return S;
}
async function loadAPI(){
  const res = await fetch(window.HP_CONFIG.API_URL + '?t=' + Date.now());
  if(!res.ok) throw new Error('api '+res.status);
  const S = await res.json();
  for(const name of SHEETS){ if(typeof S[name]!=='string') throw new Error('api sheet missing: '+name); }
  return S;
}
function loadLocal(){
  if(!window.HP_DATA) throw new Error('local data missing');
  return window.HP_DATA;
}
function setChip(state, label){
  const el = document.getElementById('dbChip');
  if(!el) return;
  el.textContent = label;
  el.className = 'db-chip ' + state;
  el.title = 'データの読み込み元: ' + label;
}
async function init(){
  const c = window.HP_CONFIG;
  const order = c.MODE==='api' ? [loadAPI,loadCSV,loadLocal]
              : c.MODE==='csv' ? [loadCSV,loadAPI,loadLocal]
              : [loadLocal];
  for(const loader of order){
    try{
      const S = await loader();
      window.HP = build(S);
      const label = loader===loadAPI?'API':(loader===loadCSV?'CSV':'LOCAL');
      setChip(loader===loadAPI?'api':(loader===loadCSV?'csv':'local'), label);
      if(c.DEBUG) console.log('[HAP//GEN] DB loaded:', label);
      window.dispatchEvent && window.dispatchEvent(new Event('hp:ready'));
      return;
    }catch(e){
      if(c.DEBUG) console.warn('[HAP//GEN] loader failed:', e.message);
    }
  }
  setChip('local','LOCAL(FALLBACK)');
  window.dispatchEvent && window.dispatchEvent(new Event('hp:ready'));
}

window.HP_DB = { parseCSV, toObjects, list, build, init, SHEETS };
if((window.HP_CONFIG && window.HP_CONFIG.MODE!=='never') && typeof document!=='undefined'){
  document.addEventListener('DOMContentLoaded', init);
}
})();
