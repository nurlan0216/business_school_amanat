/* ============================================================
   BUSINESS SCHOOL AMANAT — LP v3.3
   Лендинг: FAQ, таймер, social proof, sticky CTA,
   compare-анимация, демо-секция, hero-видео,
   landing-навигация, init
   ============================================================ */

// ══ FAQ ═══════════════════════════════════════════════════════════
function toggleFaq(item) {
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.lp-faq-item.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

/* FAQ section scroll-in observer */
(function() {
  function _initFaqObserver() {
    const faqSection = document.querySelector('.lp-faq-section');
    if (!faqSection) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setTimeout(() => faqSection.classList.add('in-view'), 50);
          io.disconnect();
        }
      });
    }, { threshold: 0.05 });
    io.observe(faqSection);
  }
  if (document.readyState !== 'loading') { _initFaqObserver(); }
  else { document.addEventListener('DOMContentLoaded', _initFaqObserver); }
})();

// ══ LANDING TIMER ═════════════════════════════════════════════════
function initLandingTimer() {
  const elH = document.getElementById('lp-timer-h');
  const elM = document.getElementById('lp-timer-m');
  const elS = document.getElementById('lp-timer-s');
  const section = document.getElementById('lp-timer-section');
  if (!elH || !elM || !elS) return;

  const STORAGE_KEY = 'lp_timer_deadline';

  // ── Читаем конфиг из админки ──────────────────────────────────
  let timerConfig = {};
  try { timerConfig = JSON.parse(localStorage.getItem('lp_timer_config') || '{}'); } catch (_) {}

  const MODE         = timerConfig.mode || 'float';
  const FLOAT_DAYS   = Math.max(1, parseInt(timerConfig.days) || 3);
  const DURATION_MS  = FLOAT_DAYS * 24 * 60 * 60 * 1000;
  const RESET_MS     = 7 * 24 * 60 * 60 * 1000;

  let deadline;
  let isFixed = false;

  if (MODE === 'fixed' && timerConfig.fixedDate) {
    // Фиксированный режим: дедлайн задан администратором
    deadline  = new Date(timerConfig.fixedDate).getTime();
    isFixed   = true;
  } else {
    // Плавающий режим: дедлайн от первого визита, хранится в localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { ts, exp } = JSON.parse(saved);
        if (Date.now() < exp) { deadline = ts; }
      }
    } catch (_) {}

    if (!deadline) {
      deadline = Date.now() + DURATION_MS;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: deadline, exp: Date.now() + RESET_MS })); } catch (_) {}
    }
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick(el, val) {
    el.textContent = pad(val);
    el.classList.remove('tick');
    void el.offsetWidth;
    el.classList.add('tick');
    setTimeout(() => el.classList.remove('tick'), 130);
  }

  let lastSec = -1;
  function update() {
    const remaining = Math.max(0, deadline - Date.now());
    const totalSec  = Math.floor(remaining / 1000);
    if (totalSec === lastSec) return;
    lastSec = totalSec;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    tick(elS, s);
    if (Math.floor(((totalSec + 1) % 3600) / 60) !== m || totalSec === 0) tick(elM, m);
    if (Math.floor((totalSec + 1) / 3600) !== h || totalSec === 0) tick(elH, h);
    elH.textContent = pad(h);
    elM.textContent = pad(m);
    if (section) {
      if (remaining < 10 * 60 * 1000) section.classList.add('urgent');
      else section.classList.remove('urgent');
    }
    // Сброс только в плавающем режиме
    if (remaining === 0 && !isFixed) {
      deadline = Date.now() + DURATION_MS;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: deadline, exp: Date.now() + RESET_MS })); } catch (_) {}
      lastSec = -1;
    }
  }

  update();
  setInterval(update, 250);
}

// ══ SOCIAL PROOF COUNTER ══════════════════════════════════════════
function initSocialProofCounter() {
  const el = document.getElementById('lp-sp-num');
  if (!el) return;
  const target = 2400, from = 1800, duration = 1400;
  const start = Date.now();
  function tick() {
    const elapsed = Date.now() - start;
    const progress = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + (target - from) * eased);
    el.textContent = current >= 1000
      ? Math.floor(current / 1000) + ' ' + String(current % 1000).padStart(3, '0')
      : current;
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = '2 400';
  }
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { tick(); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
  } else {
    setTimeout(tick, 400);
  }
}

// ══ SOCIAL PROOF TOAST ════════════════════════════════════════════
const SP_NAMES = [
  { name: 'Новый студент', city: 'Казахстан', emoji: '👤' },
  { name: 'Новый студент', city: 'Казахстан', emoji: '👤' },
  { name: 'Новый студент', city: 'Казахстан', emoji: '👤' },
];

