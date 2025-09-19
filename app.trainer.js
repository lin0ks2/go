(function(){
  const App = window.App || (window.App = {});

  // local helper (без глобальной зависимости)
  const _clamp = (val, min, max) => {
    const n = +val;
    return Math.min(max, Math.max(min, Number.isFinite(n) ? n : 0));
  };

  App.Trainer = App.Trainer || {};
  App.Trainer.starsMax = function(){ return 6; };

  function weightForWord(wordId){
    const score = (App.state && App.state.stars && App.state.stars[wordId]) || 0;
    return 1 - _clamp(score / App.Trainer.starsMax(), 0, 1);
  }

  App.Trainer.sampleNextIndexWeighted = function(deck){
    if (!deck || !deck.length) return 0;
    const weights = deck.map(w => weightForWord(w.id));
    const total = weights.reduce((a,b)=>a+b,0);
    if (total <= 0) return Math.floor(Math.random()*deck.length);
    let r = Math.random() * total;
    for (let i=0;i<deck.length;i++){
      r -= weights[i];
      if (r<=0) return i;
    }
    return 0;
  };
})();