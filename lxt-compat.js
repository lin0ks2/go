
// lxt-compat.js — glue fixes: lang filter -> lazy load, default verbs, Info modal from i18n
(function(){
  function onReady(fn){ if (document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  onReady(function(){
    var App = window.App || (window.App={});
    // wrap saveSettings to react on dictsLangFilter changes
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
    // enforce {lang}_verbs at start
    setTimeout(function(){
      try{
        var k = (App.dictRegistry && App.dictRegistry.activeKey) || null;
        var lang = (App.settings && App.settings.dictsLangFilter) || 'en';
        if (!k || !/_verbs\b/.test(String(k))){
          if (App.switchDeck) App.switchDeck((lang||'en')+'_verbs');
        }
      }catch(e){}
    }, 0);
    // Info modal
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
