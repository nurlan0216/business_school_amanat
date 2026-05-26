/* ============================================================
   BUSINESS SCHOOL AMANAT — LP COURSES PATCH
   Исправляет:
   1. Перевод карточек курсов на лендинге (RU/KZ)
   2. Иконки берутся из Google Sheets (courses[].iconUrl)
      как только loadSheet2() загрузит данные
   ============================================================ */

// ── Данные карточек курсов ──────────────────────────────────
const LP_COURSE_DATA = {
  // Основные курсы — сопоставляются по позиции (0,1,2)
  main: [
    {
      // Kaspi
      icon: { ru: '🛒', kz: '🛒' },
      badge: { ru: 'Казахстан #1', kz: 'Қазақстан #1' },
      title: { ru: 'Kaspi магазин', kz: 'Kaspi дүкені' },
      desc: {
        ru: 'Самый быстрый старт на казахстанском рынке. Регистрация, листинг, первые продажи — с нуля до результата.',
        kz: 'Қазақстан нарығындағы ең жылдам старт. Тіркеу, листинг, алғашқы сатылымдар — нөлден нәтижеге дейін.'
      },
      tags: {
        ru: ['#Казахстан', '#БыстрыйСтарт', '#Новичок'],
        kz: ['#Қазақстан', '#ЖылдамСтарт', '#Жаңадан']
      },
      // Ключевое слово для поиска в courses[] из Sheets
      matchKey: 'kaspi'
    },
    {
      // Wildberries
      icon: { ru: '🫐', kz: '🫐' },
      badge: { ru: 'Топ маркетплейс', kz: 'Топ маркетплейс' },
      title: { ru: 'Wildberries', kz: 'Wildberries' },
      desc: {
        ru: 'Крупнейший маркетплейс России и СНГ. SEO, реклама внутри WB, работа с отзывами и рейтингом.',
        kz: 'Ресей мен ТМД-ның ең ірі маркетплейсі. SEO, WB ішіндегі жарнама, пікірлермен және рейтингпен жұмыс.'
      },
      tags: {
        ru: ['#Россия', '#СНГ', '#МасштабБизнеса'],
        kz: ['#Ресей', '#ТМД', '#БизнесКөлемі']
      },
      matchKey: 'wildberries'
    },
    {
      // Ozon
      icon: { ru: '🔵', kz: '🔵' },
      badge: { ru: 'Быстрый рост', kz: 'Жылдам өсу' },
      title: { ru: 'Ozon', kz: 'Ozon' },
      desc: {
        ru: 'Второй по размеру маркетплейс РФ. Логистика FBO/FBS, продвижение, аналитика продаж.',
        kz: 'РФ-тің екінші ірі маркетплейсі. FBO/FBS логистикасы, жылжыту, сату аналитикасы.'
      },
      tags: {
        ru: ['#Ozon', '#FBO', '#Аналитика'],
        kz: ['#Ozon', '#FBO', '#Аналитика']
      },
      matchKey: 'ozon'
    }
  ],
  // Бонусные курсы — сопоставляются по matchKey
  bonus: [
    {
      icon: { ru: '🛍️', kz: '🛍️' },
      title: { ru: 'Shopify', kz: 'Shopify' },
      desc: {
        ru: 'Создание интернет-магазина для международных продаж.',
        kz: 'Халықаралық сатылымдарға арналған интернет-дүкен жасау.'
      },
      matchKey: 'shopify'
    },
    {
      icon: { ru: '🌍', kz: '🌍' },
      title: { ru: 'eBay', kz: 'eBay' },
      desc: {
        ru: 'Международные аукционы и продажи за рубеж.',
        kz: 'Халықаралық аукциондар және шетелге сату.'
      },
      matchKey: 'ebay'
    },
    {
      icon: { ru: '🎯', kz: '🎯' },
      title: { ru: 'Таргет', kz: 'Таргет' },
      desc: {
        ru: 'Платная реклама: настройка кампаний, аудитории, бюджеты.',
        kz: 'Ақылы жарнама: науқандарды баптау, аудитория, бюджеттер.'
      },
      sublist: {
        ru: ['TikTok Реклама (TikTok Ads)', 'Instagram Реклама (Meta Ads)'],
        kz: ['TikTok Жарнамасы (TikTok Ads)', 'Instagram Жарнамасы (Meta Ads)']
      },
      matchKey: 'таргет'
    },
    {
      icon: { ru: '🇨🇳', kz: '🇨🇳' },
      title: { ru: 'Китай', kz: 'Қытай' },
      desc: {
        ru: 'Работа с китайскими поставщиками напрямую.',
        kz: 'Қытай жеткізушілерімен тікелей жұмыс.'
      },
      sublist: {
        ru: ['1688', 'Taobao', 'Pinduoduo', 'WeChat (поставщики)', 'Alipay'],
        kz: ['1688', 'Taobao', 'Pinduoduo', 'WeChat (жеткізушілер)', 'Alipay']
      },
      matchKey: 'китай'
    },
    {
      icon: { ru: '🇹🇷', kz: '🇹🇷' },
      title: { ru: 'Турция', kz: 'Түркия' },
      desc: {
        ru: 'Поиск и работа с турецкими поставщиками.',
        kz: 'Түрік жеткізушілерін іздеу және олармен жұмыс.'
      },
      matchKey: 'турция'
    },
    {
      icon: { ru: '🇺🇸', kz: '🇺🇸' },
      title: { ru: 'Америка уроки', kz: 'Америка сабақтары' },
      desc: {
        ru: 'Продажи на американском рынке.',
        kz: 'Американдық нарықта сату.'
      },
      langTag: { ru: 'На казах. языке · Америка сабақтары', kz: 'Қазақ тілінде · Америка сабақтары' },
      matchKey: 'америка'
    }
  ]
};

