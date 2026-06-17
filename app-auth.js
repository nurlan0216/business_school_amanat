/* ============================================================
   BUSINESS SCHOOL AMANAT — AUTH v3.3
   Авторизация, выход, восстановление сессии,
   монитор безопасности, admin-панель
   ============================================================ */

// ══════════════════════════════ CSV PARSING ═══════════════════════
function parseCSV(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if      (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { cells.push(cur); cur = ''; }
      else    cur += ch;
    }
    cells.push(cur);
    rows.push(cells.map(c => c.trim()));
  }
  return rows;
}
const strip = s => (s || '').replace(/^"|"$/g, '').trim();

// ══════════════════════════════ SECURITY LIVE MONITOR ═════════════
// Проверяет статус каждые 2 минуты через Apps Script.
// Если Apps Script недоступен — проверка просто пропускается до следующего
// цикла (без фолбэка на прямой публичный доступ к Google Sheets — Лист1
// со всеми данными студентов не должен быть публичным).
// Различает: 🚫 ЗАБЛОКИРОВАНО / 🚫 НАРУШЕНИЕ → сообщение о нарушении.
function startSecurityMonitor() {
  if (securityCheckInterval) clearInterval(securityCheckInterval);
  securityCheckInterval = setInterval(async () => {
    let currentIin = null, currentPhone = '';
    try { currentIin = sessionStorage.getItem('bs_iin'); currentPhone = sessionStorage.getItem('bs_phone') || localStorage.getItem('bs_phone') || ''; } catch(_) {}
    if (!currentUser || !currentIin) return;

    // -- Попытка 1: Apps Script -----------------------------------------
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 10000);
      let res;
      try { res = await fetch(getScriptUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ _type: 'auth', iin: currentIin, phone: currentPhone }), signal: ctrl.signal }); }
      finally { clearTimeout(tid); }
      if (res.ok) {
        const result = await res.json();
        if (!result.found) { triggerInstantBlock('notfound'); return; }
        const leak      = !!result.isLeak || !!result.isMultiAccount;
        const blocked   = !!result.blocked || !!result.isBlocked || !!result.isAdminBlock;
        const violation = !!result.isViolation;
        if (leak)                { triggerInstantBlock('leak');      return; }
        if (blocked || violation) { triggerInstantBlock('violation'); return; }
        if (!result.isAllowed || !result.isPaid) { triggerInstantBlock('noaccess'); return; }
        return;
      }
    } catch (e) { console.warn('[monitor] Apps Script unavailable:', e.message); }
    // Apps Script недоступен — БЕЗ фолбэка на прямой публичный доступ к Google Sheets
    // (Лист1 со всеми данными студентов не должен быть публичным).
    // Monitor просто пропускает эту проверку: не блокирует пользователя,
    // но и не раскрывает данные. Следующая проверка — через 2 минуты.
  }, 120000);
}

