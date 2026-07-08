/* ============================================================
   BUSINESS SCHOOL AMANAT — CORE v3.3
   Константы, состояние, утилиты, язык, переводы,
   курсор, idle-маяк, тема, отзывы, popup лендинга,
   таймер обратного отсчёта
   ============================================================ */

'use strict';

// ══════════════════════════════ CONSTANTS ══════════════════════════
const SHEET_ID_DEFAULT = '16oQKh2SxwtNCNDAFr1lOg-3wdnkd-Lvago7S4ZyRpis';
const LOG_SCRIPT_URL   = 'https://script.google.com/macros/s/AKfycbw70U3y7CRr18ig-87FILlYQK2syJ539pbONP-5JEyC8NegaZ0GjvI-ZXA4F2x19xPolQ/exec';

// ── Запасные значения настроек ────────────────────────────────────
// Вступают в силу только если в localStorage и в Лист2 ничего нет.
const HERO_VIDEO_ID_DEFAULT = '';                          // YouTube ID по умолчанию
const TIMER_CONFIG_DEFAULT  = '{"mode":"float","days":3}'; // JSON конфига таймера

// Всегда возвращает актуальный URL скрипта (из adminpanel или дефолт)
function getScriptUrl() {
  return localStorage.getItem('bs_script_url') || LOG_SCRIPT_URL;
}

// ── Возвращает актуальный конфиг таймера ─────────────────────────
// Приоритет: localStorage (установлен из Sheets или админкой) → константа
function getTimerConfig() {
  try {
    return JSON.parse(localStorage.getItem('lp_timer_config') || TIMER_CONFIG_DEFAULT);
  } catch (_) {
    return JSON.parse(TIMER_CONFIG_DEFAULT);
  }
}

// ⚠️ Пароль не хранится в открытом виде — только SHA-256 хеш
const ADMIN_PW_HASH  = '7404297e91a4ab5b540fceefb2c0030cc24965b1ac4591c774435421b5d8b9ad';
const DEFAULT_COLORS = ['#e31e24','#9d4ed0','#0055ff','#22c48a','#f5c842','#ff5c35','#229ED9','#e1306c','#ff9800','#00bcd4'];

// ══════════════════════════════ STATE ══════════════════════════════
let lang               = 'ru';
let currentUser        = null;
let gsSheetId          = localStorage.getItem('gs_sheet_id') || SHEET_ID_DEFAULT;
let courses            = [];
let currentCourseIdx   = null;
let currentLessonIndex = 0;
let watchedLessons     = JSON.parse(localStorage.getItem('watched_lessons') || '{}');
let currentTheme       = localStorage.getItem('theme') || 'dark';
let lessonSearchQuery  = '';
let courseSearchQuery  = '';
let currentYtId        = null;
let ytStartTime        = 0;
let tapTimer           = null;
let logoClickCount     = 0;
let logoClickTimer     = null;
let filterCoursesTimer = null;
let filterLessonsTimer = null;

// ─── YouTube IFrame Player API ──────────────────────────
let ytPlayer       = null;
let ytApiReady     = false;
let currentVideoEl = null;

window.onYouTubeIframeAPIReady = function() { ytApiReady = true; };

// ─── Theater / fullscreen state ─────────────────────────
let isTheaterMode = false;

let catalogFulfillmentUrl = '';
let catalogGoldUrl        = '';
let waUrl                 = '';
let tgUrl                 = '';
let waAccessUrl           = '';
let tgChannelUrl          = '';

let securityCheckInterval = null;
let demoTimerInterval     = null;
let demoyYtPlayer         = null;
let demoIsTheater         = false;

// ══════════════════════════════ DOM UTILS ══════════════════════════
const $       = id => document.getElementById(id);
const setText = (id, v) => { const e=$(id); if(e) e.textContent = v; };
const setHtml = (id, v) => { const e=$(id); if(e) e.innerHTML = v; };
const setHref = (id, url) => { const e=$(id); if(e && url) e.href = url; };
const sleep   = ms => new Promise(r => setTimeout(r, ms));

// ── setFaqAnswer: пишет в .lp-faq-a-inner, сохраняя обёртку для grid-collapse ──
function setFaqAnswer(id, html) {
  const wrap = document.getElementById(id);
  if (!wrap) return;
  let inner = wrap.querySelector('.lp-faq-a-inner');
  if (!inner) {
    inner = document.createElement('div');
    inner.className = 'lp-faq-a-inner';
    wrap.appendChild(inner);
  }
  inner.innerHTML = html;
}

