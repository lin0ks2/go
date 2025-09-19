
// lazy-decks.js — dynamic loader for deck.{lang}.js and registry rebuild
(function(){
  function langFromKey(key){ var m=String(key||'').match(/^([a-z]{2})_/i); return m?m[1].toLowerCase():null; }
  function fallbackKeyForLang(lang){ return (lang||'en').toLowerCase()+'_verbs'; }
  function rebuildRegistry(){
    var App=window.App||(window.App={});
    App.dictRegistry=App.dictRegistry||{list:[],activeKey:null};
    var list=[]; var d=window.decks||{};
    for (var k in d){ if (d.hasOwnProperty(k)) list.push(k); }
    list.sort(); App.dictRegistry.list=list; return list;
  }
  function ensureLoaded(lang){
    return new Promise(function(res){
      lang=(lang||'en').toLowerCase();
      // if already any key for this lang present — ok
      var d=window.decks||{}; for (var k in d){ if (/^[a-z]{2}_/i.test(k) && k.slice(0,2).toLowerCase()===lang) return res(); }
      var s=document.createElement('script'); s.async=true; s.src='deck.'+lang+'.js?v=1';
      s.onload=function(){ res(); }; s.onerror=function(){ console.warn('deck file missing:', s.src); res(); };
      document.head.appendChild(s);
    });
  }
  async function switchTo(key){
    var App=window.App||(window.App={});
    var lang = langFromKey(key) || (App.settings && App.settings.dictsLangFilter) || 'en';
    await ensureLoaded(lang);
    var list=rebuildRegistry();
    if (!window.decks || !window.decks[key]){
      var fb=fallbackKeyForLang(lang);
      key = (window.decks && window.decks[fb]) ? fb : (list[0]||fb);
    }
    App.dictRegistry.activeKey=key;
    try{
      if (typeof renderDictList==='function') renderDictList();
      if (typeof renderDictTitle==='function') renderDictTitle();
      if (typeof renderCard==='function') renderCard(true);
      if (App.Stats && typeof App.Stats.recomputeAndRender==='function') App.Stats.recomputeAndRender();
    }catch(e){ console.error(e); }
  }
  window.App = window.App || {};
  App.onDictLangChanged = function(newLang){
    var lang=(newLang||'en').toLowerCase();
    var key=fallbackKeyForLang(lang);
    return switchTo(key);
  };
  // Expose manual switch
  App.switchDeck = switchTo;
})();
