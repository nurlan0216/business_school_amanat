/* ============================================================
   BUSINESS SCHOOL AMANAT — PLATFORM v3.3
   Курсы, уроки, видеоплеер, демо-режим, hero-видео,
   просмотр изображений, мобильная навигация
   ============================================================ */

// ══ Утилиты просмотра/прогресса ══════════════════════════════════
const getWatchKey = (ci, li) => `${ci}-${li}`;
const isWatched   = (ci, li) => !!watchedLessons[getWatchKey(ci, li)];

function markWatched(ci, li) {
  watchedLessons[getWatchKey(ci, li)] = true;
  localStorage.setItem('watched_lessons', JSON.stringify(watchedLessons));
}
function getLessons(idx) {
  const c = courses[idx];
  if (!c) return [];
  return lang === 'kz' ? c.lessonsKZ : c.lessonsRU;
}
function getVideoLessons(idx) {
  return getLessons(idx).map((l, i) => ({ lesson: l, absIdx: i })).filter(x => x.lesson.type === 'video');
}
function getCourseProgress(idx) {
  const vl = getVideoLessons(idx);
  if (!vl.length) return { watched: 0, total: 0, pct: 0 };
  const w = vl.filter(x => isWatched(idx, x.absIdx)).length;
  return { watched: w, total: vl.length, pct: Math.round(w / vl.length * 100) };
}
function getTotalProgress() {
  let totalW = 0, totalT = 0;
  courses.forEach((_, i) => {
    const p = getCourseProgress(i);
    totalW += p.watched; totalT += p.total;
  });
  return { watched: totalW, total: totalT, pct: totalT ? Math.round(totalW / totalT * 100) : 0 };
}

// ══ HERO STATS ═══════════════════════════════════════════════════
function updateHeroStats() {
  const prog = getTotalProgress();
  animNumber('hstat-courses', courses.length);
  animNumber('hstat-watched', prog.watched);
  const pctEl = $('hstat-progress');
  if (pctEl) {
    let from = 0, to = prog.pct;
    const dur = 800, start = Date.now();
    (function f() {
      const p = Math.min(1, (Date.now() - start) / dur);
      pctEl.textContent = Math.round(from + (to - from) * easeOut(p)) + '%';
      if (p < 1) requestAnimationFrame(f);
    })();
  }
  const cc = $('courses-count');
  if (cc) cc.textContent = courses.length;
}
function animNumber(id, to) {
  const el = $(id); if (!el) return;
  const dur = 900, start = Date.now();
  (function f() {
    const p = Math.min(1, (Date.now() - start) / dur);
    el.textContent = Math.round(easeOut(p) * to);
    if (p < 1) requestAnimationFrame(f);
  })();
}

// ══ COURSES GRID ═════════════════════════════════════════════════
const BONUS_COURSES = ['shopify','ebay','таргет','target','китай','china','турция','turkey','америка','america'];
const BONUS_SUBTITLES = {
  ru: {
    'таргет': 'TikTok Реклама + Instagram Реклама',
    'target': 'TikTok Ads + Instagram Ads',
    'китай': '1688 · Taobao · Pinduoduo · WeChat · Alipay',
    'china': '1688 · Taobao · Pinduoduo · WeChat · Alipay',
    'америка': 'На казахском языке',
    'america': 'На казахском языке',
  },
  kz: {
    'таргет': 'TikTok Жарнамасы + Instagram Жарнамасы',
    'target': 'TikTok Ads + Instagram Ads',
    'китай': '1688 · Taobao · Pinduoduo · WeChat · Alipay',
    'china': '1688 · Taobao · Pinduoduo · WeChat · Alipay',
    'америка': 'Қазақ тілінде',
    'america': 'Қазақ тілінде',
  }
};

function renderCoursesGrid() {
  const grid = $('platforms-grid');
  if (!grid) return;
  const query = courseSearchQuery.toLowerCase().trim();
  const filtered = query
    ? courses.filter(c => {
        const n = (lang === 'kz' ? (c.nameKZ || c.nameRU) : (c.nameRU || c.nameKZ)).toLowerCase();
        return n.includes(query);
      })
    : courses;

  if (courses.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text3);font-size:14px">${t('noCourses')}</div>`;
    return;
  }
  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--text3);font-size:14px">${t('noResults')}</div>`;
    return;
  }

  function _buildCard(course, fi) {
    const idx        = courses.indexOf(course);
    const name       = lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ);
    const lessons    = lang === 'kz' ? course.lessonsKZ : course.lessonsRU;
    const videoCount = lessons.filter(l => l.type === 'video').length;
    const color      = course.hexColor || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    const initials   = name.substring(0, 2).toUpperCase();
    const delay      = fi * 0.06;
    const prog       = getCourseProgress(idx);
    const nameKey    = name.toLowerCase();
    const isBonus    = BONUS_COURSES.some(k => nameKey.includes(k));
    const bonusWord  = lang === 'kz' ? 'Сыйлық' : 'Бонус';
    const bonusBadge = isBonus ? `<span class="pc-bonus-badge">🎁 ${bonusWord}</span>` : '';
    const subtitleMap = BONUS_SUBTITLES[lang] || BONUS_SUBTITLES.ru;
    const subtitle   = subtitleMap[nameKey] || '';
    const subtitleHtml = subtitle ? `<p class="pc-subtitle">${subtitle}</p>` : '';
    const kzBadgeText = lang === 'kz' ? 'Қазақ тілінде' : 'На казах. языке';
    const kzBadge    = (nameKey.includes('амери') || nameKey.includes('america')) ? `<span class="pc-kz-badge">${kzBadgeText}</span>` : '';
    const iconHtml   = course.iconUrl
      ? `<img src="${course.iconUrl}" alt="${escHtml(name)}" loading="lazy" onerror="this.style.display='none'">`
      : initials;
    const progressBlock = videoCount > 0 ? `
      <div class="pc-progress-wrap">
        <div class="pc-progress-row">
          <span class="pc-progress-label">${prog.watched} ${t('of')} ${prog.total} ${t('lessons')}</span>
          <span class="pc-progress-pct" style="color:${color}">${prog.pct}%</span>
        </div>
        <div class="pc-progress-track">
          <div class="pc-progress-fill" style="width:${prog.pct}%;background:linear-gradient(90deg,${color},${lightenHex(color,20)})"></div>
        </div>
      </div>` : '';
    return `<div class="platform-card${isBonus ? ' platform-card--bonus' : ''}" style="--card-accent:${color};--card-glow:${hexToRgba(color,0.06)};animation-delay:${delay}s" onclick="openLesson(${idx})">
      <div class="pc-body">
        <div class="pc-logo">
          <div class="pc-icon" style="background:linear-gradient(140deg,${color},${darkenHex(color,20)})">${iconHtml}</div>
          <span class="pc-name">${escHtml(name)}</span>
        </div>
        ${bonusBadge}${kzBadge}${subtitleHtml}
        <p class="pc-desc">${videoCount} ${t('lessons')}</p>
      </div>
      ${progressBlock}
      <div class="pc-footer">
        <span class="pc-count"><span class="dot" style="background:${color}"></span>${videoCount} ${t('lessons')}</span>
        <span class="pc-cta" style="color:${color}"><span>${t('go')}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </span>
      </div>
    </div>`;
  }

  if (query) {
    grid.innerHTML = filtered.map((course, fi) => _buildCard(course, fi)).join('');
    updateHeroStats();
    return;
  }

  const mainCourses  = filtered.filter(c => {
    const n = (lang === 'kz' ? (c.nameKZ || c.nameRU) : (c.nameRU || c.nameKZ)).toLowerCase();
    return !BONUS_COURSES.some(k => n.includes(k));
  });
  const bonusCourses = filtered.filter(c => {
    const n = (lang === 'kz' ? (c.nameKZ || c.nameRU) : (c.nameRU || c.nameKZ)).toLowerCase();
    return BONUS_COURSES.some(k => n.includes(k));
  });

  let html = '';
  if (mainCourses.length > 0) {
    const labelMain = lang === 'kz' ? '🔥 Негізгі курстар' : '🔥 Основные курсы';
    html += `<div class="pc-group-label" style="grid-column:1/-1">${labelMain}</div>`;
    html += mainCourses.map((c, i) => _buildCard(c, i)).join('');
  }
  if (bonusCourses.length > 0) {
    const labelBonus = lang === 'kz' ? '🎁 Бонустық курстар — сыйлыққа' : '🎁 Бонусные курсы — в подарок';
    const subBonus   = lang === 'kz' ? 'Негізгілерге қосымша. Үстем төлемсіз.' : 'Идут в дополнение к основным. Без доплат.';
    html += `<div class="pc-group-label pc-group-label--bonus" style="grid-column:1/-1">${labelBonus}<span class="pc-group-sub">${subBonus}</span></div>`;
    html += bonusCourses.map((c, i) => _buildCard(c, mainCourses.length + i)).join('');
  }
  grid.innerHTML = html;
  updateHeroStats();
}