// ══════════════════════════════ REVIEWS DATA ═══════════════════════
const REVIEWS = {
  ru: [
    { text: '«Запустила магазин на Wildberries через месяц обучения. Поддержка куратора на высшем уровне — всегда на связи и помогает разобраться»', name: 'Айгерим С.', city: 'Алматы', init: 'АС', grad: 'linear-gradient(135deg,#f5c842,#ff9800)', photo: 'https://api.dicebear.com/7.x/personas/svg?seed=aigerim-almaty&backgroundColor=ffd93d' },
    { text: '«За 3 месяца вышел на стабильный доход с маркетплейсов. Уроки структурированы логично — всё по делу, без воды»', name: 'Нурлан М.', city: 'Астана', init: 'НМ', grad: 'linear-gradient(135deg,#22c48a,#0055ff)', photo: 'https://api.dicebear.com/7.x/personas/svg?seed=nurlan-astana&backgroundColor=6c8ebf' },
    { text: '«Искала обучение по Kaspi — нашла здесь. Куратор всегда на связи, отвечает быстро. Материал актуальный. Очень довольна!»', name: 'Дина К.', city: 'Алматы', init: 'ДК', grad: 'linear-gradient(135deg,#229ED9,#9d4ed0)', photo: 'https://api.dicebear.com/7.x/personas/svg?seed=dina-karaganda&backgroundColor=a8d8ea' },
    { text: '«Начинала с нуля, сейчас мой магазин на Ozon приносит стабильный доход. Курс структурирован очень понятно»', name: 'Мадина Т.', city: 'Шымкент', init: 'МТ', grad: 'linear-gradient(135deg,#e31e24,#ff9800)', photo: 'https://api.dicebear.com/7.x/personas/svg?seed=madina-shymkent&backgroundColor=ffb347' },
    { text: '«Самое ценное — живая поддержка куратора. Никогда не чувствовала, что осталась одна с вопросами»', name: 'Зарина А.', city: 'Тараз', init: 'ЗА', grad: 'linear-gradient(135deg,#f5c842,#22c48a)', photo: 'https://api.dicebear.com/7.x/personas/svg?seed=zarina-taraz&backgroundColor=b8e994' },
    { text: '«Через 2 месяца после курса открыл второй магазин. Business School Amanat — это реальный результат, не обещания»', name: 'Серик Б.', city: 'Астана', init: 'СБ', grad: 'linear-gradient(135deg,#0055ff,#22c48a)', photo: 'https://api.dicebear.com/7.x/personas/svg?seed=serik-astana&backgroundColor=82b1ff' },
  ],
  kz: [
    { text: '«Бір ай оқудан кейін Wildberries-те дүкен аштым. Куратор қолдауы өте жоғары деңгейде»', name: 'Айгерим С.', city: 'Алматы', init: 'АС', grad: 'linear-gradient(135deg,#f5c842,#ff9800)', photo: 'https://api.dicebear.com/7.x/personas/svg?seed=aigerim-almaty&backgroundColor=ffd93d' },
    { text: '«3 айда маркетплейстерден тұрақты табысқа шықтым. Сабақтар логикалы, нақты, бос сөзсіз»', name: 'Нурлан М.', city: 'Астана', init: 'НМ', grad: 'linear-gradient(135deg,#22c48a,#0055ff)', photo: 'https://api.dicebear.com/7.x/personas/svg?seed=nurlan-astana&backgroundColor=6c8ebf' },
    { text: '«Kaspi бойынша оқуды іздедім — осында таптым. Куратор әрқашан байланыста. Өте риза болдым!»', name: 'Дина К.', city: 'Алматы', init: 'ДК', grad: 'linear-gradient(135deg,#229ED9,#9d4ed0)', photo: 'https://api.dicebear.com/7.x/personas/svg?seed=dina-karaganda&backgroundColor=a8d8ea' },
    { text: '«Нөлден бастадым, қазір Ozon-дағы дүкенім тұрақты табыс әкелуде. Курс өте түсінікті»', name: 'Мадина Т.', city: 'Шымкент', init: 'МТ', grad: 'linear-gradient(135deg,#e31e24,#ff9800)', photo: 'https://api.dicebear.com/7.x/personas/svg?seed=madina-shymkent&backgroundColor=ffb347' },
    { text: '«Ең бағалысы — куратордың тірі қолдауы. Сұрақтарыммен жалғыз қалғаным болмады»', name: 'Зарина А.', city: 'Тараз', init: 'ЗА', grad: 'linear-gradient(135deg,#f5c842,#22c48a)', photo: 'https://api.dicebear.com/7.x/personas/svg?seed=zarina-taraz&backgroundColor=b8e994' },
    { text: '«Курстан кейін 2 ай өтіп екінші дүкен аштым. Business School Amanat — уәде емес, нақты нәтиже»', name: 'Серік Б.', city: 'Астана', init: 'СБ', grad: 'linear-gradient(135deg,#0055ff,#22c48a)', photo: 'https://api.dicebear.com/7.x/personas/svg?seed=serik-astana&backgroundColor=82b1ff' },
  ]
};

// ═══ REVIEWS GRID (4-в-ряд, авторотация) ═══
let _revGridIdx  = 0;
let _revSlotNext = 0;
let _revGridTimer = null;

function renderReviewsGrid() {
  const reviews = REVIEWS[lang] || REVIEWS.ru;
  for (let s = 0; s < 4; s++) {
    const r = reviews[s % reviews.length];
    _fillRevSlot(s, r, false);
  }
  _revGridIdx  = 4 % reviews.length;
  _revSlotNext = 0;
  _startRevRotation();
}

function _fillRevSlot(slotIdx, review, animate) {
  const slot = document.getElementById('lp-rev-slot-' + slotIdx);
  if (!slot) return;
  const avaInner = review.photo
    ? `<img src="${review.photo}" alt="${escHtml(review.name)}" class="lp-review-ava-img" onerror="this.style.display='none';this.parentNode.classList.add('lp-review-ava--fallback');this.parentNode.textContent='${review.init}'">`
    : review.init;
  const avaStyle = review.photo ? '' : ` style="background:${review.grad}"`;
  const avaClass = review.photo ? 'lp-review-ava lp-review-ava--photo' : 'lp-review-ava';
  const html = `<div class="lp-review-card">
    <div class="lp-review-stars">★★★★★</div>
    <p class="lp-review-text">${escHtml(review.text)}</p>
    <div class="lp-review-author">
      <div class="${avaClass}"${avaStyle}>${avaInner}</div>
      <div><div class="lp-review-name">${escHtml(review.name)}</div>
      <div class="lp-review-city">${escHtml(review.city)}</div></div>
    </div></div>`;
  if (!animate) { slot.innerHTML = html; return; }
  slot.style.opacity = '0';
  slot.style.transition = 'opacity 0.35s ease';
  setTimeout(() => { slot.innerHTML = html; slot.style.opacity = ''; }, 350);
}

function _startRevRotation() {
  if (_revGridTimer) clearInterval(_revGridTimer);
  const reviews = REVIEWS[lang] || REVIEWS.ru;
  if (reviews.length <= 4) return;
  _revGridTimer = setInterval(() => {
    const rv = REVIEWS[lang] || REVIEWS.ru;
    _fillRevSlot(_revSlotNext, rv[_revGridIdx], true);
    _revSlotNext = (_revSlotNext + 1) % 4;
    _revGridIdx  = (_revGridIdx + 1) % rv.length;
  }, 3000);
}

// Останавливает ротацию отзывов — вызывается при переходе на страницу платформы
window._stopRevRotation = function() {
  if (_revGridTimer) { clearInterval(_revGridTimer); _revGridTimer = null; }
};

function renderLandingCarousel() { renderReviewsGrid(); }
function goCarousel() {}
function startCarouselTimer() {}

