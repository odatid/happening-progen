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
/* 組み合わせ総数（UI表示用） */
function nCk(n,k){ if(k<0||k>n) return 0; let r=1; for(let i=1;i<=k;i++){ r=r*(n-k+i)/i; } return Math.round(r); }
function comboCount(){
  const co = (window.HP.COMEDY||[]).length, chn = (window.HP.CHARS||[]).length;
  const tplTotal = (window.HP.TPL||[]).length, arc = (window.HP.ARCADE||[]).length;
  const comedyCombos = nCk(co,2)+nCk(co,3);
  return arc * tplTotal * chn * comedyCombos;
}
/* ハプニング種別に対応するゲームテンプレート（種別専用 → 汎用HP00 の順） */
function templatesFor(hpId){
  const all = window.HP.TPL || [];
  const own = all.filter(t=>t.hpId===hpId);
  if(own.length) return own;
  return all.filter(t=>t.hpId==='HP00');
}

function hpById(id){ return (window.HP.HAPPI||[]).find(x=>x.id===id); }
function genreById(id){ return (window.HP.GENRES||[]).find(x=>x.id===id); }
function tasteById(id){
  const v = String(id||'').toLowerCase();
  const all = window.HP.TASTES||[];
  /* ラジオ値(pop/pixel)とDB ID(T_POP/T_PIXEL)の両方に対応 */
  return all.find(x=>x.id===id) || all.find(x=>x.id.toLowerCase().endsWith('_'+v)) || all[0];
}
function illustById(id){
  const v = String(id||'').toLowerCase();
  const all = window.HP.ILLUST||[];
  /* ラジオ値(pop/gekiga/photo)とDB ID(I_POP/I_GEKIGA/I_PHOTO)の両方に対応 */
  return all.find(x=>x.id===id) || all.find(x=>x.id.toLowerCase().endsWith('_'+v)) || all[0];
}
function variantsOf(gid){ return (window.HP.VARIANTS||[]).filter(v=>v.genre_id===gid); }