// ── Поиск иконки курса из Sheets по matchKey ────────────────
function _findCourseIcon(matchKey) {
  // courses объявлен как let в app-core.js — берём из window или глобального scope
  const _courses = window.courses || (typeof courses !== 'undefined' ? courses : []);
  if (!_courses || !_courses.length) return null;
  const key = matchKey.toLowerCase();
  const found = _courses.find(c => {
    const nameRU = (c.nameRU || '').toLowerCase();
    const nameKZ = (c.nameKZ || '').toLowerCase();
    return nameRU.includes(key) || nameKZ.includes(key);
  });
  return (found && found.iconUrl) ? found.iconUrl : null;
}

// ── Рендер иконки: из Sheets или fallback-эмодзи ────────────
function _renderLpIcon(iconUrl, fallbackEmoji, size) {
  const cls = size === 'sm' ? 'lp-course-icon lp-course-icon--sm' : 'lp-course-icon';
  if (iconUrl) {
    // SVG-флаги и картинки из Sheets
    return `<div class="${cls}"><img src="${iconUrl}" alt="" loading="lazy" onerror="this.style.display='none'" style="width:${size === 'sm' ? '32px' : '40px'};height:${size === 'sm' ? '32px' : '40px'};object-fit:contain"></div>`;
  }
  return `<div class="${cls}">${fallbackEmoji}</div>`;
}