// ══════════════════════════════ CURSOR ════════════════════════════
(function initCursor() {
  if (window.matchMedia('(hover: none)').matches) return;
  const cur = $('cursor'), fol = $('cursor-follower'), tip = $('cursor-tooltip');
  if (!cur || !fol) return;
  document.body.classList.add('cursor-active');
  let mx = 0, my = 0, fx = 0, fy = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cur.style.transform = `translate(${mx - 4}px, ${my - 4}px)`;
    if (tip) { tip.style.left = (mx + 18) + 'px'; tip.style.top  = (my - 10) + 'px'; }
    resetIdleBeacon();
  });
  (function animFol() {
    fx += (mx - fx - 18) * 0.14;
    fy += (my - fy - 18) * 0.14;
    fol.style.transform = `translate(${fx}px, ${fy}px)`;
    requestAnimationFrame(animFol);
  })();

  const tooltipMap = {
    '#lp-hero-btn-wa':   () => t('cursorEnterPrice'),
    '.lp-btn-primary':   () => t('cursorEnterPrice'),
    '.lp-btn-secondary': () => t('cursorLogin'),
    '#login-btn':        () => t('cursorLogin'),
    '.demo-card':        () => t('cursorDemo'),
    '.lp-demo-preview':  () => t('cursorDemo'),
    '.platform-card':    () => t('cursorWatch'),
    '.demo-toggle-btn':  () => t('cursorDemo'),
    '.resume-beacon':    () => t('cursorContinue'),
  };

  document.addEventListener('mouseover', e => {
    const el = e.target;
    const hoverable = el.closest('a, button, [role="button"], .clickable, .platform-card, .action-card');
    cur.classList.toggle('hovering', !!hoverable);
    fol.classList.toggle('hovering', !!hoverable);
    if (!tip) return;
    const dataTip = el.closest('[data-tip]');
    if (dataTip) { showCursorTip(dataTip.dataset.tip); return; }
    for (const [sel, fn] of Object.entries(tooltipMap)) {
      if (el.closest(sel)) { showCursorTip(fn()); return; }
    }
    hideCursorTip();
  });
  document.addEventListener('mouseout', () => hideCursorTip());
})();

function showCursorTip(text) {
  const tip = $('cursor-tooltip');
  if (!tip || !text) return;
  tip.textContent = text;
  tip.classList.add('visible');
}
function hideCursorTip() {
  const tip = $('cursor-tooltip');
  if (tip) tip.classList.remove('visible');
}

// ── Idle beacon ────────────────────────────────────────────────────
let _idleBeaconTimer  = null;
let _idleBeaconActive = false;
function resetIdleBeacon() {
  clearTimeout(_idleBeaconTimer);
  if (_idleBeaconActive) removeIdleBeacon();
  _idleBeaconTimer = setTimeout(showIdleBeacon, 5000);
}
function showIdleBeacon() {
  const lp = $('landing-page');
  if (!lp || lp.style.display === 'none') return;
  const btn = lp.querySelector('.lp-btn-primary');
  if (!btn) return;
  _idleBeaconActive = true;
  btn.classList.add('idle-beacon');
}
function removeIdleBeacon() {
  _idleBeaconActive = false;
  document.querySelectorAll('.idle-beacon').forEach(el => el.classList.remove('idle-beacon'));
}
document.addEventListener('click', removeIdleBeacon);
setTimeout(resetIdleBeacon, 100);

// ══════════════════════════════ THEME ════════════════════════════
function initTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
}
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', currentTheme);
  initTheme();
}
function initAutoTheme() {
  const manualTheme = localStorage.getItem('manualTheme');
  if (manualTheme) return;
  const hour = new Date().getHours();
  const shouldBeDark = hour >= 22 || hour < 7;
  const target = shouldBeDark ? 'dark' : 'light';
  if (currentTheme !== target) {
    currentTheme = target;
    localStorage.setItem('theme', currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
    const msg = shouldBeDark ? 'Переключили на тёмную тему 🌙' : 'Переключили на светлую тему ☀️';
    showToast(msg, 'success');
  }
}
initTheme();
initAutoTheme();

// ══════════════════════════════ LP POPUP ═════════════════════════
function closeLpPopup(e, force) {
  if (e && e.target && !e.target.classList.contains('lp-popup-overlay') && !force) return;
  const overlay = document.getElementById('lp-popup-overlay');
  if (!overlay) return;
  overlay.classList.add('lp-popup-hiding');
  setTimeout(() => { overlay.style.display = 'none'; overlay.classList.remove('lp-popup-hiding'); }, 300);
}

function showLpPopup() {
  const lp = document.getElementById('landing-page');
  if (!lp || lp.style.display === 'none') return;
  const overlay = document.getElementById('lp-popup-overlay');
  if (!overlay) return;
  const waBtn = document.getElementById('lp-popup-wa-btn');
  if (waBtn) {
    const waNum = (waAccessUrl && waAccessUrl.match(/wa\.me\/(\d+)/))
      ? waAccessUrl.match(/wa\.me\/(\d+)/)[1]
      : '77776020216';
    waBtn.href = `https://wa.me/${waNum}?text=${encodeURIComponent(t('waTextPrice'))}`;
  }
  overlay.style.display = 'flex';
}

(function initLpPopup() {
  const LS_KEY = 'bs_lp_popup_ts';
  const TTL_MS = 48 * 60 * 60 * 1000;

  function shouldShow() {
    if (typeof currentUser !== 'undefined' && currentUser) return false; // уже авторизован
    try {
      const ts = localStorage.getItem(LS_KEY);
      if (ts && (Date.now() - Number(ts)) < TTL_MS) return false;
    } catch(_) {}
    const lp = document.getElementById('landing-page');
    return lp && lp.style.display !== 'none';
  }

  function triggerPopup() {
    if (!shouldShow()) return;
    try { localStorage.setItem(LS_KEY, Date.now()); } catch(_) {}
    document.removeEventListener('mouseleave', onExitIntent);
    clearTimeout(fallbackTimer);
    showLpPopup();
  }

  function onExitIntent(e) { if (e.clientY < 10) triggerPopup(); }

  let fallbackTimer;
  if (window.innerWidth >= 768) {
    document.addEventListener('mouseleave', onExitIntent);
    fallbackTimer = setTimeout(triggerPopup, 40000);
  } else {
    fallbackTimer = setTimeout(triggerPopup, 40000);
    var _mobileScrolledDown = false;
    window.addEventListener('scroll', function _mobileScrollTrigger() {
      if (!_mobileScrolledDown && window.scrollY > 300) {
        _mobileScrolledDown = true;
      } else if (_mobileScrolledDown && window.scrollY < 100) {
        window.removeEventListener('scroll', _mobileScrollTrigger);
        clearTimeout(fallbackTimer);
        triggerPopup();
      }
    }, { passive: true });
  }
})();

// ══════════════════════════════ COUNTDOWN ════════════════════════
let _cdInterval = null;

function initCountdown(deadlineStr) {
  const bar = document.getElementById('lp-countdown');
  if (!bar) return;
  if (_cdInterval) { clearInterval(_cdInterval); _cdInterval = null; }
  if (!deadlineStr) { bar.style.display = 'none'; return; }

  let deadline;
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadlineStr)) {
    deadline = new Date(deadlineStr + 'T23:59:59');
  } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(deadlineStr)) {
    const [d, m, y] = deadlineStr.split('.');
    deadline = new Date(`${y}-${m}-${d}T23:59:59`);
  } else { bar.style.display = 'none'; return; }

  function tick() {
    const diff = deadline - Date.now();
    if (diff <= 0) { bar.style.display = 'none'; clearInterval(_cdInterval); return; }
    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000)  / 60000);
    const secs  = Math.floor((diff % 60000)    / 1000);
    const pad   = n => String(n).padStart(2, '0');
    const el = id => document.getElementById(id);
    if (el('lp-cd-days'))  el('lp-cd-days').textContent  = pad(days);
    if (el('lp-cd-hours')) el('lp-cd-hours').textContent = pad(hours);
    if (el('lp-cd-mins'))  el('lp-cd-mins').textContent  = pad(mins);
    if (el('lp-cd-secs'))  el('lp-cd-secs').textContent  = pad(secs);
    bar.style.display = '';
  }
  tick();
  _cdInterval = setInterval(tick, 1000);
}