/* ---------- 本文解析：エピソードから舞台・人物・小物・出来事を抽出 ---------- */
const DIC_PLACES = [
  ['リビング,居間', 'リビング'],
  ['キッチン,台所', 'キッチン（台所）'],
  ['食卓,ダイニング', '食卓まわり'],
  ['玄関,下駄箱', '玄関'],
  ['トイレ,便所,おまる', 'トイレ前の通路'],
  ['風呂,バスルーム,シャワー,湯船', 'バスルーム'],
  ['洗面所,洗濯,ベランダ,物干し', '洗濯まわり・ベランダ'],
  ['寝室,ふとん,布団,ベッド', '寝室'],
  ['子ども部屋,子供部屋,キッズルーム', '子ども部屋'],
  ['廊下,階段', '廊下・階段'],
  ['商店街,スーパー,コンビニ,レジ,ドラッグストア,モール,店', '商店街・お店の中'],
  ['公園,砂場,ブランコ,すべり台,児童館', '公園'],
  ['電車,駅,ホーム,バス,バス停,車内', '電車・バスの中'],
  ['車,チャイルドシート,ドライブ,助手席', '車の中'],
  ['病院,待合室,注射,クリニック', '病院・待合室'],
  ['保育園,幼稚園,送迎,園バス', '保育園・幼稚園'],
  ['和室,畳,縁側', '和室（畳）'],
  ['エレベーター', 'エレベーター'],
  ['プール,海,川,水遊び', '水辺'],
  ['庭,ガレージ,自転車置き場', '家のまわり'],
  ['テレワーク,在宅ワーク,書斎', 'リビングの作業スペース'],
  ['会社,オフィス', '会社・オフィス']
];
const DIC_TIMES = [
  ['朝,モーニング,起床,出勤', '朝'],
  ['昼,お昼,日中', '昼'],
  ['夕方,夕飯,夕食', '夕方'],
  ['夜,夜中,深夜,真夜中,夜泣き,寝る前', '夜'],
  ['早朝,未明', '早朝'],
  ['冬,雪,寒い', '冬'],
  ['夏,猛暑,暑い,梅雨', '夏'],
  ['雨,台風,豪雨', '雨の日']
];
const DIC_PEOPLE = [
  ['パパ,父,親父,だんな,旦那,夫', 'パパ'],
  ['ママ,母,母親,かあさん,妻,嫁', 'ママ'],
  ['じいじ,祖父,おじいちゃん,爺', 'じいじ'],
  ['ばあば,祖母,おばあちゃん,婆', 'ばあば'],
  ['兄,お兄ちゃん,あにき', 'お兄ちゃん'],
  ['姉,お姉ちゃん', 'お姉ちゃん'],
  ['妹', '妹'],
  ['弟', '弟'],
  ['双子', '双子'],
  ['赤ちゃん,あかちゃん,乳児,新生児', '赤ちゃん'],
  ['犬,ワンコ,ポチ,柴,ゴールデン', '家の犬'],
  ['猫,ネコ,にゃんこ', '家の猫'],
  ['先生,保育士', '先生'],
  ['店員,レジ,スタッフ', '店員'],
  ['上の子,下の子', '兄弟姉妹']
];
const DIC_THINGS = [
  ['牛乳,ミルクパック', '牛乳パック'],
  ['スマホ,アイフォン,携帯', 'スマホ'],
  ['クレヨン,クレパス,絵の具,ペン,マジック', 'クレヨン・えのぐ'],
  ['絵本', '絵本'],
  ['オムツ,おむつ,紙オムツ', 'おむつ'],
  ['おもちゃ,玩具,ブロック,プラレール', 'おもちゃ'],
  ['靴下,くつした,靴,サンダル', '靴・靴下'],
  ['カーテン,のれん', 'カーテン'],
  ['リモコン,エアコン', 'エアコンのリモコン'],
  ['コップ,グラス,タンブラー', 'コップ'],
  ['スプーン,フォーク,はし,箸', 'スプーン・フォーク'],
  ['ごはん,ご飯,カレー,パスタ,ラーメン,パン,おかず,離乳食', 'ごはん'],
  ['ジュース,麦茶,お茶,水筒', '飲み物'],
  ['トイレットペーパー,トイレットロール,ティッシュ', 'トイレットペーパー'],
  ['哺乳瓶,ほにゅうびん,粉ミルク,ストローマグ', '哺乳瓶・マグ'],
  ['眼鏡,めがね,メガネ', '眼鏡'],
  ['化粧,口紅,ファンデ,スキンケア,美容液', '化粧品'],
  ['洗剤,柔軟剤,掃除機,ワックス', '洗剤・掃除道具'],
  ['パスモ,スイカ,財布,カード,鍵', '財布・カード類'],
  ['おやつ,菓子,チョコ,スナック,ポテチ', 'おやつ']
];
const DIC_VEHICLES = [
  ['ママチャリ,自転車,チャリ', 'ママチャリ（自転車）'],
  ['園バス,スクールバス,お迎えバス,バス停,バス', 'お迎えバス'],
  ['三輪車,キックボード,スクーター', '三輪車・キックボード'],
  ['ベビーカー,バギー', 'ベビーカー'],
  ['車,マイカー,ドライブ,助手席,チャイルドシート', '車'],
  ['電車,駅,ホーム,改札', '電車'],
  ['タクシー', 'タクシー'],
  ['救急車,パトカー,消防車', 'はしご・サイレン車']
];
const DIC_ACTIONS = [
  ['全裸,裸,はだか,服を脱,パンツ一丁', '裸とっかえひっかえ'],
  ['こぼし,こぼれ,ぶちまけ,ダバダバ,床に広が', 'こぼし・ぶちまけ'],
  ['散らか,ひっくり返し,ひっくり返り,反乱,破壊', '大散乱'],
  ['抱っこ,おんぶ,担ぐ,背負', '抱っこ・おんぶ'],
  ['追いかけ,追跡,逃走,脱走,ダッシュ,走り', '追いかけっこ'],
  ['隠れ,かくれんぼ,見つから,行方不明,痕跡,跡', 'かくれんぼ・痕跡捜索'],
  ['飛び出し,飛び出し,かけ出し', '飛び出し'],
  ['泣き,大泣き,だだこね,号泣,ぐず', '大泣き・だだこね'],
  ['撮影,写真,動画,カメラ', '記録に残そうとする大人'],
  ['正座,にらめっこ,にらむ,凝視', '正座・にらめっこ'],
  ['寝た,寝落ち,寝かしつけ,添い寝,眠り', '寝かしつけ攻防'],
  ['とられ,盗られ,取り返し,けんと,かっと', 'とりあい'],
  ['描い,かいた,らくがき,落書き,仕上げ,作品', '大作完成'],
  ['食べ,たべ,あーん,もぐもぐ,吐き出し,べー', '口まわり攻防'],
  ['鳴き,うるさい,騒音,音', '音の犯人探し']
];

