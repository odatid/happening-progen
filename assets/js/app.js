/* =========================================================
   HAP//GEN — UI結線（フォーム → 生成 → 出力）
   ========================================================= */
(function(){
'use strict';
const $ = id => document.getElementById(id);
let seed = Math.floor(Math.random()*2147483647);
let packTouched = false;

function val(name){ const el = document.querySelector('input[name="'+name+'"]:checked'); return el ? el.value : ''; }
function setRadio(name, v){ const el = document.querySelector('input[name="'+name+'"][value="'+v+'"]'); if(el) el.checked = true; }
function inputs(){ return { t:$('fTitle').value, s:$('fStory').value, a:$('fAuthor').value, p:$('fPack').value, g:val('genre'), gt:val('gtheme'), it:val('itaste') }; }
function counters(){
  $('cTitle').textContent = Array.from($('fTitle').value).length;
  $('cStory').textContent = Array.from($('fStory').value).length;
  $('cAuthor').textContent = Array.from($('fAuthor').value).length;
}
function toast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(()=>t.classList.remove('show'), 1600);
}
function save(){ try{ localStorage.setItem('hapgen', JSON.stringify(inputs())); }catch(e){} }

function fillPacks(){
  const sel = $('fPack'); sel.innerHTML = '';
  (window.HP.HAPPI||[]).forEach(h=>{
    const o = document.createElement('option');
    o.value = h.id; o.textContent = h.label + '（' + h.id + '）';
    sel.appendChild(o);
  });
  sel.addEventListener('change', ()=>{ packTouched = true; save(); });
}
function autoDetect(){
  if(packTouched) return;
  const id = window.HP_GEN.detectHappening($('fTitle').value + '　' + $('fStory').value);
  if($('fPack').value !== id) $('fPack').value = id;
}

/* ---------- セッション（URLハッシュ + localStorage） ---------- */
function b64u(s){ return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64u(s){ return decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/')))); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function chipsHTML(sum){
  const c = [];
  c.push('<span class="chip k-hp"><b>ハプニング:</b> ' + esc(sum.hp) + '</span>');
  c.push('<span class="chip k-genre"><b>ジャンル:</b> ' + esc(sum.genre) + '</span>');
  c.push('<span class="chip k-variant"><b>実装パターン:</b> ' + esc(sum.variant) + '</span>');
  sum.twists.forEach(t=>c.push('<span class="chip k-twist"><b>ツイスト:</b> ' + esc(t) + '</span>'));
  sum.comedy.forEach(t=>c.push('<span class="chip k-comedy"><b>笑い:</b> ' + esc(t) + '</span>'));
  sum.gimmicks.forEach(t=>c.push('<span class="chip k-gimmick"><b>仕掛け:</b> ' + esc(t) + '</span>'));
  if(sum.combos) c.push('<span class="chip k-combo"><b>この条件での組み合わせ:</b> 約' + sum.combos.toLocaleString('ja-JP') + '通り</span>');
  c.push('<span class="chip k-taste"><b>ゲーム:</b> ' + esc(sum.gtheme) + ' ／ <b>イラスト:</b> ' + esc(sum.itaste) + '</span>');
  sum.extracted.forEach(t=>c.push('<span class="chip k-extract"><b>本文から抽出:</b> ' + esc(t) + '</span>'));
  c.push('<span class="chip k-scene"><b>舞台:</b> ' + esc(sum.scene) + '</span>');
  return c.join('');
}

function generate(rollNew){
  if(!window.HP || !window.HP.HAPPI){ toast('DBを読み込み中です。もう一度おしてください'); return; }
  const i = inputs();
  if(!i.t.trim() || !i.s.trim()){ toast('タイトルとエピソードは必須です'); return; }
  /* UIフォーム(t/s/a/p/g) → 生成関数(title/story/author/pack/genre) のキーを正しく対応させる */
  const sel = { title: i.t, story: i.s, author: i.a, pack: i.p, genre: i.g, gtheme: i.gt, it: i.it };
  if(rollNew) seed = Math.floor(Math.random()*2147483647);
  const gp = window.HP_GEN.buildGamePrompt(sel, seed);
  const ip = window.HP_GEN.buildIllustPrompt(sel, seed);
  $('outGame').value = gp.text;
  $('outIllust').value = ip.text;
  $('sumChips').innerHTML = chipsHTML(window.HP_GEN.summary(sel, gp.roll));
  $('formCard').hidden = true;
  $('outCard').hidden = false;
  const payload = b64u(JSON.stringify(Object.assign({}, i, { seed: seed })));
  try{ history.replaceState(null, '', '#g=' + payload); }catch(e){ location.hash = 'g=' + payload; }
  $('sessionCode').textContent = payload.slice(0, 8);
  save();
  window.scrollTo({top:0, behavior:'smooth'});
}

function applyState(o){
  $('fTitle').value = o.t || ''; $('fStory').value = o.s || ''; $('fAuthor').value = o.a || '';
  if(o.p){ $('fPack').value = o.p; packTouched = true; }
  if(o.g) setRadio('genre', o.g);
  if(o.gt) setRadio('gtheme', o.gt);
  if(o.it) setRadio('itaste', o.it);
  counters();
}
function restore(){
  const h = location.hash.replace(/^#/, '');
  if(h.indexOf('g=') === 0){
    try{
      const o = JSON.parse(unb64u(h.slice(2)));
      if(o.seed) seed = o.seed;
      applyState(o);
      generate(false);
      return true;
    }catch(e){}
  }
  try{
    const raw = localStorage.getItem('hapgen');
    if(raw){ applyState(JSON.parse(raw)); }
  }catch(e){}
  return false;
}

/* ---------- 出力（コピー / ダウンロード / 印刷） ---------- */
function dl(name, text){
  const blob = new Blob([text], {type:'text/markdown;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}
function safeName(s){ return (s||'').replace(/[\\/:*?"<>|\s]+/g,'_').slice(0,24) || 'hapning'; }
async function copyTA(ta){
  try{ await navigator.clipboard.writeText(ta.value); toast('コピーしました'); }
  catch(e){ ta.select(); document.execCommand('copy'); toast('コピーしました'); }
}
function copyText(t){
  const ta = document.createElement('textarea'); ta.value = t;
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast('セッションリンクをコピーしました'); }
  catch(e){ toast('コピーできませんでした'); }
  ta.remove();
}

/* ---------- 結線 ---------- */
function wire(){
  ['fTitle','fStory','fAuthor'].forEach(id=>{
    $(id).addEventListener('input', ()=>{ counters(); autoDetect(); save(); });
  });
  ['genre','gtheme','itaste'].forEach(n=>{
    document.querySelectorAll('input[name="'+n+'"]').forEach(el=>el.addEventListener('change', save));
  });
  $('btnGen').addEventListener('click', ()=>generate(true));
  $('btnReroll').addEventListener('click', ()=>generate(true));
  $('btnBack').addEventListener('click', ()=>{ $('outCard').hidden = true; $('formCard').hidden = false; window.scrollTo({top:0}); });
  $('btnSample').addEventListener('click', ()=>{
    const hs = (window.HP && window.HP.HAPPI) || [];
    if(!hs.length){ toast('DB読み込み中です'); return; }
    const h = hs[Math.floor(Math.random()*hs.length)];
    $('fTitle').value = h.sampleTitle || ('サンプル：' + h.label);
    $('fStory').value = h.sample || '';
    $('fPack').value = h.id; packTouched = true;
    counters(); save();
    /* サンプルをフォームに入れるだけ。生成はユーザーが確認してから「生成する」で行う */
    toast('サンプルを入れました。内容を確認して「生成する」をおしてください');
    window.scrollTo({top:0, behavior:'smooth'});
  });
  $('btnRestart').addEventListener('click', ()=>{
    if(!confirm('入力を全部消して最初からやり直しますか？')) return;
    try{ localStorage.removeItem('hapgen'); }catch(e){}
    history.replaceState(null, '', location.pathname);
    ['fTitle','fStory','fAuthor'].forEach(id=>$(id).value='');
    packTouched = false; seed = Math.floor(Math.random()*2147483647);
    $('outCard').hidden = true; $('formCard').hidden = false;
    counters(); window.scrollTo({top:0});
  });
  $('btnPrint').addEventListener('click', ()=>window.print());
  $('tabGame').addEventListener('click', ()=>{
    $('tabGame').classList.add('on'); $('tabIllust').classList.remove('on');
    $('paneGame').hidden = false; $('paneIllust').hidden = true;
  });
  $('tabIllust').addEventListener('click', ()=>{
    $('tabIllust').classList.add('on'); $('tabGame').classList.remove('on');
    $('paneIllust').hidden = false; $('paneGame').hidden = true;
  });
  $('btnCopyGame').addEventListener('click', ()=>copyTA($('outGame')));
  $('btnCopyIllust').addEventListener('click', ()=>copyTA($('outIllust')));
  $('btnDlGame').addEventListener('click', ()=>dl('ゲーム生成プロンプト_' + safeName(inputs().t) + '.md', $('outGame').value));
  $('btnDlIllust').addEventListener('click', ()=>dl('イラスト生成プロンプト_' + safeName(inputs().t) + '.md', $('outIllust').value));
  $('btnDlBoth').addEventListener('click', ()=>{
    const i = inputs();
    const both = '# 生成プロンプト（まとめ）\n\n## 1. ゲーム生成プロンプト\n\n' + $('outGame').value + '\n\n---\n\n## 2. イラスト生成プロンプト\n\n' + $('outIllust').value + '\n';
    dl('プロンプトまとめ_' + safeName(i.t) + '.md', both);
  });
  $('sessionChip').addEventListener('click', ()=>copyText(location.href));
}

function boot(){
  if(window.HP && window.HP.HAPPI){ start(); }
  else{ window.addEventListener('hp:ready', start); }
  function start(){
    fillPacks();
    const c = window.HP.CFG || {};
    if(c.event_name && c.organizer){
      $('footCredit').textContent = c.event_name + '（仮）｜' + c.organizer;
    }
    wire(); counters(); restore();
  }
}
boot();
})();