function triggerInstantBlock(reason) {
  // reason: 'violation' | 'noaccess' | 'notfound' | undefined
  // 1. Останавливаем монитор
  if (securityCheckInterval) {
    clearInterval(securityCheckInterval);
    securityCheckInterval = null;
  }

  // 2. Полностью очищаем сессию (включая localStorage!)
  currentUser = null;
  currentCourseIdx = null;
  try {
    sessionStorage.removeItem('bs_user');
    sessionStorage.removeItem('bs_iin');
    sessionStorage.removeItem('bs_phone');
  } catch(_) {}
  try { localStorage.removeItem('bs_session'); } catch(_) {}

  // 3. Закрываем всё открытое
  const slot = $('video-slot');
  if (slot) slot.innerHTML = '';
  const _lm = $('lesson-modal'); if (_lm) _lm.classList.remove('show', 'video-active');
  const _vs = $('video-section'); if (_vs) _vs.style.display  = 'none';
  const _lsp = $('lessons-page'); if (_lsp) _lsp.style.display = 'none';
  const _lb = $('logout-btn'); if (_lb) _lb.style.display     = 'none';
  const _mn = $('mobile-nav'); if (_mn) _mn.style.display     = 'none';
  const hdrCenter = $('header-center');
  if (hdrCenter) hdrCenter.style.display = 'none';
  // Убираем всплывашку "Продолжить урок" (resume beacon)
  const resumeBeacon = document.getElementById('resume-beacon-el');
  if (resumeBeacon) resumeBeacon.remove();
  // Убираем viewers bar
  if (typeof window._hideViewersBar === 'function') window._hideViewersBar();
  // Останавливаем social proof toast
  if (typeof window._stopSpToast === 'function') window._stopSpToast();
  // Убираем sticky CTA bar
  const stickyBar = document.getElementById('sticky-cta-bar');
  if (stickyBar) stickyBar.classList.remove('sticky-visible');

  // 4. Очищаем форму входа
  ['inp-name', 'inp-iin', 'inp-phone'].forEach(id => {
    const e = $(id); if (e) e.value = '';
  });
  ['login-error', 'login-success'].forEach(id => {
    const e = $(id); if (e) e.style.display = 'none';
  });
  const pw = $('progress-wrap'); if (pw) pw.style.display = 'none';
  const pf = $('prog-fill'); if (pf) pf.style.width = '0%';
  const btn = $('login-btn');
  if (btn) { btn.disabled = false; btn.classList.remove('loading'); }

  // 5. Переходим на лендинг
  const lp = $('landing-page');
  if (lp) {
    lp.style.display = 'block';
    lp.classList.add('page-fade-in');
    setTimeout(() => lp.classList.remove('page-fade-in'), 400);
  }
  const _lgp = $('login-page'); if (_lgp) _lgp.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 6. Полноэкранный overlay с блокировкой всего контента
  setTimeout(() => {
    const isKz = typeof lang !== 'undefined' && lang === 'kz';

    // ── Данные по причине ────────────────────────────────────────
    const OVERLAY_DATA = {
      leak: {
        icon:  '🚫',
        title: { ru: 'НАРУШЕНИЕ ДОГОВОРА',                kz: 'ШАРТ БҰЗЫЛДЫ' },
        text:  { ru: 'Вы нарушили правила компании и договор, передав доступ третьему лицу (пункт договора 5-10). Ваш аккаунт заблокирован.',
                 kz: 'Сіз компания ережелері мен шартты бұздыңыз, үшінші тұлғаға рұқсат бердіңіз (шарттың 5-10 тармағы). Аккаунт бұғатталды.' },
        contact: { ru: 'Напишите куратору или администратору сайта',
                   kz: 'Куратормен немесе сайт әкімшісіне жазыңыз' },
        waMsg: { ru: 'Здравствуйте, мой аккаунт заблокирован за нарушение договора (пункт 5-10). Прошу разобраться.',
                 kz: 'Сәлеметсіз бе, аккаунтым шартты бұзғаны үшін бұғатталды (5-10 тармақ). Шешуді сұраймын.' }
      },
      violation: {
        icon:  '🔒',
        title: { ru: 'ДОСТУП ПРИОСТАНОВЛЕН',              kz: 'ҚАТЫНАС ТОҚТАТЫЛДЫ' },
        text:  { ru: 'Ваш доступ приостановлен администратором.',
                 kz: 'Сіздің қатынасыңыз әкімші тарапынан тоқтатылды.' },
        contact: { ru: 'Напишите куратору или администратору сайта',
                   kz: 'Куратормен немесе сайт әкімшісіне жазыңыз' },
        waMsg: { ru: 'Здравствуйте, мой доступ приостановлен администратором. Прошу разобраться.',
                 kz: 'Сәлеметсіз бе, қатынасым әкімші тарапынан тоқтатылды. Шешуді сұраймын.' }
      },
      noaccess: null,
      notfound: {
        icon:  '🔴',
        title: { ru: 'АККАУНТ НЕ НАЙДЕН',                kz: 'АККАУНТ ТАБЫЛМАДЫ' },
        text:  { ru: 'Ваш аккаунт не найден в системе.',
                 kz: 'Аккаунтыңыз жүйеде табылмады.' },
        contact: { ru: 'Напишите куратору или администратору сайта',
                   kz: 'Куратормен немесе сайт әкімшісіне жазыңыз' },
        waMsg: { ru: 'Здравствуйте, мой аккаунт не найден в системе. Прошу помочь.',
                 kz: 'Сәлеметсіз бе, аккаунтым жүйеде табылмады. Көмек сұраймын.' }
      }
    };

    const d    = OVERLAY_DATA[reason] || null;
    const l    = isKz ? 'kz' : 'ru';

    // Если нет данных для оверлея (noaccess и др.) — просто остаёмся на лендинге
    if (!d) return;

    // ── Заполняем overlay ────────────────────────────────────────
    const blockOverlay = document.getElementById('block-overlay');
    if (blockOverlay) {
      const iconEl  = document.getElementById('block-overlay-icon');
      const titleEl = document.getElementById('block-overlay-title');
      const textEl  = document.getElementById('block-overlay-text');
      const waEl    = document.getElementById('block-overlay-wa');

      if (iconEl)  iconEl.textContent  = d.icon;
      if (titleEl) titleEl.textContent = d.title[l];
      if (textEl)  textEl.textContent  = d.text[l];
      const contactEl = document.getElementById('block-overlay-contact');
      if (contactEl) contactEl.textContent = (d.contact && d.contact[l]) ? d.contact[l] : '';
      const okEl = document.getElementById('block-overlay-ok');
      if (okEl) {
        okEl.onclick = function() {
          blockOverlay.style.display = 'none';
          document.body.style.overflow = '';
        };
      }
      if (waEl) {
        waEl.textContent = ''; // очищаем перед вставкой SVG + текста
        waEl.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> '
          + (isKz ? 'WhatsApp-қа жазу' : 'Написать в WhatsApp');
        waEl.href = 'https://wa.me/77776020216?text=' + encodeURIComponent(d.waMsg[l]);
      }

      // Показываем overlay
      blockOverlay.style.display = 'flex';

      // Блокируем скролл страницы
      document.body.style.overflow = 'hidden';

      // Перехватываем фокус — Tab не уходит за пределы overlay
      blockOverlay.setAttribute('tabindex', '-1');
      blockOverlay.focus();
      blockOverlay.addEventListener('keydown', function(e) {
        // Блокируем любые клавиши кроме Tab внутри overlay и Enter/Space на WA-ссылке
        const focusable = blockOverlay.querySelectorAll('a[href]');
        if (e.key === 'Tab') {
          e.preventDefault();
          if (focusable.length) focusable[0].focus();
        }
      });
    }
  }, 400);

  if (typeof resetIdleBeacon === 'function') resetIdleBeacon();
}