// ══════════════════════════════ LANGUAGE ══════════════════════════
function setLang(l) {
  lang = l;
  window.lang = l;
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === l);
  });
  applyTexts();
  updateHeroVideoTexts();
  const lblEl = $('viewers-label');
  const LABEL = { ru: 'человек смотрят сейчас', kz: 'адам қазір қарауда' };
  if (lblEl) lblEl.textContent = LABEL[lang] || LABEL.ru;
  if (currentCourseIdx !== null && $('lesson-modal').classList.contains('show')) {
    renderLessonList(currentCourseIdx);
    updateModalProgress(currentCourseIdx);
  }
  renderCoursesGrid();
  updateHeroStats();
  if (demoSectionOpen) renderDemoCards();
}

// ══════════════════════════════ APPLY TEXTS ═══════════════════════
function applyTexts() {
  setText('eyebrow-text',     t('eyebrow'));
  setHtml('login-title',      t('loginTitle').replace('\n','<br>'));
  setText('login-subtitle',   t('loginSub'));
  setText('login-hint-text',  t('loginHint'));
  setText('label-name',       t('labelName'));
  setText('label-iin',        t('labelIin'));
  setText('label-phone',      t('labelPhone'));
  setText('btn-text',         t('btnText'));
  setText('logout-label',     t('logout'));
  setHtml('tg-note',          t('tgNote').replace('__WA__', waUrl || 'https://wa.me/77776020216'));
  setHtml('hero-badge',       `<span class="badge-pulse"></span>${t('heroBadge')}`);
  setHtml('hero-h',           t('heroH'));
  setText('hero-sub',         t('heroSub'));
  setText('act-ff-title',     t('actFfTitle'));
  setText('act-ff-desc',      t('actFfDesc'));
  setText('act-gold-title',   t('actGoldTitle'));
  setText('act-gold-desc',    t('actGoldDesc'));
  setText('act-wa-title',     t('actWaTitle'));
  setText('act-wa-desc',      t('actWaDesc'));
  setText('act-tg-title',     t('actTgTitle'));
  setText('act-tg-desc',      t('actTgDesc'));
  setText('plat-title',       t('platTitle'));
  setText('fb-title',         t('fbTitle'));
  setText('fb-desc',          t('fbDesc'));
  setText('wa-btn-text',      t('waBtnText'));
  setText('tg-btn-text',      t('tgBtnText'));
  setText('prev-label',       t('prev'));
  setText('next-label',       t('next'));
  setText('mps-title',        t('progressCourse'));
  setText('completion-title', t('completionTitle'));
  setText('completion-sub',   t('completionSub'));
  setText('achievement-title', t('achievementTitle'));
  setText('img-dl-text',      t('imgDownload'));
  setText('img-open-text',    t('imgOpenOrig'));
  setText('mnav-courses',     t('mnavCourses'));
  setText('mnav-cat',         t('mnavCat'));
  setText('mnav-help',        t('mnavHelp'));
  setText('user-status-text', t('statusText'));
  const ls = $('lesson-search'); if(ls) ls.placeholder = t('searchLessons');
  const cs = $('course-search'); if(cs) cs.placeholder = t('coursesSearch');
  if (currentUser) setText('user-name-badge', t('hello') + ' ' + currentUser + '!');
  document.querySelectorAll('.deco-lbl').forEach(el => { const v = el.dataset[lang]; if (v) el.textContent = v; });
  document.querySelectorAll('.hstat-lbl').forEach(el => { const v = el.dataset[lang]; if (v) el.textContent = v; });

  // ── Лендинг ──
  setText('lp-hero-h1-verb',     t('lpH1Verb'));
  setText('lp-hero-h1-gold',     t('lpH1Gold'));
  setText('lp-hero-h1-end',      t('lpH1End'));
  const prepEl = document.getElementById('lp-hero-h1-prep');
  if (prepEl) { prepEl.textContent = t('lpH1Prep') || ''; prepEl.style.display = lang === 'kz' ? 'none' : ''; }
  setHtml('lp-hero-sub',         t('lpHeroSub'));
  setText('lp-sp-label',          t('lpSpLabel'));
  setText('lp-hero-btn-wa-text', t('lpHeroBtnWa'));
  setText('lp-hero-btn-login',   t('lpHeroBtnLogin'));
  setText('lp-stat-students',    t('lpStatStudents'));
  setText('lp-stat-online',      t('lpStatOnline'));
  setText('lp-stat-support',     t('lpStatSupport'));
  const daysNumEl = document.getElementById('lp-stat-days-num');
  if (daysNumEl) daysNumEl.textContent = lang === 'kz' ? '18 күн' : '18 дней';
  setText('lp-feat-label',       t('lpFeatLabel'));
  setText('lp-feat-h',           t('lpFeatH'));
  setText('lp-feat1-title',      t('lpFeat1Title'));
  setText('lp-feat1-desc',       t('lpFeat1Desc'));
  setText('lp-feat2-title',      t('lpFeat2Title'));
  setText('lp-feat2-desc',       t('lpFeat2Desc'));
  setText('lp-feat3-title',      t('lpFeat3Title'));
  setText('lp-feat3-desc',       t('lpFeat3Desc'));
  setText('lp-feat4-title',      t('lpFeat4Title'));
  setText('lp-feat4-desc',       t('lpFeat4Desc'));
  setText('lp-rev-label',        t('lpRevLabel'));
  setText('lp-rev-h',            t('lpRevH'));
  renderLandingCarousel();
  updateHeroVideoTexts();
  setText('lp-demo-label',       t('lpDemoLabel'));
  setText('lp-demo-h',           t('lpDemoH'));
  setText('lp-demo-sub',         t('lpDemoSub'));
  setText('lp-demo-btn',         t('lpDemoBtn'));
  setText('lp-demo-badge',       t('lpDemoBadge'));
  setText('demo-btn-text',     t('demoBtnText'));
  setText('demo-hint',         t('demoHintText'));
  setHtml('lp-cta-h',            t('lpCtaH'));
  setText('lp-cta-sub',          t('lpCtaSub'));
  setText('lp-cta-wa-btn',       t('lpCtaWaBtn'));
  setText('lp-guarantee-hero-text', t('lpGuarantee'));
  setText('lp-guarantee-cta-text',  t('lpGuarantee'));
  setText('lp-cta-login-btn',    t('lpCtaLoginBtn'));
  setText('lp-back-btn-text',    t('lpBackBtn'));

  // ── Блок цены ──
  setText('lp-price-label',    t('lpPriceLabel'));
  setText('lp-price-h',        t('lpPriceH'));
  setText('lp-price-sub',      t('lpPriceSub'));
  setText('lp-price-badge',    t('lpPriceBadge'));
  setText('lp-price-number',   t('lpPriceNumber'));
  setText('lp-price-period',   t('lpPricePeriod'));
  setText('lp-price-inc1',     t('lpPriceInc1'));
  setText('lp-price-inc2',     t('lpPriceInc2'));
  setText('lp-price-inc3',     t('lpPriceInc3'));
  setText('lp-price-inc4',     t('lpPriceInc4'));
  setText('lp-price-inc5',     t('lpPriceInc5'));
  setText('lp-price-inc6',     t('lpPriceInc6'));
  setText('lp-price-btn-text', t('lpPriceBtn'));
  setText('lp-price-guarantee',t('lpPriceGuarantee'));

  // ── Таймер ──
  setText('lp-timer-badge',  t('lpTimerBadge'));
  setText('lp-timer-label',  t('lpTimerLabel'));
  setText('lp-timer-unit-h', t('lpTimerUnitH'));
  setText('lp-timer-unit-m', t('lpTimerUnitM'));
  setText('lp-timer-unit-s', t('lpTimerUnitS'));

  // ── Калькулятор ──
  setText('lp-calc-label',      t('lpCalcLabel'));
  setText('lp-calc-h',          t('lpCalcH'));
  setText('lp-calc-desc',       t('lpCalcDesc'));
  setText('lp-calc-lbl-market', t('lpCalcLblMarket'));
  setText('lp-calc-cta-text',   t('lpCalcCtaText'));
  const calcBtnEl = document.querySelector('#lp-calc-ai-btn .lp-calc-ai-btn-text');
  if (calcBtnEl) calcBtnEl.textContent = t('lpCalcBtnText');
  const calcInput = document.getElementById('lp-calc-input');
  if (calcInput) calcInput.placeholder = t('lpCalcInputPlaceholder');
  const calcStepLabel = document.querySelector('.lp-calc-step-label');
  if (calcStepLabel) { const spans = calcStepLabel.querySelectorAll('span'); if (spans.length >= 2) spans[1].textContent = t('lpCalcStepLabel'); }
  const calcEmptyText = document.querySelector('.lp-calc-empty-text');
  if (calcEmptyText) calcEmptyText.innerHTML = t('lpCalcEmptyText').replace('\n', '<br>');
  const calcResHeaderText = document.querySelector('.lp-calc-res-header-text');
  if (calcResHeaderText) {
    let prodStrong = calcResHeaderText.querySelector('#lp-calc-product-name');
    if (!prodStrong) { prodStrong = document.createElement('strong'); prodStrong.id = 'lp-calc-product-name'; prodStrong.textContent = '—'; }
    else { prodStrong.remove(); }
    calcResHeaderText.textContent = t('lpCalcResHeader');
    calcResHeaderText.appendChild(prodStrong);
  }
  const aiInsightLabel = document.querySelector('.lp-calc-ai-insight-label');
  if (aiInsightLabel) aiInsightLabel.innerHTML = '<span aria-hidden="true">✦</span> ' + escHtml(t('lpCalcAiLabel'));
  const barLbls = document.querySelectorAll('.lp-calc-bar-lbl');
  const monthKeys = ['lpCalcMonth1', 'lpCalcMonth2', 'lpCalcMonth3'];
  barLbls.forEach((el, i) => { if (monthKeys[i]) el.textContent = t(monthKeys[i]); });
  const summaryLbls = document.querySelectorAll('.lp-calc-summary-lbl');
  const summaryKeys = ['lpCalcRevenueLbl', 'lpCalcProfitLbl', 'lpCalcCapitalLbl'];
  summaryLbls.forEach((el, i) => { if (summaryKeys[i]) el.textContent = t(summaryKeys[i]); });
  const calcTipsTitle = document.querySelector('.lp-calc-tips-title');
  if (calcTipsTitle) calcTipsTitle.textContent = t('lpCalcTipsTitle');
  const calcDisc = document.querySelector('.lp-calc-disclaimer');
  if (calcDisc) calcDisc.textContent = t('lpCalcDisc');
  const calcRetryBtn = document.querySelector('.lp-calc-retry-btn');
  if (calcRetryBtn) {
    let textNode = null;
    calcRetryBtn.childNodes.forEach(n => {
      if (n.nodeType === Node.TEXT_NODE) textNode = n;
    });
    if (textNode) {
      textNode.textContent = ' ' + t('lpCalcRetry');
    } else {
      calcRetryBtn.appendChild(document.createTextNode(' ' + t('lpCalcRetry')));
    }
  }
  const calcTagEls = document.querySelectorAll('.lp-calc-tag');
  const tagKeys = ['lpCalcTag1', 'lpCalcTag2', 'lpCalcTag3', 'lpCalcTag4', 'lpCalcTag5', 'lpCalcTag6'];
  const tagRawKz = ['Балалар шұлықтары','Қол кремі','Телефон қапшығы','Төсек-орын жабдықтары','Антистресс','Су бутылкасы'];
  const tagRawRu = ['Детские носки','Крем для рук','Чехол для телефона','Постельное бельё','Игрушка антистресс','Спортивная бутылка'];
  calcTagEls.forEach((btn, i) => {
    if (i >= tagKeys.length) return;
    btn.textContent = t(tagKeys[i]);
    const raw = (lang === 'kz' ? tagRawKz[i] : tagRawRu[i]) || '';
    if (raw) btn.setAttribute('onclick', `setCalcProduct('${raw.replace(/'/g, "\\'")}')`);
  });

  // ── Сравнение ──
  setText('lp-cmp-label',      t('lpCmpLabel'));
  setText('lp-cmp-h',          t('lpCmpH'));
  setText('lp-cmp-intro',      t('lpCmpIntro'));
  setText('lp-cmp-with-hdr',   t('lpCmpWithHdr'));
  setText('lp-cmp-with-sub',   t('lpCmpWithSub'));
  setText('lp-cmp-y1t', t('lpCmpY1t'));  setText('lp-cmp-y1d', t('lpCmpY1d'));
  setText('lp-cmp-y2t', t('lpCmpY2t'));  setText('lp-cmp-y2d', t('lpCmpY2d'));
  setText('lp-cmp-y3t', t('lpCmpY3t'));  setText('lp-cmp-y3d', t('lpCmpY3d'));
  setText('lp-cmp-y4t', t('lpCmpY4t'));  setText('lp-cmp-y4d', t('lpCmpY4d'));
  setText('lp-cmp-y5t', t('lpCmpY5t'));  setText('lp-cmp-y5d', t('lpCmpY5d'));
  setText('lp-cmp-y6t', t('lpCmpY6t'));  setText('lp-cmp-y6d', t('lpCmpY6d'));
  setText('lp-cmp-y7t', t('lpCmpY7t'));  setText('lp-cmp-y7d', t('lpCmpY7d'));
  setText('lp-cmp-cta-text',    t('lpCmpCtaText'));
  setText('lp-cmp-without-hdr', t('lpCmpWithoutHdr'));
  setText('lp-cmp-without-sub', t('lpCmpWithoutSub'));
  setText('lp-cmp-n1t', t('lpCmpN1t'));  setText('lp-cmp-n1d', t('lpCmpN1d'));
  setText('lp-cmp-n2t', t('lpCmpN2t'));  setText('lp-cmp-n2d', t('lpCmpN2d'));
  setText('lp-cmp-n3t', t('lpCmpN3t'));  setText('lp-cmp-n3d', t('lpCmpN3d'));
  setText('lp-cmp-n4t', t('lpCmpN4t'));  setText('lp-cmp-n4d', t('lpCmpN4d'));
  setText('lp-cmp-n5t', t('lpCmpN5t'));  setText('lp-cmp-n5d', t('lpCmpN5d'));
  setText('lp-cmp-n6t', t('lpCmpN6t'));  setText('lp-cmp-n6d', t('lpCmpN6d'));
  setText('lp-cmp-n7t', t('lpCmpN7t'));  setText('lp-cmp-n7d', t('lpCmpN7d'));
  setText('lp-cmp-no-cta', t('lpCmpNoCta'));

  // ── FAQ ──
  setText('lp-faq-label',        t('lpFaqLabel'));
  setText('lp-faq-h',            t('lpFaqH'));
  setText('lp-faq-intro',        t('lpFaqIntro'));
  setText('lp-faq-q1', t('lpFaqQ1')); setFaqAnswer('lp-faq-a1', t('lpFaqA1'));
  setText('lp-faq-q2', t('lpFaqQ2')); setFaqAnswer('lp-faq-a2', t('lpFaqA2'));
  setText('lp-faq-q3', t('lpFaqQ3')); setFaqAnswer('lp-faq-a3', t('lpFaqA3'));
  setText('lp-faq-q4', t('lpFaqQ4')); setFaqAnswer('lp-faq-a4', t('lpFaqA4'));
  setText('lp-faq-q5', t('lpFaqQ5')); setFaqAnswer('lp-faq-a5', t('lpFaqA5'));
  setText('lp-faq-q6', t('lpFaqQ6')); setFaqAnswer('lp-faq-a6', t('lpFaqA6'));
  setText('lp-faq-q7', t('lpFaqQ7')); setFaqAnswer('lp-faq-a7', t('lpFaqA7'));
  setText('lp-faq-cta-text',     t('lpFaqCtaText'));
  setText('lp-faq-cta-btn-text', t('lpFaqCtaBtnText'));

  // ── Финальный popup ──
  setText('lp-popup-h',       t('lpPopupH'));
  setText('lp-popup-sub',     t('lpPopupSub'));
  setText('lp-popup-wa-text', t('lpPopupWaText'));
  setText('lp-popup-skip',    t('lpPopupSkip'));

  // ── Калькулятор — ID-based ──
  // Примечание: lp-calc-empty-text, lp-calc-disclaimer, lp-calc-ai-btn-text
  // обновляются выше через querySelector (строки 505–539).
  // lp-calc-retry-btn не имеет id — обновляется через querySelector на строке 533.
  const calcStepNumEl = document.getElementById('lp-calc-step-num');
  if (calcStepNumEl) calcStepNumEl.textContent = '1';
  const calcStepLabelById = document.getElementById('lp-calc-step-label-text');
  if (calcStepLabelById) calcStepLabelById.textContent = t('lpCalcStepLabel');
  setText('lp-calc-bar-lbl-1', t('lpCalcMonth1'));
  setText('lp-calc-bar-lbl-2', t('lpCalcMonth2'));
  setText('lp-calc-bar-lbl-3', t('lpCalcMonth3'));
  setText('lp-calc-summary-lbl-1', t('lpCalcRevenueLbl'));
  setText('lp-calc-summary-lbl-2', t('lpCalcProfitLbl'));
  setText('lp-calc-summary-lbl-3', t('lpCalcCapitalLbl'));
  const aiInsightLabelById = document.getElementById('lp-calc-ai-insight-label');
  if (aiInsightLabelById) aiInsightLabelById.innerHTML = '<span aria-hidden="true">✦</span> ' + escHtml(t('lpCalcAiLabel'));
  setText('lp-calc-tips-title', t('lpCalcTipsTitle'));
  const calcResHeaderById = document.getElementById('lp-calc-res-header-text');
  if (calcResHeaderById) {
    let prodStrong = calcResHeaderById.querySelector('#lp-calc-product-name');
    if (!prodStrong) { prodStrong = document.createElement('strong'); prodStrong.id = 'lp-calc-product-name'; prodStrong.textContent = '—'; }
    else { prodStrong.remove(); }
    calcResHeaderById.textContent = t('lpCalcResHeader');
    calcResHeaderById.appendChild(prodStrong);
  }

  // ── Social proof ──
  const spToastActionEl = document.querySelector('.sp-toast-action');
  if (spToastActionEl) spToastActionEl.textContent = t('spToastAction');

  // ── Sticky CTA ──
  const stickyCtaLabel = document.getElementById('sticky-cta-label');
  if (stickyCtaLabel) stickyCtaLabel.textContent = t('stickyCta');
  const stickyLoginBtn = document.getElementById('sticky-cta-login-btn');
  if (stickyLoginBtn) stickyLoginBtn.textContent = t('stickyLogin');

  // ── Таймер срочности ──
  const cdLabel = document.getElementById('lp-countdown-label');
  if (cdLabel) cdLabel.textContent = t('cdLabel');
  const cdUnits = [['lp-cd-days-lbl','cdDays'],['lp-cd-hours-lbl','cdHours'],['lp-cd-mins-lbl','cdMins'],['lp-cd-secs-lbl','cdSecs']];
  cdUnits.forEach(([id, key]) => { const el = document.getElementById(id); if (el) el.textContent = t(key); });

  // ── WA-ссылки ──
  (function updateWaLinks() {
    function buildHref(el, textKey) {
      if (!el) return;
      const waNum = (typeof waAccessUrl !== 'undefined' && waAccessUrl)
        ? (waAccessUrl.match(/wa\.me\/(\d+)/) || [])[1]
        : (el.href.match(/wa\.me\/(\d+)/) || [])[1] || '77776020216';
      el.href = `https://wa.me/${waNum}?text=${encodeURIComponent(t(textKey))}`;
    }
    buildHref(document.querySelector('.sticky-cta-wa'),  'waTextAccess');
    buildHref(document.getElementById('lp-hero-btn-wa'), 'waTextAccess');
    buildHref(document.querySelector('.lp-cmp-cta-btn'), 'waTextPrice');
    buildHref(document.querySelector('.lp-faq-cta-btn'), 'waTextQuestion');
    buildHref(document.getElementById('lp-cta-wa-link'), 'waTextBuy');
    buildHref(document.getElementById('mob-wa-btn'),      'waTextAccess');
    buildHref(document.getElementById('lp-price-btn'),    'waTextBuy');
  })();

  const mobWaText = document.getElementById('mob-wa-text');
  if (mobWaText) mobWaText.textContent = t('stickyCta');

  // ── Cert + Progress модали ──
  const certModalTitleEl = document.getElementById('cert-modal-title');
  if (certModalTitleEl) certModalTitleEl.textContent = t('certModalTitle');
  const certModalSubEl = document.getElementById('cert-modal-sub');
  if (certModalSubEl) certModalSubEl.textContent = t('certModalSub');
  const certGetLabelEl = document.getElementById('cert-get-label');
  if (certGetLabelEl) certGetLabelEl.textContent = t('certGetBtn');
  const certDlLabelEl = document.getElementById('cert-download-label');
  if (certDlLabelEl) certDlLabelEl.textContent = t('certDownloadBtn');
  const certGenLabelEl = document.getElementById('cert-gen-label');
  if (certGenLabelEl) certGenLabelEl.textContent = t('certGenLabel');
  const progressTitleEl = document.getElementById('progress-modal-title');
  if (progressTitleEl) progressTitleEl.textContent = t('progressModalTitle');
  const progressNavLabelEl = document.getElementById('progress-nav-btn-label');
  if (progressNavLabelEl) progressNavLabelEl.textContent = t('progressNavBtn');

  // Fix H: viewers-label в applyTexts (стабильность при любом вызове)
  const viewersLabelEl = document.getElementById('viewers-label');
  if (viewersLabelEl) viewersLabelEl.textContent = lang === 'kz' ? 'адам қазір қарауда' : 'человек смотрят сейчас';

  // ── Секция курсов ──
  const isKz = lang === 'kz';
  const coursesLabel = document.querySelector('.lp-courses-section .lp-section-label');
  if (coursesLabel) coursesLabel.textContent = isKz ? 'Оқыту бағдарламасы' : 'Программа обучения';
  const coursesH = document.querySelector('.lp-courses-section .lp-section-h');
  if (coursesH) coursesH.textContent = isKz
    ? '3 негізгі маркетплейс + 6 бонустық курс сыйлыққа'
    : '3 основных маркетплейса + 6 бонусных курсов в подарок';
  const mainLabel = document.querySelector('.lp-courses-group-label:not(.lp-courses-group-label--bonus)');
  if (mainLabel) mainLabel.textContent = isKz ? '🔥 Негізгі курстар' : '🔥 Основные курсы';
  const bonusLabel = document.querySelector('.lp-courses-group-label--bonus');
  if (bonusLabel) bonusLabel.innerHTML = isKz
    ? '🎁 Бонустық курстар — сыйлыққа <span class="lp-courses-bonus-note">Негізгілерге қосымша. Доплатасыз.</span>'
    : '🎁 Бонусные курсы — в подарок <span class="lp-courses-bonus-note">Идут в дополнение к основным. Без доплат.</span>';

  // ── Кнопка WA в контейнере авторизации ──
  const loginWaLink  = document.getElementById('login-wa-link');
  const loginWaText  = document.getElementById('login-wa-text');
  const loginWaLabel = document.getElementById('login-wa-label');
  const loginWaBadge = document.getElementById('login-wa-badge');
  if (loginWaLink) {
    const waNum = (waAccessUrl && waAccessUrl.match(/wa\.me\/(\d+)/))
      ? waAccessUrl.match(/wa\.me\/(\d+)/)[1]
      : '77776020216';
    loginWaLink.href = `https://wa.me/${waNum}?text=${encodeURIComponent(
      lang === 'kz'
        ? 'Сәлеметсіз бе, платформаға кіру туралы білгім келеді'
        : 'Здравствуйте, хочу узнать о доступе к платформе'
    )}`;
  }
  if (loginWaText)  loginWaText.textContent  = lang === 'kz' ? 'WhatsApp-та жазу' : 'Написать в WhatsApp';
  if (loginWaLabel) loginWaLabel.textContent = lang === 'kz' ? 'Кіру мүмкіндігі жоқ па немесе көмек керек пе?' : 'Нет доступа или нужна помощь?';
  if (loginWaBadge) loginWaBadge.textContent = lang === 'kz' ? '5 минутта жауап' : 'Ответим за 5 мин';
}