function scanDic(text, dic){
  const t = String(text||'');
  const out = [];
  dic.forEach(pair=>{
    const kws = pair[0].split(',');
    if(kws.some(k=>t.indexOf(k)>=0) && out.indexOf(pair[1])<0) out.push(pair[1]);
  });
  return out;
}
function analyzeStory(text){
  const t0 = String(text||'');
  /* 乗り物語（ママチャリ等）を先に抽出し、人物・小物判定の誤爆を防ぐため該当語を除いた本文で判定する */
  const vehicles = scanDic(t0, DIC_VEHICLES);
  let t = t0;
  DIC_VEHICLES.forEach(p=>{ p[0].split(',').forEach(k=>{ if(t0.indexOf(k)>=0) t = t.split(k).join(''); }); });
  const a = {
    places:  scanDic(t, DIC_PLACES),
    times:   scanDic(t, DIC_TIMES),
    people:  scanDic(t, DIC_PEOPLE),
    things:  scanDic(t, DIC_THINGS),
    actions: scanDic(t, DIC_ACTIONS),
    vehicles: vehicles
  };
  a.none = !a.places.length && !a.times.length && !a.people.length && !a.things.length && !a.actions.length && !a.vehicles.length;
  return a;
}
/* 本文から「事件の瞬間」になりそうな文を拾う */
function storyHighlights(text, maxN){
  const t = String(text||'');
  const sentences = t.split(/(?<=[。！？!?.\n])/).map(s=>s.trim()).filter(Boolean);
  const keys = ['こぼ','散らか','脱走','逃げ','追い','間に合','遅刻','バス','ママチャリ','泣き','だだこね','裸','描い','食べ','寝','全裸','笑い','撮影','うんち','トイレ','風呂','握りつぶ','返し','とられ','投げ','置いて','戻ったら','気づ','隠れ','まみれ'];
  const hits = sentences.filter(s=>keys.some(k=>s.indexOf(k)>=0));
  const rest = sentences.filter(s=>hits.indexOf(s)<0);
  return hits.concat(rest).slice(0, maxN||3);
}
/* 舞台・背景テキストを組む（DBの既定＋本文解析を融合） */
function buildSceneText(hp, a){
  const L = [];
  if(a.places.length) L.push('主な舞台は「' + a.places.join('・') + '」');
  if(a.vehicles.length) L.push('登場する乗り物は「' + a.vehicles.join('・') + '」');
  if(a.times.length) L.push('時間帯・季節は「' + a.times.join('・') + '」');
  if(!L.length) L.push('舞台はエピソード本文から読み取って決めること（本文に場所の明記がないため、文脈に合う日常の空間を選ぶ。DBのサンプル設定は一切使わない）');
  let s = L.join('。') + '。';
  s += '雰囲気は「' + (a.actions.length ? a.actions.join('・') : 'エピソードの出来事そのもの') + '」。';
  return s;
}
function buildCastText(hp, a){
  const cast = [];
  if(a.people.length) cast.push('登場人物：' + a.people.join('・'));
  const sub = ['親（投稿者本人）', '子ども（ハプニングの主役）'];
  if(a.people.length) cast.push('必須：' + sub.join('、'));
  else cast.push('登場人物：' + sub.join('、') + '（本文に特定の人物の記載がないための既定）');
  return cast.join('／');
}
function buildPropsText(hp, a){
  const all = a.vehicles.concat(a.things);
  if(all.length) return '本文に登場する乗り物・小物をそのまま出す：' + all.join('・');
  return '小物はエピソードから決める。本文に固有の小物の記載がない場合に限り、種別の候補（' + (hp.good||[]).slice(0,4).join('・') + '）から選んでもよい（エピソードに合わないものは使わない）';
}
/* エピソード→ゲームメカニクスへの変換指示（DBサンプル由来の状況指定は使わない） */
function buildMechText(hp, a, story){
  const who = a.people.length ? a.people.join('・') : '親（投稿者）';
  const where = a.places.length ? a.places.join('・') : 'エピソード本文から決める';
  const rides = a.vehicles;
  const acts = a.actions;
  const things = a.things;
  const parts = ['主役: ' + who, '舞台: ' + where];
  if(rides.length) parts.push('乗り物: ' + rides.join('・'));
  if(things.length) parts.push('小物: ' + things.join('・'));
  parts.push('行動: ' + (acts.length ? acts.join('・') : 'エピソードに書かれた行動をそのまま'));
  let s = '上のエピソードの『誰が・どこで・何を使い・何をしたか』を、そのままゲームの目的・操作・得点に変換する。' + parts.join('／') + '。';
  const st = String(story||'');
  if(acts.some(x=>x.indexOf('追いかけ')>=0) || /追いかけ|追跡|間に合|遅刻/.test(st)){
    s += '推奨形：追跡アクション（主役を左右操作で動かし、よけるものと追いつく対象をエピソードの登場物にする）。';
  }
  if(acts.some(x=>x.indexOf('こぼし')>=0) || /こぼ/.test(st)){
    s += '推奨形：キャッチ・回収アクション（こぼれるものを受け止める操作にする）。';
  }
  return s;
}

