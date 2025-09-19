(function () {
  const App = window.App || (window.App = {});
  const D = App.DOM || (App.DOM = {});

  // local helper, чтобы не зависеть от App.clamp
  const _clamp = (val, min, max) => {
    const n = +val;
    return Math.min(max, Math.max(min, Number.isFinite(n) ? n : 0));
  };

  function current() {
    const deck = App.Decks.resolveDeckByKey(App.dictRegistry.activeKey) || [];
    if (!deck.length) return { id: -1, word: '', uk: '', ru: '' };
    if (App.state.index < 0 || App.state.index >= deck.length) App.state.index = 0;
    return deck[App.state.index];
  }

  function renderStars() {
    const w = current();
    const score = _clamp(App.state.stars[w.id] || 0, 0, App.Trainer.starsMax());
    const host = D.starsEl;
    if (!host) return;
    host.innerHTML = '';
    for (let i = 0; i < App.Trainer.starsMax(); i++) {
      const s = document.createElement('span');
      s.className = 'starIcon' + (i < score ? ' filled' : '');
      s.textContent = '★';
      host.appendChild(s);
    }
  }

  function onChoice(btn, correct) {
    const w = current();
    const cur = _clamp(App.state.stars[w.id] || 0, 0, App.Trainer.starsMax());
    if (correct) {
      App.state.stars[w.id] = _clamp(cur + 1, 0, App.Trainer.starsMax());
    } else {
      App.state.stars[w.id] = _clamp(cur - 1, 0, App.Trainer.starsMax());
    }
    renderStars();
  }

  App.renderStars = renderStars;
})();