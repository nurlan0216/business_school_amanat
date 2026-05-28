/* ============================================================
   BUSINESS SCHOOL AMANAT — PROGRESS v3.3
   Стрик, дашборд прогресса, сертификат, конфетти,
   достижения, хедер прогресс-бар
   ============================================================ */

// ══ HEADER PROGRESS BAR ══════════════════════════════════════════
function updateHeaderProgressBar() {
  const bar     = $('header-progress-bar');
  const fill    = $('header-progress-fill');
  const tooltip = $('header-progress-tooltip');
  if (!bar || !fill) return;
  if (!currentUser) { bar.style.display = 'none'; return; }
  bar.style.display = 'block';
  const prog = getTotalProgress();
  fill.style.width = prog.pct + '%';
  if (tooltip) {
    const tooltipText = lang === 'kz'
      ? `${prog.pct}% — ${prog.watched} / ${prog.total} сабақ көрілді`
      : `${prog.pct}% — ${prog.watched} из ${prog.total} уроков просмотрено`;
    tooltip.textContent = tooltipText;
  }
}

// ══ STREAK ═══════════════════════════════════════════════════════
function getTodayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

function getStreakData() {
  try {
    const raw = localStorage.getItem('bs_streak');
    return raw ? JSON.parse(raw) : { count: 0, lastDate: '' };
  } catch(_) { return { count: 0, lastDate: '' }; }
}

function saveStreakData(data) {
  try { localStorage.setItem('bs_streak', JSON.stringify(data)); } catch(_) {}
}

