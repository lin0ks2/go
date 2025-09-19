
/* app.mistakes.js — v3
 * Mistakes storage with per-dictionary-language scoping and independent progress.
 * Public API:
 *   App.Mistakes.add(id, wordObj, sourceKey)
 *   App.Mistakes.deck()           -> array of full word objects for ACTIVE filters
 *   App.Mistakes.list()           -> alias of deck()
 *   App.Mistakes.count()          -> number (ACTIVE filters)
 *   App.Mistakes.clearActive()    -> clears only active uiLang+dictLang bucket
 *   App.Mistakes.sourceKeyFor(id) -> last known sourceKey for a word id
 *   App.Mistakes.onShow(id)       -> no-op (reserved)
 *   App.Mistakes.getStars(sourceKey, id)
 *   App.Mistakes.setStars(sourceKey, id, value)
 *   App.Mistakes.sourceKeyInActive(id)
 *
 * ACTIVE filters:
 *   - ui language: App.settings.lang ('ru' | 'uk')
 *   - dict language: resolved from App.settings.dictsLangFilter or from active dict key
 *
 * Data layout in localStorage (LS_M3):
 * {
 *   uiLang: {
 *     dictLang: {
 *       items: { [sourceKey]: { [id]: true } },
 *       stars: { [sourceKey]: { [id]: number } },   // independent progress
 *       sources: { [id]: sourceKey }                // reverse map
 *     }
 *   }
 * }
 */
(function() {
  const App = window.App || (window.App = {});
  const M = App.Mistakes || (App.Mistakes = {});

  const LS_M3 = 'mistakes.v3';
  const SAFE_INT = function(x, def){ x = Number(x); return Number.isFinite(x) ? x : (def||0); };

  function _load() {
    try { return JSON.parse(localStorage.getItem(LS_M3) || '{}'); }
    catch(e){ return {}; }
  }
  function _save(obj) {
    try { localStorage.setItem(LS_M3, JSON.stringify(obj)); } catch(e){}
  }

  function _activeUiLang(){
    return (App.settings && (App.settings.lang === 'uk' ? 'uk' : 'ru')) || 'ru';
  }

  function _langOfKey(k){
    try {
      const m = String(k||'').match(/^([a-z]{2})_/i);
      return m ? m[1].toLowerCase() : null;
    } catch(e){ return null; }
  }

  function _activeDictLang(){
    if (App.settings && App.settings.dictsLangFilter) return App.settings.dictsLangFilter;
    const key = (App.dictRegistry && App.dictRegistry.activeKey) || null;
    const lg = _langOfKey(key);
    return lg || 'de';
  }

  function _ensureBucket(db, uiLang, dictLang){
    if (!db[uiLang]) db[uiLang] = {};
    if (!db[uiLang][dictLang]) db[uiLang][dictLang] = { items:{}, stars:{}, sources:{}, _v:3 };
    return db[uiLang][dictLang];
  }

  function _sourceMap(db) {
    const uiLang = _activeUiLang();
    const dictLang = _activeDictLang();
    const b = _ensureBucket(db, uiLang, dictLang);
    return b.sources || (b.sources = {});
  }

  // Public: where this id originally comes from
  M.sourceKeyFor = function(id){
    const db = _load();
    const sources = _sourceMap(db);
    return sources && sources[String(id)] || null;
  };

  // Add word into mistakes under active uiLang + dictLang bucket
  M.add = function(id, word, sourceKey){
    if (!id) return;
    id = String(id);
    const uiLang = _activeUiLang();
    if (!sourceKey && word && (word._mistakeSourceKey || word._favoriteSourceKey)) {
      sourceKey = word._mistakeSourceKey || word._favoriteSourceKey;
    }
    if (!sourceKey) {
      const active = (App && App.dictRegistry && App.dictRegistry.activeKey) || null;
      if (active && active !== 'mistakes') sourceKey = active;
    }
    if (!sourceKey) return;

    const dictLang = _langOfKey(sourceKey) || _activeDictLang();
    const db = _load();
    const bucket = _ensureBucket(db, uiLang, dictLang);

    if (!bucket.items[sourceKey]) bucket.items[sourceKey] = {};
    bucket.items[sourceKey][id] = true;
    bucket.sources[id] = sourceKey;

    _save(db);
  };

  // Independent stars for mistakes-only
  function _getStarsBucket(db){
    const uiLang = _activeUiLang();
    const dictLang = _activeDictLang();
    const b = _ensureBucket(db, uiLang, dictLang);
    return b.stars || (b.stars = {});
  }

  M.getStars = function(sourceKey, id){
    const db = _load();
    const sb = _getStarsBucket(db);
    const sk = String(sourceKey||'');
    const wid = String(id||'');
    const obj = sb[sk] || {};
    return SAFE_INT(obj[wid], 0);
  };
  M.setStars = function(sourceKey, id, val){
    const db = _load();
    const sb = _getStarsBucket(db);
    const sk = String(sourceKey||'');
    const wid = String(id||'');
    if (!sb[sk]) sb[sk] = {};
    sb[sk][wid] = SAFE_INT(val, 0);
    _save(db);
  };

  // Full deck for ACTIVE filters (uiLang + dictLang)
  M.deck = function(){
    const db = _load();
    const uiLang = _activeUiLang();
    const dictLang = _activeDictLang();
    const bucket = _ensureBucket(db, uiLang, dictLang);

    const out = [];
    const items = bucket.items || {};
    Object.keys(items).forEach(function(sourceKey){
      const ids = items[sourceKey] || {};
      const deck = (App.Decks && typeof App.Decks.resolveDeckByKey==='function')
        ? (App.Decks.resolveDeckByKey(sourceKey) || [])
        : [];
      if (!deck.length) return;
      const map = new Map(deck.map(w => [String(w.id), w]));
      Object.keys(ids).forEach(function(id){
        const w = map.get(String(id));
        if (w) {
          if (!w._mistakeSourceKey) w._mistakeSourceKey = sourceKey;
          out.push(w);
        }
      });
    });
    return out;
  };
  M.list = function(){ return M.deck(); };

  M.count = function(){
    const db = _load();
    const uiLang = _activeUiLang();
    const dictLang = _activeDictLang();
    const bucket = _ensureBucket(db, uiLang, dictLang);
    let n = 0;
    Object.keys(bucket.items || {}).forEach(sk => {
      n += Object.keys(bucket.items[sk] || {}).length;
    });
    return n;
  };

  // Clear only active bucket
  M.clearActive = function(){
    const db = _load();
    const uiLang = _activeUiLang();
    const dictLang = _activeDictLang();
    db[uiLang] && db[uiLang][dictLang] && (db[uiLang][dictLang] = { items:{}, stars:{}, sources:{}, _v:3 });
    _save(db);
  };

  // Optional: remember last shown id
  M.onShow = function(id){};

  M.sourceKeyInActive = function(id){
    const db = _load();
    const uiLang = _activeUiLang();
    const dictLang = _activeDictLang();
    const bucket = _ensureBucket(db, uiLang, dictLang);
    return (bucket.sources || {})[String(id)] || null;
  };
})();