// ══════════════════════════════ PARSE LESSON ══════════════════════
function parseLesson(raw) {
  if (!raw) return { type: 'empty', url: '', name: '' };
  if (raw.startsWith('header:')) return { type: 'header', url: '', name: raw.slice(7).trim() };
  if (raw.startsWith('img:')) {
    const rest = raw.slice(4).trim(), p = rest.indexOf('|');
    return p > -1
      ? { type: 'image', url: rest.slice(0, p).trim(), name: rest.slice(p + 1).trim() }
      : { type: 'image', url: rest, name: '' };
  }
  if (raw.startsWith('file:')) {
    const rest = raw.slice(5).trim(), p = rest.indexOf('|'), c = rest.indexOf(',');
    const s = p > -1 ? p : (c > -1 ? c : -1);
    return s > -1
      ? { type: 'file', url: rest.slice(0, s).trim(), name: rest.slice(s + 1).trim() }
      : { type: 'file', url: rest, name: 'Файл' };
  }
  if (raw.startsWith('link:')) {
    const rest = raw.slice(5).trim(), p = rest.indexOf('|');
    return p > -1
      ? { type: 'link', url: rest.slice(0, p).trim(), name: rest.slice(p + 1).trim() }
      : { type: 'link', url: rest, name: rest };
  }
  if (raw.startsWith('text:')) return { type: 'text', url: '', name: raw.slice(5).trim() };
  const lower = raw.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/.test(lower)) return { type: 'image', url: raw, name: '' };
  if (raw.includes('drive.google.com') && raw.includes('thumbnail')) return { type: 'image', url: raw, name: '' };
  const p = raw.indexOf('|');
  if (p > -1) return { type: 'video', url: raw.slice(0, p).trim(), name: raw.slice(p + 1).trim() };
  return { type: 'video', url: raw, name: '' };
}