function recordLessonToday() {
  const today = getTodayDateStr();
  const data = getStreakData();
  if (data.lastDate === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  if (data.lastDate === yStr) {
    data.count = (data.count || 0) + 1;
  } else {
    data.count = 1;
  }
  data.lastDate = today;
  saveStreakData(data);
  updateStreakBadge();
}

function updateStreakBadge() {
  const badge = $('streak-badge-hero');
  if (!badge || !currentUser) return;
  const data = getStreakData();
  const today = getTodayDateStr();
  if (data.count >= 1 && data.lastDate === today) {
    badge.textContent = lang === 'kz'
      ? `🔥 ${data.count} ${t('streakLabel')}`
      : `🔥 ${data.count} ${pluralDays(data.count)} ${t('streakLabel')}`;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function pluralDays(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'день';
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'дня';
  return 'дней';
}

function checkStreakOnLogin() {
  if (!currentUser) return;
  const data = getStreakData();
  if (data.count > 3) {
    const msg = lang === 'kz'
      ? `🔥 ${data.count} ${t('streakLabel')}! Жалғастырыңыз, ${currentUser}!`
      : `🔥 ${data.count} ${pluralDays(data.count)} ${t('streakLabel')}! Так держать, ${currentUser}!`;
    setTimeout(() => showToast(msg, 'success'), 1000);
  }
}

// ══ PROGRESS DASHBOARD ═══════════════════════════════════════════
function openProgressDashboard() {
  const body = $('progress-modal-body');
  if (!body) return;

  const totalProg = getTotalProgress();
  const streak = getStreakData();
  const watchTime = Math.round(totalProg.watched * 5);

  const startKey = 'bs_start_date';
  let startDate = localStorage.getItem(startKey);
  if (!startDate) {
    startDate = new Date().toLocaleDateString(lang === 'kz' ? 'kk-KZ' : 'ru-RU');
    localStorage.setItem(startKey, startDate);
  }

  let html = `
    <div class="pd-meta-row">
      <div class="pd-meta-card">
        <div class="pd-meta-num">${totalProg.pct}%</div>
        <div class="pd-meta-lbl">${t('totalProgressLabel')}</div>
      </div>
      <div class="pd-meta-card">
        <div class="pd-meta-num">${watchTime} ${t('watchTimeUnit')}</div>
        <div class="pd-meta-lbl">${t('watchTimeLabel')}</div>
      </div>
      <div class="pd-meta-card">
        <div class="pd-meta-num">🔥 ${streak.count}</div>
        <div class="pd-meta-lbl">${lang === 'kz' ? streak.count + ' ' + t('streakLabel') : pluralDays(streak.count) + ' ' + t('streakLabel')}</div>
      </div>
      <div class="pd-meta-card">
        <div class="pd-meta-num" style="font-size:14px">${startDate}</div>
        <div class="pd-meta-lbl">${t('startDateLabel')}</div>
      </div>
    </div>
    <div class="pd-chart-title">${t('chartTitle')}</div>
  `;

  courses.forEach((course, idx) => {
    const name = lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ);
    const prog = getCourseProgress(idx);
    const color = course.hexColor || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    if (prog.total === 0) return;
    html += `
      <div class="pd-bar-row">
        <div class="pd-bar-label" title="${escHtml(name)}">${escHtml(name)}</div>
        <div class="pd-bar-track">
          <div class="pd-bar-fill" style="width:${prog.pct}%;background:linear-gradient(90deg,${color},${lightenHex(color,20)})"></div>
        </div>
        <div class="pd-bar-pct">${prog.pct}%</div>
      </div>
    `;
  });

  body.innerHTML = html;
  $('progress-modal').classList.add('show');
}

// ══ CONFETTI ═════════════════════════════════════════════════════
function launchConfetti(duration = 3000) {
  const canvas = $('confetti-canvas');
  if (!canvas) return;
  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  canvas.width = W; canvas.height = H;

  const COLORS = ['#f5c842', '#ffffff', '#e8920a', '#ffd96a', '#fffbe6'];
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * W,
    y: -10 - Math.random() * 40,
    w: 4 + Math.random() * 8,
    h: 6 + Math.random() * 10,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI * 2,
    rotV: (Math.random() - 0.5) * 0.15,
    opacity: 1,
  }));

  const endTime = Date.now() + duration;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const now = Date.now();
    const remaining = endTime - now;
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV; p.vy += 0.05;
      if (remaining < 500) p.opacity = Math.max(0, remaining / 500);
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      if (p.y > H + 20) { p.y = -10; p.x = Math.random() * W; p.vy = 2 + Math.random() * 4; }
    });
    if (now < endTime) requestAnimationFrame(draw);
    else canvas.style.display = 'none';
  }
  draw();
}

// ══ ACHIEVEMENTS ══════════════════════════════════════════════════
function showAchievementBadge(text) {
  const badge = $('achievement-badge');
  const sub   = $('achievement-sub-text');
  if (!badge || !sub) return;
  sub.textContent = text;
  badge.style.display = 'block';
  requestAnimationFrame(() => badge.classList.add('ach-visible'));
  setTimeout(() => {
    badge.classList.remove('ach-visible');
    setTimeout(() => { badge.style.display = 'none'; }, 400);
  }, 4000);
}

function checkFirstLesson() {
  const key = 'bs_first_lesson_done';
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  launchConfetti(3000);
  showAchievementBadge('Первый урок! 🎓');
}

function checkCourseCompletion(courseIdx) {
  const prog = getCourseProgress(courseIdx);
  const key = `bs_course_completed_${courseIdx}`;
  if (prog.pct === 100 && prog.total > 0 && !localStorage.getItem(key)) {
    localStorage.setItem(key, '1');
    launchConfetti(3000);
    const course = courses[courseIdx];
    const name = course ? (lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ)) : 'Курс';
    showAchievementBadge(`Курс «${name}» завершён!`);
  }
}

// ══ CERTIFICATE ═══════════════════════════════════════════════════
let certCourseIdx = null;

