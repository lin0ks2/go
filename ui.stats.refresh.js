
/* ui.stats.refresh.js — P0: single batched refresh per frame, no duplicate hooks */
(function(){
  const App = window.App || (window.App = {});
  const D = App.DOM || (App.DOM = {});

  let scheduled = false;
  function rafRefresh(){
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function(){
      scheduled = false;
      try { if (typeof App.renderSetStats === 'function') App.renderSetStats(); } catch(_){}
      try {
        const t = App.i18n ? App.i18n() : { totalWords:'Всего слов', learned:'Выучено' };
        if (App.DOM && App.DOM.statsBar && typeof App.getLearnedCounts === 'function' && typeof App.getActiveDictKey === 'function'){
          const key = App.getActiveDictKey();
          const counts = App.getLearnedCounts(key);
          App.DOM.statsBar.textContent = (t.totalWords||'Всего слов') + ': ' + counts.total + ' / ' + (t.learned||'Выучено') + ': ' + counts.learned;
        } else if (typeof App.updateStats === 'function'){ App.updateStats(); }
      } catch(_){}
    });
  }

  // Public minimal API to request refresh once
  window.UIRefresh = { request: rafRefresh };
})();
