
// lxt-compat.js — glue fixes v2: default verbs immediately, flags for all langs, info modal
(function(){
  var ALL_LANGS = ['en','de','fr','sr','es'];
  function onReady(fn){ if (document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  onReady(function(){
    var App = window.App || (window.App={});

    // 0) Ensure settings and default filter
    App.settings = App.settings || {};
    if (!App.settings.dictsLangFilter) App.settings.dictsLangFilter = 'en';

    // 1) Wrap saveSettings to react on dict language change
    var origSave = App.saveSettings || function(){};
    App.saveSettings = function(next){
      var prevLang = (App.settings && App.settings.dictsLangFilter) || null;
      origSave.apply(App, arguments);
      try{
        var newLang = (next && next.dictsLangFilter) || (App.settings && App.settings.dictsLangFilter) || null;
        if (newLang && newLang !== prevLang && App.onDictLangChanged){
          App.onDictLangChanged(newLang);
        }
      }catch(e){}
    };

    // 2) Override renderLangFlags to always show full set of flags
    App.renderLangFlags = function(){
      var D = App.DOM || (App.DOM={});
      if (!D.langFlags) return;
      var active = (App.settings && App.settings.dictsLangFilter) || 'en';
      var FLAGS = { en:'🇬🇧', de:'🇩🇪', fr:'🇫🇷', sr:'🇷🇸', es:'🇪🇸' };
      D.langFlags.innerHTML = '';
      ALL_LANGS.forEach(function(lg){
        var b = document.createElement('button');
        b.className = 'flag';
        b.setAttribute('data-lang', lg);
        b.setAttribute('aria-pressed', String(lg===active));
        b.title = (App.i18n && App.i18n()['lang_'+lg]) || lg.toUpperCase();
        b.textContent = FLAGS[lg] || lg.toUpperCase();
        b.addEventListener('click', function(){
          App.settings.dictsLangFilter = lg;
          App.saveSettings && App.saveSettings(App.settings);
        });
        D.langFlags.appendChild(b);
      });
    };

    // 3) Force default {lang}_verbs immediately at first paint
    try{
      if (App.switchDeck){
        var lang = (App.settings && App.settings.dictsLangFilter) || 'en';
        App.switchDeck((lang||'en')+'_verbs');
      }
    }catch(e){}
    // also re-assert shortly after
    setTimeout(function(){
      try{
        var k = (App.dictRegistry && App.dictRegistry.activeKey) || null;
        var lang = (App.settings && App.settings.dictsLangFilter) || 'en';
        if (!k || !/_verbs\b/.test(String(k))){
          if (App.switchDeck) App.switchDeck((lang||'en')+'_verbs');
        }
      }catch(e){}
    }, 50);

    // 4) Info modal (already added earlier) — keep as is
    try{
      var btn = document.getElementById('btnInfo');
      if (btn){
        btn.addEventListener('click', function(){
          var t = (App.i18n && App.i18n()) || {};
          var title = t.infoTitle || 'Info';
          var steps = t.infoSteps || [];
          var D = App.DOM || (App.DOM={});
          var list = D.dictList || document.getElementById('dictList');
          var modalTitle = D.modalTitle || document.getElementById('modalTitle');
          if (modalTitle) modalTitle.textContent = title;
          if (list){
            var html='';
            if (Array.isArray(steps) && steps.length){
              html+='<ol class="infoList">'; steps.forEach(function(s){ html+='<li>'+String(s)+'</li>'; }); html+='</ol>';
            } else {
              html+='<p>'+(t.infoIntro||'How to use Lexitron')+'</p>';
            }
            list.innerHTML=html;
          }
          if (typeof openModal==='function') openModal();
          else { var modal=document.getElementById('modal'); if (modal) modal.classList.remove('hidden'); }
        });
      }
    }catch(e){}
  });
})();