/* 本文キーワード → ハプニング種別の自動判定（ヒット数スコアリング方式。
   「お迎えバス」「バスルーム」など語が複数種別にまたがっても、最も多く一致した種別を選ぶ） */
function detectHappening(text){
  const t = String(text||'');
  let best = 'HP00', bestScore = 0;
  for(const h of (window.HP.HAPPI||[])){
    if(h.id==='HP00') continue;
    let s = 0;
    h.kw.forEach(k=>{ if(t.indexOf(k)>=0) s++; });
    if(s > bestScore){ best = h.id; bestScore = s; }
  }
  return best;
}

/* エピソードに合う操作キャラクターを選ぶ（本文の人物語に基づく優先 + 抽選） */
function pickChar(hp, a, story, rng){
  const all = window.HP.CHARS || [];
  if(!all.length) return null;
  const st = String(story||'');
  const score = c => {
    let s = 1;
    const map = {
      CC01:/ママ|母|かあさん|母親/, CC02:/パパ|父|父親|だんな|旦那|夫/,
      CC03:/坊や|息子|男の子|息子さん/, CC04:/女の子|娘|むすめ/,
      CC05:/赤ちゃん|あかちゃん|乳児|0歳|1歳/, CC06:/ママチャリ|自転車|チャリ/,
      CC07:/ベビーカー|バギー/, CC08:/犬|猫|ネコ|ワンコ|ペット/,
      CC09:/じいじ|ばあば|祖父|祖母|おじいちゃん|おばあちゃん|じじ|ばば|爺|婆/,
      CC10:/三輪車/, CC11:/ハムスター/
    };
    const re = map[c.id];
    if(re && re.test(st)) s += 10;
    /* 乗り物・ペア系（CC06/CC07/CC10）は「主役+乗り物」のペア絵として常に有力 +1 */
    if(c.id==='CC06'||c.id==='CC07'||c.id==='CC10') s += 1;
    return s;
  };
  /* 語で強く結びつく候補がいればそれを優先（確定的）、いなければ抽選 */
  const ranked = all.map(c=>({c, s:score(c)})).sort((x,y)=>y.s-x.s);
  if(ranked[0].s >= 11) return ranked[0].c;
  return all[Math.floor(rng()*all.length)];
}