// ══════════════════════════════ LOAD SHEET 2 ══════════════════════
async function loadSheet2() {
  try {
    // Запрос идёт через Cloudflare Worker — SHEET_ID не виден в клиентском коде
    const url = `/api/sheet2?_cb=${Date.now()}`;
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 12000);
    let res;
    try { res = await fetch(url, { signal: controller.signal }); }
    finally { clearTimeout(timeoutId); }
    if (!res.ok) { console.error('Sheet2 HTTP error', res.status); showSheetError(); return; }
    const csv  = await res.text();
    const rows = parseCSV(csv);

    // ── Строки A3–A8: основные ссылки (индексы 2–7) ──────────────
    catalogFulfillmentUrl = strip((rows[2] || [])[0]) || '';
    catalogGoldUrl        = strip((rows[3] || [])[0]) || '';
    waUrl                 = strip((rows[4] || [])[0]) || '';
    tgUrl                 = strip((rows[5] || [])[0]) || '';
    tgChannelUrl          = strip((rows[6] || [])[0]) || '';
    waAccessUrl           = strip((rows[7] || [])[0]) || '';

    // ── A9: дедлайн countdown-бара (существующая логика) ─────────
    const cdDeadlineRaw   = strip((rows[8] || [])[0]) || '';
    initCountdown(cdDeadlineRaw);

    // ── A10: YouTube ID/URL hero-видео (поддерживает Shorts) ─────────
    const sheetHeroVideoRaw = strip((rows[9] || [])[0]) || '';
    const heroClearedManually = localStorage.getItem('bs_hero_video_cleared') === '1';
    if (sheetHeroVideoRaw && !heroClearedManually) {
      // Поддерживаем как голый ID, так и полный URL (включая /shorts/)
      const _ytPatterns = [
        /youtube\.com\/shorts\/([\w-]{11})/,
        /youtu\.be\/([\w-]{11})/,
        /youtube\.com\/watch\?v=([\w-]{11})/,
        /youtube\.com\/embed\/([\w-]{11})/,
        /[?&]v=([\w-]{11})/,
      ];
      let extractedId = '';
      let extractedUrl = sheetHeroVideoRaw;
      for (const p of _ytPatterns) {
        const m = sheetHeroVideoRaw.match(p);
        if (m) { extractedId = m[1]; break; }
      }
      // Если URL не совпал — это голый ID
      if (!extractedId && /^[\w-]{11}$/.test(sheetHeroVideoRaw)) {
        extractedId = sheetHeroVideoRaw;
        extractedUrl = 'https://youtu.be/' + sheetHeroVideoRaw;
      }
      if (extractedId) {
        localStorage.setItem('bs_hero_video_id',  extractedId);
        localStorage.setItem('bs_hero_video_url', extractedUrl);
      }
    }
    if (typeof applyHeroVideo === 'function') applyHeroVideo();

    // ── A11: JSON конфига таймера акции ──────────────────────────────
    const sheetTimerRaw = strip((rows[10] || [])[0]) || '';
    if (sheetTimerRaw) {
      try {
        JSON.parse(sheetTimerRaw); // валидация JSON
        localStorage.setItem('lp_timer_config', sheetTimerRaw);
        localStorage.removeItem('lp_timer_deadline');
        // Перезапускаем таймер с актуальным конфигом из Sheets (баг #6)
        if (typeof initLandingTimer === 'function') initLandingTimer();
      } catch (jsonErr) {
        console.warn('[loadSheet2] A11 не является валидным JSON, игнорируем:', sheetTimerRaw);
      }
    }

    // ── A12: JSON текстов постера hero-видео ─────────────────────────
    const sheetPosterTextsRaw = strip((rows[11] || [])[0]) || '';
    if (sheetPosterTextsRaw) {
      try {
        JSON.parse(sheetPosterTextsRaw); // валидация JSON
        localStorage.setItem('bs_hero_poster_texts', sheetPosterTextsRaw);
        if (typeof updateHeroVideoTexts === 'function') updateHeroVideoTexts();
      } catch (jsonErr) {
        console.warn('[loadSheet2] A12 не является валидным JSON, игнорируем:', sheetPosterTextsRaw);
      }
    }

    // ── A13: Apps Script URL (синхронизация между устройствами) ──────
    const sheetScriptUrl = strip((rows[12] || [])[0]) || '';
    if (sheetScriptUrl && sheetScriptUrl.startsWith('https://script.google.com/')) {
      const localScriptUrl = localStorage.getItem('bs_script_url') || '';
      if (!localScriptUrl) {
        localStorage.setItem('bs_script_url', sheetScriptUrl);
        console.log('[loadSheet2] Apps Script URL получен из Sheets (A13):', sheetScriptUrl.slice(0, 60) + '\u2026');
      }
    }

    courses = [];
    let maxCol = 0;
    rows.forEach(r => { if (r.length > maxCol) maxCol = r.length; });

    for (let i = 0; ; i++) {
      const colKZ = 1 + 2 * i;
      const colRU = 2 + 2 * i;
      if (colKZ >= maxCol) break;
      const nameKZ = strip((rows[0] || [])[colKZ]);
      const nameRU = strip((rows[0] || [])[colRU]);
      if (!nameKZ && !nameRU) break;
      // Иконка (URL) и цвет (hex) берутся из строки 1 по KZ и RU колонкам
      const rawKZIcon = strip((rows[1] || [])[colKZ]) || '';
      const rawRUIcon = strip((rows[1] || [])[colRU]) || '';
      const _isUrl = s => s && (s.startsWith('http') || s.startsWith('data:') || s.startsWith('//'));
      const _isHex = s => s && /^#[0-9a-fA-F]{3,8}$/.test(s.trim());
      const iconUrl  = _isUrl(rawKZIcon) ? rawKZIcon : (_isUrl(rawRUIcon) ? rawRUIcon : '');
      const hexColor = _isHex(rawKZIcon) ? rawKZIcon : (_isHex(rawRUIcon) ? rawRUIcon : '');
      const lessonsKZ = [], lessonsRU = [];
      for (let r = 2; r < rows.length; r++) {
        const row   = rows[r] || [];
        const rawKZ = strip(row[colKZ]);
        const rawRU = strip(row[colRU]);
        if (!rawKZ && !rawRU) continue;
        lessonsKZ.push(parseLesson(rawKZ));
        lessonsRU.push(parseLesson(rawRU));
      }
      courses.push({ nameKZ, nameRU, iconUrl, hexColor, lessonsKZ, lessonsRU });
    }

    applyLinks();
    applyTexts();
    renderCoursesGrid();
    updateHeroStats();
    // Сигнализируем подписчикам (app-lp-courses.js) что данные готовы
    window.dispatchEvent(new CustomEvent('sheet2Loaded'));
  } catch (e) {
    console.error('Sheet2 load error', e);
    showSheetError();
  }
}