function openCertModal() {
  if (currentCourseIdx === null) return;
  certCourseIdx = currentCourseIdx;
  const course = courses[certCourseIdx];
  if (!course) return;

  const courseName = lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ);
  const certTitleEl = $('cert-modal-title');
  if (certTitleEl) certTitleEl.textContent = t('certModalTitle');
  const sub = $('cert-modal-sub');
  if (sub) sub.textContent = `${lang === 'kz' ? 'Курс:' : 'Курс:'} «${courseName}»`;

  const canvas = $('cert-canvas');
  if (canvas) canvas.style.display = 'none';
  const getBtn = $('cert-get-btn');
  if (getBtn) getBtn.style.display = '';
  const dlBtn = $('cert-download-btn');
  if (dlBtn) dlBtn.style.display = 'none';
  const prog = $('cert-gen-progress');
  if (prog) prog.style.display = 'none';

  $('cert-modal').classList.add('show');
}

function generateCertificateWithProgress() {
  const getBtn = $('cert-get-btn');
  const dlBtn  = $('cert-download-btn');
  const prog   = $('cert-gen-progress');
  const fill   = $('cert-gen-fill');
  const label  = $('cert-gen-label');
  const canvas = $('cert-canvas');

  if (getBtn) getBtn.style.display = 'none';
  if (prog)   prog.style.display   = 'block';

  const steps = ['Формируем данные...', 'Рисуем оформление...', 'Добавляем имя...', 'Финальная обработка...', 'Готово! 🎉'];
  let pct = 0, stepIdx = 0;
  const interval = setInterval(() => {
    pct += 20 + Math.random() * 10;
    if (pct > 100) pct = 100;
    if (fill) fill.style.width = pct + '%';
    if (label && steps[stepIdx]) { label.textContent = steps[stepIdx++]; }
    if (pct >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        if (prog) prog.style.display = 'none';
        const course = courses[certCourseIdx];
        const courseName = course
          ? (lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ))
          : 'Курс';
        if (canvas) {
          drawCertificate(canvas, currentUser || 'Студент', courseName);
          canvas.style.display = '';
        }
        if (dlBtn) dlBtn.style.display = '';
      }, 300);
    }
  }, 280);
}

function closeCertModal() {
  $('cert-modal').classList.remove('show');
}

