
// ui.info.js — populate Info modal from i18n and bind buttons
(function(){
  const App = window.App || (window.App={});
  function t(){ return (typeof App.i18n === 'function') ? App.i18n() : {}; }
  function qs(id){ return document.getElementById(id); }

  function renderInfo(){
    const ti = t();
    const titleEl = qs('infoTitle');
    if (titleEl) titleEl.textContent = ti.infoTitle || 'Info';
    const cont = qs('infoContent');
    if (cont){
      cont.innerHTML = '';
      const steps = Array.isArray(ti.infoSteps) ? ti.infoSteps : [];
      if (steps.length){
        const ol = document.createElement('ol');
        for (let s of steps){
          const li = document.createElement('li');
          li.textContent = String(s);
          ol.appendChild(li);
        }
        cont.appendChild(ol);
      }
    }
  }

  function openInfo(){ const m = qs('infoModal'); if (!m) return; renderInfo(); m.classList.remove('hidden'); }
  function closeInfo(){ const m = qs('infoModal'); if (!m) return; m.classList.add('hidden'); }

  function applyButtonI18n(){
    const ti = t();
    const btnInfo = qs('btnInfo'); if (btnInfo){ btnInfo.title = ti.infoTitle||'Info'; btnInfo.setAttribute('aria-label', ti.infoTitle||'Info'); }
    const dictsBtn = qs('dictsBtn'); if (dictsBtn){ dictsBtn.title = ti.modalTitle||'Словари'; dictsBtn.setAttribute('aria-label', ti.modalTitle||'Словари'); }
    const favBtn = qs('favBtn'); if (favBtn){ favBtn.title = ti.favTitle||'Избранное'; favBtn.setAttribute('aria-label', (ti.favAddAria||ti.favTitle||'Избранное')); }
    const themeBtn = qs('themeToggleBtn'); if (themeBtn){ themeBtn.title = ti.themeLabel||'Тема'; themeBtn.setAttribute('aria-label', ti.themeLabel||'Тема'); }
    const langBtn = qs('langToggleBtn'); if (langBtn){ langBtn.title = ti.langLabel||'Язык'; langBtn.setAttribute('aria-label', ti.langLabel||'Язык'); }
  }

  function bind(){
    const btn = qs('btnInfo'); if (btn) btn.addEventListener('click', openInfo);
    const close = qs('infoClose'); if (close) close.addEventListener('click', closeInfo);
    const backdrop = document.querySelector('#infoModal .modalFrame'); 
    if (backdrop){ backdrop.addEventListener('click', function(e){ if (e.target && e.target.closest('.modalFrame')===this && e.target.id!=='infoContent'){} }); }
    applyButtonI18n();
    renderInfo();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