function showSheetError() {
  const grid = $('platforms-grid');
  if (grid) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px 24px;color:var(--text3);font-size:14px;line-height:2">
      <div style="font-size:36px;margin-bottom:12px">⚠️</div>
      <div style="color:var(--text2);font-weight:600;margin-bottom:8px;font-size:15px">${t('sheetErrTitle')}</div>
      <div style="font-size:13px;margin-bottom:20px">${t('errSheetUnavailable')}</div>
      <button onclick="loadSheet2()" style="background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:10px;padding:11px 24px;font-size:13px;font-weight:700;color:#000;cursor:pointer;font-family:'DM Sans',sans-serif">
        ${t('sheetErrRetry')}
      </button>
    </div>`;
  }
}

// ══════════════════════════════ DEVICE INFO ═══════════════════════
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let device = 'Десктоп';
  if      (/iPhone/.test(ua))          device = 'iPhone';
  else if (/iPad/.test(ua))            device = 'iPad';
  else if (/Android.*Mobile/.test(ua)) device = 'Android телефон';
  else if (/Android/.test(ua))         device = 'Android планшет';
  let os = 'Неизвестно';
  if      (/Windows NT 10/.test(ua))   os = 'Windows 10/11';
  else if (/Windows NT 6/.test(ua))    os = 'Windows 7/8';
  else if (/Mac OS X/.test(ua))        os = 'macOS';
  else if (/iPhone OS ([\d_]+)/.test(ua)) os = 'iOS ' + ua.match(/iPhone OS ([\d_]+)/)[1].replace(/_/g, '.');
  else if (/Android ([\d.]+)/.test(ua)) os = 'Android ' + ua.match(/Android ([\d.]+)/)[1];
  else if (/Linux/.test(ua))            os = 'Linux';
  let browser = 'Неизвестно';
  if      (/YaBrowser/.test(ua)) browser = 'Яндекс';
  else if (/OPR|Opera/.test(ua)) browser = 'Opera';
  else if (/Edg/.test(ua))       browser = 'Edge';
  else if (/Chrome/.test(ua))    browser = 'Chrome';
  else if (/Firefox/.test(ua))   browser = 'Firefox';
  else if (/Safari/.test(ua))    browser = 'Safari';
  return { device, os, browser };
}

// ══════════════════════════════ LOGIN LOG ════════════════════════
async function logLogin(iin, name) {
  const scriptUrl = getScriptUrl();
  if (!scriptUrl || scriptUrl.includes('ВАШИ_ID')) return;
  try {
    const now = new Date();
    const { device, os, browser } = getDeviceInfo();
    let ip = '—';
    try {
      const ipCtrl = new AbortController();
      const ipTimer = setTimeout(() => ipCtrl.abort(), 3000);
      try { const r = await fetch('https://api.ipify.org?format=json', { signal: ipCtrl.signal }); ip = (await r.json()).ip || '—'; } catch (_) {}
      finally { clearTimeout(ipTimer); }
    } catch (_) {}
    fetch(scriptUrl, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _type: 'login_log', date: now.toLocaleDateString(lang === 'kz' ? 'kk-KZ' : 'ru-RU'), time: now.toLocaleTimeString(lang === 'kz' ? 'kk-KZ' : 'ru-RU'), iin, name, device, os, browser, screen: `${screen.width}×${screen.height}`, language: navigator.language || '—', ip })
    });
  } catch (e) { console.warn('Log error:', e); }
}

// ══════════════════════════════ LOGIN ════════════════════════════
async function doLogin() {
  const MAX_ATTEMPTS   = parseInt(localStorage.getItem('bs_max_attempts') || '5', 10);
  const BLOCK_DURATION = parseInt(localStorage.getItem('bs_block_duration') || '2', 10) * 60 * 1000;
  const ATTEMPTS_KEY = 'login_attempts', BLOCK_KEY = 'login_block_until';
  try {
    const blockUntil = parseInt(localStorage.getItem(BLOCK_KEY) || '0', 10);
    if (Date.now() < blockUntil) {
      const remainMs  = blockUntil - Date.now();
      const remainSec = Math.ceil(remainMs / 1000);
      const remainMin = Math.ceil(remainMs / 60000);
      const timeStr   = remainSec <= 90
        ? (lang === 'kz' ? remainSec + ' секунд' : remainSec + ' сек.')
        : (lang === 'kz' ? remainMin + ' минут' : remainMin + ' мин.');
      showMsg('error', lang === 'kz'
        ? `Тым көп әрекет. ${timeStr} күтіңіз.`
        : `Слишком много попыток. Подождите ${timeStr}`);
      return;
    }
  } catch(_) {}

  const name  = $('inp-name').value.trim();
  const iin   = $('inp-iin').value.trim();
  const phone = $('inp-phone').value.trim().replace(/\s/g, '');
  $('login-error').style.display   = 'none';
  $('login-success').style.display = 'none';

  if (!name || !iin || !phone) { showMsg('error', t('errEmpty')); return; }
  if (!/^\d{12}$/.test(iin))   { showMsg('error', t('errIin'));   return; }
  if (phone.replace(/[+\-()]/g, '').length < 10) { showMsg('error', t('errPhone')); return; }

  const btn = $('login-btn');
  btn.disabled = true;
  btn.classList.add('loading');
  const pgw = $('progress-wrap'); pgw.style.display = 'block';
  const pg  = $('progress-glow'); if (pg) pg.classList.add('active');
  const steps = T[lang].steps;
  $('prog-steps').innerHTML = steps.map((s, i) =>
    `<span class="p-step" id="ps${i}"><span class="dot"></span>${s}</span>`).join('');

  await animProg(0, 15, 300, ''); markStep(0);
  await animProg(15, 40, 400, steps[1]); markStep(1);

  let foundName = '', isPaid = false, isAllowed = false;
  let scriptOk = false;
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 15000);
    let res;
    try {
      res = await fetch(getScriptUrl(), {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ _type: 'auth', iin, phone }), signal: controller.signal
      });
    } finally { clearTimeout(timeoutId); }
    if (!res.ok) throw new Error('http_' + res.status);
    const result = await res.json();
    scriptOk = true;
    if (!result.found) { finishLogin(btn, true); showMsg('error', t('errNotFound')); return; }
    // Проверяем блокировку / нарушение из Apps Script
    if (result.isBlocked || result.blocked || result.isViolation || result.isMultiAccount || result.isAdminBlock) {
      finishLogin(btn, true);
      triggerInstantBlock((result.isLeak || result.isMultiAccount) ? 'leak' : 'violation');
      return;
    }
    foundName = result.name || name;
    isPaid    = !!result.isPaid;
    isAllowed = !!result.isAllowed;
  } catch (e) {
    // Apps Script недоступен — БЕЗ фолбэка на прямой публичный доступ к Google Sheets
    // (Лист1 со всеми данными студентов не должен быть публичным).
    console.warn('Apps Script unavailable:', e.message);
    await animProg(40, 40, 50, '');
    btn.disabled = false; btn.classList.remove('loading');
    pgw.style.display = 'none'; if (pg) pg.classList.remove('active');
    showMsg('error', t('errSheetUnavailable'));
    return;
  }

  await animProg(40, 60, 300, steps[2]); markStep(2);
  await sleep(180);
  await animProg(60, 75, 300, steps[3]); markStep(3);
  await sleep(180);
  if (!isPaid)    { finishLogin(btn, true); showMsg('error', t('errNotPaid'));  return; }
  await animProg(75, 90, 300, steps[4]); markStep(4);
  await sleep(180);
  if (!isAllowed) { finishLogin(btn, true); showMsg('error', t('errNoAccess')); return; }
  await animProg(90, 100, 350, steps[5]); markStep(5);
  if (pg) pg.classList.remove('active');

  try { localStorage.removeItem('login_attempts'); localStorage.removeItem('login_block_until'); } catch(_) {}

  currentUser = foundName || name;
  logLogin(iin, currentUser);

  const sessionData = JSON.stringify({ user: currentUser, iin, phone, ts: Date.now() });
  try { sessionStorage.setItem('bs_user', currentUser); sessionStorage.setItem('bs_iin', iin); sessionStorage.setItem('bs_phone', phone); } catch (_) {}
  try { localStorage.setItem('bs_session', sessionData); } catch (_) {}

  $('login-success').textContent   = t('ok') + ' ' + currentUser + '!';
  $('login-success').style.display = 'block';
  await sleep(700);
  window.location.href = 'platforma.html';
}

function finishLogin(btn, failed) {
  btn.disabled = false; btn.classList.remove('loading');
  setTimeout(() => { $('progress-wrap').style.display = 'none'; $('prog-fill').style.width = '0%'; }, 1000);
  if (failed) {
    try {
      const _maxAttempts = parseInt(localStorage.getItem('bs_max_attempts') || '5', 10);
      const _blockDuration = parseInt(localStorage.getItem('bs_block_duration') || '2', 10) * 60 * 1000;
      const ATTEMPTS_KEY = 'login_attempts', BLOCK_KEY = 'login_block_until';
      const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10) + 1;
      if (attempts >= _maxAttempts) {
        localStorage.setItem(BLOCK_KEY, Date.now() + _blockDuration);
        localStorage.removeItem(ATTEMPTS_KEY);
        // Показываем оверлей «Аккаунт заблокирован»
        const _isKzBlock = typeof lang !== 'undefined' && lang === 'kz';
        const blockOverlay = document.getElementById('block-overlay');
        if (blockOverlay) {
          const iconEl  = document.getElementById('block-overlay-icon');
          const titleEl = document.getElementById('block-overlay-title');
          const textEl  = document.getElementById('block-overlay-text');
          const waEl    = document.getElementById('block-overlay-wa');
          if (iconEl)  iconEl.textContent  = '🔒';
          if (titleEl) titleEl.textContent = _isKzBlock ? 'АККАУНТ БҰҒАТТАЛДЫ' : 'АККАУНТ ЗАБЛОКИРОВАН';
          if (textEl)  textEl.textContent  = _isKzBlock
            ? 'Тым көп сәтсіз кіру әрекеті. Аккаунтыңыз уақытша бұғатталды. Техқолдауға хабарласыңыз.'
            : 'Слишком много неверных попыток входа. Аккаунт временно заблокирован. Обратитесь в техподдержку.';
          if (waEl) {
            const waMsg = _isKzBlock
              ? 'Сәлеметсіз бе, тым көп сәтсіз кіру әрекетінен кейін аккаунтым бұғатталды. Көмек сұраймын.'
              : 'Здравствуйте, мой аккаунт заблокирован после нескольких неверных попыток входа. Прошу помочь.';
            waEl.textContent = '';
            waEl.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> '
              + (_isKzBlock ? 'WhatsApp-қа жазу' : 'Написать в WhatsApp');
            waEl.href = 'https://wa.me/77776020216?text=' + encodeURIComponent(waMsg);
          }
          blockOverlay.style.display = 'flex';
          document.body.style.overflow = 'hidden';
          blockOverlay.setAttribute('tabindex', '-1');
          blockOverlay.focus();
        }
      }
      else localStorage.setItem(ATTEMPTS_KEY, attempts);
    } catch(_) {}
  }
}
function showMsg(type, msg) {
  const el = $(type === 'error' ? 'login-error' : 'login-success');
  el.textContent = msg; el.style.display = 'block';
}
function markStep(i) { const el = $(`ps${i}`); if (el) el.classList.add('done'); }
function animProg(from, to, dur, label) {
  return new Promise(res => {
    const fill = $('prog-fill'), pct = $('prog-pct'), lbl = $('progress-label-text');
    if (label && lbl) lbl.textContent = label;
    const start = Date.now();
    (function f() {
      const p = Math.min(1, (Date.now() - start) / dur);
      const v = Math.round(from + (to - from) * easeOut(p));
      fill.style.width = v + '%'; pct.textContent = v + '%';
      p < 1 ? requestAnimationFrame(f) : res();
    })();
  });
}

// ══════════════════════════════ SESSION RESTORE ═══════════════════
async function tryRestoreSession() {
  let savedUser = null, savedIin = null, savedPhone = null;
  try { savedUser = sessionStorage.getItem('bs_user'); savedIin = sessionStorage.getItem('bs_iin'); savedPhone = sessionStorage.getItem('bs_phone'); } catch(_) {}
  if (!savedUser) {
    try {
      const raw = localStorage.getItem('bs_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        const TTL = 30 * 24 * 60 * 60 * 1000;
        if (parsed && parsed.user && parsed.iin && (Date.now() - (parsed.ts || 0)) < TTL) {
          savedUser = parsed.user; savedIin = parsed.iin; savedPhone = parsed.phone || '';
          try { sessionStorage.setItem('bs_user', savedUser); sessionStorage.setItem('bs_iin', savedIin); sessionStorage.setItem('bs_phone', savedPhone); } catch(_) {}
        } else { localStorage.removeItem('bs_session'); }
      }
    } catch(_) {}
  }
  if (!savedUser || !savedIin) return false;

  // Быстрая ревалидация доступа через Apps Script (Задача 9)
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5000);
    let res;
    try {
      res = await fetch(getScriptUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ _type: 'auth', iin: savedIin, phone: savedPhone }),
        signal: ctrl.signal
      });
    } finally { clearTimeout(tid); }
    if (res && res.ok) {
      const result = await res.json();
      if (!result.found || result.blocked || result.isBlocked || result.isViolation || !result.isPaid || !result.isAllowed) {
        // Доступ отозван — очищаем сессию
        try { localStorage.removeItem('bs_session'); } catch(_) {}
        try { sessionStorage.removeItem('bs_user'); sessionStorage.removeItem('bs_iin'); sessionStorage.removeItem('bs_phone'); } catch(_) {}
        return false;
      }
    }
  } catch (_) {
    // Apps Script недоступен — разрешаем войти, security monitor проверит позже
  }

  currentUser = savedUser;
  await loadSheet2();
  // Платформа: показываем lessons; лендинг: редиректим на /platforma
  if (typeof showLessons === 'function' && window.location.pathname.includes('platforma')) {
    showLessons();
  } else if (!window.location.pathname.includes('platforma')) {
    window.location.href = 'platforma.html';
  }
  return true;
}

// ══════════════════════════════ INPUT HELPERS ═════════════════════
(function initInputHelpers() {
  function _bind() {
    const inpIin   = $('inp-iin');
    const inpName  = $('inp-name');
    const inpPhone = $('inp-phone');
    if (inpIin)   inpIin.addEventListener('input',   function () { this.value = this.value.replace(/\D/g, ''); });
    if (inpIin)   inpIin.addEventListener('keydown', e => { if (e.key === 'Enter' && inpPhone) inpPhone.focus(); });
    if (inpName)  inpName.addEventListener('keydown',  e => { if (e.key === 'Enter' && inpIin) inpIin.focus(); });
    if (inpPhone) inpPhone.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  }
  if (document.readyState !== 'loading') { _bind(); }
  else { document.addEventListener('DOMContentLoaded', _bind); }
})();

// ══════════════════════════════ ADMIN ════════════════════════════
(function initLogoClickAdmin() {
  function _bind() {
    const logoWrap = $('logo-wrap');
    if (!logoWrap) return;
    logoWrap.addEventListener('click', () => {
      logoClickCount++;
      if (logoClickCount === 1) {
        logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 600);
      } else { clearTimeout(logoClickTimer); logoClickCount = 0; window.location.href = 'admin.html'; }
    });
  }
  if (document.readyState !== 'loading') { _bind(); }
  else { document.addEventListener('DOMContentLoaded', _bind); }
})();

function updateAdminVideoStatus(id) {
  const dot = $('admin-video-status-dot'), text = $('admin-video-status-text');
  const previewRow = $('admin-video-preview-row'), previewLink = $('admin-video-preview-link');
  if (!dot || !text) return;
  if (id && id.trim()) {
    dot.classList.add('active'); text.textContent = '✓ задано'; text.style.color = '#22c48a';
    if (previewRow && previewLink) { previewRow.style.display = 'flex'; previewLink.href = 'https://youtu.be/' + id.trim(); previewLink.textContent = 'https://youtu.be/' + id.trim(); }
  } else {
    dot.classList.remove('active'); text.textContent = 'не задано'; text.style.color = '';
    if (previewRow) previewRow.style.display = 'none';
  }
}
function previewAdminVideoId(val) { updateAdminVideoStatus(val.trim()); }
function saveAdminVideoId() {
  const input = $('admin-video-id-input'); if (!input) return;
  let raw = input.value.trim();
  const match = raw.match(/(?:youtu\.be\/|[?&]v=)([\w-]{11})/);
  const id = match ? match[1] : (raw.length === 11 ? raw : '');
  if (!id && raw) { showToast('⚠ Не похоже на YouTube ID. Проверьте ссылку.', 'error'); return; }
  if (id) { localStorage.setItem('bs_hero_video_id', id); localStorage.removeItem('bs_hero_video_cleared'); input.value = id; updateAdminVideoStatus(id); if (typeof applyHeroVideo === 'function') applyHeroVideo(); showToast('✅ YouTube ID сохранён! Видео появится в Hero.', 'success'); }
  else { localStorage.removeItem('bs_hero_video_id'); localStorage.setItem('bs_hero_video_cleared', '1'); updateAdminVideoStatus(''); if (typeof applyHeroVideo === 'function') applyHeroVideo(); showToast('Видео-превью убрано.', 'success'); }
}
function clearAdminVideoId() {
  localStorage.removeItem('bs_hero_video_id');
  localStorage.setItem('bs_hero_video_cleared', '1'); // флаг: админ вручную убрал видео
  const input = $('admin-video-id-input'); if (input) input.value = '';
  if (typeof applyHeroVideo === 'function') applyHeroVideo();
  updateAdminVideoStatus(''); showToast('🗑 Видео-превью удалено из Hero.', 'success');
}
function openAdmin() {
  $('admin-gs-input').value = gsSheetId;
  const scriptInput = $('admin-script-input');
  if (scriptInput) scriptInput.value = '/api/auth'; // URL обрабатывается Cloudflare Worker
  const vid = localStorage.getItem('bs_hero_video_id') || '';
  const vidInput = $('admin-video-id-input');
  if (vidInput) vidInput.value = vid;
  updateAdminVideoStatus(vid);
  $('admin-modal').classList.add('show');
}
function saveAdmin() {
  const val = $('admin-gs-input').value.trim();
  if (val) { gsSheetId = val; localStorage.setItem('gs_sheet_id', val); }
  const scriptInput = $('admin-script-input');
  if (scriptInput && scriptInput.value.trim()) {
    localStorage.setItem('bs_script_url', scriptInput.value.trim());
    showToast('✅ Сохранено! Script URL обновлён.', 'success');
  } else { showToast(t('savedOk'), 'success'); }
  closeModal('admin-modal');
  loadSheet2();
}
async function runAdminDiag() {
  const logEl = $('admin-diag-log'), s2El = $('diag-sheet2'), scEl = $('diag-script'), runBtn = $('admin-diag-run-btn');
  if (logEl) { logEl.style.display = 'block'; logEl.innerHTML = ''; }
  if (runBtn) runBtn.disabled = true;
  const log = (msg, ok) => {
    if (!logEl) return;
    const line = document.createElement('div');
    line.className = 'diag-line ' + (ok === true ? 'ok' : ok === false ? 'err' : 'info');
    line.textContent = msg; logEl.appendChild(line); logEl.scrollTop = logEl.scrollHeight;
  };
  log('🔍 Проверяем Google Sheets (Лист2)...');
  if (s2El) s2El.textContent = '⏳ проверяем...';
  try {
    // /api/sheet2 — Worker проксирует запрос, SHEET_ID скрыт на сервере
    const url = `/api/sheet2?_cb=${Date.now()}`;
    const ctrl = new AbortController();
    const t1 = setTimeout(() => ctrl.abort(), 8000);
    let res;
    try { res = await fetch(url, { signal: ctrl.signal }); }
    finally { clearTimeout(t1); }
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 5) { if (s2El) s2El.textContent = '✅ доступна'; log(`✅ Лист2 загружен (${text.length} байт)`, true); }
      else { if (s2El) s2El.textContent = '⚠️ пусто'; log('⚠️ Лист2 пустой или нет данных', null); }
    } else { if (s2El) s2El.textContent = '❌ ошибка ' + res.status; log(`❌ Лист2 HTTP ${res.status}`, false); }
  } catch (e) { if (s2El) s2El.textContent = '❌ недоступна'; log('❌ Лист2 недоступен: ' + (e.name === 'AbortError' ? 'таймаут 8с' : e.message), false); }

  log('🔍 Проверяем Apps Script (авторизацию)...');
  if (scEl) scEl.textContent = '⏳ проверяем...';
  const scriptUrl = getScriptUrl();
  try {
    const ctrl2 = new AbortController();
    const t2 = setTimeout(() => ctrl2.abort(), 10000);
    let res2;
    try { res2 = await fetch(scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ _type: 'auth', iin: '000000000000', phone: '' }), signal: ctrl2.signal }); }
    finally { clearTimeout(t2); }
    if (res2.ok) {
      const json2 = await res2.json();
      if (typeof json2.found !== 'undefined') { if (scEl) scEl.textContent = '✅ отвечает'; log(`✅ Apps Script работает. Ответ: found=${json2.found}`, true); }
      else { if (scEl) scEl.textContent = '⚠️ неожиданный ответ'; log(`⚠️ Apps Script ответил, но формат неожиданный: ${JSON.stringify(json2)}`, null); }
    } else { if (scEl) scEl.textContent = '❌ HTTP ' + res2.status; log(`❌ Apps Script HTTP ${res2.status}`, false); }
  } catch(e2) {
    if (scEl) scEl.textContent = '❌ недоступен';
    log('❌ Apps Script: ' + (e2.name === 'AbortError' ? 'таймаут 10с' : e2.message), false);
  }
  log('✔ Диагностика завершена');
  if (runBtn) runBtn.disabled = false;
}