function filterCourses(q) {
  clearTimeout(filterCoursesTimer);
  filterCoursesTimer = setTimeout(() => { courseSearchQuery = q; renderCoursesGrid(); }, 220);
}
function filterLessons(q) {
  clearTimeout(filterLessonsTimer);
  filterLessonsTimer = setTimeout(() => {
    lessonSearchQuery = q;
    if (currentCourseIdx !== null) renderLessonList(currentCourseIdx);
  }, 220);
}

// ══ OPEN LESSON MODAL ═════════════════════════════════════════════
function openLesson(idx) {
  currentCourseIdx = idx;
  $('video-section').style.display = 'none';
  $('video-slot').innerHTML = '';
  $('lesson-modal').classList.remove('video-active');

  const course = courses[idx];
  const name   = lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ);
  const color  = course.hexColor || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

  const modal = $('lesson-modal').querySelector('.modal');
  if (modal) modal.style.setProperty('--card-accent-modal', color);

  const badge = $('lp-badge');
  badge.textContent = name;
  badge.style.cssText = `background:${hexToRgba(color, 0.14)};color:${color};display:inline-flex;align-items:center;border-radius:9px;padding:5px 14px;font-size:11px;font-weight:800;letter-spacing:0.6px;margin-bottom:16px;text-transform:uppercase`;

  $('lp-title').textContent = name;
  $('lp-sub').textContent   = '';
  const ls = $('lesson-search'); if (ls) { ls.value = ''; }
  lessonSearchQuery = '';

  renderLessonList(idx);
  updateModalProgress(idx);
  $('lesson-modal').classList.add('show');
}

function updateModalProgress(idx) {
  const prog = getCourseProgress(idx);
  const fill = $('mps-fill'), pct = $('mps-pct'), sub = $('mps-sub');
  if (fill) fill.style.width = prog.pct + '%';
  if (pct)  pct.textContent  = prog.pct + '%';
  if (sub)  sub.textContent  = `${prog.watched} ${t('of')} ${prog.total} ${t('lessonsWatched')}`;
  const sec = $('modal-progress-section');
  if (sec) sec.style.display = prog.total > 0 ? 'block' : 'none';
  const banner = $('completion-banner');
  if (banner) banner.classList.toggle('show', prog.total > 0 && prog.watched === prog.total);
}

// ══ LESSON LIST ═══════════════════════════════════════════════════
function renderLessonList(idx) {
  const lessons  = getLessons(idx);
  const color    = courses[idx]?.hexColor || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
  const query    = lessonSearchQuery.toLowerCase().trim();
  let videoSeq   = 0, hasResults = false;

  const html = lessons.map((lesson, i) => {
    if (lesson.type === 'empty') return '';
    if (lesson.type === 'header') {
      if (query) return '';
      return `<li class="is-section-header"><span class="section-header-text">${escHtml(lesson.name)}</span></li>`;
    }
    if (lesson.type === 'image') {
      const imgName = lesson.name || (lang === 'kz' ? 'Сурет' : 'Изображение');
      if (query && !imgName.toLowerCase().includes(query)) return '';
      hasResults = true;
      return `<li class="clickable" onclick="openImageViewer('${safeAttr(lesson.url)}','${safeAttr(imgName)}')">
        <span class="lnum" style="border-color:${color};color:${color};font-size:14px">🖼</span>
        <span class="l-title" style="color:var(--text)">${escHtml(imgName)}</span>
        <span class="l-play" style="color:${color}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </span></li>`;
    }
    if (lesson.type === 'text') {
      if (query) return '';
      return `<li class="is-text-block"><div class="lesson-text-block">${escHtml(lesson.name)}</div></li>`;
    }
    if (lesson.type === 'link') {
      const match = !query || (lesson.name || '').toLowerCase().includes(query) || (lesson.url || '').toLowerCase().includes(query);
      if (!match) return '';
      hasResults = true;
      return `<li class="clickable is-link-item" onclick="window.open('${safeAttr(lesson.url)}','_blank')">
        <div class="lesson-link-icon" style="background:${hexToRgba(color,0.12)};color:${color}">🔗</div>
        <span class="l-title" style="color:${color};font-weight:600">${escHtml(lesson.name || lesson.url)}</span>
        <span style="font-size:11px;opacity:.5;color:${color};flex-shrink:0">↗</span></li>`;
    }
    if (lesson.type === 'file') {
      if (query && !(lesson.name || '').toLowerCase().includes(query)) return '';
      hasResults = true;
      return `<li class="clickable" onclick="window.open('${safeAttr(lesson.url)}','_blank')">
        <span class="lnum" style="border-color:${color};color:${color}">📎</span>
        <span class="l-title">${escHtml(lesson.name || t('fileDownload'))}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></li>`;
    }
    // Video
    const vIdx       = videoSeq++;
    const lessonName = lesson.name || (lang === 'kz' ? `Сабақ ${vIdx + 1}` : `Урок ${vIdx + 1}`);
    const hasLink    = lesson.url && lesson.url.length > 4;
    const watched    = isWatched(idx, i);
    if (query && !lessonName.toLowerCase().includes(query)) return '';
    hasResults = true;
    return `<li class="clickable${watched ? ' watched' : ''}" onclick="playLesson(${idx},${i})">
      <span class="lnum" style="${watched
        ? 'border-color:var(--green);color:var(--green);background:rgba(34,196,138,0.1)'
        : `border-color:${color};color:${color}`}">${watched ? '✓' : vIdx + 1}</span>
      <span class="l-title">${escHtml(lessonName)}</span>
      ${watched
        ? `<span class="l-check">✓</span>`
        : (hasLink
          ? `<span class="l-play" style="color:${color}"><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></span>`
          : '<span style="font-size:11px;color:var(--text3)">—</span>')
      }</li>`;
  }).join('');

  const ul = $('lp-list');
  if (query && !hasResults) {
    ul.innerHTML = `<li style="border:none;padding:24px 0;justify-content:center"><span style="color:var(--text3);font-size:13px">${t('noResults')}</span></li>`;
  } else {
    ul.innerHTML = html;
  }
}

// ══ CLOSE LESSON ══════════════════════════════════════════════════
function closeLesson() {
  $('lesson-modal').classList.remove('show', 'video-active');
  $('video-section').style.display = 'none';
  $('video-slot').innerHTML = '';
  currentLessonIndex = 0; lessonSearchQuery = '';
  $('completion-banner').classList.remove('show');
  if (demoTimerInterval) { clearInterval(demoTimerInterval); demoTimerInterval = null; }
  if (ytPlayer) { try { ytPlayer.destroy(); } catch(_) {} ytPlayer = null; }
  currentVideoEl = null;
  syncPlayPauseIcon(false);
  $('video-container')?.classList.remove('shorts-mode');
  if (isTheaterMode) toggleVideoFS();
  const bar = $('custom-vc-bar');
  if (bar) bar.style.display = 'none';
  renderCoursesGrid();
  updateHeroStats();
}

