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
function startSecurityMonitor() {
  if (securityCheckInterval) clearInterval(securityCheckInterval);
  securityCheckInterval = setInterval(async () => {
    let currentIin = null;
    try { currentIin = sessionStorage.getItem('bs_iin'); } catch(_) {}
    if (!currentUser || !currentIin) return;
    try {
      const res = await fetch(getScriptUrl(), {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body:    JSON.stringify({ _type: 'auth', iin: currentIin, phone: sessionStorage.getItem('bs_phone') || localStorage.getItem('bs_phone') || '' })
      });
      if (!res.ok) return;
      const result = await res.json();
      if (!result.found || !result.isAllowed || !result.isPaid) triggerInstantBlock();
    } catch (e) { console.warn('Security monitor tick failed:', e); }
  }, 120000);
}

function triggerInstantBlock() {
  if (securityCheckInterval) clearInterval(securityCheckInterval);
  currentUser = null; currentCourseIdx = null;
  try { sessionStorage.removeItem('bs_user'); sessionStorage.removeItem('bs_iin'); } catch (_) {}
  const slot = $('video-slot'); if (slot) slot.innerHTML = '';
  $('lesson-modal').classList.remove('show', 'video-active');
  $('video-section').style.display = 'none';
  $('lessons-page').style.display = 'none';
  $('logout-btn').style.display   = 'none';
  $('mobile-nav').style.display   = 'none';
  const blockOverlay = $('block-overlay');
  if (blockOverlay) {
    blockOverlay.style.display = 'flex';
  } else {
    const lp = $('landing-page'); if (lp) lp.style.display = 'block';
    $('login-page').style.display = 'none';
  }
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
  if (!gsSheetId) return;
  try {
    const url = `https://docs.google.com/spreadsheets/d/${gsSheetId}/gviz/tq?tqx=out:csv&sheet=Лист2`;
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

    // ── A10: YouTube ID hero-видео (новая строка) ─────────────────
    const sheetHeroVideoId = strip((rows[9] || [])[0]) || '';
    const heroClearedManually = localStorage.getItem('bs_hero_video_cleared') === '1';
    if (sheetHeroVideoId && !heroClearedManually) {
      localStorage.setItem('bs_hero_video_id', sheetHeroVideoId);
    }
    if (typeof applyHeroVideo === 'function') applyHeroVideo();

    // ── A11: JSON конфига таймера акции (новая строка) ────────────
    const sheetTimerRaw = strip((rows[10] || [])[0]) || '';
    if (sheetTimerRaw) {
      try {
        JSON.parse(sheetTimerRaw); // валидация JSON
        localStorage.setItem('lp_timer_config', sheetTimerRaw);
        localStorage.removeItem('lp_timer_deadline');
      } catch (jsonErr) {
        console.warn('[loadSheet2] A11 не является валидным JSON, игнорируем:', sheetTimerRaw);
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
    try { const r = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) }); ip = (await r.json()).ip || '—'; } catch (_) {}
    fetch(scriptUrl, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _type: 'login_log', date: now.toLocaleDateString(lang === 'kz' ? 'kk-KZ' : 'ru-RU'), time: now.toLocaleTimeString(lang === 'kz' ? 'kk-KZ' : 'ru-RU'), iin, name, device, os, browser, screen: `${screen.width}×${screen.height}`, language: navigator.language || '—', ip })
    });
  } catch (e) { console.warn('Log error:', e); }
}

