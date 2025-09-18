
// Central language resolver
App.Decks = App.Decks || {};
App.Decks.langOfKey = function(key){
  const m = String(key||'').match(/^([a-z]{2})[_-]/i);
  return m ? m[1].toLowerCase() : null;
};
/* app.decks.js v1.2.1
   ─────────────────────────────────────────────────────────────────────────────
   Роль файла:
   • Реестр колод (встроенные + пользовательские)
   • Имена словарей по КЛЮЧУ без эвристик (c поддержкой алиасов/синонимов)
   • Флаги/иконки и предпросмотр
   • Выбор словаря по умолчанию

   Изменения v1.2.1:
   • Добавлена нормализация ключей (алиасы): de_preps, prepositions, de-prep и т.п.
     → корректно отображаем «Предлоги»/«Прийменники», даже если ключ отличается.
*/

(function(){
  // ───────────────────────────────────────────────────────────────────────────
  // [БЛОК 1] Короткие ссылки и страховки
  // ───────────────────────────────────────────────────────────────────────────
  const App = window.App || (window.App = {});
  if (!App.DOM) App.DOM = {};
  if (!App.settings) App.settings = { lang: 'uk' };
  if (!App.state) App.state = {};
  if (!App.dictRegistry) App.dictRegistry = { activeKey:null, user:{} };

  // ───────────────────────────────────────────────────────────────────────────
  // [БЛОК 2] Нормализация ключей и именование (RU/UK)
  // ───────────────────────────────────────────────────────────────────────────
  // Алиасы -> каноническое имя
  const CANON = {
    de_pronouns:     ['de_pronouns', 'pronouns', 'de-pronouns', 'depronouns', 'de_pronoun', 'de-pronoun'],
    de_numbers:      ['de_numbers', 'numbers', 'de-numbers', 'denumbers', 'de_number', 'de-number', 'numerals', 'числительные'],
    de_prepositions: ['de_prepositions','prepositions','de-preps','de_preps','de-prep','de_prep','de-preposition','de_preposition','prep','preps','предлоги'],
    de_conjunctions: ['de_conjunctions','conjunctions','de-conj','de_conj','conj','союзы'],
    de_particles:    ['de_particles','particles','de-part','de_part','part','частицы'],
    de_adverbs:      ['de_adverbs','adverbs','de-adv','de_adv','adv','наречия','наречия_'],
    de_adjectives:   ['de_adjectives','adjectives','de-adj','de_adj','adj','прилагательные'],
    de_nouns:        ['de_nouns','nouns','de-nouns','denouns','noun','существительные','іменники'],
    de_verbs:        ['de_verbs','verbs','de-verbs','deverb','verb','глаголы','дієслова'],
  };

  // Быстрый обратный индекс: алиас -> канон
  const ALIAS = (() => {
    const map = {};
    for (const canon of Object.keys(CANON)) {
      for (const a of CANON[canon]) {
        map[a.toLowerCase()] = canon;
      }
    }
    return map;
  })();

  function normalizeKey(key){
    if (!key) return null;
    const k = String(key).trim().toLowerCase().replace(/\s+/g,'').replace(/_/g,'_').replace(/-+/g,'-');
    // точное совпадение алиаса
    if (ALIAS[k]) return ALIAS[k];
    // попытка «смягчённой» нормализации: убрать нечитаемые символы
    const soft = k.replace(/[^\w-]/g,'');
    if (ALIAS[soft]) return ALIAS[soft];
    return key; // вернуть исходный, если не распознали
  }

  // Локализованные названия по канону
  function i18nNameMap() {
    const lang = (App.settings.lang === 'ru') ? 'ru' : 'uk';
    const RU = {
      de_pronouns:     'Местоимения',
      de_numbers:      'Числительные',
      de_prepositions: 'Предлоги',
      de_conjunctions: 'Союзы',
      de_particles:    'Частицы',
      de_adverbs:      'Наречия',
      de_adjectives:   'Прилагательные',
      de_nouns:        'Существительные',
      de_verbs:        'Глаголы',
      default:         'Слова',
      favorites:       'Избранное'
    };
    const UK = {
      de_pronouns:     'Займенники',
      de_numbers:      'Числівники',
      de_prepositions: 'Прийменники',
      de_conjunctions: 'Сполучники',
      de_particles:    'Частки',
      de_adverbs:      'Прислівники',
      de_adjectives:   'Прикметники',
      de_nouns:        'Іменники',
      de_verbs:        'Дієслова',
      default:         'Словник',
      favorites:       'Обране'
    };
    return (lang === 'ru') ? RU : UK;
  }

  function nameByKey(key) {
    const map = i18nNameMap();
    if (!key) return map.default;
    if (key === 'fav' || key === 'favorites') return map.favorites;
    const canon = normalizeKey(key);
    return map[canon] || map.default;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // [БЛОК 3] Доступ к колодам
  // ───────────────────────────────────────────────────────────────────────────
  function builtinKeys(){
    const out = [];
    if (window.decks && typeof window.decks === 'object') {
      for (const k of Object.keys(window.decks)) {
        if (Array.isArray(window.decks[k]) && window.decks[k].length) out.push(k);
      }
    }
    // Стабильный приоритет по КАНОНУ
       // Стабильный приоритет по КАНОНУ (нужный порядок)
    const priority = [
      'de_verbs',        // Глаголы — первыми
      'de_nouns',        // Существительные
      'de_adjectives',   // Прилагательные
      'de_adverbs',      // Наречия
      'de_pronouns',     // Местоимения
      'de_prepositions', // Предлоги
      'de_numbers',      // Числительные
      'de_conjunctions', // Союзы
      'de_particles'     // Частицы
    ];
    return out.sort((a,b)=>{
      const ca = normalizeKey(a);
      const cb = normalizeKey(b);
      const ia = priority.indexOf(ca);
      const ib = priority.indexOf(cb);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
  }

  function resolveDeckByKey(key){
    
  if (key === 'mistakes') { try { return (App.Mistakes && App.Mistakes.list) ? (App.Mistakes.deck() || []) : []; } catch(e){ return []; } }
if (!key) return [];
    // Избранное — «виртуальная» колода
    
    if (key === 'fav' || key === 'favorites'){
      try {
        App.migrateFavoritesToV2 && App.migrateFavoritesToV2();
        const st  = App.state || {};
        const v2  = st.favorites_v2 || {};
        const out = [];
        Object.keys(v2).forEach((dictKey) => {
          const src = App.Decks.resolveDeckByKey(dictKey) || [];
          const map = v2[dictKey] || {};
          for (let i = 0; i < src.length; i++){
            const w = src[i];
            if (map[w.id]) out.push(w);
          }
        });
        return out;
      } catch (e){
        console.warn('fav build failed', e);
        return [];
      }
    }

    // Пользовательские
    if (key.startsWith && key.startsWith('user-')){
      return App.dictRegistry.user?.[key]?.words || [];
    }
    // Встроенные
    if (window.decks && Array.isArray(window.decks[key])) return window.decks[key];
    // Попытка: если ключ был алиасом, попробуем канон как реальный ключ
    const canon = normalizeKey(key);
    if (canon !== key && Array.isArray(window.decks[canon])) return window.decks[canon];
    return [];
  }

  function getAllWordsFlat(){
    const list=[];
    for (const k of builtinKeys()) list.push(...(window.decks[k]||[]));
    for (const k of Object.keys(App.dictRegistry.user||{})) list.push(...(App.dictRegistry.user[k].words||[]));
    return list;
  }

  // ───────────────────────────────────────────────────────────────────────────
// [БЛОК 4] Имя словаря и флаг
// ───────────────────────────────────────────────────────────────────────────
function resolveNameByKey(key){
  if (!key) return nameByKey(key);
  if (key === 'mistakes') {
    try {
      return (App.i18n && App.i18n().mistakesName) || 'Мои ошибки';
    } catch(e){
      return 'Мои ошибки';
    }
  }
  const suf = String(key).split('_')[1] || '';
  const t = (App.i18n && App.i18n()) || {};
  const map = {
    verbs:t.pos_verbs, nouns:t.pos_nouns, adjectives:t.pos_adjs,
    adverbs:t.pos_advs, prepositions:t.pos_preps,
    conjunctions:(t.pos_conjs||t.pos_misc),
    particles:(t.pos_particles||t.pos_misc),
    numbers:(t.pos_numbers||t.pos_misc),
    pronouns:(t.pos_pronouns||t.pos_misc),
    misc:t.pos_misc
  };
  if (map[suf]) return map[suf];
  return nameByKey(key);
}

function flagForKey(key, words){
  if (key === 'fav' || key === 'favorites') return '♥';
  const m = String(key||'').match(/^([a-z]{2})_/i);
  const lg = m ? m[1].toLowerCase() : '';
  const MAP = { en:'🇬🇧', de:'🇩🇪', fr:'🇫🇷', es:'🇪🇸', it:'🇮🇹', pl:'🇵🇱', sr:'🇷🇸', ru:'🇷🇺', uk:'🇺🇦', tr:'🇹🇷' };
  return MAP[lg] || '🌐';
}

// ───────────────────────────────────────────────────────────────────────────
// [БЛОК 5] Предпросмотр
// [БЛОК 5] Предпросмотр
  // ───────────────────────────────────────────────────────────────────────────
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function openPreview(words, title){
    const t = (App.i18n ? App.i18n() : { pos_misc:'Слова' });
    const transKey = (App.settings.lang==='ru') ? 'ru' : 'uk';
    const rows = (words||[]).map(w=>`<tr><td>${escapeHtml(w.word||'')}</td><td>${escapeHtml(w[transKey]||'')}</td></tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title||'')}</title>
    <style>body{font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #e5e7eb;padding:8px 10px;text-align:left}thead th{background:#f8fafc}</style>
    </head><body><h3>${escapeHtml(title||'')}</h3>
    <table><thead><tr><th>${t.pos_misc||'Слова'}</th><th>${(App.settings.lang==='ru')?'Перевод':'Переклад'}</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;
    const blob = new Blob([html],{type:'text/html;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.target='_blank'; a.rel='noopener'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 60000);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // [БЛОК 6] Выбор словаря по умолчанию
  // ───────────────────────────────────────────────────────────────────────────
  function pickDefaultKey(){
    const fav = resolveDeckByKey('fav');
    if (fav && fav.length >= 4) return 'fav';

    const built = builtinKeys();
    for (const k of built){
      const arr = resolveDeckByKey(k);
      if (arr && arr.length >= 4) return k;
    }

    const users = Object.keys(App.dictRegistry.user||{});
    for (const k of users){
      const arr = resolveDeckByKey(k);
      if (arr && arr.length >= 4) return k;
    }

    return built[0] || users[0] || null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // [БЛОК 7] Экспорт API в App.Decks
  // ───────────────────────────────────────────────────────────────────────────
  App.Decks = {
    builtinKeys,
    resolveDeckByKey,
    resolveNameByKey,
    flagForKey,
    openPreview,
    pickDefaultKey
  };
})();
 // конец!


const ORDER = ['verbs','nouns','adjectives','adverbs','pronouns','prepositions','numbers','conjunctions','particles'];