// ══ IMAGE VIEWER ══════════════════════════════════════════════════
function openImageViewer(url, name) {
  $('img-viewer-src').src           = url;
  $('img-viewer-src').alt           = name;
  $('img-viewer-title').textContent = name;
  $('img-viewer-dl').href           = url;
  $('img-viewer-dl').download       = name;
  $('img-viewer-open').href         = url;
  $('img-viewer-modal').classList.add('show');
}
function closeImageViewer() {
  $('img-viewer-modal').classList.remove('show');
  setTimeout(() => { $('img-viewer-src').src = ''; }, 300);
}

// ══ UNIVERSAL PLAY OVERLAY ════════════════════════════════════════
function showUniversalPlayOverlay(onPlayCallback) {
  const slot = $('video-slot');
  slot.innerHTML = `
    <div id="universal-play-overlay" style="position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,0.77)">
      <div id="upo-btn" style="width:88px;height:88px;background:rgba(255,40,40,0.94);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(0,0,0,0.7);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21"/></svg>
      </div>
      <span style="color:#fff;font-size:15px;font-family:sans-serif;font-weight:500;pointer-events:none">${t('videoPlayBtn')}</span>
    </div>
  `;
  const btn = document.getElementById('upo-btn');
  btn.addEventListener('click', function () { onPlayCallback(); });
  btn.addEventListener('touchend', function (e) { e.preventDefault(); onPlayCallback(); });
}