/* キャラクターシート（色指定・服装・顔パーツ・アニメ状態まで具体指定） */
function charSheet(c){
  const L = [];
  L.push('キャラクターシート（下の指定をそのまま実装する）：');
  L.push('- 頭身：3.5〜4頭身のちびデフォルメ。丸みのあるシルエット。');
  L.push('- 体色：' + c.colors);
  L.push('- 服装・持ち物：' + c.outfit);
  L.push('- 顔のパーツ：' + c.face);
  L.push('- アニメーション：' + c.anim);
  L.push('- 禁止：プリミティブな図形（丸・四角・棒人間）や無名アイコンでの代用。目・髪型・服・ほっぺの赤み・持ち物まで描き込んだ具体キャラにすること。');
  return L;
}
/* 江戸川区ならではの舞台づくり（ゲーム・イラスト共通の組み立て） */
function buildLocalGame(items){
  const L = [];
  L.push('ゲームの随所（背景・看板・標識・小物・演出）に、江戸川区ならではの風景・景観・文字を入れること。区民が「江戸川区のイベントだ」と一目でわかる舞台づくりが必須。');
  L.push('採用する江戸川区の要素：');
  items.forEach(it=>L.push('  - ' + it.name + '：' + it.prompt_text));
  L.push('- 上の要素はエピソードの舞台と違和感なく融合させること。家庭内が舞台なら「窓の外に江戸川・戸建て住宅街・電柱と電線」、外出系なら「区の看板・駅名・商店街・河川敷」にする。');
  L.push('- 主張しすぎない程度に、画面の随所（背景・看板・道しるべ・小物）に散りばめること。看板・標識の文字には「えどがわ」表記や地区名（葛西/小岩/船堀/瑞江/篠崎/一之江）を使う。');
  L.push('- 区の公式キャラクター（エドリバー）を登場させる場合は、区の許可が取れている場合のみにし、デザインを変更しないこと。許可が未定なら登場させない。');
  return L;
}
function buildLocalIllust(items){
  const L = [];
  L.push('背景に江戸川区ならではの風景・景観を描き込み、区民が「江戸川区のパネルだ」とわかるようにする。');
  L.push('採用する江戸川区の要素：');
  items.forEach(it=>L.push('  - ' + it.name + '：' + it.prompt_text));
  L.push('- 看板や標識に「えどがわ」表記・地区名を小さく入れる（文字は最小限、主役は親子）。');
  L.push('- 区の公式キャラクター（エドリバー）を使う場合は区の許可制。許可が未定なら描かない。');
  return L;
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
  const twists = []; /* 対象はゲームに慣れていない一般客のため、ツイストは出さない */
  const comedy = pickN(rng, window.HP.COMEDY, 2 + (rng()<0.35 ? 1 : 0));
  const gimmicks = []; /* 特別仕掛けも出さない */
  const tplPool = templatesFor(hp.id);
  const tpl = tplPool.length ? tplPool[Math.floor(rng()*tplPool.length)] : null;
  const arcade = (window.HP.ARCADE||[]).length ? (window.HP.ARCADE||[])[Math.floor(rng()*(window.HP.ARCADE||[]).length)] : null;
  const ch = pickChar(hp, null, sel.story, rng);
  const variant = null; /* アーケード型基盤が常に主軸なので汎用バリアントは使わない */
  const onoGame = pickN(rng, hp.ono, Math.min(3, (hp.ono||[]).length));
  const localGame = pickN(rng, window.HP.LOCAL, 3 + (rng()<0.4 ? 1 : 0));
  const localIllust = pickN(rng, window.HP.LOCAL, 2);
  return { hp, genre, variant, tpl, arcade, ch, twists, comedy, gimmicks, localGame, localIllust, onoGame, onoIllust: onoGame[0]||'', cfg };
}

function bl(label, text){ return '- ' + label + '：' + text; }