function drawCertificate(canvas, studentName, courseName) {
  const W = 800, H = 560;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#060608';
  ctx.fillRect(0, 0, W, H);

  const borderGrad = ctx.createLinearGradient(0, 0, W, H);
  borderGrad.addColorStop(0, '#f5c842');
  borderGrad.addColorStop(0.5, '#ffd96a');
  borderGrad.addColorStop(1, '#e8920a');
  ctx.strokeStyle = borderGrad; ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, W - 24, H - 24);

  ctx.strokeStyle = 'rgba(245,200,66,0.2)'; ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  const corners = [[40, 40], [W-40, 40], [40, H-40], [W-40, H-40]];
  corners.forEach(([cx, cy]) => {
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245,200,66,0.15)'; ctx.fill();
    ctx.strokeStyle = 'rgba(245,200,66,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  });

  ctx.beginPath(); ctx.arc(W / 2, 110, 44, 0, Math.PI * 2);
  const circGrad = ctx.createRadialGradient(W/2, 110, 0, W/2, 110, 44);
  circGrad.addColorStop(0, '#f5c842'); circGrad.addColorStop(1, '#e8920a');
  ctx.fillStyle = circGrad; ctx.fill();
  ctx.font = 'bold 20px Syne, sans-serif'; ctx.fillStyle = '#000'; ctx.textAlign = 'center';
  ctx.fillText('BS', W / 2, 117);

  ctx.font = '600 13px DM Sans, sans-serif'; ctx.fillStyle = 'rgba(245,200,66,0.7)';
  ctx.textAlign = 'center'; ctx.fillText(t('certCanvasTitle'), W / 2, 186);

  const lineGrad = ctx.createLinearGradient(160, 0, W - 160, 0);
  lineGrad.addColorStop(0, 'transparent'); lineGrad.addColorStop(0.3, 'rgba(245,200,66,0.5)');
  lineGrad.addColorStop(0.7, 'rgba(245,200,66,0.5)'); lineGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = lineGrad; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(160, 200); ctx.lineTo(W - 160, 200); ctx.stroke();

  ctx.font = 'bold 36px Syne, sans-serif'; ctx.fillStyle = '#ededf5';
  ctx.textAlign = 'center'; ctx.fillText(studentName, W / 2, 260);

  ctx.font = '400 15px DM Sans, sans-serif'; ctx.fillStyle = '#8080a8';
  ctx.fillText(t('certCanvasSub'), W / 2, 292);

  const maxWidth = 600;
  ctx.font = '700 22px Syne, sans-serif'; ctx.fillStyle = '#f5c842'; ctx.textAlign = 'center';
  const words = courseName.split(' ');
  let line = '', lines2 = [];
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth) { lines2.push(line); line = w; }
    else line = test;
  }
  if (line) lines2.push(line);
  lines2.forEach((l, i) => ctx.fillText(l, W / 2, 334 + i * 30));

  ctx.beginPath(); ctx.moveTo(160, 390); ctx.lineTo(W - 160, 390); ctx.stroke();

  const dateStr = new Date().toLocaleDateString(lang === 'kz' ? 'kk-KZ' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.font = '400 13px DM Sans, sans-serif'; ctx.fillStyle = '#44445c';
  ctx.fillText(dateStr, W / 2, 416);

  ctx.font = '700 14px Syne, sans-serif'; ctx.fillStyle = 'rgba(245,200,66,0.5)';
  ctx.fillText('Business School AMANAT', W / 2, 450);

  ctx.fillStyle = 'rgba(245,200,66,0.35)'; ctx.font = '20px serif';
  ctx.fillText('★  ★  ★  ★  ★', W / 2, 490);
}

function downloadCert() {
  const canvas = $('cert-canvas');
  if (!canvas) return;
  const course = courses[certCourseIdx];
  const courseName = course ? (lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ)) : 'Курс';
  const link = document.createElement('a');
  link.download = `${t('certFilename')}_BSAmanat_${courseName.replace(/\s+/g, '_')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ══ PATCH markWatched ═════════════════════════════════════════════
const _origMarkWatched = window.markWatched;
window.markWatched = function(ci, li) {
  if (typeof _origMarkWatched === 'function') _origMarkWatched.call(this, ci, li);
  recordLessonToday();
  checkFirstLesson();
  checkCourseCompletion(ci);
  updateHeaderProgressBar();
};

// ══ PATCH showLessons ═════════════════════════════════════════════
const _origShowLessons = window.showLessons;
window.showLessons = function() {
  if (typeof _origShowLessons === 'function') _origShowLessons.call(this);
  // initAutoTheme не вызываем здесь — она уже вызвана в app-core.js при старте
  // и вызов при каждом входе показывает нежелательный toast смены темы
  checkStreakOnLogin();
  updateStreakBadge();
  updateHeaderProgressBar();
  const btn = $('progress-dashboard-btn');
  if (btn) btn.style.display = 'inline-flex';
  if (!localStorage.getItem('bs_start_date')) {
    localStorage.setItem('bs_start_date', new Date().toLocaleDateString(lang === 'kz' ? 'kk-KZ' : 'ru-RU'));
  }
  const bar = $('sticky-cta-bar');
  if (bar) { bar.style.display = 'none'; bar.classList.remove('sticky-visible'); }
};

// ══ PATCH logout ══════════════════════════════════════════════════
const _origLogout = window.logout;
window.logout = function() {
  if (typeof _origLogout === 'function') _origLogout.call(this);
  updateHeaderProgressBar();
  const btn = $('progress-dashboard-btn');
  if (btn) btn.style.display = 'none';
  const streak = $('streak-badge-hero');
  if (streak) streak.style.display = 'none';
};