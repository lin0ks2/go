
/* app.core.js — saveState debounced (P0) */
(function(){
  const App = window.App || (window.App = {});
  const LS = 'app.state.v1';

  // Load on start (existing behavior preserved)
  App.state = (function(){
    try { return JSON.parse(localStorage.getItem(LS) || '{}'); }
    catch(e){ return {}; }
  })();

  // Debounced saveState (coalesced writes)
  let _saveTimer = null;
  let _pendingState = null;
  const _write = function(){
    try {
      localStorage.setItem(LS, JSON.stringify(_pendingState || App.state || {}));
    } catch(e) {}
    _saveTimer = null;
    _pendingState = null;
  };

  App.saveState = function(next){
    if (next && typeof next === 'object') App.state = next;
    _pendingState = App.state;
    if (_saveTimer) return;
    // Prefer requestIdleCallback if available, fallback to 80ms debounce
    if (typeof window.requestIdleCallback === 'function'){
      _saveTimer = requestIdleCallback(_write, { timeout: 200 });
    } else {
      _saveTimer = setTimeout(_write, 80);
    }
  };

  App.loadState = function(){ try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch(e){ return {}; } };
})();