/* ---------- ゲーム生成プロンプト ---------- */
function buildGamePrompt(sel, seed){
  const r = roll(sel, seed);
  const cfg = r.cfg;
  const a = analyzeStory(sel.story);
  const hl = storyHighlights(sel.story, 3);
  const sceneText = buildSceneText(r.hp, a);
  const min = cfg.game_min_sec || '30', max = cfg.game_max_sec || '90';
  const L = [];
  L.push('今回の種になるハプニングエピソードはこちら。');
  L.push('【エピソード】' + (sel.title || '（無題）'));
  L.push('【本文】' + (sel.story || '（本文なし）'));
  L.push('【投稿者】' + (sel.author || '区民投稿'));
  L.push('');
  L.push('こちらを表現するユニークなゲームを生成する。エピソードの舞台・登場人物・小物・展開をそのままゲームに落とし込み、このエピソードでしか作れない1本にすること。');
  L.push('');
  L.push('# 目的');
  L.push('「' + (cfg.event_name||'笑える子育てハプニングミュージアム') + '」（' + (cfg.venue||'') + '・12月イベント）に展示・実装可能な、' + min + '秒〜' + max + '秒でサクッと遊べる直感的でユーモラスなWebミニゲームを、単一のHTMLファイルとして作成してください。');
  L.push('ゲームは区民から投稿された子育てハプニングを題材に、コミカルに表現します。子育てを笑いに変える「あるある」の共感がテーマです。');
  L.push('');
  L.push('# 投稿ハプニング（テーマ）');
  L.push(bl('タイトル', sel.title));
  L.push(bl('エピソード', sel.story));
  L.push(bl('投稿者', sel.author || '区民投稿'));
  L.push(bl('ハプニング種別', r.hp.label + '（' + r.hp.id + '）'));
  L.push(bl('フキダシ用オノマトペ候補', r.onoGame.join(' / ')));
  L.push('');
  L.push('# 物語の反映（最重要・必ず守ること）');
  L.push('- このゲームの題材は上のエピソードそのもの。DBのサンプルエピソードやパターン名の例は題材に使わず、舞台・登場人物・小物・展開はすべてエピソードから決めること。');
  L.push(bl('舞台・背景', sceneText));
  L.push(bl('登場させる人物', buildCastText(r.hp, a)));
  L.push(bl('ゲーム内に出す乗り物・小物', buildPropsText(r.hp, a)));
  L.push(bl('ゲームへの変換指示', buildMechText(r.hp, a, sel.story)));
  if(a.things.length || a.vehicles.length) L.push(bl('障害物候補（悪いもの）', r.hp.bad.join(' ') + ' ＋ エピソードにちなんだ乗り物・小物（' + a.vehicles.concat(a.things).join('・') + '）から選ぶ'));
  else L.push(bl('障害物候補（悪いもの）', r.hp.bad.join(' ')));
  L.push(bl('見どころ（エピソード引用）', hl.join(' ／ ')));
  L.push('- 背景の描き込み・ステージの小物・演出は、上のエピソードの状況をそのまま反映すること。「あるある汎用」の無難な背景にしないこと。');
  L.push('- ゲームの締め（リザルト画面）に、エピソードのオチや一番笑える瞬間を1行で表示すること。');
  L.push('');
  L.push('# ゲームジャンルとゲームデザイン');
  L.push(bl('ジャンル', r.genre.name + ' — ' + r.genre.goal));
  L.push('# ゲーム基盤（アーケード型・必須）');
  L.push('ゲームの土台は、下記の懐かしのアーケード型にすること（子どもから大人まで直感的に遊べる形式）。');
  L.push(bl('基盤型「' + r.arcade.name + '」', r.arcade.desc));
  L.push('- 基盤型の操作・進行・得点ルールを必ず使うこと。そのうえで、舞台・登場物・ゴール・障害物はすべてエピソードの内容に置き換えること（基盤は「型」であって、内容はエピソード100%）。');
  L.push('');
  L.push('# 操作キャラクター（最重要・かわいいキャラで作る）');
  L.push(bl('操作キャラ「' + r.ch.name + '」', r.ch.profile));
  charSheet(r.ch).forEach(l=>L.push(l));
  L.push('- 【必須】プレイヤーが操作する対象は、上のキャラクターにすること。記号（●▲■）、無名のアイコン、棒人間、無機質な図形を操作キャラにしない。');
  L.push('- エピソードに登場する他の人物（子ども・パートナー・ペット）も、同じデフォルメ・同じ色指定ルールのかわいいキャラとして画面に登場させる。操作キャラは子どもを操作しない（子どもは無邪気な表情で画面にいる側）。');
  L.push('');
  L.push('# 江戸川区ならではの舞台づくり（最重要）');
  buildLocalGame(r.localGame).forEach(l=>L.push(l));
  if(r.tpl){
    L.push('');
    L.push('# ゲームコア設計（このハプニング専用テンプレート・題材の適用）');
    L.push(bl('テンプレート「' + r.tpl.name + '」', r.tpl.core));
    L.push('- このテンプレートの場面・目的を、上のアーケード基盤型の上に乗せること（例：基盤＝横スクロール、テンプレ＝壁がきミュージアムなら「右へ進みながら壁の落書きをなぞって消す」）。基盤型とテンプレートの融合がこのゲームの独自性になる。');
  }
  L.push('');
  L.push('');
  L.push('# 笑い設計（最重要・コミカル表現の要件）');
  L.push('- 子どもの起こすハプニングは「悪意のない無邪気な事象」。ゲーム内で子どもを悪者・犯人扱いせず、罰する演出もしない。失敗は「大変なことになった!」というコミカルな事態として表現する。');
  L.push('- 親子で笑える「あるある」の共感が笑いの軸。恐怖・お仕置き・怒号で締めず、最後は親子で笑い合う余韻で終わること。');
  L.push('- 笑いの演出パターン（下記を採用し、エピソードに合わせて調整）：');
  r.comedy.forEach(c=>L.push('  - ' + c.name + '：' + c.game));
  L.push('- 【必須】子どもの無邪気な顔をゲーム画面に表示すること：プレイ中、子どもの顔を画面内（大きめの顔パネル、または場面内の子どもキャラ）に常時出し、状況で表情が変わる演出にする。コンボ中=にっこり笑顔、ミス=「え?」ときょとん顔、ピンチ=わくわくした照れ顔、リザルト=ドヤ顔または満面の笑顔。恐怖・泣き・怒りの表情は禁止（無邪気な表情のみ）。');
  L.push('- 「親だけが必死、子どもは無邪気」の対比を画面で見える化することが本ゲーム最大の笑いの源泉。子どもの顔は装飾ではなく笑いの主役として設計すること。');
  L.push('- ハプニングの「無茶さ」は誇張したコミカル演出（画面シェイク・スローモーション・顔芸・コミカル物理）で表現し、現実の危険さや苦痛は描かないこと。');
  L.push(bl('操作体系（PC）', r.genre.controlsPC));
  L.push(bl('操作体系（スマホ）', r.genre.controlsSP));
  L.push('- 【必須】プレイヤーは1人。操作するのは親（投稿者）だけで、子どもを操作キャラ・2人目のプレイヤーにしない。交互プレイ・協力プレイ・2人同時操作・親子の持ち回りはしない。子どもは画面内でハプニングを起こす無邪気な存在として登場する（親の操作に反応して動くなど、1人プレイの中で演出する）。');
  L.push(bl('ゲームサイクル', 'タイトル画面（操作説明含む）→ メインゲーム → リザルト画面（スコア・ランク判定・再挑戦ボタン）。'));
  L.push(bl('ループ', r.genre.loop));
  L.push(bl('スコア', r.genre.score));
  L.push(bl('成功条件', r.genre.win));
  L.push(bl('失敗条件', r.genre.lose));
  L.push(bl('プレイ時間', r.genre.duration + '秒（' + min + '〜' + max + '秒。1プレイは必ずこの範囲で終わる短時間・高回転設計にすること）'));
  L.push(bl('テンポの要件', '単純操作・テンポ重視。待ち時間・休憩を挟まず、30秒〜1分でサクッとクリアできる設計にする。演出（ヒットストップ等）は体感テンポを落とさない範囲に抑える。'));
  L.push(bl('対象プレイヤー', 'ゲームに慣れていない一般客（子育て世帯を中心とした区民）。ルールは画面を見ればわかる単純さにし、特別仕掛けや複雑なモードは入れない。'));
  L.push(bl('トーン＆マナー', '子育てを否定・バカにせず、当事者も笑える「共感のある笑い」。不快・危険な表現は避ける。'));
  L.push('');
  const t = tasteById(sel.gt) || (window.HP.TASTES||[])[0];
  L.push('# ビジュアル＆UI要件（テイスト：' + t.name + '）');
  L.push('1. スタイル：' + t.style);
  L.push('2. 配色：' + t.palette);
  L.push('3. フォント：' + t.font);
  L.push('4. 背景：' + t.bg);
  L.push('5. 画面ジュース（エフェクト）：' + t.effect);
  L.push('6. 【最重要】上のテイスト指定を絶対に守ること。指定と異なるスタイルにしないこと。');
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
  const a = analyzeStory(sel.story);
  const hl = storyHighlights(sel.story, 2);
  const sceneText = buildSceneText(r.hp, a);
  const t = illustById(sel.it) || (window.HP.ILLUST||[])[0];
  const L = [];
  L.push('今回の種になるハプニングエピソードはこちら。');
  L.push('【エピソード】' + (sel.title || '（無題）'));
  L.push('【本文】' + (sel.story || '（本文なし）'));
  L.push('【投稿者】' + (sel.author || '区民投稿'));
  L.push('');
  L.push('こちらを表現する1コマイラストを生成する。エピソードの舞台・登場人物・小物・一番笑える瞬間をそのまま1コマに落とし込み、このエピソードでしか描けない1枚にすること。');
  L.push('');
  L.push('# 目的');
  L.push('「' + (cfg.event_name||'笑える子育てハプニングミュージアム') + '」（' + (cfg.venue||'') + '）の展示パネル用 1コマイラストを作成してください。テーマは次の子育てハプニングです。');
  L.push('');
  L.push('# 投稿ハプニング（テーマ）');
  L.push(bl('タイトル', sel.title));
  L.push(bl('エピソード', sel.story));
  L.push(bl('投稿者', sel.author || '区民投稿'));
  L.push(bl('ハプニング種別', r.hp.label + '（' + r.hp.id + '）'));
  L.push(bl('フキダシ用オノマトペ候補', r.onoIllust));
  L.push('');
  L.push('# 物語の反映（最重要・必ず守ること）');
  L.push('- この1コマの題材は上のエピソードそのもの。DBのサンプルエピソードや構図例は題材に使わず、描く瞬間・人物・小物はすべてエピソードから決めること。');
  L.push(bl('舞台・背景', sceneText));
  L.push(bl('登場させる人物', buildCastText(r.hp, a)));
  L.push(bl('描き込む小物', buildPropsText(r.hp, a)));
  L.push(bl('見どころ（エピソード引用）', hl.join(' ／ ')));
  L.push('- 1コマで描く瞬間は、上のエピソードの中で一番笑える場面（見どころ）にすること。エピソードと無関係な汎用構図にしないこと。');
  L.push('- 背景はこのエピソードの舞台（' + (a.places.length ? a.places.join('・') : 'エピソード本文から読み取る') + '）を読み取れるように描き込むこと。');
  L.push('');
  L.push('# 江戸川区ならではの背景（最重要）');
  buildLocalIllust(r.localIllust).forEach(l=>L.push(l));
  L.push('');
  L.push('# キャラクターシート（イラストにも適用）');
  L.push('- 人物は操作キャラクター「' + r.ch.name + '」のキャラクターシートに合わせて描く（' + r.ch.colors + '）。');
  L.push('');
  L.push('# イラストテイスト（' + t.name + '）');
  L.push('1. スタイル：' + t.style);
  L.push('2. 配色：' + t.palette);
  L.push('3. 質感：' + t.texture);
  L.push('4. 【最重要】上のスタイル指定を最優先で守ること。配色・質感・構図・描き味はすべてこのテイストで統一し、指定と異なるスタイル（例：実写指定なのに劇画調、劇画指定なのにポップ調）にしないこと。');
  L.push('');
  L.push('# 構図要件');
  L.push('- 縦長1コマ（比率' + (cfg.illust_ratio||'4:5') + '・目安' + (cfg.illust_size||'1080x1350') + 'px）。パネル印刷（' + (cfg.panel_print||'A4縦') + '想定）に耐える解像度。');
  L.push('- 【必須】子どもの無邪気な顔を1コマの中心に大きく描くこと：満面の笑顔・ドヤ顔・きょとん顔など無邪気な表情で、恐怖・泣き・怒りは禁止。子どもの無邪気な顔と親の必死な顔の対比がこの1コマの笑いの源泉。');
  L.push('- ' + t.composition);
  L.push('- 上部にタイトル帯：ハプニングタイトル（' + sel.title + '）を太字で。');
  L.push('- フキダシ1個にオノマトペ（例：' + r.onoIllust + '）。');
  L.push('- 下部に帯：エピソード本文（20字以内×7行程度に折り返し）＋「投稿：' + (sel.author||'区民投稿') + '」＋イベント名（' + (cfg.event_name||'') + '）。');
  L.push('- 文字は最小限（タイトルとオノマトペのみ）。日本語文字が破綻しやすい場合は文字なしで出力し、あとからパネルに文字を重ねる前提でもよい。');
  L.push('');
  L.push('# 注意事項');
  L.push('- ' + t.ng);
  L.push('- 子どもの起こすハプニングは悪意のない無邪気な事象。子どもを悪者にせず、笑いの演出は下記を採用：');
  r.comedy.forEach(c=>L.push('  - ' + c.name + '：' + c.illust));
  L.push('- 子育てを否定する表現ではなく、当事者も笑える共感のある描写にする。');
  L.push('');
  L.push('# 出力形式');
  L.push('- 縦長比率' + (cfg.illust_ratio||'4:5') + '。高解像度。背景透過なし。');
  return { text: L.join('\n'), roll: r };
}