// ══ PLAY LESSON ═══════════════════════════════════════════════════
function playLesson(courseIdx, lessonAbsIdx) {
  const lessons = getLessons(courseIdx);
  const lesson  = lessons[lessonAbsIdx];
  if (!lesson || lesson.type !== 'video') return;

  if (ytPlayer) { try { ytPlayer.destroy(); } catch(_) {} ytPlayer = null; }
  currentVideoEl = null;
  $('video-container')?.classList.remove('shorts-mode');

  const bar = $('custom-vc-bar');
  if (bar) bar.style.display = 'none';

  currentCourseIdx   = courseIdx;
  currentLessonIndex = lessonAbsIdx;
  markWatched(courseIdx, lessonAbsIdx);

  let vNum = 0;
  for (let i = 0; i < lessonAbsIdx; i++) if (lessons[i].type === 'video') vNum++;
  vNum++;

  const lessonName = lesson.name || (lang === 'kz' ? `Сабақ ${vNum}` : `Урок ${vNum}`);
  $('current-lesson-title').textContent = lessonName;

  const prevIdx = findAdjacentVideo(lessons, lessonAbsIdx, -1);
  const nextIdx = findAdjacentVideo(lessons, lessonAbsIdx, +1);
  $('prev-btn').disabled = prevIdx === -1;
  $('next-btn').disabled = nextIdx === -1;
  const vp = $('vid-prev-btn'); if (vp) vp.disabled = prevIdx === -1;
  const vn = $('vid-next-btn'); if (vn) vn.disabled = nextIdx === -1;

  const slot = $('video-slot');
  slot.innerHTML = '';
  const link = lesson.url || '';
  currentYtId = null; ytStartTime = Date.now();

  if (link) {
    const ytId = extractYouTubeId(link);
    if (ytId) {
      const isShort = /\/shorts\//i.test(link);
      const vc = $('video-container');
      if (isShort) vc.classList.add('shorts-mode');
      else vc.classList.remove('shorts-mode');

      showUniversalPlayOverlay(() => {
        slot.innerHTML = '';
        hideTapZones();
        currentVideoEl = null;

        const playerDiv = document.createElement('div');
        playerDiv.id = 'yt-player-div-' + Date.now();
        playerDiv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%';
        slot.appendChild(playerDiv);

        function createYtPlayer() {
          ytPlayer = new YT.Player(playerDiv.id, {
            videoId: ytId,
            playerVars: {
              autoplay: 1, controls: 0, fs: 0, rel: 0,
              modestbranding: 1, iv_load_policy: 3,
              playsinline: 1, showinfo: 0, disablekb: 1,
              origin: location.origin
            },
            events: {
              onReady: e => {
                e.target.playVideo();
                showCustomControls();
                syncPlayPauseIcon(true);
                addYtCleanOverlay(slot);
                if (!currentUser && isDemoLesson(currentCourseIdx, currentLessonIndex)) {
                  startDemoTimer(60);
                }
              },
              onStateChange: e => {
                syncPlayPauseIcon(e.data === 1 || e.data === 3);
              }
            }
          });
        }

        if (ytApiReady) {
          createYtPlayer();
        } else {
          let tries = 0;
          const poll = setInterval(() => {
            tries++;
            if (window.YT && YT.Player) {
              ytApiReady = true; clearInterval(poll); createYtPlayer();
            } else if (tries > 40) {
              clearInterval(poll);
              slot.innerHTML = '';
              const iframe = document.createElement('iframe');
              iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&fs=0`;
              iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
              iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';
              slot.appendChild(iframe);
              addYtCleanOverlay(slot);
              showCustomControls();
            }
          }, 200);
        }
      });
    } else if (link.includes('vk.com') || link.includes('vkvideo.ru')) {
      let embedUrl = link;
      const mClip  = link.match(/clip(-?\d+)_(\d+)/);
      const mVideo = link.match(/video(-?\d+)_(\d+)/);
      if (mClip) {
        embedUrl = `https://vkvideo.ru/clip_ext.php?oid=${mClip[1]}&id=${mClip[2]}&autoplay=1&no_recs=1`;
      } else if (mVideo) {
        embedUrl = `https://vk.com/video_ext.php?oid=${mVideo[1]}&id=${mVideo[2]}&hd=2&autoplay=1&js_api=1&no_recs=1`;
      }
      showUniversalPlayOverlay(() => {
        slot.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock; web-share';
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('webkitallowfullscreen', 'true');
        iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';
        slot.appendChild(iframe);
        showCustomControls();
      });
    } else if (link.includes('drive.google.com')) {
      let fileId = null;
      const m1 = link.match(/\/file\/d\/([^\/\?&]+)/);
      const m2 = link.match(/[?&]id=([^&]+)/);
      if (m1) fileId = m1[1]; else if (m2) fileId = m2[1];
      const embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : link.replace('/view', '/preview');
      showUniversalPlayOverlay(() => {
        slot.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
        iframe.setAttribute('allowfullscreen', '');
        iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';
        slot.appendChild(iframe);
        showCustomControls();
      });
    } else if (link.includes('cloudflarestream.com') || link.includes('iframe.cloudflarestream.com')) {
      let src = link;
      const m = link.match(/cloudflarestream\.com\/([a-f0-9]+)/i);
      if (m) src = `https://iframe.cloudflarestream.com/${m[1]}?autoplay=true&preload=true`;
      showUniversalPlayOverlay(() => {
        slot.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen';
        iframe.setAttribute('allowfullscreen', '');
        iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';
        slot.appendChild(iframe);
        showCustomControls();
      });
    } else if (link.includes('vimeo.com')) {
      const m = link.match(/vimeo\.com\/(\d+)/);
      const videoId = m ? m[1] : '';
      const src = videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1&playsinline=1&muted=0` : link;
      showUniversalPlayOverlay(() => {
        slot.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('webkitallowfullscreen', 'true');
        iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';
        slot.appendChild(iframe);
        showCustomControls();
      });
    } else if (link.includes('bunny.net') || link.includes('b-cdn.net') || link.includes('iframe.mediadelivery.net')) {
      let src = link;
      if (!link.includes('iframe.mediadelivery.net') && !link.includes('embed')) {
        const m = link.match(/([a-f0-9\-]{36})/i);
        if (m) src = `https://iframe.mediadelivery.net/embed/${m[1]}?autoplay=true`;
      }
      showUniversalPlayOverlay(() => {
        slot.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen';
        iframe.setAttribute('allowfullscreen', '');
        iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';
        slot.appendChild(iframe);
        showCustomControls();
      });
    } else if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(link)) {
      showUniversalPlayOverlay(() => {
        slot.innerHTML = '';
        currentVideoEl = null;
        const video = document.createElement('video');
        video.src = link;
        video.controls = true;
        video.playsinline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.preload = 'metadata';
        video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:#000;border-radius:inherit';
        slot.appendChild(video);
        currentVideoEl = video;
        showCustomControls();
      });
    } else {
      showUniversalPlayOverlay(() => {
        slot.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = link;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
        iframe.setAttribute('allowfullscreen', '');
        iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';
        slot.appendChild(iframe);
        showCustomControls();
      });
    }
  } else {
    slot.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:13px;flex-direction:column;gap:10px"><span style="font-size:36px">🎬</span><span>Ссылка не добавлена</span></div>`;
  }

  setupTapZones();
  $('video-section').style.display = 'block';
  if (window.innerWidth <= 640) $('lesson-modal').classList.add('video-active');
  updateModalProgress(courseIdx);
  renderLessonList(courseIdx);
}

function findAdjacentVideo(lessons, from, dir) {
  let i = from + dir;
  while (i >= 0 && i < lessons.length) {
    if (lessons[i].type === 'video') return i;
    i += dir;
  }
  return -1;
}
function extractYouTubeId(url) {
  const patterns = [/youtu\.be\/([^?&]+)/, /youtube\.com\/watch\?v=([^&]+)/, /youtube\.com\/embed\/([^?&]+)/, /youtube\.com\/shorts\/([^?&]+)/];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

// ══ CUSTOM VIDEO CONTROLS ════════════════════════════════════════
function showCustomControls() {
  const bar = $('custom-vc-bar');
  if (bar) bar.style.display = 'flex';
}

function addYtCleanOverlay(slot) {
  const old = slot.querySelector('#yt-clean-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'yt-clean-overlay';
  overlay.style.cssText = 'position:absolute;inset:0;z-index:7;background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent';
  slot.appendChild(overlay);

  let tapTimer2 = null, lastTapTime = 0, lastTapZone = '';

  function getZone(e) {
    const rect = overlay.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const pct = x / rect.width;
    if (pct < 0.33) return 'left';
    if (pct > 0.67) return 'right';
    return 'center';
  }

  function handleTap(e) {
    const now = Date.now();
    const zone = getZone(e);
    const isDouble = (now - lastTapTime) < 320 && zone === lastTapZone;
    lastTapTime = now; lastTapZone = zone;
    if (isDouble) {
      clearTimeout(tapTimer2); tapTimer2 = null;
      if (zone === 'left')        vcSeek(-10);
      else if (zone === 'right')  vcSeek(10);
      else                         toggleYtPlayPause();
    } else {
      clearTimeout(tapTimer2);
      tapTimer2 = setTimeout(() => { tapTimer2 = null; toggleYtPlayPause(); }, 280);
    }
  }
  overlay.addEventListener('click', handleTap);
  overlay.addEventListener('touchend', e => { e.preventDefault(); handleTap(e); });
}

function syncPlayPauseIcon(playing) {
  const iconPlay  = $('vc-icon-play');
  const iconPause = $('vc-icon-pause');
  if (!iconPlay || !iconPause) return;
  iconPlay.style.display  = playing ? 'none' : '';
  iconPause.style.display = playing ? '' : 'none';
}

function toggleYtPlayPause() {
  if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') {
    const overlay = document.getElementById('yt-clean-overlay');
    if (overlay) overlay.click();
    return;
  }
  try {
    const state = ytPlayer.getPlayerState();
    if (state === 1 || state === 3) {
      ytPlayer.pauseVideo(); showPlayPauseFlash('⏸'); syncPlayPauseIcon(false);
    } else {
      ytPlayer.playVideo();  showPlayPauseFlash('▶'); syncPlayPauseIcon(true);
    }
  } catch(_) {}
}

function showPlayPauseFlash(icon) {
  const el = $('seek-flash');
  if (!el) return;
  el.textContent = icon;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.remove('show'), 700);
}

function showSeekFlash(delta) {
  const el = $('seek-flash');
  if (!el) return;
  el.textContent = delta > 0 ? `+${delta} сек ⏩` : `${delta} сек ⏪`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.remove('show'), 900);
}

function vcSeek(delta) {
  if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
    try { ytPlayer.seekTo(Math.max(0, ytPlayer.getCurrentTime() + delta), true); showSeekFlash(delta); return; } catch(_) {}
  }
  if (currentVideoEl) {
    currentVideoEl.currentTime = Math.max(0, currentVideoEl.currentTime + delta);
    showSeekFlash(delta); return;
  }
  showSeekFlash(delta);
}

function toggleVideoFS() {
  const vc = $('video-container');
  const bar = $('custom-vc-bar');
  const esc = $('theater-esc');
  const expandIcon = $('vc-fs-icon-expand');
  const shrinkIcon = $('vc-fs-icon-shrink');

  if (!isTheaterMode) {
    isTheaterMode = true;
    vc.classList.add('theater-mode');
    document.body.classList.add('video-theater');
    if (esc) esc.style.display = 'flex';
    if (expandIcon) expandIcon.style.display = 'none';
    if (shrinkIcon) shrinkIcon.style.display = 'block';
    if (bar) bar.style.display = 'flex';
  } else {
    isTheaterMode = false;
    vc.classList.remove('theater-mode');
    document.body.classList.remove('video-theater');
    if (esc) esc.style.display = 'none';
    if (expandIcon) expandIcon.style.display = 'block';
    if (shrinkIcon) shrinkIcon.style.display = 'none';
  }
}

function hideTapZones() {
  ['tap-left','tap-right','tap-center'].forEach(id => {
    const el = $(id); if (el) el.style.pointerEvents = 'none';
  });
}
function showTapZones() {
  ['tap-left','tap-right','tap-center'].forEach(id => {
    const el = $(id); if (el) el.style.pointerEvents = '';
  });
}
function setupTapZones() { hideTapZones(); }

function prevLesson() {
  const lessons = getLessons(currentCourseIdx);
  const prev = findAdjacentVideo(lessons, currentLessonIndex, -1);
  if (prev !== -1) playLesson(currentCourseIdx, prev);
}
function nextLesson() {
  const lessons = getLessons(currentCourseIdx);
  const next = findAdjacentVideo(lessons, currentLessonIndex, +1);
  if (next !== -1) playLesson(currentCourseIdx, next);
}
const getElapsedSec = () => Math.round((Date.now() - ytStartTime) / 1000);

// ══ DEMO MODE ════════════════════════════════════════════════════
function isDemoLesson(courseIdx, lessonAbsIdx) {
  if (courseIdx === null) return false;
  const vl = getVideoLessons(courseIdx);
  return vl.length > 0 && vl[0].absIdx === lessonAbsIdx;
}

function startDemoTimer(seconds) {
  if (demoTimerInterval) clearInterval(demoTimerInterval);
  let left = seconds;
  const slot = $('video-slot');
  const timerEl = document.createElement('div');
  timerEl.id = 'demo-timer-bar';
  timerEl.style.cssText = `position:absolute;top:10px;right:10px;z-index:20;background:rgba(0,0,0,0.75);color:#f5c842;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;padding:6px 12px;border-radius:8px;pointer-events:none;border:1px solid rgba(245,200,66,0.4);`;
  timerEl.textContent = `🎬 Демо: ${left} сек`;
  slot.appendChild(timerEl);

  demoTimerInterval = setInterval(() => {
    left--;
    if (timerEl.isConnected) timerEl.textContent = `🎬 Демо: ${left} сек`;
    if (left <= 0) {
      clearInterval(demoTimerInterval);
      demoTimerInterval = null;
      showDemoEndOverlay();
    }
  }, 1000);
}

function showDemoEndOverlay() {
  if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
    try { ytPlayer.pauseVideo(); } catch(_) {}
  }
  const slot = $('video-slot');
  const tb = document.getElementById('demo-timer-bar');
  if (tb) tb.remove();
  const overlay = document.createElement('div');
  overlay.id = 'demo-end-overlay';
  overlay.style.cssText = `position:absolute;inset:0;z-index:25;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:rgba(6,6,8,0.92);text-align:center;padding:24px;font-family:'DM Sans',sans-serif;`;
  overlay.innerHTML = `
    <div style="font-size:44px">🔒</div>
    <div style="color:#fff;font-size:18px;font-weight:700;line-height:1.4">Войдите для просмотра<br>полного урока</div>
    <div style="color:#8080a8;font-size:13px;max-width:260px;line-height:1.6">Вы просмотрели демо-версию. Войдите в платформу, чтобы получить полный доступ ко всем урокам.</div>
    <button onclick="closeLesson()" style="background:linear-gradient(135deg,#f5c842,#f0a500);border:none;border-radius:12px;padding:13px 28px;font-size:14px;font-weight:700;color:#000;cursor:pointer;font-family:'DM Sans',sans-serif;margin-top:4px;">Войти в платформу</button>
  `;
  slot.appendChild(overlay);
}