// ══════════════════════════════ APPLY LINKS ═══════════════════════
function applyLinks() {
  const setLink = (id, url, fallback) => {
    const el = $(id);
    if (!el) return;
    el.href = url || '#';
    if (!url && fallback) {
      el.onclick = e => { e.preventDefault(); showToast(t('linkNotSet'), 'error'); };
    } else { el.onclick = null; }
  };
  setLink('submenu-fulfillment', catalogFulfillmentUrl, true);
  setLink('submenu-gold',        catalogGoldUrl, true);
  setLink('wa-action-link',      waUrl, true);
  setLink('tg-action-link',      tgUrl, true);

  const waBtnEl   = $('wa-btn');
  const waBtnText = $('wa-btn-text');
  if (currentUser) {
    setLink('wa-btn', waUrl);
    if (waBtnText) waBtnText.textContent = t('headerWaSupport');
  } else {
    if (waBtnEl) { waBtnEl.href = waAccessUrl || '#'; waBtnEl.onclick = null; }
    if (waBtnText) waBtnText.textContent = t('headerWaAccess');
  }

  const tgBtnEl   = $('tg-btn');
  const tgBtnText = $('tg-btn-text');
  if (currentUser) {
    if (tgBtnEl) tgBtnEl.style.display = '';
    setLink('tg-btn', tgUrl);
    if (tgBtnText) tgBtnText.textContent = t('headerTgCurator');
  } else {
    if (tgBtnEl) tgBtnEl.style.display = 'none';
  }
  setLink('cat-modal-ff',   catalogFulfillmentUrl);
  setLink('cat-modal-gold', catalogGoldUrl);

  const tgCh = $('tg-channel-btn');
  if (tgCh) { tgCh.href = tgChannelUrl || '#'; tgCh.style.display = tgChannelUrl ? 'inline-flex' : 'none'; }
  const tn = $('tg-note');
  if (tn) tn.innerHTML = t('tgNote').replace('__WA__', waUrl || 'https://wa.me/77776020216');

  // ── Кнопка «Смотреть все отзывы в Telegram» на лендинге ──
  const btnReviews = $('btn-all-reviews');
  const btnReviewsWrap = $('btn-all-reviews-wrap');
  if (btnReviews && btnReviewsWrap) {
    if (tgChannelUrl) {
      btnReviews.href = tgChannelUrl;
      btnReviewsWrap.style.display = '';
    } else {
      btnReviewsWrap.style.display = 'none';
    }
    const textEl = document.getElementById('btn-all-reviews-text');
    if (textEl) {
      textEl.textContent = lang === 'kz'
        ? 'Барлық пікірлерді Telegram-да көру'
        : 'Смотреть все отзывы в Telegram';
    }
  }

  // ── data-ru / data-kz — универсальный переключатель текстов ──
  document.querySelectorAll('[data-ru]').forEach(function(el) {
    var val = el.getAttribute('data-' + lang) || el.getAttribute('data-ru');
    if (val !== null) el.textContent = val;
  });

  applyLoginPageReviews();
}