/* ---------- UI用サマリー ---------- */
function summary(sel, r){
  const t = tasteById(sel.gt); const it = illustById(sel.it);
  const a = analyzeStory(sel.story);
  const parts = [];
  if(a.places.length) parts.push(a.places.join('・'));
  if(a.vehicles.length) parts.push('乗り物: ' + a.vehicles.join('・'));
  if(a.times.length) parts.push(a.times.join('・'));
  if(a.people.length) parts.push('人物: ' + a.people.join('・'));
  if(a.things.length) parts.push('小物: ' + a.things.join('・'));
  if(a.actions.length) parts.push('状況: ' + a.actions.join('・'));
  return {
    hp: r.hp.label + '（' + r.hp.id + '）',
    genre: r.genre.name,
    variant: r.variant ? (r.variant.name + ' — ' + r.variant.desc) : '—',
    twists: r.twists.map(x=>x.text),
    comedy: r.comedy.map(x=>x.name),
    gimmicks: r.gimmicks.map(x=>x.name),
    tpl: r.tpl ? (r.tpl.name + ' — ' + r.tpl.core) : '',
    arcade: r.arcade.name,
    ch: r.ch ? r.ch.name : '',
    local: (r.localGame||[]).map(x=>x.name),
    combos: comboCount(),
    gtheme: t ? t.name : '',
    itaste: it ? it.name : '',
    scene: buildSceneText(r.hp, a),
    extracted: parts,
    cast: buildCastText(r.hp, a),
    props: buildPropsText(r.hp, a)
  };
}

return { detectHappening, roll, buildGamePrompt, buildIllustPrompt, summary, comboCount };
})();