// ══════════════════════════════ LOGIN ════════════════════════════
async function doLogin() {
  const MAX_ATTEMPTS = 5, BLOCK_DURATION = 10 * 60 * 1000;
  const ATTEMPTS_KEY = 'login_attempts', BLOCK_KEY = 'login_block_until';
  try {
    const blockUntil = parseInt(localStorage.getItem(BLOCK_KEY) || '0', 10);
    if (Date.now() < blockUntil) {
      const remaining = Math.ceil((blockUntil - Date.now()) / 60000);
      showMsg('error', lang === 'kz' ? `Тым көп әрекет. ${remaining} минут күтіңіз.` : `Слишком много попыток. Подождите ${remaining} мин.`);
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
    foundName = result.name || name;
    isPaid    = !!result.isPaid;
    isAllowed = !!result.isAllowed;
  } catch (e) {
    console.warn('Apps Script unavailable, trying direct sheet fallback:', e.message);
    try {
      await animProg(40, 42, 100, steps[1]);
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${gsSheetId}/gviz/tq?tqx=out:csv&sheet=Лист1`;
      const ctrl2 = new AbortController();
      setTimeout(() => ctrl2.abort(), 12000);
      const res2 = await fetch(sheetUrl, { signal: ctrl2.signal });
      if (!res2.ok) throw new Error('sheet_http_' + res2.status);
      const csv  = await res2.text();
      const rows = parseCSV(csv);
      const normPhone = p => { let d = (p||'').replace(/\D/g,''); if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1); if (d.length === 10) d = '7' + d; return d; };
      const matchIin = iin.replace(/\D/g,'').trim(), matchPhone = normPhone(phone);
      let found = false;
      for (const row of rows) {
        const rowIin = (row[0]||'').replace(/\D/g,'').trim();
        if (rowIin !== matchIin) continue;
        found = true;
        const rowPhone = normPhone(row[3]||'');
        if (rowPhone && matchPhone && rowPhone !== matchPhone) { finishLogin(btn, true); showMsg('error', t('errNotFound')); return; }
        if ((row[3]||'').includes('НАРУШЕНИЕ')) { finishLogin(btn, true); showMsg('error', t('errNoAccess')); return; }
        foundName = (row[1]||'').trim() || name;
        const statusA = (row[10]||'').toUpperCase();
        const statusP = (row[11]||'').toUpperCase();
        isAllowed = statusA.includes('✅') && (statusA.includes('РАЗРЕШЕНО') || statusA.includes('РҰҚСАТ'));
        isPaid    = statusP.includes('✅') && (statusP.includes('ОПЛАЧЕНО')  || statusP.includes('ТӨЛЕНДІ'));
        break;
      }
      if (!found) { finishLogin(btn, true); showMsg('error', t('errNotFound')); return; }
      scriptOk = true;
    } catch(e2) {
      await animProg(40, 40, 50, '');
      btn.disabled = false; btn.classList.remove('loading');
      pgw.style.display = 'none'; if (pg) pg.classList.remove('active');
      showMsg('error', (e2.name === 'AbortError') ? t('errSheetUnavailable') : t('errNetwork'));
      return;
    }
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
  await loadSheet2();
  await sleep(700);
  showLessons();
}

function finishLogin(btn, failed) {
  btn.disabled = false; btn.classList.remove('loading');
  setTimeout(() => { $('progress-wrap').style.display = 'none'; $('prog-fill').style.width = '0%'; }, 1000);
  if (failed) {
    try {
      const ATTEMPTS_KEY = 'login_attempts', BLOCK_KEY = 'login_block_until';
      const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10) + 1;
      if (attempts >= 5) { localStorage.setItem(BLOCK_KEY, Date.now() + 10 * 60 * 1000); localStorage.removeItem(ATTEMPTS_KEY); }
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
  currentUser = savedUser;
  await loadSheet2();
  showLessons();
  return true;
}

// ══════════════════════════════ INPUT HELPERS ═════════════════════
$('inp-iin').addEventListener('input',   function () { this.value = this.value.replace(/\D/g, ''); });
$('inp-iin').addEventListener('keydown', e => { if (e.key === 'Enter') $('inp-phone').focus(); });
$('inp-name').addEventListener('keydown',  e => { if (e.key === 'Enter') $('inp-iin').focus(); });
$('inp-phone').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

// ══════════════════════════════ ADMIN ════════════════════════════
$('logo-wrap').addEventListener('click', () => {
  logoClickCount++;
  if (logoClickCount === 1) {
    logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 600);
  } else { clearTimeout(logoClickTimer); logoClickCount = 0; openAdminPw(); }
});
function openAdminPw() {
  $('admin-pw-input').value = ''; $('pw-error').style.display = 'none';
  $('admin-pw-modal').classList.add('show');
  setTimeout(() => $('admin-pw-input').focus(), 200);
}
async function checkAdminPw() {
  const val = $('admin-pw-input').value;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(val));
  const hash = [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2,'0')).join('');
  if (hash === ADMIN_PW_HASH) { closeModal('admin-pw-modal'); openAdmin(); }
  else { $('pw-error').textContent = t('wrongPw'); $('pw-error').style.display = 'block'; $('admin-pw-input').value = ''; $('admin-pw-input').focus(); }
}
$('admin-pw-input').addEventListener('keydown', e => { if (e.key === 'Enter') checkAdminPw(); });

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
  if (scriptInput) scriptInput.value = localStorage.getItem('bs_script_url') || LOG_SCRIPT_URL;
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
    const url = `https://docs.google.com/spreadsheets/d/${gsSheetId}/gviz/tq?tqx=out:csv&sheet=Лист2`;
    const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
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
    const ctrl2 = new AbortController(); setTimeout(() => ctrl2.abort(), 10000);
    const res2 = await fetch(scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ _type: 'auth', iin: '000000000000', phone: '' }), signal: ctrl2.signal });
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
