/* ============================================================
   BUSINESS SCHOOL AMANAT — VIEWERS v3.3
   Online-счётчик, viewers-bar: анимация, обновление,
   маяк «продолжить» (resume beacon)
   ============================================================ */

// ══ ONLINE COUNTER + VIEWERS BAR ═════════════════════════════════
function initOnlineCounter() {
  // ─── 1. Stat-bar counter (lp-online-count) ──────────────────
  const el = $('lp-online-count');
  const MIN_V = 8, MAX_V = 28;
  let count = MIN_V + Math.floor(Math.random() * (MAX_V - MIN_V));
  if (el) el.textContent = count;

  function _fadeUpdate(target, next) {
    if (!target) return;
    target.style.opacity = '0';
    target.style.transition = 'opacity 0.3s';
    setTimeout(() => { target.textContent = next; target.style.opacity = '1'; }, 300);
  }

  // ─── 2. Viewers Bar (bottom-right pill) ─────────────────────
  const bar   = $('viewers-bar');
  const barEl = $('viewers-count');
  const lblEl = $('viewers-label');

  const LABEL = { ru: 'человек смотрят сейчас', kz: 'адам қазір қарауда' };

  function _updateBarLabel() {
    if (lblEl) lblEl.textContent = LABEL[lang] || LABEL.ru;
  }
  _updateBarLabel();

  if (barEl) barEl.textContent = count;

  // Показываем viewers bar с задержкой 5 сек
  let barVisible = false;
  setTimeout(() => {
    if (window._showViewersBar) window._showViewersBar();
  }, 5000);

  function _tick() {
    const rng = Math.random();
    let delta = 0;
    if (rng < 0.55) delta = Math.random() < 0.55 ? 1 : -1;
    else if (rng < 0.80) delta = Math.random() < 0.55 ? 2 : -2;
    const next = Math.min(MAX_V, Math.max(MIN_V, count + delta));
    if (next === count) return scheduleNext();
    const dir = next > count ? 'up' : 'down';
    count = next;

    _fadeUpdate(el, count);

    if (barEl) {
      barEl.classList.add('vb-flip');
      if (bar) { bar.classList.remove('vb-up','vb-down'); bar.classList.add('vb-' + dir); }
      setTimeout(() => { barEl.textContent = count; barEl.classList.remove('vb-flip'); }, 210);
    }

    scheduleNext();
  }

  function scheduleNext() {
    setTimeout(_tick, 8000 + Math.random() * 10000);
  }
  scheduleNext();

  window._hideViewersBar = function() {
    if (!bar || !barVisible) return;
    barVisible = false;
    bar.classList.remove('vb-visible');
    bar.classList.add('vb-hidden');
  };

  window._showViewersBar = function() {
    if (!bar) return;
    barVisible = true;
    bar.style.display = 'flex';
    void bar.offsetWidth;
    bar.classList.remove('vb-hidden');
    bar.classList.add('vb-visible');
    _updateBarLabel();
  };
}