// ══ DEMO SECTION (landing demo cards) ════════════════════════════
let demoSectionOpen = false;

function toggleDemoSection() {
  demoSectionOpen = !demoSectionOpen;
  const wrap = $('demo-cards-wrap');
  const section = $('demo-section');
  if (!wrap || !section) return;
  if (demoSectionOpen) {
    wrap.style.display = 'block'; section.classList.add('open'); renderDemoCards();
  } else {
    wrap.style.display = 'none'; section.classList.remove('open');
  }
}

function renderDemoCards() {
  const grid = $('demo-cards-grid');
  if (!grid) return;
  if (!courses || courses.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text3);font-size:13px">⏳ ${t('demoLoading')}</div>`;
    setTimeout(renderDemoCards, 1500);
    return;
  }
  grid.innerHTML = courses.map((course, idx) => {
    const name  = lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ);
    const color = course.hexColor || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    const initials = name.substring(0, 2).toUpperCase();
    const iconHtml = course.iconUrl
      ? `<img src="${course.iconUrl}" alt="${escHtml(name)}" loading="lazy" onerror="this.style.display='none'">`
      : initials;
    const lessons = lang === 'kz' ? course.lessonsKZ : course.lessonsRU;
    return `<div class="demo-card" style="--demo-accent:${color};--demo-glow:${hexToRgba(color,0.05)}" onclick="openDemoLesson(${idx})">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="demo-card-icon" style="background:linear-gradient(140deg,${color},${darkenHex(color,20)})">${iconHtml}</div>
        <div>
          <div class="demo-card-name">${escHtml(name)}</div>
          <div class="demo-card-meta">${lessons.filter(l=>l.type==='video').length} ${t('demoLessonsUnit')}</div>
        </div>
      </div>
      <div class="demo-card-badge">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        ${t('demoFreeBadge')}
      </div>
      <div class="demo-card-cta">
        <span class="demo-cta-label">${t('demoWatchCta')}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </div>
    </div>`;
  }).join('');
}

function openDemoLesson(idx) {
  const course = courses[idx];
  if (!course) return;
  const name    = lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ);
  const color   = course.hexColor || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
  const lessons = lang === 'kz' ? course.lessonsKZ : course.lessonsRU;
  const first   = lessons.find(l => l.type === 'video');
  if (!first || !first.url) { showToast(t('demoUnavailable'), 'error'); return; }

  const ytId = extractYouTubeId(first.url);
  if (!ytId) { showToast(t('demoUnavailableShort'), 'error'); return; }

  const lessonTitle = first.name || (lang === 'kz' ? 'Сабақ 1' : 'Урок 1');
  demoSecondsLeft = 60;

  const overlay = document.createElement('div');
  overlay.className = 'demo-video-overlay';
  overlay.id = 'demo-video-overlay';
  overlay.innerHTML = `
    <div class="demo-video-inner" id="demo-video-inner">
      <div class="demo-modal-header">
        <div class="lesson-badge" style="background:${hexToRgba(color,0.14)};color:${color};display:inline-flex;align-items:center;border-radius:9px;padding:5px 14px;font-size:11px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase">${escHtml(name)}</div>
        <button class="demo-video-close" onclick="closeDemoLesson()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="demo-video-title">${escHtml(lessonTitle)}</div>
      <div class="video-container" id="demo-video-container">
        <div id="demo-video-slot"></div>
        <div class="tap-zone tap-left"  id="demo-tap-left"  onclick="demoVcSeek(-10)"></div>
        <div class="tap-zone tap-right" id="demo-tap-right" onclick="demoVcSeek(10)"></div>
        <div id="demo-seek-flash" class="seek-flash"></div>
        <button id="demo-theater-esc" class="theater-esc" onclick="toggleDemoFS()" style="display:none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="8 3 3 3 3 8"/><polyline points="21 8 21 3 16 3"/><polyline points="3 16 3 21 8 21"/><polyline points="16 21 21 21 21 16"/></svg>
        </button>
        <div class="demo-click-guard" id="demo-click-guard"></div>
      </div>
      <div class="custom-vc-bar" id="demo-vc-bar">
        <button class="vc-btn vc-rew" onclick="demoVcSeek(-10)" title="-10 сек">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.22"/></svg><span>-10</span>
        </button>
        <div class="vc-spacer"></div>
        <button class="vc-btn vc-play-pause" id="demo-play-pause-btn" onclick="toggleDemoPlayPause()" title="Воспроизвести / Пауза">
          <svg id="demo-icon-play" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
          <svg id="demo-icon-pause" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        </button>
        <div class="vc-spacer"></div>
        <button class="vc-btn vc-fwd" onclick="demoVcSeek(10)" title="+10 сек">
          <span>+10</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3.22"/></svg>
        </button>
        <div class="vc-divider"></div>
        <button class="vc-btn vc-fs" onclick="toggleDemoFS()" title="Полноэкранный режим">
          <svg id="demo-fs-expand" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          <svg id="demo-fs-shrink" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:none"><polyline points="8 3 3 3 3 8"/><polyline points="21 8 21 3 16 3"/><polyline points="3 16 3 21 8 21"/><polyline points="16 21 21 21 21 16"/></svg>
        </button>
      </div>
      <div class="demo-timer-bar"><div class="demo-timer-fill" id="demo-timer-fill" style="width:100%"></div></div>
      <div class="demo-video-limit">Демо-версия: <strong id="demo-seconds">60</strong> сек. — <a href="#" onclick="event.preventDefault();closeDemoLesson();showLandingLogin()" style="color:var(--gold)">Войти для полного доступа →</a></div>
    </div>`;
  document.body.appendChild(overlay);

  // Start demo countdown
  let timeLeft = 60;
  const timerFill = document.getElementById('demo-timer-fill');
  const secEl = document.getElementById('demo-seconds');

  if (demoTimerInterval) clearInterval(demoTimerInterval);
  demoTimerInterval = setInterval(() => {
    timeLeft--;
    if (secEl) secEl.textContent = timeLeft;
    if (timerFill) timerFill.style.width = (timeLeft / 60 * 100) + '%';
    if (timeLeft <= 0) {
      clearInterval(demoTimerInterval);
      demoTimerInterval = null;
      _showDemoEndBlock();
    }
  }, 1000);

  _loadDemoYt(ytId);
}

