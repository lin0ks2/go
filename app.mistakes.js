/**
 * app.mistakes.js
 *
 * Хранение ошибок — ПО ЯЗЫКУ ИНТЕРФЕЙСА (App.settings.lang).
 * Каждая запись также содержит язык словаря-источника (dl),
 * чтобы на чтении фильтровать по языку АКТИВНОГО словаря.
 *
 * localStorage key: 'mistakes.v1'
 * Структура:
 * {
 *   <uiLang>: {
 *     <dictKey>: {
 *       <wordId>: { ts:<ms>, seen:<n>, dl:<dictLang|null> }
 *     }
 *   }
 * }
 */
(function(){
  var App = window.App || (window.App = {});
  var LS_KEY = 'mistakes.v1';
  var MAX_PER_LANG = 1000; // лимит уникальных слов на язык интерфейса

  // ---------- utils ----------
  function load(){
    try{
      var raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function save(db){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(db)); }catch(e){}
  }
  function activeLang(){               // язык интерфейса (RU/UK/…)
    return (App.settings && App.settings.lang) || 'ru';
  }
  function langOfKey(dictKey){         // язык словаря-источника (de/en/…)
    try{
      if (App.Decks && App.Decks.langOfKey) return App.Decks.langOfKey(dictKey);
    }catch(e){}
    return null;
  }
  function targetLang(){               // язык ТЕКУЩЕГО активного словаря (если есть)
    try{
      var key = App.dictRegistry && App.dictRegistry.activeKey;
      if (key && key !== 'mistakes') return langOfKey(key) || null;
    }catch(e){}
    return null; // если активен 'mistakes' или активный словарь неизвестен — не фильтруем по словарному языку
  }
  function now(){ return Date.now ? Date.now() : (+new Date()); }

  function ensure(db, uiLang, dictKey){
    if (!db[uiLang]) db[uiLang] = {};
    if (!db[uiLang][dictKey]) db[uiLang][dictKey] = {};
    return db[uiLang][dictKey];
  }
  function totalCountForLang(db, uiLang){
    var total=0, L=db[uiLang]||{};
    for (var k in L){ if (!L.hasOwnProperty(k)) continue;
      total += Object.keys(L[k]||{}).length;
    }
    return total;
  }
  function evictIfNeeded(db, uiLang){
    var total = totalCountForLang(db, uiLang);
    if (total <= MAX_PER_LANG) return;
    var L=db[uiLang]||{}, items=[];
    for (var dk in L){ if (!L.hasOwnProperty(dk)) continue;
      var map=L[dk];
      for (var id in map){ if (!map.hasOwnProperty(id)) continue;
        items.push([dk, id, map[id].ts||0]);
      }
    }
    // удаляем самые старые
    items.sort(function(a,b){ return (a[2]|0) - (b[2]|0); });
    var toDrop = total - MAX_PER_LANG;
    for (var i=0; i<toDrop && i<items.length; i++){
      var dk = items[i][0], id = items[i][1];
      delete L[dk][id];
    }
  }
  function resolveDeck(dictKey){
    if (App.Decks && App.Decks.resolveDeckByKey) {
      return App.Decks.resolveDeckByKey(dictKey) || [];
    }
    return [];
  }
  function indexDeckById(deck){
    var idx={};
    for (var i=0;i<deck.length;i++){ idx[String(deck[i].id)] = deck[i]; }
    return idx;
  }

  // ---------- public API ----------
  App.Mistakes = {
    /**
     * Добавить/обновить ошибку.
     * ВАЖНО: бакет = ТЕКУЩИЙ ЯЗЫК ИНТЕРФЕЙСА (UI).
     * Дополнительно сохраняем язык словаря-источника (dl),
     * чтобы потом фильтровать без внешних зависимостей.
     */
    add: function(id, card, sourceKey){
      try{
        id = String(id);
        var dictKey = sourceKey || (card && card.sourceKey) || (App.dictRegistry && App.dictRegistry.activeKey) || null;
        if (!dictKey) return;

        var uiLang = activeLang();
        var dkLang = langOfKey(dictKey) || null;

        var db = load();
        var bucket = ensure(db, uiLang, dictKey);

        if (!bucket[id]) {
          bucket[id] = { ts: now(), seen: 1, dl: dkLang };
        } else {
          bucket[id].seen = (bucket[id].seen|0)+1;
          bucket[id].ts = now();
          if (dkLang) bucket[id].dl = dkLang; // обновляем dl, если язык источника распознан
        }

        evictIfNeeded(db, uiLang);
        save(db);
      }catch(e){}
    },

    /** Список (превью) для ТЕКУЩЕГО языка интерфейса; фильтр по языку активного словаря (если известен). */
    list: function(){
      var uiLang = activeLang();
      var db = load();
      var L = db[uiLang] || {};
      var tLang = targetLang();

      var out=[];
      for (var dk in L){ if (!L.hasOwnProperty(dk)) continue;
        var m=L[dk];
        for (var id in m){ if (!m.hasOwnProperty(id)) continue;
          var entry = m[id];
          // фильтр по языку словаря: если известен tLang и у записи есть dl — сравниваем по dl
          if (tLang && entry && entry.dl && entry.dl !== tLang) continue;
          out.push({ id: id, dictKey: dk, ts: entry.ts||0 });
        }
      }
      out.sort(function(a,b){ return (b.ts|0) - (a.ts|0); });
      return out;
    },

    /** Кол-во уникальных ошибок для ТЕКУЩЕГО UI-языка; фильтр по языку активного словаря. */
    count: function(){
      var uiLang = activeLang();
      var db = load();
      var L = db[uiLang] || {};
      var tLang = targetLang();

      var total=0;
      for (var dk in L){ if (!L.hasOwnProperty(dk)) continue;
        var map=L[dk]; if (!map) continue;
        for (var id in map){ if (!map.hasOwnProperty(id)) continue;
          var entry = map[id];
          if (tLang && entry && entry.dl && entry.dl !== tLang) continue;
          total++;
        }
      }
      return total;
    },

    /**
     * Тренировочная колода для ТЕКУЩЕГО UI-языка; фильтр по языку активного словаря.
     * Параллельно чистим «битые» id, которых уже нет в исходном словаре.
     */
    deck: function(){
      var uiLang = activeLang();
      var db = load();
      var L = db[uiLang] || {};
      var tLang = targetLang();

      var out=[];
      var perDictIndex = {};

      // Индексируем только те словари, у которых потенциально пригодятся записи
      for (var dk in L){ if (!L.hasOwnProperty(dk)) continue;
        var deck = resolveDeck(dk);
        if (!deck || !deck.length) continue;
        perDictIndex[dk] = indexDeckById(deck);
      }

      // Валидируем/собираем
      for (var dk in L){ if (!L.hasOwnProperty(dk)) continue;
        var idx = perDictIndex[dk]; if (!idx) continue;
        var map = L[dk];
        for (var id in map){ if (!map.hasOwnProperty(id)) continue;
          var entry = map[id];
          if (tLang && entry && entry.dl && entry.dl !== tLang) continue; // фильтр по языку словаря-источника
          var w = idx[id];
          if (w){
            var ww = Object.assign({}, w);
            ww._mistakeSourceKey = dk;
            out.push(ww);
          } else {
            // битая запись (слово удалили/поменялся id) — вычищаем
            delete map[id];
          }
        }
      }
      if (out.length) save(db);

      // Сортировка: новые — вперёд
      out.sort(function(a,b){
        var mapA = (L[a._mistakeSourceKey]||{}), mapB = (L[b._mistakeSourceKey]||{});
        var eA = mapA[String(a.id)], eB = mapB[String(b.id)];
        var ta = eA?eA.ts:0, tb = eB?eB.ts:0;
        return (tb|0) - (ta|0);
      });
      return out;
    },

    /** Словарь-источник для id (в ТЕКУЩЕМ UI-бакете). */
    sourceKeyFor: function(id){
      var uiLang = activeLang();
      var db = load();
      var L = db[uiLang] || {};
      id = String(id);
      for (var dk in L){ if (!L.hasOwnProperty(dk)) continue;
        if (L[dk] && L[dk][id]) return dk;
      }
      return null;
    },

    /** Очистить ошибки для ТЕКУЩЕГО UI-языка. */
    clearActive: function(){
      var uiLang = activeLang();
      var db = load();
      if (db[uiLang]) { db[uiLang] = {}; save(db); }
    },

    /** Отметить показ карточки (обновить recency). */
    onShow: function(id){
      var uiLang = activeLang();
      var db = load();
      var L = db[uiLang] || {};
      id = String(id);
      for (var dk in L){ if (!L.hasOwnProperty(dk)) continue;
        var m=L[dk];
        if (m && m[id]) { m[id].ts = now(); break; }
      }
      save(db);
    }
  };
})();