// ══════════════════════════════ COLOR UTILS ═══════════════════════
function hexToRgba(hex, a) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  return `rgba(${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)},${a})`;
}
function darkenHex(hex, pct) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const r = Math.max(0, parseInt(hex.slice(0,2),16) - pct);
  const g = Math.max(0, parseInt(hex.slice(2,4),16) - pct);
  const b = Math.max(0, parseInt(hex.slice(4,6),16) - pct);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
function lightenHex(hex, pct) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const r = Math.min(255, parseInt(hex.slice(0,2),16) + pct);
  const g = Math.min(255, parseInt(hex.slice(2,4),16) + pct);
  const b = Math.min(255, parseInt(hex.slice(4,6),16) + pct);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ══════════════════════════════ HTML UTILS ════════════════════════
function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function safeAttr(s) {
  return (s || '').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
}
const easeOut = t => 1 - Math.pow(1 - t, 3);

// ══════════════════════════════ HEADER SCROLL ═════════════════════
window.addEventListener('scroll', () => {
  const h = document.querySelector('.header-inner');
  if (h) h.style.background = window.scrollY > 20
    ? (currentTheme === 'dark' ? 'rgba(6,6,8,0.95)'  : 'rgba(245,245,250,0.97)')
    : (currentTheme === 'dark' ? 'rgba(6,6,8,0.82)'  : 'rgba(245,245,250,0.9)');
}, { passive: true });