/**
 * app.mistakes.js
 *
 * Независимый тренажёр «Мои ошибки»:
 *  - Хранение ошибок ПО ЯЗЫКУ ИНТЕРФЕЙСА (App.settings.lang).
 *  - У записи сохраняем язык словаря-источника (dl).
 *  - UI (list/count/deck): показываем ТОЛЬКО "живые" слова (существуют в исходных словарях).
 *  - Без авто-усушки; очистка — только вручную (clearActive).
 *  - Независимый прогресс (звёзды) для «МОш» в mistakes.progress.v1 (пер UI-языку).
 */
(function(){
  var App = window.App || (window.App = {});
  var LS_KEY = 'mistakes.v1';
  var PROG_KEY = 'mistakes.progress.v1';

  // ---------- utils ----------
  function now(){ return Date.now ? Date.now() : (+new Date()); }
  function activeLang(){ return (App.settings && App.settings.lang) || 'ru'; } // язык интерфейса

  function load(){
    try{ var raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : {}; }catch(e){ return {}; }
  }
  function save(db){ try{ localStorage.setItem(LS_KEY, JSON.stringify(db)); }catch(e){} }

  function loadProg(){ try{ var raw = localStorage.getItem(PROG_KEY); return raw ? JSON.parse(raw) : {}; }catch(e){ return {}; } }
  function saveProg(db){ try{ localStorage.setItem(PROG_KEY, JSON.stringify(db)); }catch(e){} }

  function langOfKey(dictKey){
    try{ if (App.Decks && App.Decks.langOfKey) return App.Decks.langOfKey(dictKey); }catch(e){}
    return null;
  }
  function targetLang(){ // язык активного словаря (если не "mistakes")
    try{
      var key = App.dictRegistry && App.dictRegistry.activeKey;
      if (key && key !== 'mistakes') return langOfKey(key) || null;
    }catch(e){}
    return null;
  }

  function ensure(db, uiLang, dictKey){
    if (!db[uiLang]) db[uiLang] = {};
    if (!db[uiLang][dictKey]) db[uiLang][dictKey] = {};
    return db[uiLang][dictKey];
  }

  function resolveDeck(dictKey){
    if (App.Decks && App.Decks.resolveDeckByKey) return App.Decks.resolveDeckByKey(dictKey) || [];
    return [];
  }
  function indexDeckById(deck){
    var idx = {};
    for (var i=0;i<deck.length;i++){ idx[String(deck[i].id)] = deck[i]; }
    return idx;
  }
  function wordExists(dictKey, wordId){
    var deck = resolveDeck(dictKey);
    if (!deck || !deck.length) return false;
    var id = String(wordId);
    for (var i=0;i<deck.length;i++){ if (String(deck[i].id) === id) return true; }
    return false;
  }

  // --- независимый прогресс для «МОш» (пер UI-языку) ---
  function progKey(dictKey, id){ return dictKey + '#' + String(id); }
  function progGet(uiLang, dictKey, id){
    var db = loadProg(); var L = db[uiLang] || {}; var k = progKey(dictKey, id);
    return (L && L[k]) ? (L[k].stars|0) : 0;
  }
  function progSet(uiLang, dictKey, id, stars){
    var db = loadProg(); if (!db[uiLang]) db[uiLang] = {};
    var k = progKey(dictKey, id);
    var cur = db[uiLang][k] || {stars:0, ts:0};
    var max = (App.Trainer && App.Trainer.starsMax ? App.Trainer.starsMax() : 5);
    cur.stars = Math.max(0, Math.min((stars|0), max));
    cur.ts = now();
    db[uiLang][k] = cur; saveProg(db); return cur.stars;
  }
  function progInc(uiLang, dictKey, id, delta){ return progSet(uiLang, dictKey, id, progGet(uiLang, dictKey, id) + (delta|0)); }
  function progIsLearned(uiLang, dictKey, id){
    var max = (App.Trainer && App.Trainer.starsMax ? App.Trainer.starsMax() : 5);
    return progGet(uiLang, dictKey, id) >= max;
  }

  // ---------- public API ----------
  App.Mistakes = {
    // независимый прогресс «МОш»
    progress: {
      getStars: function(dictKey,id){ return progGet(activeLang(), dictKey, id); },
      setStars: function(dictKey,id,val){ return progSet(activeLang(), dictKey, val); },
      incStar:  function(dictKey,id,delta){ return progInc(activeLang(), dictKey, id, delta||1); },
      reset:    function(dictKey,id){ return progSet(activeLang(), dictKey, id, 0); },
      isLearned:function(dictKey,id){ return progIsLearned(activeLang(), dictKey, id); }
    },

    add: function(id, card, sourceKey){
      try{
        id = String(id);
        var dictKey = sourceKey || (card && card.sourceKey) || (App.dictRegistry && App.dictRegistry.activeKey) || null;
        if (!dictKey) return;
        var uiLang = activeLang();
        var dkLang = langOfKey(dictKey) || null;

        var db = load();
        var bucket = ensure(db, uiLang, dictKey);

        if (!bucket[id]) bucket[id] = { ts: now(), seen: 1, dl: dkLang };
        else { bucket[id].seen = (bucket[id].seen|0)+1; bucket[id].ts = now(); if (dkLang) bucket[id].dl = dkLang; }

        save(db);
      }catch(e){}
    },

    list: function(){
      var uiLang = activeLang(), tLang = targetLang();
      var db = load(), L = db[uiLang] || {}, out = [];
      for (var dk in L){ if (!L.hasOwnProperty(dk)) continue;
        var map = L[dk]; if (!map) continue;
        for (var id in map){ if (!map.hasOwnProperty(id)) continue;
          var e = map[id];
          if (tLang && e && e.dl && e.dl !== tLang) continue;
          if (!wordExists(dk, id)) continue;
          out.push({ id: id, dictKey: dk, ts: e.ts||0 });
        }
      }
      out.sort(function(a,b){ return (b.ts|0) - (a.ts|0); });
      return out;
    },

    count: function(){
      var uiLang = activeLang(), tLang = targetLang();
      var db = load(), L = db[uiLang] || {}, total = 0;
      for (var dk in L){ if (!L.hasOwnProperty(dk)) continue;
        var map = L[dk]; if (!map) continue;
        for (var id in map){ if (!map.hasOwnProperty(id)) continue;
          var e = map[id];
          if (tLang && e && e.dl && e.dl !== tLang) continue;
          if (!wordExists(dk, id)) continue;
          total++;
        }
      }
      return total;
    },

    deck: function(){
      var uiLang = activeLang(), tLang = targetLang();
      var db = load(), L = db[uiLang] || {}, out=[], perIdx={};

      for (var dk in L){ if (!L.hasOwnProperty(dk)) continue;
        var deck = resolveDeck(dk);
        if (!deck || !deck.length) continue;
        perIdx[dk] = indexDeckById(deck);
      }
      for (var dk in L){ if (!L.hasOwnProperty(dk)) continue;
        var idx = perIdx[dk]; if (!idx) continue;
        var map = L[dk];
        for (var id in map){ if (!map.hasOwnProperty(id)) continue;
          var e = map[id];
          if (tLang && e && e.dl && e.dl !== tLang) continue;
          var w = idx[String(id)];
          if (!w) continue;
          var ww = Object.assign({}, w);
          ww._mistakeSourceKey = dk;
          out.push(ww);
        }
      }
      out.sort(function(a,b){
        var ea = (L[a._mistakeSourceKey]||{})[String(a.id)];
        var eb = (L[b._mistakeSourceKey]||{})[String(b.id)];
        var ta = ea?ea.ts:0, tb = eb?eb.ts:0;
        return (tb|0) - (ta|0);
      });
      return out;
    },

    sourceKeyFor: function(id){
      var uiLang = activeLang(); var db = load(); var L = db[uiLang] || {};
      id = String(id);
      for (var dk in L){ if (!L.hasOwnProperty(dk)) continue;
        if (L[dk] && L[dk][id]) return dk;
      }
      return null;
    },

    clearActive: function(){
      var ui = activeLang();
      var db = load(); if (db[ui]) { db[ui] = {}; save(db); }
      try{ var p = loadProg(); if (p[ui]) { p[ui] = {}; saveProg(p); } }catch(e){}
    },

    onShow: function(id){
      var uiLang = activeLang(); var db = load(); var L = db[uiLang] || {};
      id = String(id);
      for (var dk in L){ if (!L.hasOwnProperty(dk)) continue;
        var m=L[dk]; if (m && m[id]) { m[id].ts = now(); break; }
      }
      save(db);
    }
  };
})();