let spToastTimer = null;
let spToastEnabled = false; // управляется из showLanding() / showLessonsPage()

function initSocialProofToast() {
  function scheduleNext() {
    if (!spToastEnabled) return; // не планируем если лендинг неактивен
    const delay = 45000 + Math.random() * 45000;
    spToastTimer = setTimeout(showSpToast, delay);
  }
  scheduleNext();
}

function showSpToast() {
  if (!spToastEnabled) return; // не планируем следующий показ если лендинг неактивен
  const lp = document.getElementById('landing-page');
  if (!lp || lp.style.display !== 'block') { initSocialProofToast(); return; }
  const person = SP_NAMES[Math.floor(Math.random() * SP_NAMES.length)];
  const el = $('social-proof-toast');
  const nameEl = $('sp-toast-name');
  if (!el || !nameEl) return;
  el.querySelector('.sp-toast-avatar').textContent = person.emoji;
  nameEl.textContent = lang === 'kz' ? 'Жаңа студент' : 'Новый студент';
  const actionEl = document.getElementById('sp-toast-action');
  if (actionEl) actionEl.textContent = t('spToastAction');
  el.style.display = 'flex';
  requestAnimationFrame(() => { el.classList.add('sp-visible'); });
  setTimeout(() => {
    el.classList.remove('sp-visible');
    setTimeout(() => { el.style.display = 'none'; }, 400);
  }, 4000);
  initSocialProofToast();
}

// ══ STICKY CTA BAR ════════════════════════════════════════════════
(function initStickyCta() {
  let lastScroll = 0, stickyShown = false;
  window.addEventListener('scroll', () => {
    const lp = $('landing-page');
    if (!lp || lp.style.display === 'none') return;
    const bar = $('sticky-cta-bar');
    if (!bar) return;
    const scrollY = window.scrollY;
    if (scrollY > 300 && scrollY > lastScroll) {
      if (!stickyShown) { bar.style.display = 'block'; requestAnimationFrame(() => bar.classList.add('sticky-visible')); stickyShown = true; }
    } else if (scrollY < lastScroll) {
      if (stickyShown) { bar.classList.remove('sticky-visible'); stickyShown = false; }
    }
    lastScroll = scrollY;
  }, { passive: true });
})();

// Патч showLanding — скрываем sticky bar при возврате на лендинг
// и включаем social proof toast
(function() {
  if (typeof window.showLanding === 'function') {
    const _orig = window.showLanding;
    window.showLanding = function() {
      const bar = document.getElementById('sticky-cta-bar');
      if (bar) bar.classList.remove('sticky-visible');
      spToastEnabled = true;
      _orig.apply(this, arguments);
    };
  }
})();

// Глобальная функция для остановки toast при уходе с лендинга
// Вызывается из showLessonsPage() и triggerInstantBlock()
window._stopSpToast = function() {
  spToastEnabled = false;
  if (spToastTimer) { clearTimeout(spToastTimer); spToastTimer = null; }
};

// Патч toggleTheme — сохраняем ручной выбор
if (typeof toggleTheme === 'function') {
  const _origToggleTheme = toggleTheme;
  window.toggleTheme = function() {
    localStorage.setItem('manualTheme', '1');
    _origToggleTheme.call(this);
  };
}

// ══ INIT FEATURES ═════════════════════════════════════════════════
(function initFeatures() {
  setTimeout(() => { spToastEnabled = true; initSocialProofToast(); }, 15000);

  // Auto theme при загрузке — делегируем app-core.js (без toast, manualTheme проверяется внутри)
  if (typeof initAutoTheme === 'function') initAutoTheme();

  // Compare section — scroll-triggered animation
  (function initCompareAnimation() {
    const section = document.querySelector('.lp-compare-section');
    if (!section || !window.IntersectionObserver) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { section.classList.add('in-view'); io.disconnect(); }
      });
    }, { threshold: 0.15 });
    io.observe(section);
  })();
})();

// ══ MAIN INIT ═════════════════════════════════════════════════════
(async function init() {
  applyTexts();
  initLandingTimer();
  initOnlineCounter();
  initSocialProofCounter();
  const restored = await tryRestoreSession();
  if (!restored) {
    if (gsSheetId) loadSheet2();
    else if (typeof applyHeroVideo === 'function') applyHeroVideo();
    const lp = document.getElementById('landing-page');
    if (lp) lp.style.display = 'block';
    $('login-page').style.display   = 'none';
    $('lessons-page').style.display = 'none';
    resetIdleBeacon();
  }
})();