let demoSecondsLeft = 60;

function _loadDemoYt(ytId) {
  const slot = document.getElementById('demo-video-slot');
  if (!slot) return;

  if (ytApiReady && typeof YT !== 'undefined' && YT.Player) {
    const div = document.createElement('div');
    div.id = 'demo-yt-api-target';
    slot.appendChild(div);
    demoyYtPlayer = new YT.Player('demo-yt-api-target', {
      videoId: ytId,
      playerVars: { autoplay: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1, controls: 0, disablekb: 1 },
      width: '100%', height: '100%',
      events: {
        onReady: e => { try { e.target.playVideo(); syncDemoPlayPauseIcon(true); } catch(_) {} }
      }
    });
    setTimeout(() => {
      const iframe = slot.querySelector('iframe');
      if (iframe) iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;pointer-events:none';
    }, 800);
  } else {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&controls=0&disablekb=1&iv_load_policy=3&playsinline=1`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;pointer-events:none';
    slot.appendChild(iframe);
  }
}

function _showDemoEndBlock() {
  if (demoyYtPlayer && typeof demoyYtPlayer.pauseVideo === 'function') {
    try { demoyYtPlayer.pauseVideo(); } catch(_) {}
  }
  setTimeout(() => {
    closeDemoLesson();
    setTimeout(() => { const inp = $('inp-name'); if (inp) inp.focus(); }, 300);
  }, 800);
}

function syncDemoPlayPauseIcon(playing) {
  const iconPlay  = document.getElementById('demo-icon-play');
  const iconPause = document.getElementById('demo-icon-pause');
  if (!iconPlay || !iconPause) return;
  iconPlay.style.display  = playing ? 'none' : '';
  iconPause.style.display = playing ? '' : 'none';
}

function toggleDemoPlayPause() {
  if (!demoyYtPlayer || typeof demoyYtPlayer.getPlayerState !== 'function') return;
  try {
    const state = demoyYtPlayer.getPlayerState();
    if (state === 1 || state === 3) { demoyYtPlayer.pauseVideo(); syncDemoPlayPauseIcon(false); }
    else { demoyYtPlayer.playVideo(); syncDemoPlayPauseIcon(true); }
  } catch(_) {}
}

function demoVcSeek(delta) {
  if (demoyYtPlayer && typeof demoyYtPlayer.getCurrentTime === 'function') {
    try { demoyYtPlayer.seekTo(Math.max(0, demoyYtPlayer.getCurrentTime() + delta), true); } catch(_) {}
  }
  const flash = document.getElementById('demo-seek-flash');
  if (flash) {
    flash.textContent = delta > 0 ? `+${delta}с` : `${delta}с`;
    flash.classList.remove('show'); void flash.offsetWidth; flash.classList.add('show');
    setTimeout(() => flash.classList.remove('show'), 600);
  }
}

function toggleDemoFS() {
  const vc  = document.getElementById('demo-video-container');
  const esc = document.getElementById('demo-theater-esc');
  const exp = document.getElementById('demo-fs-expand');
  const shr = document.getElementById('demo-fs-shrink');
  demoIsTheater = !demoIsTheater;
  if (demoIsTheater) {
    vc?.classList.add('theater-mode');
    document.body.classList.add('video-theater');
    if (esc) esc.style.display = 'flex';
    if (exp) exp.style.display = 'none';
    if (shr) shr.style.display = 'block';
  } else {
    vc?.classList.remove('theater-mode');
    document.body.classList.remove('video-theater');
    if (esc) esc.style.display = 'none';
    if (exp) exp.style.display = 'block';
    if (shr) shr.style.display = 'none';
  }
}

function closeDemoLesson() {
  if (demoTimerInterval) { clearInterval(demoTimerInterval); demoTimerInterval = null; }
  if (demoyYtPlayer && typeof demoyYtPlayer.destroy === 'function') {
    try { demoyYtPlayer.destroy(); } catch(_) {}
    demoyYtPlayer = null;
  }
  if (demoIsTheater) { document.body.classList.remove('video-theater'); demoIsTheater = false; }
  const ov = $('demo-video-overlay');
  if (ov) ov.remove();
  if (!currentUser) {
    const loginPg = $('login-page');
    const lp = $('landing-page');
    if (lp && loginPg) {
      lp.style.display = 'block'; lp.classList.add('page-fade-in');
      loginPg.style.display = 'none';
      const backBtn = $('lp-back-btn');
      if (backBtn) backBtn.style.display = 'none';
      setTimeout(() => { lp.classList.remove('page-fade-in'); }, 400);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      resetIdleBeacon();
    }
  }
}

// ══ HERO VIDEO (YT IFrame API + custom controls) ══════════════════
function getHeroVideoId() { return localStorage.getItem('bs_hero_video_id') || ''; }

// ── Применяет hero-видео: показывает/скрывает блок по наличию ID ──
function applyHeroVideo() {
  const id = (typeof getHeroVideoId === 'function')
    ? getHeroVideoId()
    : (localStorage.getItem('bs_hero_video_id') || '');
  const wrap   = document.getElementById('lp-hero-video-wrap');
  const poster = document.getElementById('lp-hero-video-poster');
  const player = document.getElementById('lp-hero-video-player');
  if (!wrap) return;
  if (id) {
    wrap.style.display = '';
    if (poster) poster.style.display = '';
    if (player) { player.style.display = 'none'; } // сбросить; видео грузится по клику
    wrap.dataset.ytId = id;
  } else {
    wrap.style.display = 'none';
  }
}

// ── Состояние hero-плеера ─────────────────────────────────────
let heroYtPlayer   = null;
let heroVcInterval = null;
let heroVcMuted    = true;  // стартуем muted (autoplay требует)
let heroVcIsDragging = false;

// ── Открыть / закрыть ─────────────────────────────────────────
function openHeroVideo() {
  const ytId = getHeroVideoId();
  if (!ytId) { showToast('🎬 Добавьте YouTube ID в Админ-панели (⚙ → Видео-превью)', 'info'); return; }

  const poster = document.getElementById('lp-hero-video-poster');
  const playerWrap = document.getElementById('lp-hero-video-player');
  if (!poster || !playerWrap) return;

  poster.style.display = 'none';
  playerWrap.style.display = 'block';

  // Уничтожаем старый инстанс если был
  if (heroYtPlayer) { try { heroYtPlayer.destroy(); } catch(_) {} heroYtPlayer = null; }

  // Контейнер должен быть чистым div без id-коллизий
  const target = document.getElementById('lp-hero-yt-api');
  if (!target) return;
  target.innerHTML = '<div id="lp-hero-yt-player-div"></div>';

  // Ждём готовности YT API
  function _create() {
    heroYtPlayer = new YT.Player('lp-hero-yt-player-div', {
      videoId: ytId,
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        iv_load_policy: 3,
        disablekb: 1,
        fs: 0,
      },
      events: {
        onReady: function(e) {
          e.target.playVideo();
          heroVcMuted = true;
          _heroVcUpdateMuteIcon();
          _heroVcStartPoll();
        },
        onStateChange: function(e) {
          const playing = e.data === YT.PlayerState.PLAYING;
          _heroVcSyncPlayIcon(playing);
          if (playing) _heroVcStartPoll();
          else _heroVcStopPoll();
        },
      },
    });
  }

  if (window.YT && YT.Player) { _create(); }
  else {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function() {
      if (prev) prev();
      _create();
    };
  }
}

function closeHeroVideo() {
  _heroVcStopPoll();
  if (heroYtPlayer) { try { heroYtPlayer.stopVideo(); heroYtPlayer.destroy(); } catch(_) {} heroYtPlayer = null; }
  const target = document.getElementById('lp-hero-yt-api');
  if (target) target.innerHTML = '<div id="lp-hero-yt-player-div"></div>';
  const playerWrap = document.getElementById('lp-hero-video-player');
  if (playerWrap) playerWrap.style.display = 'none';
  const poster = document.getElementById('lp-hero-video-poster');
  if (poster) poster.style.display = 'flex';
  // Сброс иконок
  _heroVcSyncPlayIcon(false);
}

// ── Play / Pause ──────────────────────────────────────────────
function heroVcTogglePlay() {
  if (!heroYtPlayer || typeof heroYtPlayer.getPlayerState !== 'function') return;
  const state = heroYtPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) { heroYtPlayer.pauseVideo(); _heroVcSyncPlayIcon(false); }
  else { heroYtPlayer.playVideo(); _heroVcSyncPlayIcon(true); }
}

// ── Перемотка ─────────────────────────────────────────────────
function heroVcSeek(delta) {
  if (!heroYtPlayer || typeof heroYtPlayer.getCurrentTime !== 'function') return;
  try { heroYtPlayer.seekTo(Math.max(0, heroYtPlayer.getCurrentTime() + delta), true); } catch(_) {}
}

// ── Mute / Unmute ─────────────────────────────────────────────
function heroVcToggleMute() {
  if (!heroYtPlayer) return;
  heroVcMuted = !heroVcMuted;
  try { heroVcMuted ? heroYtPlayer.mute() : heroYtPlayer.unMute(); } catch(_) {}
  _heroVcUpdateMuteIcon();
}

function _heroVcUpdateMuteIcon() {
  const on  = document.getElementById('lp-hvc-vol-on');
  const off = document.getElementById('lp-hvc-vol-off');
  if (on)  on.style.display  = heroVcMuted ? 'none' : '';
  if (off) off.style.display = heroVcMuted ? '' : 'none';
}

// ── Fullscreen ────────────────────────────────────────────────
function heroVcToggleFS() {
  const wrap = document.getElementById('lp-hero-video-wrap');
  if (!wrap) return;
  if (!document.fullscreenElement) {
    wrap.requestFullscreen && wrap.requestFullscreen();
  } else {
    document.exitFullscreen && document.exitFullscreen();
  }
}

document.addEventListener('fullscreenchange', function() {
  const exp = document.getElementById('lp-hvc-fs-exp');
  const shr = document.getElementById('lp-hvc-fs-shr');
  const isFs = !!document.fullscreenElement;
  if (exp) exp.style.display = isFs ? 'none' : '';
  if (shr) shr.style.display = isFs ? '' : 'none';
});

// ── Прогресс-бар (клик + drag) ────────────────────────────────
function heroVcSeekStart(e) {
  heroVcIsDragging = true;
  heroVcSeekAt(e);

  function onMove(ev) { if (heroVcIsDragging) heroVcSeekAt(ev.touches ? ev.touches[0] : ev); }
  function onUp()   { heroVcIsDragging = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp); }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchmove', onMove, { passive: true });
  document.addEventListener('touchend', onUp);
}

function heroVcSeekAt(e) {
  const bar = document.getElementById('lp-hvc-progress');
  if (!bar || !heroYtPlayer || typeof heroYtPlayer.getDuration !== 'function') return;
  const rect = bar.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  try {
    const dur = heroYtPlayer.getDuration();
    if (dur > 0) heroYtPlayer.seekTo(pct * dur, true);
  } catch(_) {}
}

// ── Polling: обновляем прогресс-бар и таймер ─────────────────
function _heroVcStartPoll() {
  if (heroVcInterval) return;
  heroVcInterval = setInterval(_heroVcTick, 250);
}

function _heroVcStopPoll() {
  if (heroVcInterval) { clearInterval(heroVcInterval); heroVcInterval = null; }
}

function _heroVcTick() {
  if (!heroYtPlayer || typeof heroYtPlayer.getCurrentTime !== 'function') return;
  try {
    const cur = heroYtPlayer.getCurrentTime();
    const dur = heroYtPlayer.getDuration();
    if (!dur) return;

    const pct = cur / dur;
    const fill  = document.getElementById('lp-hvc-fill');
    const thumb = document.getElementById('lp-hvc-thumb');
    if (!heroVcIsDragging) {
      if (fill)  fill.style.width = (pct * 100) + '%';
      if (thumb) thumb.style.left = (pct * 100) + '%';
    }

    const timeEl = document.getElementById('lp-hvc-time');
    if (timeEl) timeEl.textContent = _heroFmt(cur) + ' / ' + _heroFmt(dur);
  } catch(_) {}
}

function _heroFmt(s) {
  s = Math.floor(s);
  const m = Math.floor(s / 60), sec = s % 60;
  return m + ':' + String(sec).padStart(2, '0');
}

// ── Синхронизация иконки play/pause ──────────────────────────
function _heroVcSyncPlayIcon(playing) {
  const iconPlay  = document.getElementById('lp-hvc-icon-play');
  const iconPause = document.getElementById('lp-hvc-icon-pause');
  if (iconPlay)  iconPlay.style.display  = playing ? 'none' : '';
  if (iconPause) iconPause.style.display = playing ? '' : 'none';
}

function updateHeroVideoTexts() {
  const isKz = lang === 'kz';
  setText('lp-hvr-label',    isKz ? 'Студент нәтижесі'        : 'Результат студента');
  setText('lp-hvr-period',   isKz ? 'Kaspi-де бірінші айда'   : 'за первый месяц на Kaspi');
  setText('lp-hvr-duration', isKz ? '▶ 28 сек · нақты сатылым': '▶ 28 сек · реальные продажи');
  setText('lp-hvp-text',     isKz ? '2 400+ студент сатуда'   : '2 400+ студентов уже продают');
}

// ══ RESUME BEACON ════════════════════════════════════════════════
function showResumeBeacon() {
  if (!currentUser || !courses.length) return;
  for (let ci = 0; ci < courses.length; ci++) {
    const vl = getVideoLessons(ci);
    if (!vl.length) continue;
    let lastWatched = -1;
    for (let vi = vl.length - 1; vi >= 0; vi--) {
      if (isWatched(ci, vl[vi].absIdx)) { lastWatched = vi; break; }
    }
    const nextIdx = lastWatched < vl.length - 1 ? lastWatched + 1 : -1;
    if (nextIdx === -1) continue;
    const next = vl[nextIdx];
    const course = courses[ci];
    const name = lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ);
    const color = course.hexColor || DEFAULT_COLORS[ci % DEFAULT_COLORS.length];
    const lessons = lang === 'kz' ? course.lessonsKZ : course.lessonsRU;
    let vNum = 0;
    for (let i = 0; i < next.absIdx; i++) if (lessons[i].type === 'video') vNum++;
    vNum++;
    const lessonName = next.lesson.name || (lang === 'kz' ? `Сабақ ${vNum}` : `Урок ${vNum}`);
    const old = $('resume-beacon-el');
    if (old) old.remove();
    const beacon = document.createElement('div');
    beacon.id = 'resume-beacon-el';
    beacon.className = 'resume-beacon';
    beacon.style.setProperty('--rb-color', color);
    beacon.innerHTML = `
      <div class="rb-inner" onclick="openLesson(${ci});setTimeout(()=>playLesson(${ci},${next.absIdx}),400)">
        <div class="rb-icon" style="background:${color}">▶</div>
        <div class="rb-text">
          <div class="rb-course">${escHtml(name)}</div>
          <div class="rb-lesson">${escHtml(lessonName)}</div>
        </div>
        <div class="rb-close" onclick="event.stopPropagation();this.closest('.resume-beacon').remove()">✕</div>
      </div>`;
    document.body.appendChild(beacon);
    setTimeout(() => beacon.classList.add('rb-visible'), 100);
    return;
  }
}

// ══ MOBILE NAV ════════════════════════════════════════════════════
function mobileNavTo(section, btn) {
  document.querySelectorAll('.mnav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (section === 'catalog') {
    $('catalog-page-modal').classList.add('show');
  } else if (section === 'help') {
    if (waUrl) window.open(waUrl, '_blank');
    else if (tgUrl) window.open(tgUrl, '_blank');
    else showToast(t('linkNotSet'), 'error');
  } else {
    document.querySelector('.platforms-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ══ SHOW LESSONS / LOGOUT / SHOW LANDING ════════════════════════
function showLessons() {
  $('landing-page').style.display  = 'none';
  $('login-page').style.display    = 'none';
  $('lessons-page').style.display  = 'block';
  $('logout-btn').style.display    = 'flex';
  $('header-center').style.display = 'flex';
  if (window.innerWidth <= 640) $('mobile-nav').style.display = 'flex';
  const mobWaBar = $('mob-wa-bar');
  if (mobWaBar) mobWaBar.style.display = 'none';
  const blockOverlay = $('block-overlay');
  if (blockOverlay) blockOverlay.style.display = 'none';

  applyTexts(); applyLinks();
  updateHeroStats();
  startSecurityMonitor();

  setTimeout(() => {
    document.querySelectorAll('.platform-card').forEach(el => el.style.animation = '');
    showResumeBeacon();
  }, 1200);
}

function logout() {
  if (securityCheckInterval) { clearInterval(securityCheckInterval); securityCheckInterval = null; }
  currentUser = null; currentCourseIdx = null;
  try {
    sessionStorage.removeItem('bs_user');
    sessionStorage.removeItem('bs_iin');
    sessionStorage.removeItem('bs_phone');
  } catch(_) {}
  try { localStorage.removeItem('bs_session'); } catch(_) {}

  $('logout-btn').style.display    = 'none';
  $('mobile-nav').style.display    = 'none';
  $('header-center').style.display = 'none';
  $('lessons-page').style.display  = 'none';
  $('login-page').style.display    = 'none';

  ['inp-name','inp-iin','inp-phone'].forEach(id => { const e=$(id); if(e) e.value=''; });
  ['login-error','login-success'].forEach(id => { const e=$(id); if(e) e.style.display='none'; });
  $('progress-wrap').style.display = 'none';
  $('prog-fill').style.width = '0%';
  const btn = $('login-btn'); btn.disabled = false; btn.classList.remove('loading');

  const lp = $('landing-page');
  if (lp) {
    lp.style.display = 'block';
    lp.classList.add('page-fade-in');
    setTimeout(() => lp.classList.remove('page-fade-in'), 400);
  }
  const backBtn = $('lp-back-btn');
  if (backBtn) backBtn.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  resetIdleBeacon();
}

function showLanding() {
  const lp = $('landing-page');
  const loginPg = $('login-page');
  if (loginPg) { loginPg.classList.add('page-fade-out'); }
  setTimeout(() => {
    if (loginPg) { loginPg.style.display = 'none'; loginPg.classList.remove('page-fade-out'); }
    if (lp) { lp.style.display = 'block'; lp.classList.add('page-fade-in'); }
    setTimeout(() => { if (lp) lp.classList.remove('page-fade-in'); }, 400);
    const backBtn = $('lp-back-btn');
    if (backBtn) backBtn.style.display = 'none';
    const mobWaBar = $('mob-wa-bar');
    if (mobWaBar && window.innerWidth <= 768) mobWaBar.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    resetIdleBeacon();
    if (window._showViewersBar) window._showViewersBar();
  }, 220);
}

function showLandingLogin() {
  const lp = $('landing-page');
  const loginPg = $('login-page');
  if (lp) { lp.classList.add('page-fade-out'); }
  if (window._hideViewersBar) window._hideViewersBar();
  setTimeout(() => {
    if (lp) { lp.style.display = 'none'; lp.classList.remove('page-fade-out'); }
    const mobWaBarLogin = $('mob-wa-bar');
    if (mobWaBarLogin) mobWaBarLogin.style.display = 'none';
    if (loginPg) {
      loginPg.style.display = 'flex';
      loginPg.classList.add('page-fade-in');
      loginPg.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(() => { if (loginPg) loginPg.classList.remove('page-fade-in'); }, 400);
    const backBtn = $('lp-back-btn');
    if (backBtn) backBtn.style.display = 'flex';
    removeIdleBeacon();
  }, 220);
}

function scrollToDemoAndOpen() {
  const lp = $('landing-page');
  const loginPg = $('login-page');
  if (lp) { lp.classList.add('page-fade-out'); }
  setTimeout(() => {
    if (lp) { lp.style.display = 'none'; lp.classList.remove('page-fade-out'); }
    if (loginPg) { loginPg.style.display = 'flex'; loginPg.classList.add('page-fade-in'); }
    setTimeout(() => { if (loginPg) loginPg.classList.remove('page-fade-in'); }, 400);
    const backBtn = $('lp-back-btn');
    if (backBtn) backBtn.style.display = 'flex';
    setTimeout(() => {
      const demoSection = $('demo-section');
      if (demoSection) {
        demoSection.scrollIntoView({ behavior: 'smooth' });
        const wrap = $('demo-cards-wrap');
        if (wrap && wrap.style.display === 'none') toggleDemoSection();
      }
    }, 320);
  }, 220);
}

// ══ LOGIN PAGE REVIEWS HELPER ═════════════════════════════════════
function applyLoginPageReviews() {
  const btn = $('reviews-channel-btn');
  if (btn) {
    if (tgChannelUrl) { btn.href = tgChannelUrl; btn.style.display = 'inline-flex'; }
    else { btn.style.display = 'none'; }
  }
  const tgLoginLink = $('tg-link-login');
  if (tgLoginLink && tgUrl) tgLoginLink.href = tgUrl;
}

// ══ KEYBOARD NAV ═════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (isTheaterMode) { toggleVideoFS(); return; }
    if ($('lesson-modal').classList.contains('show'))          closeLesson();
    else if ($('img-viewer-modal').classList.contains('show')) closeImageViewer();
    else document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
  }
  if ($('lesson-modal').classList.contains('show') && $('video-section').style.display !== 'none') {
    if (e.key === 'ArrowLeft')  prevLesson();
    if (e.key === 'ArrowRight') nextLesson();
    if (e.key === 'j' || e.key === 'J') vcSeek(-10);
    if (e.key === 'l' || e.key === 'L') vcSeek(10);
    if (e.key === 'f' || e.key === 'F') toggleVideoFS();
  }
});

// ══ OVERLAY CLICK CLOSE ═══════════════════════════════════════════
document.querySelectorAll('.overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target !== o) return;
    if (o.id === 'lesson-modal')          closeLesson();
    else if (o.id === 'img-viewer-modal') closeImageViewer();
    else o.classList.remove('show');
  });
});

// ══ INPUT HELPERS ════════════════════════════════════════════════


// ══ MODALS HELPERS ═══════════════════════════════════════════════
function closeModal(id) { $(id)?.classList.remove('show'); }

// ══ TOAST ════════════════════════════════════════════════════════
function showToast(msg, type = 'success') {
  const el = $('toast');
  el.textContent = msg;
  el.className   = 'toast ' + type;
  requestAnimationFrame(() => setTimeout(() => el.classList.add('show'), 10));
  setTimeout(() => el.classList.remove('show'), 3200);
}