// ── Основная функция: обновляет карточки курсов на лендинге ──
function applyLpCourseCards() {
  const l = window.lang || (typeof lang !== 'undefined' ? lang : 'ru');

  // ── Основные курсы ──────────────────────────────────────────
  const mainCards = document.querySelectorAll('.lp-courses-main .lp-course-card--main');
  mainCards.forEach((card, i) => {
    const data = LP_COURSE_DATA.main[i];
    if (!data) return;

    const iconUrl = _findCourseIcon(data.matchKey);
    const iconEl  = card.querySelector('.lp-course-icon');
    if (iconEl) {
      if (iconUrl) {
        iconEl.innerHTML = `<img src="${iconUrl}" alt="" loading="lazy" onerror="this.style.display='none'" style="width:40px;height:40px;object-fit:contain;border-radius:6px">`;
      }
      // Если иконки нет в Sheets — оставляем существующий эмодзи
    }

    const badgeEl = card.querySelector('.lp-course-badge-main');
    if (badgeEl) badgeEl.textContent = data.badge[l] || data.badge.ru;

    const titleEl = card.querySelector('.lp-course-title');
    if (titleEl) titleEl.textContent = data.title[l] || data.title.ru;

    const descEl = card.querySelector('.lp-course-desc');
    if (descEl) descEl.textContent = data.desc[l] || data.desc.ru;

    const tagsEl = card.querySelector('.lp-course-tags');
    if (tagsEl) {
      const tags = data.tags[l] || data.tags.ru;
      tagsEl.innerHTML = tags.map(tag => `<span class="lp-course-tag">${tag}</span>`).join('');
    }
  });

  // ── Бонусные курсы ──────────────────────────────────────────
  const bonusCards = document.querySelectorAll('.lp-courses-bonus .lp-course-card--bonus');
  bonusCards.forEach((card, i) => {
    const data = LP_COURSE_DATA.bonus[i];
    if (!data) return;

    const iconUrl = _findCourseIcon(data.matchKey);
    const iconEl  = card.querySelector('.lp-course-icon--sm');
    if (iconEl) {
      if (iconUrl) {
        iconEl.innerHTML = `<img src="${iconUrl}" alt="" loading="lazy" onerror="this.style.display='none'" style="width:32px;height:32px;object-fit:contain;border-radius:4px">`;
      }
      // Если нет в Sheets — оставляем эмодзи
    }

    const titleEl = card.querySelector('.lp-course-title');
    if (titleEl) titleEl.textContent = data.title[l] || data.title.ru;

    const descEl = card.querySelector('.lp-course-desc');
    if (descEl) descEl.textContent = data.desc[l] || data.desc.ru;

    // Подсписок (Таргет, Китай)
    const sublistEl = card.querySelector('.lp-course-sublist');
    if (sublistEl && data.sublist) {
      const items = data.sublist[l] || data.sublist.ru;
      sublistEl.innerHTML = items.map(item => `<li>${item}</li>`).join('');
    }

    // Языковой тег (Америка)
    const langTagEl = card.querySelector('.lp-course-lang-tag');
    if (langTagEl && data.langTag) {
      langTagEl.textContent = data.langTag[l] || data.langTag.ru;
    }
  });
}

// ── Перехват loadSheet2: обновляем карточки после загрузки ──
(function patchLoadSheet2() {
  const _origLoadSheet2 = window.loadSheet2;
  if (typeof _origLoadSheet2 === 'function') {
    window.loadSheet2 = async function() {
      await _origLoadSheet2.apply(this, arguments);
      // setTimeout гарантирует что renderCoursesGrid() внутри loadSheet2 уже выполнился
      setTimeout(() => applyLpCourseCards(), 50);
    };
  } else {
    // loadSheet2 ещё не определена — ждём
    let _attempts = 0;
    const _waitInterval = setInterval(() => {
      _attempts++;
      if (typeof window.loadSheet2 === 'function') {
        clearInterval(_waitInterval);
        const _orig = window.loadSheet2;
        window.loadSheet2 = async function() {
          await _orig.apply(this, arguments);
          setTimeout(() => applyLpCourseCards(), 50);
        };
      }
      if (_attempts > 100) clearInterval(_waitInterval); // 10 сек вместо 5
    }, 100);
  }
})();

// ── Перехват setLang: переводим карточки при смене языка ────
(function patchSetLang() {
  const _origSetLang = window.setLang;
  if (typeof _origSetLang === 'function') {
    window.setLang = function(l) {
      _origSetLang.apply(this, arguments);
      applyLpCourseCards();
    };
  } else {
    let _attempts = 0;
    const _waitInterval = setInterval(() => {
      _attempts++;
      if (typeof window.setLang === 'function') {
        clearInterval(_waitInterval);
        const _orig = window.setLang;
        window.setLang = function(l) {
          _orig.apply(this, arguments);
          applyLpCourseCards();
        };
      }
      if (_attempts > 100) clearInterval(_waitInterval); // 10 сек вместо 5
    }, 100);
  }
})();

// ── Инициализация при загрузке страницы ─────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Первый прогон — переводы без иконок (Sheets ещё не загружены)
  applyLpCourseCards();
  // После загрузки Sheets иконки подставятся через патч loadSheet2
});

// Если DOMContentLoaded уже сработал
if (document.readyState !== 'loading') {
  applyLpCourseCards();
}
