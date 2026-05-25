/* ============================================================
   BUSINESS SCHOOL AMANAT — APP LOGIC v3.2 (UPDATED)
   ============================================================ */

'use strict';

// ══════════════════════════════ CONSTANTS ══════════════════════════
const SHEET_ID_DEFAULT = '1_y_qWhuJPybW3hPo91t3bRNu-xd0LS3dojfZbI8fk1A';
const LOG_SCRIPT_URL   = 'https://script.google.com/macros/s/AKfycbyL8b-8Rh92_mKvA16Gbzymla-H8Uav-bjv8RHoasoc-rD6Vu59o9kAEsNA0Dpv68K_/exec';

// Всегда возвращает актуальный URL скрипта (из adminpanel или дефолт)
function getScriptUrl() {
  return localStorage.getItem('bs_script_url') || LOG_SCRIPT_URL;
}

// ⚠️ Пароль не хранится в открытом виде — только SHA-256 хеш
// Для смены пароля: запусти в консоли: crypto.subtle.digest('SHA-256', new TextEncoder().encode('НовыйПароль')).then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))
const ADMIN_PW_HASH    = '7404297e91a4ab5b540fceefb2c0030cc24965b1ac4591c774435421b5d8b9ad'; // SHA-256 от текущего пароля
const DEFAULT_COLORS   = ['#e31e24','#9d4ed0','#0055ff','#22c48a','#f5c842','#ff5c35','#229ED9','#e1306c','#ff9800','#00bcd4'];

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
let ytPlayer         = null;   // YT.Player instance
let ytApiReady       = false;  // set true once API fires onYouTubeIframeAPIReady
let currentVideoEl   = null;   // <video> element for direct mp4 playback

// Called automatically by YouTube API script
window.onYouTubeIframeAPIReady = function() {
  ytApiReady = true;
};

// ─── Theater / fullscreen state ─────────────────────────
let isTheaterMode = false;

let catalogFulfillmentUrl = '';
let catalogGoldUrl        = '';
let waUrl                 = '';
let tgUrl                 = '';
let waAccessUrl           = '';  // A8 — ссылка WA "Получить доступ" (до авторизации)
let tgChannelUrl          = '';  // A7 — ссылка на ТГ-канал с отзывами

// Переменная для хранения фонового интервала проверки блокировки
let securityCheckInterval = null;
let demoTimerInterval     = null;
let demoyYtPlayer         = null;
let demoIsTheater         = false;

// ══════════════════════════════ TRANSLATIONS ══════════════════════
const T = {
  ru: {
    eyebrow: 'Образовательная платформа',
    loginTitle: 'Добро\nпожаловать',
    loginSub: 'Введите данные для входа. Доступ предоставляется только зарегистрированным участникам.',
    loginHint: 'Введите имя, ИИН и номер телефона, которые вы указывали при заключении договора с Business School Amanat.',
    labelName: 'Ваше имя', labelIin: 'ИИН', labelPhone: 'Номер телефона',
    btnText: 'Войти в платформу', logout: 'Выйти',
    tgNote: 'Тех. поддержка: <a href="__WA__" target="_blank" rel="noopener">WhatsApp</a> · Куратор: <a href="__TG__" target="_blank" rel="noopener">Telegram</a>',
    heroBadge: 'Обучение',
    heroH: 'Начните продавать<br>на <em>маркетплейсах</em>',
    heroSub: 'Выберите платформу и начните обучение прямо сейчас',
    actFfTitle: 'Фулфилмент', actFfDesc: 'Каталог материалов',
    actGoldTitle: 'Алтын / Золото', actGoldDesc: 'Каталог материалов',
    actWaTitle: 'WhatsApp', actWaDesc: 'Написать куратору',
    actTgTitle: 'Telegram', actTgDesc: 'Написать куратору',
    platTitle: 'Платформы для обучения',
    fbTitle: 'Нужна помощь?', fbDesc: 'Задайте вопрос куратору — ответим в течение 24 часов',
    waBtnText: 'WhatsApp', tgBtnText: 'Telegram',
    steps: ['Подключение к серверу...','Поиск в базе данных...','Проверка ИИН...','Проверка оплаты...','Проверка доступа...','Выдача доступа...'],
    errEmpty: 'Заполните все поля', errIin: 'ИИН должен содержать 12 цифр',
    errPhone: 'Введите корректный номер телефона',
    errNotFound: '❌ ИИН не найден в базе. Обратитесь к куратору.',
    errNotPaid: '❌ Оплата не подтверждена. Обратитесь к куратору.',
    errNoAccess: '❌ Доступ не разрешён. Обратитесь к куратору.',
    errNetwork: '⚠ Ошибка соединения. Проверьте интернет и попробуйте снова.',
    errSheetUnavailable: '⚠ Сервер данных временно недоступен. Попробуйте позже или обратитесь к куратору.',
    ok: 'Доступ открыт! Добро пожаловать,', hello: 'Привет,',
    savedOk: '✅ Сохранено!', wrongPw: '❌ Неверный пароль',
    go: 'Открыть', lessons: 'уроков', lesson: 'урок', watched: 'просмотрено',
    prev: 'Пред.', next: 'След.', fileDownload: 'Скачать файл',
    noCourses: 'Курсы загружаются... Обновите страницу если долго.',
    progressCourse: 'Прогресс курса', of: 'из', lessonsWatched: 'уроков просмотрено',
    searchLessons: 'Поиск по урокам...', coursesSearch: 'Поиск курсов...',
    noResults: 'Ничего не найдено',
    mnavCourses: 'Курсы', mnavCat: 'Каталог', mnavHelp: 'Помощь',
    completionTitle: 'Курс завершён! 🎉', completionSub: 'Вы просмотрели все уроки. Отличная работа!',
    linkNotSet: 'Ссылка не настроена',
    imgDownload: 'Скачать', imgOpenOrig: 'Открыть оригинал',
    statusText: 'В сети', userOnline: 'Онлайн',
    courses: 'Курсов', progress: 'Прогресс', watchedStat: 'Уроков',
    // Лендинг
    lpH1Verb: 'Зарабатывай',
    lpH1Gold: 'маркетплейсах',
    lpH1End: 'с нуля',
    lpHeroSub: 'Kaspi · Wildberries · Ozon — обучаем с нуля до стабильного дохода.<br>Уже <strong>2 400+</strong> студентов прошли путь и продают.',
    lpHeroBtnWa: 'Узнать стоимость',
    lpHeroBtnLogin: 'Уже купили? Войти',
    lpStatStudents: 'студентов', lpStatOnline: 'онлайн сейчас', lpStatSupport: 'поддержка',
    lpFeatLabel: 'Что входит в пакет', lpFeatH: 'Всё для старта и роста',
    lpFeat1Title: 'Видеоуроки', lpFeat1Desc: 'Пошаговые уроки по Kaspi, Wildberries и Ozon. Доступ навсегда — учитесь в своём темпе.',
    lpFeat2Title: 'Договор фулфилмента', lpFeat2Desc: 'Готовый договор на услуги фулфилмента — хранение, упаковка и доставка ваших товаров.',
    lpFeat3Title: 'Куратор на связи', lpFeat3Desc: 'Личный куратор отвечает на вопросы в течение 24 часов. Не застрянете на полпути.',
    lpFeat4Title: 'Каталог товаров', lpFeat4Desc: 'Готовый каталог проверенных товаров для старта продаж — не нужно искать самостоятельно.',
    lpRevLabel: 'Результаты студентов', lpRevH: 'Они уже продают',
    lpRev1: '«Запустила магазин на Wildberries через месяц обучения. Поддержка куратора на высшем уровне — всегда на связи и помогает разобраться»',
    lpRev1Name: 'Айгерим С.', lpRev1City: 'Алматы',
    lpRev2: '«За 3 месяца вышел на стабильный доход с маркетплейсов. Уроки структурированы логично — всё по делу, без воды»',
    lpRev2Name: 'Нурлан М.', lpRev2City: 'Астана',
    lpRev3: '«Продаю сейчас на трёх площадках. До курса боялся даже начинать. Business School Amanat реально меняет жизнь!»',
    lpRev3Name: 'Руслан А.', lpRev3City: 'Шымкент',
    lpDemoLabel: 'Попробуйте бесплатно', lpDemoH: 'Первый урок — без регистрации',
    lpDemoSub: 'Посмотрите вводный урок любого курса прямо сейчас. Бесплатно, без ввода данных.',
    lpDemoBtn: 'Смотреть бесплатный урок', lpDemoBadge: '60 сек · бесплатно',
    lpCtaH: 'Готовы начать<br>продавать?', lpCtaSub: 'Напишите куратору — расскажем о программе и условиях доступа',
    lpCtaWaBtn: 'Написать в WhatsApp', lpCtaLoginBtn: 'Уже купили? Войти',
    lpBackBtn: 'На главную',
    // Курсор подсказки
    cursorEnterPrice: 'Узнать стоимость', cursorLogin: 'Войти в платформу', cursorDemo: 'Бесплатный урок',
    cursorWatch: 'Смотреть урок', cursorContinue: 'Продолжить',
  },
  kz: {
    eyebrow: 'Білім беру платформасы',
    loginTitle: 'Қош\nкелдіңіз',
    loginSub: 'Кіру үшін деректерді енгізіңіз. Қол жеткізу тек тіркелген қатысушыларға беріледі.',
    loginHint: 'Business School Amanat-пен шарт жасасқанда көрсеткен аты-жөнінiзді, ЖСН-іңізді және телефон нөміріңізді енгізіңіз.',
    labelName: 'Аты-жөніңіз', labelIin: 'ЖСН', labelPhone: 'Телефон нөмірі',
    btnText: 'Платформаға кіру', logout: 'Шығу',
    tgNote: 'Тех. қолдау: <a href="__WA__" target="_blank" rel="noopener">WhatsApp</a> · Куратор: <a href="__TG__" target="_blank" rel="noopener">Telegram</a>',
    heroBadge: 'Оқыту',
    heroH: 'Маркетплейстерде<br><em>сатуды бастаңыз</em>',
    heroSub: 'Платформаны таңдаңыз және қазір оқуды бастаңыз',
    actFfTitle: 'Фулфилмент', actFfDesc: 'Материалдар каталогы',
    actGoldTitle: 'Алтын', actGoldDesc: 'Материалдар каталогы',
    actWaTitle: 'WhatsApp', actWaDesc: 'Кураторға жазу',
    actTgTitle: 'Telegram', actTgDesc: 'Кураторға жазу',
    platTitle: 'Оқуға арналған платформалар',
    fbTitle: 'Көмек керек пе?', fbDesc: 'Кураторға сұрақ қойыңыз — 24 сағат ішінде жауап береміз',
    waBtnText: 'WhatsApp', tgBtnText: 'Telegram',
    steps: ['Серверге қосылуда...','Деректер қорынан іздеу...','ЖСН тексеру...','Төлем тексеру...','Рұқсат тексеру...','Рұқсат беру...'],
    errEmpty: 'Барлық өрістерді толтырыңыз', errIin: 'ЖСН 12 саннан тұруы керек',
    errPhone: 'Дұрыс телефон нөмірін енгізіңіз',
    errNotFound: '❌ ЖСН деректер қорында табылмады. Кураторға хабарласыңыз.',
    errNotPaid: '❌ Төлем расталмады. Кураторға хабарласыңыз.',
    errNoAccess: '❌ Рұқсат берілмеген. Кураторға хабарласыңыз.',
    errNetwork: '⚠ Байланыс қатесі. Интернетті тексеріп, қайта көріңіз.',
    errSheetUnavailable: '⚠ Деректер сервері уақытша қолжетімсіз. Кейінірек көріңіз немесе кураторға хабарласыңыз.',
    ok: 'Рұқсат берілді! Қош келдіңіз,', hello: 'Сәлем,',
    savedOk: '✅ Сақталды!', wrongPw: '❌ Қате пароль',
    go: 'Ашу', lessons: 'сабақ', lesson: 'сабақ', watched: 'көрілді',
    prev: 'Алдыңғы', next: 'Келесі', fileDownload: 'Файлды жүктеу',
    noCourses: 'Сабақтар жүктелуде... Беттi жаңартыңыз.',
    progressCourse: 'Курс барысы', of: '/', lessonsWatched: 'сабақ көрілді',
    searchLessons: 'Сабақтарды іздеу...', coursesSearch: 'Курстарды іздеу...',
    noResults: 'Ештеңе табылмады',
    mnavCourses: 'Курстар', mnavCat: 'Каталог', mnavHelp: 'Көмек',
    completionTitle: 'Курс аяқталды! 🎉', completionSub: 'Барлық сабақты көрдіңіз. Керемет жұмыс!',
    linkNotSet: 'Сілтеме орнатылмаған',
    imgDownload: 'Жүктеу', imgOpenOrig: 'Түпнұсқаны ашу',
    statusText: 'Желіде', userOnline: 'Онлайн',
    courses: 'Курс', progress: 'Барысы', watchedStat: 'Сабақ',
    // Лендинг KZ
    lpH1Verb: 'Табыс тап',
    lpH1Gold: 'маркетплейстерде',
    lpH1End: 'нөлден бастай',
    lpHeroSub: 'Kaspi · Wildberries · Ozon — нөлден тұрақты табысқа дейін үйретеміз.<br>Қазірдің өзінде <strong>2 400+</strong> студент сатып жатыр.',
    lpHeroBtnWa: 'Құнын білу',
    lpHeroBtnLogin: 'Сатып алдыңыз ба? Кіру',
    lpStatStudents: 'студент', lpStatOnline: 'қазір онлайн', lpStatSupport: 'қолдау',
    lpFeatLabel: 'Пакетке не кіреді', lpFeatH: 'Бастау үшін бәрі бар',
    lpFeat1Title: 'Бейне сабақтар', lpFeat1Desc: 'Kaspi, Wildberries және Ozon бойынша қадамдық сабақтар. Мәңгілік қол жеткізу — өз қарқынмен оқыңыз.',
    lpFeat2Title: 'Фулфилмент шарты', lpFeat2Desc: 'Фулфилмент қызметтеріне дайын шарт — тауарларыңызды сақтау, орау және жеткізу.',
    lpFeat3Title: 'Куратор байланыста', lpFeat3Desc: 'Жеке куратор 24 сағат ішінде сұрақтарға жауап береді. Жолда қалмайсыз.',
    lpFeat4Title: 'Тауар каталогы', lpFeat4Desc: 'Сату бастауға арналған тексерілген тауарлардың дайын каталогы — өздігінен іздеудің қажеті жоқ.',
    lpRevLabel: 'Студенттердің нәтижелері', lpRevH: 'Олар қазірдің өзінде сатып жатыр',
    lpRev1: '«Бір ай оқудан кейін Wildberries-те дүкен ашып алдым. Куратордың қолдауы керемет — әрқашан байланыста және түсінуге көмектеседі»',
    lpRev1Name: 'Айгерим С.', lpRev1City: 'Алматы',
    lpRev2: '«3 айда маркетплейстерден тұрақты табысқа шықтым. Сабақтар логикалы құрылған — бос сөзсіз, нақты»',
    lpRev2Name: 'Нурлан М.', lpRev2City: 'Астана',
    lpRev3: '«Қазір үш алаңда сатамын. Курсқа дейін бастаудан қорқатынмын. Business School Amanat шынымен өмірді өзгертеді!»',
    lpRev3Name: 'Руслан А.', lpRev3City: 'Шымкент',
    lpDemoLabel: 'Тегін көріңіз', lpDemoH: 'Бірінші сабақ — тіркеусіз',
    lpDemoSub: 'Кез келген курстың кіріспе сабағын қазір қараңыз. Тегін, деректер енгізбестен.',
    lpDemoBtn: 'Тегін сабақты қарау', lpDemoBadge: '60 сек · тегін',
    lpCtaH: 'Сатуды бастауға<br>дайынсыз ба?', lpCtaSub: 'Кураторға жазыңыз — бағдарлама мен қол жеткізу шарттары туралы айтамыз',
    lpCtaWaBtn: 'WhatsApp-қа жазу', lpCtaLoginBtn: 'Сатып алдыңыз ба? Кіру',
    lpBackBtn: 'Басты бетке',
    // Курсор подсказки
    cursorEnterPrice: 'Құнын білу', cursorLogin: 'Платформаға кіру', cursorDemo: 'Тегін сабақ',
    cursorWatch: 'Сабақты қарау', cursorContinue: 'Жалғастыру',
  }
};

const t       = k => (T[lang] && T[lang][k]) ? T[lang][k] : k;

// ══════════════════════════════ REVIEWS CAROUSEL DATA ══════════════
const REVIEWS = {
  ru: [
    { text: '«Запустила магазин на Wildberries через месяц обучения. Поддержка куратора на высшем уровне — всегда на связи и помогает разобраться»', name: 'Айгерим С.', city: 'Алматы', init: 'АС', grad: 'linear-gradient(135deg,#f5c842,#ff9800)' },
    { text: '«За 3 месяца вышел на стабильный доход с маркетплейсов. Уроки структурированы логично — всё по делу, без воды»', name: 'Нурлан М.', city: 'Астана', init: 'НМ', grad: 'linear-gradient(135deg,#22c48a,#0055ff)' },
    { text: '«Искала обучение по Kaspi — нашла здесь. Куратор всегда на связи, отвечает быстро. Материал актуальный. Очень довольна!»', name: 'Дина К.', city: 'Алматы', init: 'ДК', grad: 'linear-gradient(135deg,#229ED9,#9d4ed0)' },
    { text: '«Начинала с нуля, сейчас мой магазин на Ozon приносит стабильный доход. Курс структурирован очень понятно»', name: 'Мадина Т.', city: 'Шымкент', init: 'МТ', grad: 'linear-gradient(135deg,#e31e24,#ff9800)' },
    { text: '«Самое ценное — живая поддержка куратора. Никогда не чувствовала, что осталась одна с вопросами»', name: 'Зарина А.', city: 'Тараз', init: 'ЗА', grad: 'linear-gradient(135deg,#f5c842,#22c48a)' },
    { text: '«Через 2 месяца после курса открыл второй магазин. Business School Amanat — это реальный результат, не обещания»', name: 'Серик Б.', city: 'Астана', init: 'СБ', grad: 'linear-gradient(135deg,#0055ff,#22c48a)' },
  ],
  kz: [
    { text: '«Бір ай оқудан кейін Wildberries-те дүкен аштым. Куратор қолдауы өте жоғары деңгейде»', name: 'Айгерим С.', city: 'Алматы', init: 'АС', grad: 'linear-gradient(135deg,#f5c842,#ff9800)' },
    { text: '«3 айда маркетплейстерден тұрақты табысқа шықтым. Сабақтар логикалы, нақты, бос сөзсіз»', name: 'Нурлан М.', city: 'Астана', init: 'НМ', grad: 'linear-gradient(135deg,#22c48a,#0055ff)' },
    { text: '«Kaspi бойынша оқуды іздедім — осында таптым. Куратор әрқашан байланыста. Өте риза болдым!»', name: 'Дина К.', city: 'Алматы', init: 'ДК', grad: 'linear-gradient(135deg,#229ED9,#9d4ed0)' },
    { text: '«Нөлден бастадым, қазір Ozon-дағы дүкенім тұрақты табыс әкелуде. Курс өте түсінікті»', name: 'Мадина Т.', city: 'Шымкент', init: 'МТ', grad: 'linear-gradient(135deg,#e31e24,#ff9800)' },
    { text: '«Ең бағалысы — куратордың тірі қолдауы. Сұрақтарыммен жалғыз қалғаным болмады»', name: 'Зарина А.', city: 'Тараз', init: 'ЗА', grad: 'linear-gradient(135deg,#f5c842,#22c48a)' },
    { text: '«Курстан кейін 2 ай өтіп екінші дүкен аштым. Business School Amanat — уәде емес, нақты нәтиже»', name: 'Серік Б.', city: 'Астана', init: 'СБ', grad: 'linear-gradient(135deg,#0055ff,#22c48a)' },
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
  const html = `<div class="lp-review-card">
    <div class="lp-review-stars">★★★★★</div>
    <p class="lp-review-text">${escHtml(review.text)}</p>
    <div class="lp-review-author">
      <div class="lp-review-ava" style="background:${review.grad}">${review.init}</div>
      <div><div class="lp-review-name">${escHtml(review.name)}</div>
      <div class="lp-review-city">${escHtml(review.city)}</div></div>
    </div></div>`;
  if (!animate) { slot.innerHTML = html; return; }
  slot.style.opacity = '0';
  slot.style.transition = 'opacity 0.35s ease';
  setTimeout(() => {
    slot.innerHTML = html;
    slot.style.opacity = '';
  }, 350);
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

function renderLandingCarousel() { renderReviewsGrid(); }
function goCarousel() {}
function startCarouselTimer() {}
const $       = id => document.getElementById(id);
const setText = (id, v) => { const e=$(id); if(e) e.textContent = v; };
const setHtml = (id, v) => { const e=$(id); if(e) e.innerHTML = v; };
const setHref = (id, url) => { const e=$(id); if(e && url) e.href = url; };
const sleep   = ms => new Promise(r => setTimeout(r, ms));

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
    if (tip) {
      tip.style.left = (mx + 18) + 'px';
      tip.style.top  = (my - 10) + 'px';
    }
    resetIdleBeacon();
  });
  (function animFol() {
    fx += (mx - fx - 18) * 0.14;
    fy += (my - fy - 18) * 0.14;
    fol.style.transform = `translate(${fx}px, ${fy}px)`;
    requestAnimationFrame(animFol);
  })();

  // Умные подсказки по data-cursor-tip или data-tip атрибутам
  const tooltipMap = {
    '#lp-hero-btn-wa':      () => t('cursorEnterPrice'),
    '.lp-btn-primary':      () => t('cursorEnterPrice'),
    '.lp-btn-secondary':    () => t('cursorLogin'),
    '#login-btn':           () => t('cursorLogin'),
    '.demo-card':           () => t('cursorDemo'),
    '.lp-demo-preview':     () => t('cursorDemo'),
    '.platform-card':       () => t('cursorWatch'),
    '.demo-toggle-btn':     () => t('cursorDemo'),
    '.resume-beacon':       () => t('cursorContinue'),
  };

  document.addEventListener('mouseover', e => {
    const el = e.target;
    const hoverable = el.closest('a, button, [role="button"], .clickable, .platform-card, .action-card');
    cur.classList.toggle('hovering', !!hoverable);
    fol.classList.toggle('hovering', !!hoverable);

    if (!tip) return;
    // Check custom data-tip first
    const dataTip = el.closest('[data-tip]');
    if (dataTip) { showCursorTip(dataTip.dataset.tip); return; }
    // Check tooltipMap
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

// ── Idle beacon — пульс на главной кнопке после 5 сек бездействия ──
let _idleBeaconTimer = null;
let _idleBeaconActive = false;
function resetIdleBeacon() {
  clearTimeout(_idleBeaconTimer);
  if (_idleBeaconActive) removeIdleBeacon();
  _idleBeaconTimer = setTimeout(showIdleBeacon, 5000);
}
function showIdleBeacon() {
  // Показываем только на лендинге
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
// Запускаем маяк через 5 сек после загрузки
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
initTheme();

// ══════════════════════════════ LANGUAGE ══════════════════════════
function setLang(l) {
  lang = l;
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === l);
  });
  applyTexts();
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
  setHtml('tg-note',          t('tgNote').replace('__WA__', waUrl || '#').replace('__TG__', tgUrl || '#'));
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

  // ── Лендинг — все тексты ──
  setText('lp-hero-h1-verb',     t('lpH1Verb'));
  setText('lp-hero-h1-gold',    t('lpH1Gold'));
  setText('lp-hero-h1-end',     t('lpH1End'));
  setHtml('lp-hero-sub',        t('lpHeroSub'));
  setText('lp-hero-btn-wa-text',t('lpHeroBtnWa'));
  setText('lp-hero-btn-login',  t('lpHeroBtnLogin'));
  setText('lp-stat-students',   t('lpStatStudents'));
  setText('lp-stat-online',     t('lpStatOnline'));
  setText('lp-stat-support',    t('lpStatSupport'));
  setText('lp-feat-label',      t('lpFeatLabel'));
  setText('lp-feat-h',          t('lpFeatH'));
  setText('lp-feat1-title',     t('lpFeat1Title'));
  setText('lp-feat1-desc',      t('lpFeat1Desc'));
  setText('lp-feat2-title',     t('lpFeat2Title'));
  setText('lp-feat2-desc',      t('lpFeat2Desc'));
  setText('lp-feat3-title',     t('lpFeat3Title'));
  setText('lp-feat3-desc',      t('lpFeat3Desc'));
  setText('lp-feat4-title',     t('lpFeat4Title'));
  setText('lp-feat4-desc',      t('lpFeat4Desc'));
  setText('lp-rev-label',       t('lpRevLabel'));
  setText('lp-rev-h',           t('lpRevH'));
  renderLandingCarousel();
  setText('lp-demo-label',      t('lpDemoLabel'));
  setText('lp-demo-h',          t('lpDemoH'));
  setText('lp-demo-sub',        t('lpDemoSub'));
  setText('lp-demo-btn',        t('lpDemoBtn'));
  setText('lp-demo-badge',      t('lpDemoBadge'));
  setHtml('lp-cta-h',           t('lpCtaH'));
  setText('lp-cta-sub',         t('lpCtaSub'));
  setText('lp-cta-wa-btn',      t('lpCtaWaBtn'));
  setText('lp-cta-login-btn',   t('lpCtaLoginBtn'));
  setText('lp-back-btn-text',   t('lpBackBtn'));
}

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
      // Проверяем через Apps Script — база не открыта публично
      const res = await fetch(getScriptUrl(), {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body:    JSON.stringify({ _type: 'auth', iin: currentIin, phone: sessionStorage.getItem('bs_phone') || localStorage.getItem('bs_phone') || '' })
      });
      if (!res.ok) return; // сбой сети — не прерываем сессию

      const result = await res.json();
      if (!result.found || !result.isAllowed || !result.isPaid) {
        triggerInstantBlock();
      }
    } catch (e) {
      console.warn('Security monitor tick failed:', e);
    }
  }, 120000); // 2 минуты вместо 10 секунд
}

function triggerInstantBlock() {
  if (securityCheckInterval) clearInterval(securityCheckInterval);
  
  // Принудительно чистим сессию
  currentUser = null;
  currentCourseIdx = null;
  try {
    sessionStorage.removeItem('bs_user');
    sessionStorage.removeItem('bs_iin');
  } catch (_) {}

  // Глушим видеоплеер
  const slot = $('video-slot');
  if (slot) slot.innerHTML = '';

  // Закрываем все всплывающие окна, если они были открыты
  $('lesson-modal').classList.remove('show', 'video-active');
  $('video-section').style.display = 'none';

  // Прячем основные рабочие экраны платформы
  $('lessons-page').style.display = 'none';
  $('logout-btn').style.display   = 'none';
  $('mobile-nav').style.display   = 'none';
  
  // Показываем оверлей принудительной блокировки
  const blockOverlay = $('block-overlay');
  if (blockOverlay) {
    blockOverlay.style.display = 'flex';
  } else {
    // Если оверлей не добавлен — на лендинг
    const lp = $('landing-page');
    if (lp) lp.style.display = 'block';
    $('login-page').style.display = 'none';
  }
}

// ══════════════════════════════ LOAD SHEET 2 ══════════════════════
async function loadSheet2() {
  if (!gsSheetId) return;
  try {
    const url = `https://docs.google.com/spreadsheets/d/${gsSheetId}/gviz/tq?tqx=out:csv&sheet=Лист2`;
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 12000);
    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) { console.error('Sheet2 HTTP error', res.status); showSheetError(); return; }
    const csv  = await res.text();
    const rows = parseCSV(csv);

    catalogFulfillmentUrl = strip((rows[2] || [])[0]) || '';
    catalogGoldUrl        = strip((rows[3] || [])[0]) || '';
    waUrl                 = strip((rows[4] || [])[0]) || '';
    tgUrl                 = strip((rows[5] || [])[0]) || '';
    tgChannelUrl          = strip((rows[6] || [])[0]) || '';  // A7 — ТГ-канал отзывов
    waAccessUrl           = strip((rows[7] || [])[0]) || '';  // A8 — WA "Получить доступ" (до авторизации)

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
      const iconUrl  = strip((rows[1] || [])[colKZ]);
      const hexColor = strip((rows[1] || [])[colRU]);
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
      <div style="color:var(--text2);font-weight:600;margin-bottom:8px;font-size:15px">Не удалось загрузить курсы</div>
      <div style="font-size:13px;margin-bottom:20px">${t('errSheetUnavailable')}</div>
      <button onclick="loadSheet2()" style="background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:10px;padding:11px 24px;font-size:13px;font-weight:700;color:#000;cursor:pointer;font-family:'DM Sans',sans-serif">
        Попробовать снова
      </button>
    </div>`;
  }
}

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

// ══════════════════════════════ APPLY LINKS ═══════════════════════
function applyLinks() {
  const setLink = (id, url, fallback) => {
    const el = $(id);
    if (!el) return;
    el.href = url || '#';
    if (!url && fallback) {
      el.onclick = e => { e.preventDefault(); showToast(t('linkNotSet'), 'error'); };
    } else {
      el.onclick = null;
    }
  };
  setLink('submenu-fulfillment', catalogFulfillmentUrl, true);
  setLink('submenu-gold',        catalogGoldUrl, true);
  setLink('wa-action-link',      waUrl, true);
  setLink('tg-action-link',      tgUrl, true);

  // WA кнопка: до авторизации — "Получить доступ" (A8), после — "Тех. поддержка сайта" (A5)
  const waBtnEl   = $('wa-btn');
  const waBtnText = $('wa-btn-text');
  if (currentUser) {
    // После авторизации
    setLink('wa-btn', waUrl);
    if (waBtnText) waBtnText.textContent = 'Тех. поддержка сайта';
  } else {
    // До авторизации
    if (waBtnEl) { waBtnEl.href = waAccessUrl || '#'; waBtnEl.onclick = null; }
    if (waBtnText) waBtnText.textContent = 'Получить доступ';
  }

  // TG кнопка: только после авторизации — "Написать куратору" (A6)
  setLink('tg-btn', tgUrl);
  const tgBtnText = $('tg-btn-text');
  if (tgBtnText) tgBtnText.textContent = 'Написать куратору';
  setLink('cat-modal-ff',        catalogFulfillmentUrl);
  setLink('cat-modal-gold',      catalogGoldUrl);
  // Кнопка ТГ-канала с отзывами
  const tgCh = $('tg-channel-btn');
  if (tgCh) {
    tgCh.href = tgChannelUrl || '#';
    tgCh.style.display = tgChannelUrl ? 'inline-flex' : 'none';
  }
  const tn = $('tg-note');
  if (tn) tn.innerHTML = t('tgNote').replace('__WA__', waUrl || '#').replace('__TG__', tgUrl || '#');
  // Плавающие кнопки полностью убраны
  const floatWa = $('float-wa-btn');
  const floatTg = $('float-tg-btn');
  applyLoginPageReviews();
}

// ══════════════════════════════ DEMO SECTION ═════════════════════
let demoSectionOpen = false;
let demoSecondsLeft = 60;

function toggleDemoSection() {
  demoSectionOpen = !demoSectionOpen;
  const wrap = $('demo-cards-wrap');
  const section = $('demo-section');
  if (!wrap || !section) return;

  if (demoSectionOpen) {
    wrap.style.display = 'block';
    section.classList.add('open');
    renderDemoCards();
  } else {
    wrap.style.display = 'none';
    section.classList.remove('open');
  }
}

function renderDemoCards() {
  const grid = $('demo-cards-grid');
  if (!grid) return;

  if (!courses || courses.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text3);font-size:13px">
      ⏳ Курсы загружаются... Подождите немного.
    </div>`;
    // Re-try in 1.5s
    setTimeout(renderDemoCards, 1500);
    return;
  }

  grid.innerHTML = courses.map((course, idx) => {
    const name  = lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ);
    const color = course.hexColor || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    const initials = name.substring(0, 2).toUpperCase();
    const iconHtml = course.iconUrl
      ? `<img src="${course.iconUrl}" alt="${escHtml(name)}" onerror="this.style.display='none';this.parentNode.textContent='${initials}'">`
      : initials;
    const lessons = lang === 'kz' ? course.lessonsKZ : course.lessonsRU;
    const firstVideo = lessons.find(l => l.type === 'video');

    return `<div class="demo-card" style="--demo-accent:${color};--demo-glow:${hexToRgba(color,0.05)}"
        onclick="openDemoLesson(${idx})">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="demo-card-icon" style="background:linear-gradient(140deg,${color},${darkenHex(color,20)})">${iconHtml}</div>
        <div>
          <div class="demo-card-name">${escHtml(name)}</div>
          <div class="demo-card-meta">${lessons.filter(l=>l.type==='video').length} уроков</div>
        </div>
      </div>
      <div class="demo-card-badge">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Бесплатный урок
      </div>
      <div class="demo-card-cta">
        <span class="demo-cta-label">Смотреть демо</span>
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
  if (!first || !first.url) { showToast('Демо-урок недоступен для этого курса', 'error'); return; }

  const ytId = extractYouTubeId(first.url);
  if (!ytId) { showToast('Демо-урок недоступен', 'error'); return; }

  const lessonTitle = first.name || (lang === 'kz' ? 'Сабақ 1' : 'Урок 1');

  // Build overlay
  const overlay = document.createElement('div');
  overlay.className = 'demo-video-overlay';
  overlay.id = 'demo-video-overlay';
  overlay.innerHTML = `
    <div class="demo-video-inner" id="demo-video-inner">
      <!-- Header -->
      <div class="demo-modal-header">
        <div class="lesson-badge" style="background:${hexToRgba(color,0.14)};color:${color};display:inline-flex;align-items:center;border-radius:9px;padding:5px 14px;font-size:11px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase">${escHtml(name)}</div>
        <button class="demo-video-close" onclick="closeDemoLesson()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Title -->
      <div class="demo-video-title">${escHtml(lessonTitle)}</div>

      <!-- Video container -->
      <div class="video-container" id="demo-video-container">
        <div id="demo-video-slot"></div>
        <!-- Tap zones (same as main player) -->
        <div class="tap-zone tap-left"  id="demo-tap-left"  onclick="demoVcSeek(-10)"></div>
        <div class="tap-zone tap-right" id="demo-tap-right" onclick="demoVcSeek(10)"></div>
        <!-- Seek flash -->
        <div id="demo-seek-flash" class="seek-flash"></div>
        <!-- Theater exit -->
        <button id="demo-theater-esc" class="theater-esc" onclick="toggleDemoFS()" style="display:none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="8 3 3 3 3 8"/><polyline points="21 8 21 3 16 3"/><polyline points="3 16 3 21 8 21"/><polyline points="16 21 21 21 21 16"/></svg>
        </button>
        <!-- Intercept clicks to YouTube -->
        <div class="demo-click-guard" id="demo-click-guard"></div>
      </div>

      <!-- Custom controls (same style as main) -->
      <div class="custom-vc-bar" id="demo-vc-bar">
        <button class="vc-btn vc-rew" onclick="demoVcSeek(-10)" title="-10 сек">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.22"/></svg>
          <span>-10</span>
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

      <!-- Timer bar -->
      <div class="demo-timer-bar">
        <div class="demo-timer-fill" id="demo-timer-fill" style="width:100%"></div>
      </div>

      <!-- Bottom CTA -->
      <div class="demo-video-limit">
        Демо-версия: <strong id="demo-seconds">60</strong> сек. —
        <span class="demo-login-link" onclick="closeDemoLesson();setTimeout(()=>showLandingLogin(),250)">Войти и смотреть полностью →</span>
      </div>
      <!-- Кнопка куратора -->
      <div class="demo-curator-btns" id="demo-curator-btns" style="display:flex;gap:8px;margin-top:10px;justify-content:center;flex-wrap:wrap"></div>
    </div>`;
  document.body.appendChild(overlay);

  // Заполняем кнопки куратора
  const curBtns = document.getElementById('demo-curator-btns');
  if (curBtns) {
    const lessonRef = encodeURIComponent(`Привет! Смотрю демо-урок курса «${name}», хочу узнать подробнее`);
    const kzRef     = encodeURIComponent(`Сәлем! «${name}» курсының демо сабағын қараймын, толығырақ білгім келеді`);
    const ref       = lang === 'kz' ? kzRef : lessonRef;
    if (waUrl)   curBtns.innerHTML += `<a href="${waUrl}?text=${ref}" target="_blank" rel="noopener" class="demo-curator-btn wa-btn-demo">💬 WhatsApp</a>`;
    if (tgUrl)   curBtns.innerHTML += `<a href="${tgUrl}" target="_blank" rel="noopener" class="demo-curator-btn tg-btn-demo">✈ Telegram</a>`;
    if (!waUrl && !tgUrl) curBtns.style.display = 'none';
  }

  // Load YouTube via IFrame API if ready, else plain iframe
  demoIsTheater = false;
  demoyYtPlayer = null;
  _loadDemoYt(ytId);

  // Start countdown
  demoSecondsLeft = 60;
  if (demoTimerInterval) clearInterval(demoTimerInterval);
  demoTimerInterval = setInterval(() => {
    demoSecondsLeft--;
    const secEl = $('demo-seconds');
    const fillEl = $('demo-timer-fill');
    if (secEl) secEl.textContent = Math.max(0, demoSecondsLeft);
    if (fillEl) fillEl.style.width = Math.max(0, demoSecondsLeft / 60 * 100) + '%';
    if (demoSecondsLeft <= 0) {
      clearInterval(demoTimerInterval);
      demoTimerInterval = null;
      _showDemoEndBlock();
    }
  }, 1000);
}

function _loadDemoYt(ytId) {
  const slot = document.getElementById('demo-video-slot');
  if (!slot) return;

  if (ytApiReady && typeof YT !== 'undefined' && YT.Player) {
    // Use IFrame API for seek support
    const div = document.createElement('div');
    div.id = 'demo-yt-api-target';
    slot.appendChild(div);
    demoyYtPlayer = new YT.Player('demo-yt-api-target', {
      videoId: ytId,
      playerVars: { autoplay: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, playsinline: 1, controls: 0, disablekb: 1 },
      width: '100%',
      height: '100%',
      events: {
        onReady: e => { try { e.target.playVideo(); syncDemoPlayPauseIcon(true); } catch(_) {} }
      }
    });
    // Style the iframe once created
    setTimeout(() => {
      const iframe = slot.querySelector('iframe');
      if (iframe) iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;pointer-events:none';
    }, 800);
  } else {
    // Fallback: plain iframe with controls=0
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&controls=0&disablekb=1&iv_load_policy=3&playsinline=1`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;pointer-events:none';
    slot.appendChild(iframe);
  }
}

function _showDemoEndBlock() {
  // Pause video
  if (demoyYtPlayer && typeof demoyYtPlayer.pauseVideo === 'function') {
    try { demoyYtPlayer.pauseVideo(); } catch(_) {}
  }
  // Auto-close the demo overlay after a brief pause so user notices it ended
  setTimeout(() => {
    closeDemoLesson();
    // Focus login form so user can log in
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
    if (state === 1 || state === 3) {
      demoyYtPlayer.pauseVideo();
      syncDemoPlayPauseIcon(false);
    } else {
      demoyYtPlayer.playVideo();
      syncDemoPlayPauseIcon(true);
    }
  } catch(_) {}
}

function demoVcSeek(delta) {
  if (demoyYtPlayer && typeof demoyYtPlayer.getCurrentTime === 'function') {
    try {
      const cur = demoyYtPlayer.getCurrentTime();
      demoyYtPlayer.seekTo(Math.max(0, cur + delta), true);
    } catch(_) {}
  }
  // Flash effect
  const flash = document.getElementById('demo-seek-flash');
  if (flash) {
    flash.textContent = delta > 0 ? `+${delta}с` : `${delta}с`;
    flash.classList.remove('show');
    void flash.offsetWidth;
    flash.classList.add('show');
    setTimeout(() => flash.classList.remove('show'), 600);
  }
}

function toggleDemoFS() {
  const vc  = document.getElementById('demo-video-container');
  const esc = document.getElementById('demo-theater-esc');
  const exp = document.getElementById('demo-fs-expand');
  const shr = document.getElementById('demo-fs-shrink');
  const inner = document.getElementById('demo-video-inner');

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
  // Destroy YT player
  if (demoyYtPlayer && typeof demoyYtPlayer.destroy === 'function') {
    try { demoyYtPlayer.destroy(); } catch(_) {}
    demoyYtPlayer = null;
  }
  // Exit theater if active
  if (demoIsTheater) {
    document.body.classList.remove('video-theater');
    demoIsTheater = false;
  }
  const ov = $('demo-video-overlay');
  if (ov) ov.remove();

  // Если не авторизован — вернуть на лендинг с плавным переходом
  if (!currentUser) {
    const loginPg = $('login-page');
    const lp = $('landing-page');
    if (lp && loginPg) {
      lp.style.display = 'block';
      lp.classList.add('page-fade-in');
      loginPg.style.display = 'none';
      const backBtn = $('lp-back-btn');
      if (backBtn) backBtn.style.display = 'none';
      setTimeout(() => { lp.classList.remove('page-fade-in'); }, 400);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      resetIdleBeacon();
    }
  }
}

// ── Update reviews section on login page ──────────────────────────
function applyLoginPageReviews() {
  // Wire up Telegram channel button if tgChannelUrl is set
  const btn = $('reviews-channel-btn');
  if (btn) {
    if (tgChannelUrl) {
      btn.href = tgChannelUrl;
      btn.style.display = 'inline-flex';
    } else {
      btn.style.display = 'none';
    }
  }
  const tgLoginLink = $('tg-link-login');
  if (tgLoginLink && tgUrl) tgLoginLink.href = tgUrl;
}
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

// ══════════════════════════════ HERO STATS ════════════════════════
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
  let from = 0;
  const dur = 900, start = Date.now();
  (function f() {
    const p = Math.min(1, (Date.now() - start) / dur);
    el.textContent = Math.round(from + (to - from) * easeOut(p));
    if (p < 1) requestAnimationFrame(f);
  })();
}
const easeOut = t => 1 - Math.pow(1 - t, 3);

// ══════════════════════════════ COURSES GRID ═════════════════════
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

  grid.innerHTML = filtered.map((course, fi) => {
    const idx        = courses.indexOf(course);
    const name       = lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ);
    const lessons    = lang === 'kz' ? course.lessonsKZ : course.lessonsRU;
    const videoCount = lessons.filter(l => l.type === 'video').length;
    const color      = course.hexColor || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    const initials   = name.substring(0, 2).toUpperCase();
    const delay      = fi * 0.06;
    const prog       = getCourseProgress(idx);

    const iconHtml = course.iconUrl
      ? `<img src="${course.iconUrl}" alt="${name}" onerror="this.style.display='none';this.parentNode.textContent='${initials}'">`
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

    return `<div class="platform-card" style="--card-accent:${color};--card-glow:${hexToRgba(color,0.06)};animation-delay:${delay}s" onclick="openLesson(${idx})">
      <div class="pc-body">
        <div class="pc-logo">
          <div class="pc-icon" style="background:linear-gradient(140deg,${color},${darkenHex(color,20)})">${iconHtml}</div>
          <span class="pc-name">${escHtml(name)}</span>
        </div>
        <p class="pc-desc">${videoCount} ${t('lessons')}</p>
      </div>
      ${progressBlock}
      <div class="pc-footer">
        <span class="pc-count">
          <span class="dot" style="background:${color}"></span>
          ${videoCount} ${t('lessons')}
        </span>
        <span class="pc-cta" style="color:${color}">
          <span>${t('go')}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </span>
      </div>
    </div>`;
  }).join('');

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

// ══════════════════════════════ OPEN LESSON MODAL ════════════════
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
  const ls = $('lesson-search'); if(ls) { ls.value = ''; }
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

// ══════════════════════════════ LESSON LIST ═══════════════════════
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

// ══════════════════════════════ DEMO MODE ════════════════════════
// Демо = первый видео-урок каждого модуля (первый урок курса)
function isDemoLesson(courseIdx, lessonAbsIdx) {
  if (courseIdx === null) return false;
  const vl = getVideoLessons(courseIdx);
  return vl.length > 0 && vl[0].absIdx === lessonAbsIdx;
}

function startDemoTimer(seconds) {
  if (demoTimerInterval) clearInterval(demoTimerInterval);
  let left = seconds;

  // Создаём оверлей таймера
  const slot = $('video-slot');
  const timerEl = document.createElement('div');
  timerEl.id = 'demo-timer-bar';
  timerEl.style.cssText = `
    position:absolute;top:10px;right:10px;z-index:20;
    background:rgba(0,0,0,0.75);color:#f5c842;
    font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;
    padding:6px 12px;border-radius:8px;pointer-events:none;
    border:1px solid rgba(245,200,66,0.4);
  `;
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
  // Останавливаем видео
  if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
    try { ytPlayer.pauseVideo(); } catch(_) {}
  }
  const slot = $('video-slot');
  // Убираем таймер
  const tb = document.getElementById('demo-timer-bar');
  if (tb) tb.remove();
  // Показываем оверлей "Войдите для доступа"
  const overlay = document.createElement('div');
  overlay.id = 'demo-end-overlay';
  overlay.style.cssText = `
    position:absolute;inset:0;z-index:25;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
    background:rgba(6,6,8,0.92);text-align:center;padding:24px;
    font-family:'DM Sans',sans-serif;
  `;
  overlay.innerHTML = `
    <div style="font-size:44px">🔒</div>
    <div style="color:#fff;font-size:18px;font-weight:700;line-height:1.4">
      Войдите для просмотра<br>полного урока
    </div>
    <div style="color:#8080a8;font-size:13px;max-width:260px;line-height:1.6">
      Вы просмотрели демо-версию. Войдите в платформу, чтобы получить полный доступ ко всем урокам.
    </div>
    <button onclick="closeLesson()" style="
      background:linear-gradient(135deg,#f5c842,#f0a500);
      border:none;border-radius:12px;padding:13px 28px;
      font-size:14px;font-weight:700;color:#000;cursor:pointer;
      font-family:'DM Sans',sans-serif;margin-top:4px;
    ">Войти в платформу</button>
  `;
  slot.appendChild(overlay);
}

// ══════════════════════════════ CLOSE LESSON ══════════════════════
function closeLesson() {
  $('lesson-modal').classList.remove('show', 'video-active');
  $('video-section').style.display = 'none';
  $('video-slot').innerHTML = '';
  currentLessonIndex = 0; lessonSearchQuery = '';
  $('completion-banner').classList.remove('show');

  // Clear demo timer
  if (demoTimerInterval) { clearInterval(demoTimerInterval); demoTimerInterval = null; }

  // Reset player refs
  if (ytPlayer) { try { ytPlayer.destroy(); } catch(_) {} ytPlayer = null; }
  currentVideoEl = null;
  syncPlayPauseIcon(false);
  $('video-container')?.classList.remove('shorts-mode');

  // Exit theater mode if active
  if (isTheaterMode) toggleVideoFS();

  // Hide custom controls
  const bar = $('custom-vc-bar');
  if (bar) bar.style.display = 'none';

  renderCoursesGrid();
  updateHeroStats();
}

// ══════════════════════════════ CUSTOM VIDEO CONTROLS ════════════
function showCustomControls() {
  const bar = $('custom-vc-bar');
  if (bar) bar.style.display = 'flex';
}

// Full-cover transparent overlay: captures all taps → play/pause or seek
function addYtCleanOverlay(slot) {
  // Remove any old overlay
  const old = slot.querySelector('#yt-clean-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'yt-clean-overlay';
  overlay.style.cssText = 'position:absolute;inset:0;z-index:7;background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent';
  slot.appendChild(overlay);

  let tapTimer2 = null;
  let lastTapTime = 0;
  let lastTapZone = '';

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
    lastTapTime = now;
    lastTapZone = zone;

    if (isDouble) {
      clearTimeout(tapTimer2); tapTimer2 = null;
      if (zone === 'left')  vcSeek(-10);
      else if (zone === 'right') vcSeek(10);
      else toggleYtPlayPause();
    } else {
      clearTimeout(tapTimer2);
      tapTimer2 = setTimeout(() => {
        tapTimer2 = null;
        toggleYtPlayPause();
      }, 280);
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
    // iOS: если плеер ещё не готов — кликаем overlay
    const overlay = document.getElementById('yt-clean-overlay');
    if (overlay) overlay.click();
    return;
  }
  try {
    const state = ytPlayer.getPlayerState();
    // 1 = playing, 3 = buffering → pause; else → play
    if (state === 1 || state === 3) {
      ytPlayer.pauseVideo();
      showPlayPauseFlash('⏸');
      syncPlayPauseIcon(false);
    } else {
      ytPlayer.playVideo();
      showPlayPauseFlash('▶');
      syncPlayPauseIcon(true);
    }
  } catch(_) {}
}

function showPlayPauseFlash(icon) {
  const el = $('seek-flash');
  if (!el) return;
  el.textContent = icon;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.remove('show'), 700);
}

function showSeekFlash(delta) {
  const el = $('seek-flash');
  if (!el) return;
  el.textContent = delta > 0 ? `+${delta} сек ⏩` : `${delta} сек ⏪`;
  el.classList.remove('show');
  void el.offsetWidth; // reflow to restart animation
  el.classList.add('show');
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.remove('show'), 900);
}

function vcSeek(delta) {
  // YouTube IFrame API
  if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
    try {
      const cur = ytPlayer.getCurrentTime();
      ytPlayer.seekTo(Math.max(0, cur + delta), true);
      showSeekFlash(delta);
      return;
    } catch(_) {}
  }
  // Native <video>
  if (currentVideoEl) {
    currentVideoEl.currentTime = Math.max(0, currentVideoEl.currentTime + delta);
    showSeekFlash(delta);
    return;
  }
  // For other iframes (VK, Drive, etc.) — seek not available cross-origin
  showSeekFlash(delta);
}

function toggleVideoFS() {
  const vc = $('video-container');
  const bar = $('custom-vc-bar');
  const esc = $('theater-esc');
  const expandIcon = $('vc-fs-icon-expand');
  const shrinkIcon = $('vc-fs-icon-shrink');

  if (!isTheaterMode) {
    // Enter theater mode
    isTheaterMode = true;
    vc.classList.add('theater-mode');
    document.body.classList.add('video-theater');
    if (esc) esc.style.display = 'flex';
    if (expandIcon) expandIcon.style.display = 'none';
    if (shrinkIcon) shrinkIcon.style.display = 'block';
    // Ensure controls bar visible
    if (bar) bar.style.display = 'flex';
  } else {
    // Exit theater mode
    isTheaterMode = false;
    vc.classList.remove('theater-mode');
    document.body.classList.remove('video-theater');
    if (esc) esc.style.display = 'none';
    if (expandIcon) expandIcon.style.display = 'block';
    if (shrinkIcon) shrinkIcon.style.display = 'none';
  }
}

// ══════════════════════════════ IMAGE VIEWER ══════════════════════
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

// ===== UNIVERSAL OVERLAY ДЛЯ ЗАПУСКА ВИДЕО ======
function showUniversalPlayOverlay(onPlayCallback) {
  const slot = $('video-slot');
  slot.innerHTML = `
    <div id="universal-play-overlay" style="position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,0.77)">
      <div id="upo-btn" style="width:88px;height:88px;background:rgba(255,40,40,0.94);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(0,0,0,0.7);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21"/></svg>
      </div>
      <span style="color:#fff;font-size:15px;font-family:sans-serif;font-weight:500;pointer-events:none">Нажмите для запуска видео</span>
    </div>
  `;
  const btn = document.getElementById('upo-btn');
  btn.addEventListener('click', function () { onPlayCallback(); });
  btn.addEventListener('touchend', function (e) { e.preventDefault(); onPlayCallback(); });
}
// ========= ВСТАВЬТЕ ЭТУ playLesson =========
function playLesson(courseIdx, lessonAbsIdx) {
  const lessons = getLessons(courseIdx);
  const lesson  = lessons[lessonAbsIdx];
  if (!lesson || lesson.type !== 'video') return;

  // Clean up previous player
  if (ytPlayer) { try { ytPlayer.destroy(); } catch(_) {} ytPlayer = null; }
  currentVideoEl = null;
  $('video-container')?.classList.remove('shorts-mode');

  // Hide controls bar until new video starts playing
  const bar = $('custom-vc-bar');
  if (bar) bar.style.display = 'none';

  currentCourseIdx = courseIdx;
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
      // Detect YouTube Shorts (vertical 9:16)
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
              autoplay: 1,
              controls: 0,      // ← hide YouTube controls
              fs: 0,            // ← disable YouTube fullscreen button
              rel: 0,
              modestbranding: 1,
              iv_load_policy: 3,
              playsinline: 1,
              showinfo: 0,
              disablekb: 1,     // ← disable YouTube keyboard shortcuts
              origin: location.origin
            },
            events: {
              onReady: e => {
                e.target.playVideo();
                showCustomControls();
                syncPlayPauseIcon(true);
                addYtCleanOverlay(slot);
                // ── ДЕМО-РЕЖИМ: 60 сек для неавторизованных ──
                if (!currentUser && isDemoLesson(currentCourseIdx, currentLessonIndex)) {
                  startDemoTimer(60);
                }
              },
              onStateChange: e => {
                // 1=playing, 3=buffering → show pause icon; else → show play icon
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
              // Fallback: controls=0 iframe
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
        const oid = mClip[1];
        const id  = mClip[2];
        embedUrl = `https://vkvideo.ru/clip_ext.php?oid=${oid}&id=${id}&autoplay=1&no_recs=1`;
      } else if (mVideo) {
        const oid = mVideo[1];
        const id  = mVideo[2];
        embedUrl = `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2&autoplay=1&js_api=1&no_recs=1`;
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
function loadYtIframe(ytId, startSec) {
  const slot = $('video-slot'); slot.innerHTML = '';
  ytStartTime = Date.now() - startSec * 1000;
  currentYtId = ytId;

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isIOS) {
    // На iPhone YouTube iframe не воспроизводится — показываем превью с кнопкой открытия
    hideTapZones();
    slot.innerHTML = `
      <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;background:#000;overflow:hidden">
        <div style="position:relative;width:100%;flex:1;overflow:hidden;cursor:pointer" onclick="window.open('https://youtu.be/${ytId}','_blank')">
          <img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" style="width:100%;height:100%;object-fit:cover">
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.25)">
            <div style="width:64px;height:64px;background:rgba(255,0,0,0.92);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(0,0,0,0.5)">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21"/></svg>
            </div>
          </div>
        </div>
        <a href="https://youtu.be/${ytId}" target="_blank" rel="noopener"
           style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:14px;background:#ff0000;color:#fff;font-size:14px;font-weight:700;text-decoration:none;font-family:'DM Sans',sans-serif;flex-shrink:0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21"/></svg>
          Смотреть на YouTube
        </a>
      </div>`;
  } else {
    showTapZones();
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&start=${Math.max(0, Math.round(startSec))}&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';
    slot.appendChild(iframe);
  }
}

function loadDriveIframe(link) {
  const slot = $('video-slot'); slot.innerHTML = '';
  hideTapZones();
  let fileId = null;
  const m1 = link.match(/\/file\/d\/([^\/\?&]+)/);
  const m2 = link.match(/[?&]id=([^&]+)/);
  if (m1) fileId = m1[1];
  else if (m2) fileId = m2[1];

  const embedUrl = fileId
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : link.replace('/view', '/preview');

  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
  iframe.allowFullscreen = true;
  iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';
  slot.appendChild(iframe);
}

function loadCloudflareIframe(link) {
  const slot = $('video-slot'); slot.innerHTML = '';
  hideTapZones();
  // Извлекаем video ID из ссылки вида:
  // https://iframe.cloudflarestream.com/VIDEO_ID
  // https://cloudflarestream.com/VIDEO_ID/iframe
  let src = link;
  const m = link.match(/cloudflarestream\.com\/([a-f0-9]+)/i);
  if (m) src = `https://iframe.cloudflarestream.com/${m[1]}?autoplay=true&preload=true`;

  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.allowFullscreen = true;
  iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';
  slot.appendChild(iframe);
}

function loadVimeoIframe(link) {
  const slot = $('video-slot'); slot.innerHTML = '';
  hideTapZones();
  const m = link.match(/vimeo\.com\/(\d+)/);
  const videoId = m ? m[1] : '';
  // autoplay=0 — ждём нажатия пользователя, тогда звук работает сразу
  const src = videoId
    ? `https://player.vimeo.com/video/${videoId}?autoplay=0&playsinline=1&muted=0`
    : link;

  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.setAttribute('webkitallowfullscreen', 'true');
  iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';
  slot.appendChild(iframe);
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

function loadVkIframe(link) {
  const slot = $('video-slot'); 
  slot.innerHTML = '';
  hideTapZones();

  let embedUrl = '';

  // 1. Извлекаем ID из разных типов ссылок VK (клипы и обычные видео)
  const mClip  = link.match(/clip(-?\d+)_(\d+)/);
  const mVideo = link.match(/video(-?\d+)_(\d+)/);

  if (mClip) {
    const oid = mClip[1];
    const id  = mClip[2];
    embedUrl = `https://vkvideo.ru/clip_ext.php?oid=${oid}&id=${id}&autoplay=1&no_recs=1`;
  } else if (mVideo) {
    const oid = mVideo[1];
    const id  = mVideo[2];
    embedUrl = `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2&autoplay=1&js_api=1&no_recs=1`;
  } else {
    // Если в таблицу вставили уже готовую embed-ссылку из iframe
    embedUrl = link;
    if (!embedUrl.includes('autoplay=')) {
      embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'autoplay=1';
    } else {
      embedUrl = embedUrl.replace('autoplay=0', 'autoplay=1');
    }
    if (!embedUrl.includes('no_recs=')) {
      embedUrl += '&no_recs=1';
    }
  }

  // Показываем чистую ручную кнопку запуска видео для предотвращения сбоев и скрытия рекламы/рекомендаций
  slot.innerHTML = `
    <div id="vk-play-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;background:#060608;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;cursor:pointer;border-radius:inherit;z-index:10"
         onclick="loadVkIframeNow('${embedUrl.replace(/'/g, "\\'")}', this)">
      <div style="width:76px;height:76px;background:rgba(74,118,198,0.95);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);transition:transform .2s ease">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="white" style="margin-left:4px"><polygon points="5 3 19 12 5 21"/></svg>
      </div>
      <span style="color:rgba(255,255,255,0.85);font-size:14px;font-family:sans-serif;font-weight:500;letter-spacing:0.5px">Включить видео урок</span>
    </div>`;
}

function loadVkIframeNow(embedUrl, overlay) {
  const slot = $('video-slot');
  slot.innerHTML = '';

  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock; web-share';
  iframe.allowFullscreen = true;
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.setAttribute('webkitallowfullscreen', 'true');
  iframe.setAttribute('mozallowfullscreen', 'true');
  iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
  iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;background:#000;';
  
  slot.appendChild(iframe);
}

function loadDirectVideo(link) {
  const slot = $('video-slot'); slot.innerHTML = '';
  hideTapZones();
  const video = document.createElement('video');
  video.src = link;
  video.controls = true;
  video.playsinline = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.preload = 'metadata';
  video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:#000;border-radius:inherit';
  slot.appendChild(video);
}
const getElapsedSec = () => Math.round((Date.now() - ytStartTime) / 1000);

function setupTapZones() {
  // Tap zones are now handled by addYtCleanOverlay for YouTube.
  // For other iframe types, we disable tap zones to avoid conflicts.
  hideTapZones();
}
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

// ══════════════════════════════ MOBILE NAV ════════════════════════
function mobileNavTo(section, btn) {
  document.querySelectorAll('.mnav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (section === 'catalog') {
    $('catalog-page-modal').classList.add('show');
  } else if (section === 'help') {
    if (waUrl) window.open(waUrl, '_blank'); // тех поддержка через WA
    else if (tgUrl) window.open(tgUrl, '_blank');
    else showToast(t('linkNotSet'), 'error');
  } else {
    document.querySelector('.platforms-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ══════════════════════════════ DEVICE INFO ═══════════════════════
function getDeviceInfo() {
  const ua = navigator.userAgent;

  let device = 'Десктоп';
  if      (/iPhone/.test(ua))             device = 'iPhone';
  else if (/iPad/.test(ua))               device = 'iPad';
  else if (/Android.*Mobile/.test(ua))    device = 'Android телефон';
  else if (/Android/.test(ua))            device = 'Android планшет';

  let os = 'Неизвестно';
  if      (/Windows NT 10/.test(ua))      os = 'Windows 10/11';
  else if (/Windows NT 6/.test(ua))       os = 'Windows 7/8';
  else if (/Mac OS X/.test(ua))            os = 'macOS';
  else if (/iPhone OS ([\d_]+)/.test(ua))  os = 'iOS '     + ua.match(/iPhone OS ([\d_]+)/)[1].replace(/_/g, '.');
  else if (/Android ([\d.]+)/.test(ua))    os = 'Android ' + ua.match(/Android ([\d.]+)/)[1];
  else if (/Linux/.test(ua))               os = 'Linux';

  let browser = 'Неизвестно';
  if      (/YaBrowser/.test(ua))          browser = 'Яндекс';
  else if (/OPR|Opera/.test(ua))          browser = 'Opera';
  else if (/Edg/.test(ua))                browser = 'Edge';
  else if (/Chrome/.test(ua))             browser = 'Chrome';
  else if (/Firefox/.test(ua))            browser = 'Firefox';
  else if (/Safari/.test(ua))             browser = 'Safari';

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
      const r = await fetch('https://api.ipify.org?format=json',
        { signal: AbortSignal.timeout(3000) });
      ip = (await r.json()).ip || '—';
    } catch (_) {}

    fetch(scriptUrl, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _type:    'login_log',
        date:     now.toLocaleDateString('ru-RU'),
        time:     now.toLocaleTimeString('ru-RU'),
        iin,
        name,
        device,
        os,
        browser,
        screen:   `${screen.width}×${screen.height}`,
        language: navigator.language || '—',
        ip
      })
    });
  } catch (e) {
    console.warn('Log error:', e);
  }
}

// ══════════════════════════════ LOGIN ════════════════════════════
async function doLogin() {
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
  // ── Попытка 1: Apps Script ──────────────────────────────────────
  let scriptOk = false;
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 15000);
    let res;
    try {
      res = await fetch(getScriptUrl(), {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body:    JSON.stringify({ _type: 'auth', iin, phone }),
        signal:  controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) throw new Error('http_' + res.status);
    const result = await res.json();
    scriptOk = true;
    if (!result.found) { finishLogin(btn); showMsg('error', t('errNotFound')); return; }
    foundName  = result.name || name;
    isPaid     = !!result.isPaid;
    isAllowed  = !!result.isAllowed;
  } catch (e) {
    console.warn('Apps Script unavailable, trying direct sheet fallback:', e.message);
    // ── Попытка 2: Прямое чтение Лист1 через gviz ──────────────────
    // Структура Лист1 (по Apps Script):
    //   col0  = ИИН
    //   col1  = Имя
    //   col3  = Телефон
    //   col10 = Статус доступа  (✅ РАЗРЕШЕНО / ✅ РҰҚСАТ)
    //   col11 = Статус оплаты   (✅ ОПЛАЧЕНО  / ✅ ТӨЛЕНДІ)
    try {
      await animProg(40, 42, 100, steps[1]);
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${gsSheetId}/gviz/tq?tqx=out:csv&sheet=Лист1`;
      const ctrl2 = new AbortController();
      setTimeout(() => ctrl2.abort(), 12000);
      const res2 = await fetch(sheetUrl, { signal: ctrl2.signal });
      if (!res2.ok) throw new Error('sheet_http_' + res2.status);
      const csv  = await res2.text();
      const rows = parseCSV(csv);

      // Нормализация телефона — 10 последних цифр
      const normPhone = p => {
        let d = (p||'').replace(/\D/g,'');
        if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
        if (d.length === 10) d = '7' + d;
        return d;
      };

      const matchIin   = iin.replace(/\D/g,'').trim();
      const matchPhone = normPhone(phone);
      let found = false;

      for (const row of rows) {
        const rowIin = (row[0]||'').replace(/\D/g,'').trim();
        if (rowIin !== matchIin) continue;

        found = true;
        const rowPhone = normPhone(row[3]||'');

        // Проверяем телефон (если в строке есть номер)
        if (rowPhone && matchPhone && rowPhone !== matchPhone) {
          finishLogin(btn); showMsg('error', t('errNotFound')); return;
        }

        // Заблокирован за нарушение?
        if ((row[3]||'').includes('НАРУШЕНИЕ')) {
          finishLogin(btn); showMsg('error', t('errNoAccess')); return;
        }

        foundName = (row[1]||'').trim() || name;

        const statusA = (row[10]||'').toUpperCase();
        const statusP = (row[11]||'').toUpperCase();

        isAllowed = statusA.includes('✅') && (statusA.includes('РАЗРЕШЕНО') || statusA.includes('РҰҚСАТ'));
        isPaid    = statusP.includes('✅') && (statusP.includes('ОПЛАЧЕНО')  || statusP.includes('ТӨЛЕНДІ'));
        break;
      }

      if (!found) { finishLogin(btn); showMsg('error', t('errNotFound')); return; }
      scriptOk = true;
    } catch(e2) {
      await animProg(40, 40, 50, '');
      btn.disabled = false;
      btn.classList.remove('loading');
      pgw.style.display = 'none';
      if (pg) pg.classList.remove('active');
      const msg = (e2.name === 'AbortError') ? t('errSheetUnavailable') : t('errNetwork');
      showMsg('error', msg);
      return;
    }
  }

  await animProg(40, 60, 300, steps[2]); markStep(2);
  await sleep(180);
  await animProg(60, 75, 300, steps[3]); markStep(3);
  await sleep(180);

  if (!isPaid)    { finishLogin(btn); showMsg('error', t('errNotPaid'));  return; }

  await animProg(75, 90, 300, steps[4]); markStep(4);
  await sleep(180);

  if (!isAllowed) { finishLogin(btn); showMsg('error', t('errNoAccess')); return; }

  await animProg(90, 100, 350, steps[5]); markStep(5);
  if (pg) pg.classList.remove('active');

  currentUser = foundName || name;
  logLogin(iin, currentUser);

  // Сохраняем сессию: sessionStorage для браузера + localStorage с TTL для PWA
  const sessionData = JSON.stringify({ user: currentUser, iin, phone, ts: Date.now() });
  try {
    sessionStorage.setItem('bs_user',  currentUser);
    sessionStorage.setItem('bs_iin',   iin);
    sessionStorage.setItem('bs_phone', phone);
  } catch (_) {}
  try {
    localStorage.setItem('bs_session', sessionData);
  } catch (_) {}

  $('login-success').textContent   = t('ok') + ' ' + currentUser + '!';
  $('login-success').style.display = 'block';
  await loadSheet2();
  await sleep(700);
  showLessons();
}

function finishLogin(btn) {
  btn.disabled = false;
  btn.classList.remove('loading');
  setTimeout(() => { $('progress-wrap').style.display = 'none'; $('prog-fill').style.width = '0%'; }, 1000);
}
function showMsg(type, msg) {
  const el = $(type === 'error' ? 'login-error' : 'login-success');
  el.textContent = msg; el.style.display = 'block';
}
function markStep(i) {
  const el = $(`ps${i}`); if (el) el.classList.add('done');
}
function animProg(from, to, dur, label) {
  return new Promise(res => {
    const fill = $('prog-fill'), pct = $('prog-pct'), lbl = $('progress-label-text');
    if (label && lbl) lbl.textContent = label;
    const start = Date.now();
    (function f() {
      const p = Math.min(1, (Date.now() - start) / dur);
      const v = Math.round(from + (to - from) * easeOut(p));
      fill.style.width = v + '%';
      pct.textContent  = v + '%';
      p < 1 ? requestAnimationFrame(f) : res();
    })();
  });
}

function showLessons() {
  // ── скрываем ВСЕ нерабочие экраны ──────────────────────────
  $('landing-page').style.display  = 'none';
  $('login-page').style.display    = 'none';
  $('lessons-page').style.display  = 'block';
  $('logout-btn').style.display    = 'flex';
  $('header-center').style.display = 'flex';
  if (window.innerWidth <= 640) $('mobile-nav').style.display = 'flex';

  // Закрываем окно принудительной блокировки, если оно висело
  const blockOverlay = $('block-overlay');
  if (blockOverlay) blockOverlay.style.display = 'none';

  applyTexts(); applyLinks();
  updateHeroStats();

  // Запуск фоновой ежесекундной/10-секундной проверки прав доступа пользователя в Лист1
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
  $('login-page').style.display    = 'none';  // прячем — идём на лендинг

  ['inp-name','inp-iin','inp-phone'].forEach(id => { const e=$(id); if(e) e.value=''; });
  ['login-error','login-success'].forEach(id => { const e=$(id); if(e) e.style.display='none'; });
  $('progress-wrap').style.display = 'none';
  $('prog-fill').style.width = '0%';
  const btn = $('login-btn'); btn.disabled = false; btn.classList.remove('loading');

  // ── возвращаем на лендинг с fade ──
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

// ══════════════════════════════ ADMIN ════════════════════════════
$('logo-wrap').addEventListener('click', () => {
  logoClickCount++;
  if (logoClickCount === 1) {
    logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 600);
  } else {
    clearTimeout(logoClickTimer); logoClickCount = 0; openAdminPw();
  }
});
function openAdminPw() {
  $('admin-pw-input').value   = '';
  $('pw-error').style.display = 'none';
  $('admin-pw-modal').classList.add('show');
  setTimeout(() => $('admin-pw-input').focus(), 200);
}
async function checkAdminPw() {
  const val = $('admin-pw-input').value;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(val));
  const hash = [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2,'0')).join('');
  if (hash === ADMIN_PW_HASH) {
    closeModal('admin-pw-modal');
    openAdmin();
  } else {
    $('pw-error').textContent   = t('wrongPw');
    $('pw-error').style.display = 'block';
    $('admin-pw-input').value   = '';
    $('admin-pw-input').focus();
  }
}
$('admin-pw-input').addEventListener('keydown', e => { if (e.key === 'Enter') checkAdminPw(); });

function openAdmin() {
  $('admin-gs-input').value = gsSheetId;
  const scriptInput = $('admin-script-input');
  if (scriptInput) scriptInput.value = localStorage.getItem('bs_script_url') || LOG_SCRIPT_URL;
  $('admin-modal').classList.add('show');
}
function saveAdmin() {
  const val = $('admin-gs-input').value.trim();
  if (val) { gsSheetId = val; localStorage.setItem('gs_sheet_id', val); }
  const scriptInput = $('admin-script-input');
  if (scriptInput && scriptInput.value.trim()) {
    const scriptVal = scriptInput.value.trim();
    localStorage.setItem('bs_script_url', scriptVal);
    showToast('✅ Сохранено! Script URL обновлён.', 'success');
  } else {
    showToast(t('savedOk'), 'success');
  }
  closeModal('admin-modal');
  loadSheet2();
}

async function runAdminDiag() {
  const logEl = $('admin-diag-log');
  const s2El  = $('diag-sheet2');
  const scEl  = $('diag-script');
  const runBtn = $('admin-diag-run-btn');
  if (logEl) { logEl.style.display = 'block'; logEl.innerHTML = ''; }
  if (runBtn) runBtn.disabled = true;

  const log = (msg, ok) => {
    if (!logEl) return;
    const line = document.createElement('div');
    line.className = 'diag-line ' + (ok === true ? 'ok' : ok === false ? 'err' : 'info');
    line.textContent = msg;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  };

  // 1. Test Google Sheets (Лист2)
  log('🔍 Проверяем Google Sheets (Лист2)...');
  if (s2El) s2El.textContent = '⏳ проверяем...';
  try {
    const url = `https://docs.google.com/spreadsheets/d/${gsSheetId}/gviz/tq?tqx=out:csv&sheet=Лист2`;
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 5) {
        if (s2El) s2El.textContent = '✅ доступна';
        log(`✅ Лист2 загружен (${text.length} байт)`, true);
      } else {
        if (s2El) s2El.textContent = '⚠️ пусто';
        log('⚠️ Лист2 пустой или нет данных', null);
      }
    } else {
      if (s2El) s2El.textContent = '❌ ошибка ' + res.status;
      log(`❌ Лист2 HTTP ${res.status}. Проверьте: таблица должна быть открыта для всех ("Читатель")`, false);
    }
  } catch (e) {
    if (s2El) s2El.textContent = '❌ недоступна';
    log('❌ Лист2 недоступен: ' + (e.name === 'AbortError' ? 'таймаут 8с' : e.message), false);
  }

  // 2. Test Apps Script
  log('🔍 Проверяем Apps Script (авторизацию)...');
  if (scEl) scEl.textContent = '⏳ проверяем...';
  const scriptUrl = getScriptUrl();
  try {
    const ctrl2 = new AbortController();
    setTimeout(() => ctrl2.abort(), 10000);
    const res2 = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ _type: 'auth', iin: '000000000000', phone: '' }),
      signal: ctrl2.signal
    });
    if (res2.ok) {
      const json2 = await res2.json();
      // Ожидаем { found: false } — ИИН не найден, но скрипт работает
      if (typeof json2.found !== 'undefined') {
        if (scEl) scEl.textContent = '✅ отвечает';
        log(`✅ Apps Script работает. Ответ: found=${json2.found}`, true);
      } else {
        if (scEl) scEl.textContent = '⚠️ неожиданный ответ';
        log(`⚠️ Apps Script ответил, но формат неожиданный: ${JSON.stringify(json2)}`, null);
      }
    } else {
      if (scEl) scEl.textContent = '❌ HTTP ' + res2.status;
      log(`❌ Apps Script HTTP ${res2.status}. Переопубликуйте скрипт: "Развернуть → Веб-приложение → Все"`, false);
    }
  } catch(e2) {
    if (scEl) scEl.textContent = '❌ недоступен';
    if (e2.name === 'AbortError') {
      log('❌ Apps Script: таймаут 10с. Проверьте URL и права публикации', false);
    } else {
      log('❌ Apps Script: ' + e2.message + '. URL неверный или скрипт не опубликован', false);
    }
  }

  log('✔ Диагностика завершена');
  if (runBtn) runBtn.disabled = false;
}

// ══════════════════════════════ MODALS HELPERS ════════════════════
function closeModal(id) { $(id)?.classList.remove('show'); }

document.querySelectorAll('.overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target !== o) return;
    if (o.id === 'lesson-modal')          closeLesson();
    else if (o.id === 'img-viewer-modal') closeImageViewer();
    else o.classList.remove('show');
  });
});

// ══════════════════════════════ TOAST ════════════════════════════
function showToast(msg, type = 'success') {
  const el = $('toast');
  el.textContent = msg;
  el.className   = 'toast ' + type;
  requestAnimationFrame(() => setTimeout(() => el.classList.add('show'), 10));
  setTimeout(() => el.classList.remove('show'), 3200);
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

// ══════════════════════════════ KEYBOARD NAV ══════════════════════
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    // First exit theater mode if active
    if (isTheaterMode) { toggleVideoFS(); return; }
    if ($('lesson-modal').classList.contains('show'))          closeLesson();
    else if ($('img-viewer-modal').classList.contains('show')) closeImageViewer();
    else document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
  }
  if ($('lesson-modal').classList.contains('show') && $('video-section').style.display !== 'none') {
    if (e.key === 'ArrowLeft')  prevLesson();
    if (e.key === 'ArrowRight') nextLesson();
    // Keyboard shortcuts for seek
    if (e.key === 'j' || e.key === 'J') vcSeek(-10);
    if (e.key === 'l' || e.key === 'L') vcSeek(10);
    if (e.key === 'f' || e.key === 'F') toggleVideoFS();
  }
});

// ══════════════════════════════ INPUT HELPERS ═════════════════════
$('inp-iin').addEventListener('input',   function () { this.value = this.value.replace(/\D/g, ''); });
$('inp-iin').addEventListener('keydown', e => { if (e.key === 'Enter') $('inp-phone').focus(); });
$('inp-name').addEventListener('keydown',  e => { if (e.key === 'Enter') $('inp-iin').focus(); });
$('inp-phone').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

// ══════════════════════════════ HEADER SCROLL EFFECT ═════════════
window.addEventListener('scroll', () => {
  const h = document.querySelector('.header-inner');
  if (h) h.style.background = window.scrollY > 20
    ? (currentTheme === 'dark' ? 'rgba(6,6,8,0.95)'  : 'rgba(245,245,250,0.97)')
    : (currentTheme === 'dark' ? 'rgba(6,6,8,0.82)'  : 'rgba(245,245,250,0.9)');
}, { passive: true });

// ══════════════════════════════ SESSION RESTORE ═══════════════════
async function tryRestoreSession() {
  let savedUser = null;
  let savedIin = null;
  let savedPhone = null;

  // Сначала пробуем sessionStorage (браузер)
  try { 
    savedUser  = sessionStorage.getItem('bs_user'); 
    savedIin   = sessionStorage.getItem('bs_iin');
    savedPhone = sessionStorage.getItem('bs_phone');
  } catch(_) {}

  // Для PWA: если sessionStorage пустой — проверяем localStorage с TTL 8 ч
  if (!savedUser) {
    try {
      const raw = localStorage.getItem('bs_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        const TTL = 30 * 24 * 60 * 60 * 1000; // 30 дней (для PWA на мобильном)
        if (parsed && parsed.user && parsed.iin && (Date.now() - (parsed.ts || 0)) < TTL) {
          savedUser  = parsed.user;
          savedIin   = parsed.iin;
          savedPhone = parsed.phone || '';
          // Восстанавливаем в sessionStorage
          try {
            sessionStorage.setItem('bs_user',  savedUser);
            sessionStorage.setItem('bs_iin',   savedIin);
            sessionStorage.setItem('bs_phone', savedPhone);
          } catch(_) {}
        } else {
          // Истёк TTL — удаляем
          localStorage.removeItem('bs_session');
        }
      }
    } catch(_) {}
  }

  if (!savedUser || !savedIin) return false;
  
  currentUser = savedUser;
  await loadSheet2();
  showLessons();
  return true;
}

// ══════════════════════════════ INIT ════════════════════════════
// ══════════════════════════════ LANDING PAGE ══════════════════════
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    resetIdleBeacon();
  }, 220);
}

function showLandingLogin() {
  const lp = $('landing-page');
  const loginPg = $('login-page');
  if (lp) { lp.classList.add('page-fade-out'); }
  setTimeout(() => {
    if (lp) { lp.style.display = 'none'; lp.classList.remove('page-fade-out'); }
    if (loginPg) {
      loginPg.style.display = 'flex';
      loginPg.classList.add('page-fade-in');
      loginPg.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(() => { if (loginPg) loginPg.classList.remove('page-fade-in'); }, 400);
    // Показываем кнопку «назад»
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

(async function init() {
  applyTexts();
  initOnlineCounter();
  const restored = await tryRestoreSession();
  if (!restored) {
    if (gsSheetId) loadSheet2();
    // Show landing page first; login page stays hidden
    const lp = document.getElementById('landing-page');
    if (lp) lp.style.display = 'block';
    $('login-page').style.display   = 'none';
    $('lessons-page').style.display = 'none';
    resetIdleBeacon();
  }
})();

// ══════════════════════════════ FOMO ONLINE COUNTER ═══════════════
function initOnlineCounter() {
  const el = $('lp-online-count');
  if (!el) return;
  // Реалистичный диапазон: 8-24 пользователя
  const base = 8 + Math.floor(Math.random() * 12);
  el.textContent = base;
  // Флуктуация каждые 12-20 секунд
  function updateCount(next) {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      el.textContent = next;
      el.style.opacity = '1';
    }, 300);
  }
  setInterval(() => {
    const current = parseInt(el.textContent) || base;
    const delta = Math.random() < 0.5 ? 1 : -1;
    const next = Math.min(28, Math.max(6, current + delta));
    updateCount(next);
  }, 12000 + Math.random() * 8000);
}

// ══════════════════════════════ RESUME BEACON ═════════════════════
// Маяк «продолжить» — показываем на карточке курса где студент остановился
function showResumeBeacon() {
  if (!currentUser || !courses.length) return;
  // Ищем курс с незавершёнными уроками
  for (let ci = 0; ci < courses.length; ci++) {
    const vl = getVideoLessons(ci);
    if (!vl.length) continue;
    // Последний просмотренный урок
    let lastWatched = -1;
    for (let vi = vl.length - 1; vi >= 0; vi--) {
      if (isWatched(ci, vl[vi].absIdx)) { lastWatched = vi; break; }
    }
    // Следующий непросмотренный
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

    // Создаём плавающий маяк
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
    return; // показываем только один маяк
  }
}

/* ══════════════════════════════════════════════════════════════
   FEATURE ADDITIONS v4.0
   ══════════════════════════════════════════════════════════════ */

// ── 2. Social Proof Toast ─────────────────────────────────────
const SP_NAMES = [
  { name: 'Нурлан', city: 'Алматы', emoji: '👨' },
  { name: 'Айгерим', city: 'Астана', emoji: '👩' },
  { name: 'Данияр', city: 'Шымкент', emoji: '👨' },
  { name: 'Зарина', city: 'Алматы', emoji: '👩' },
  { name: 'Болат', city: 'Атырау', emoji: '👨' },
  { name: 'Мадина', city: 'Тараз', emoji: '👩' },
  { name: 'Арман', city: 'Актобе', emoji: '👨' },
  { name: 'Сабина', city: 'Астана', emoji: '👩' },
  { name: 'Ерлан', city: 'Усть-Каменогорск', emoji: '👨' },
  { name: 'Гульнара', city: 'Алматы', emoji: '👩' },
  { name: 'Темирлан', city: 'Кокшетау', emoji: '👨' },
  { name: 'Айнур', city: 'Семей', emoji: '👩' },
];

let spToastTimer = null;

function initSocialProofToast() {
  function scheduleNext() {
    const delay = 45000 + Math.random() * 45000; // 45–90 сек
    spToastTimer = setTimeout(showSpToast, delay);
  }
  scheduleNext();
}

function showSpToast() {
  // Показываем только на лендинге
  const lp = $('landing-page');
  if (!lp || lp.style.display === 'none') {
    initSocialProofToast(); return;
  }
  const person = SP_NAMES[Math.floor(Math.random() * SP_NAMES.length)];
  const el = $('social-proof-toast');
  const nameEl = $('sp-toast-name');
  if (!el || !nameEl) return;

  el.querySelector('.sp-toast-avatar').textContent = person.emoji;
  nameEl.textContent = `${person.name} из ${person.city}`;
  el.style.display = 'flex';

  requestAnimationFrame(() => {
    el.classList.add('sp-visible');
  });

  setTimeout(() => {
    el.classList.remove('sp-visible');
    setTimeout(() => { el.style.display = 'none'; }, 400);
  }, 4000);

  initSocialProofToast(); // schedule next
}

// ── 3. Sticky CTA Bar ─────────────────────────────────────────
(function initStickyCta() {
  let lastScroll = 0;
  let stickyShown = false;

  window.addEventListener('scroll', () => {
    const lp = $('landing-page');
    if (!lp || lp.style.display === 'none') return;

    const bar = $('sticky-cta-bar');
    if (!bar) return;

    const scrollY = window.scrollY;

    if (scrollY > 300 && scrollY > lastScroll) {
      // Скролл вниз > 300px — показать
      if (!stickyShown) {
        bar.style.display = 'block';
        requestAnimationFrame(() => bar.classList.add('sticky-visible'));
        stickyShown = true;
      }
    } else if (scrollY < lastScroll) {
      // Скролл вверх — скрыть
      if (stickyShown) {
        bar.classList.remove('sticky-visible');
        stickyShown = false;
      }
    }
    lastScroll = scrollY;
  }, { passive: true });
})();

// При выходе на лендинг — скрываем sticky bar
const _origShowLanding = showLanding;
showLanding = function() {
  const bar = $('sticky-cta-bar');
  if (bar) { bar.classList.remove('sticky-visible'); }
  _origShowLanding.call(this);
};

// ── 4. Header Progress Bar ────────────────────────────────────
function updateHeaderProgressBar() {
  const bar = $('header-progress-bar');
  const fill = $('header-progress-fill');
  const tooltip = $('header-progress-tooltip');
  if (!bar || !fill) return;

  if (!currentUser) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'block';
  const prog = getTotalProgress();
  fill.style.width = prog.pct + '%';

  if (tooltip) {
    tooltip.textContent = `${prog.pct}% — ${prog.watched} из ${prog.total} уроков просмотрено`;
  }
}

// ── 6. Учебный стрик ─────────────────────────────────────────
function getTodayDateStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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

  if (data.lastDate === today) return; // уже записано сегодня

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  if (data.lastDate === yStr) {
    data.count = (data.count || 0) + 1;
  } else if (data.lastDate !== today) {
    data.count = 1; // стрик сбрасывается
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
    badge.textContent = `🔥 ${data.count} ${pluralDays(data.count)} подряд`;
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
    const msg = `🔥 ${data.count} ${pluralDays(data.count)} подряд! Так держать, ${currentUser}!`;
    setTimeout(() => showToast(msg, 'success'), 1000);
  }
}

// ── 7. Сертификат ─────────────────────────────────────────────
let certCourseIdx = null;

function openCertModal() {
  if (currentCourseIdx === null) return;
  certCourseIdx = currentCourseIdx;
  const course = courses[certCourseIdx];
  if (!course) return;

  const courseName = lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ);
  const sub = $('cert-modal-sub');
  if (sub) sub.textContent = `Курс: «${courseName}»`;

  // Сбрасываем состояние — показываем только кнопку "Получить сертификат"
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
  const dlBtn = $('cert-download-btn');
  const prog = $('cert-gen-progress');
  const fill = $('cert-gen-fill');
  const label = $('cert-gen-label');
  const canvas = $('cert-canvas');

  if (getBtn) getBtn.style.display = 'none';
  if (prog) prog.style.display = 'block';

  const steps = ['Формируем данные...', 'Рисуем оформление...', 'Добавляем имя...', 'Финальная обработка...', 'Готово! 🎉'];
  let pct = 0;
  let stepIdx = 0;
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
        const courseName = course ? (lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ)) : 'Курс';
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

  // Background
  ctx.fillStyle = '#060608';
  ctx.fillRect(0, 0, W, H);

  // Gold border gradient
  const borderGrad = ctx.createLinearGradient(0, 0, W, H);
  borderGrad.addColorStop(0, '#f5c842');
  borderGrad.addColorStop(0.5, '#ffd96a');
  borderGrad.addColorStop(1, '#e8920a');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, W - 24, H - 24);

  // Inner border
  ctx.strokeStyle = 'rgba(245,200,66,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  // Corner decorations
  const corners = [[40, 40], [W-40, 40], [40, H-40], [W-40, H-40]];
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245,200,66,0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,200,66,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // BS Emblem circle
  ctx.beginPath();
  ctx.arc(W / 2, 110, 44, 0, Math.PI * 2);
  const circGrad = ctx.createRadialGradient(W/2, 110, 0, W/2, 110, 44);
  circGrad.addColorStop(0, '#f5c842');
  circGrad.addColorStop(1, '#e8920a');
  ctx.fillStyle = circGrad;
  ctx.fill();

  ctx.font = 'bold 20px Syne, sans-serif';
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.fillText('BS', W / 2, 117);

  // Title
  ctx.font = '600 13px DM Sans, sans-serif';
  ctx.fillStyle = 'rgba(245,200,66,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('СЕРТИФИКАТ О ПРОХОЖДЕНИИ КУРСА', W / 2, 186);

  // Divider line
  const lineGrad = ctx.createLinearGradient(160, 0, W - 160, 0);
  lineGrad.addColorStop(0, 'transparent');
  lineGrad.addColorStop(0.3, 'rgba(245,200,66,0.5)');
  lineGrad.addColorStop(0.7, 'rgba(245,200,66,0.5)');
  lineGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(160, 200); ctx.lineTo(W - 160, 200);
  ctx.stroke();

  // Student name
  ctx.font = 'bold 36px Syne, sans-serif';
  ctx.fillStyle = '#ededf5';
  ctx.textAlign = 'center';
  ctx.fillText(studentName, W / 2, 260);

  // "успешно прошёл(а)"
  ctx.font = '400 15px DM Sans, sans-serif';
  ctx.fillStyle = '#8080a8';
  ctx.fillText('успешно прошёл(а) курс', W / 2, 292);

  // Course name
  const maxWidth = 600;
  ctx.font = '700 22px Syne, sans-serif';
  ctx.fillStyle = '#f5c842';
  ctx.textAlign = 'center';
  // Word wrap for long course names
  const words = courseName.split(' ');
  let line = '', lines2 = [];
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth) { lines2.push(line); line = w; }
    else line = test;
  }
  if (line) lines2.push(line);
  lines2.forEach((l, i) => ctx.fillText(l, W / 2, 334 + i * 30));

  // Divider
  ctx.beginPath();
  ctx.moveTo(160, 390); ctx.lineTo(W - 160, 390);
  ctx.stroke();

  // Date
  const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.font = '400 13px DM Sans, sans-serif';
  ctx.fillStyle = '#44445c';
  ctx.fillText(dateStr, W / 2, 416);

  // Business School Amanat footer
  ctx.font = '700 14px Syne, sans-serif';
  ctx.fillStyle = 'rgba(245,200,66,0.5)';
  ctx.fillText('Business School AMANAT', W / 2, 450);

  // Stars decoration
  ctx.fillStyle = 'rgba(245,200,66,0.35)';
  ctx.font = '20px serif';
  ctx.fillText('★  ★  ★  ★  ★', W / 2, 490);
}

function downloadCert() {
  const canvas = $('cert-canvas');
  if (!canvas) return;
  const course = courses[certCourseIdx];
  const courseName = course ? (lang === 'kz' ? (course.nameKZ || course.nameRU) : (course.nameRU || course.nameKZ)) : 'Курс';
  const link = document.createElement('a');
  link.download = `Сертификат_BSAmanat_${courseName.replace(/\s+/g, '_')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ── 8. Конфетти + Достижения ──────────────────────────────────
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
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotV;
      p.vy += 0.05; // gravity
      if (remaining < 500) p.opacity = Math.max(0, remaining / 500);

      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();

      if (p.y > H + 20) {
        p.y = -10;
        p.x = Math.random() * W;
        p.vy = 2 + Math.random() * 4;
      }
    });

    if (now < endTime) {
      requestAnimationFrame(draw);
    } else {
      canvas.style.display = 'none';
    }
  }
  draw();
}

function showAchievementBadge(text) {
  const badge = $('achievement-badge');
  const sub = $('achievement-sub-text');
  if (!badge || !sub) return;
  sub.textContent = text;
  badge.style.display = 'block';
  requestAnimationFrame(() => {
    badge.classList.add('ach-visible');
  });
  setTimeout(() => {
    badge.classList.remove('ach-visible');
    setTimeout(() => { badge.style.display = 'none'; }, 400);
  }, 4000);
}

// Track first lesson viewed
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

// ── 10. Авто тёмная тема ──────────────────────────────────────
function initAutoTheme() {
  const manualTheme = localStorage.getItem('manualTheme');
  if (manualTheme) return; // пользователь менял вручную — не трогаем

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

// Патч toggleTheme для сохранения ручного флага
const _origToggleTheme = toggleTheme;
window.toggleTheme = function() {
  localStorage.setItem('manualTheme', '1');
  _origToggleTheme.call(this);
};

// ── 11. Дашборд прогресса ─────────────────────────────────────
function openProgressDashboard() {
  const body = $('progress-modal-body');
  if (!body) return;

  const totalProg = getTotalProgress();
  const streak = getStreakData();
  const watchTime = Math.round(totalProg.watched * 5); // 5 мин/урок

  const startKey = 'bs_start_date';
  let startDate = localStorage.getItem(startKey);
  if (!startDate) {
    startDate = new Date().toLocaleDateString('ru-RU');
    localStorage.setItem(startKey, startDate);
  }

  let html = `
    <div class="pd-meta-row">
      <div class="pd-meta-card">
        <div class="pd-meta-num">${totalProg.pct}%</div>
        <div class="pd-meta-lbl">Общий прогресс</div>
      </div>
      <div class="pd-meta-card">
        <div class="pd-meta-num">${watchTime} мин</div>
        <div class="pd-meta-lbl">Время обучения</div>
      </div>
      <div class="pd-meta-card">
        <div class="pd-meta-num">🔥 ${streak.count}</div>
        <div class="pd-meta-lbl">${pluralDays(streak.count)} подряд</div>
      </div>
      <div class="pd-meta-card">
        <div class="pd-meta-num" style="font-size:14px">${startDate}</div>
        <div class="pd-meta-lbl">Начало обучения</div>
      </div>
    </div>
    <div class="pd-chart-title">Прогресс по курсам</div>
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

// ── PATCH markWatched to trigger new features ─────────────────
const _origMarkWatched = markWatched;
markWatched = function(ci, li) {
  _origMarkWatched.call(this, ci, li);
  recordLessonToday();
  checkFirstLesson();
  checkCourseCompletion(ci);
  updateHeaderProgressBar();
};

// ── PATCH showLessons to trigger new features ─────────────────
const _origShowLessons = showLessons;
showLessons = function() {
  _origShowLessons.call(this);
  initAutoTheme();
  checkStreakOnLogin();
  updateStreakBadge();
  updateHeaderProgressBar();
  // Show hero progress btn
  const btn = $('progress-dashboard-btn');
  if (btn) btn.style.display = 'inline-flex';
  // Update start date if not set
  if (!localStorage.getItem('bs_start_date')) {
    localStorage.setItem('bs_start_date', new Date().toLocaleDateString('ru-RU'));
  }
  // Hide sticky cta
  const bar = $('sticky-cta-bar');
  if (bar) { bar.style.display = 'none'; bar.classList.remove('sticky-visible'); }
};

// ── PATCH logout to hide new features ─────────────────────────
const _origLogout = logout;
logout = function() {
  _origLogout.call(this);
  updateHeaderProgressBar();
  const btn = $('progress-dashboard-btn');
  if (btn) btn.style.display = 'none';
  const streak = $('streak-badge-hero');
  if (streak) streak.style.display = 'none';
};

// ── INIT new features ─────────────────────────────────────────
(function initFeatures() {
  // Social proof toast — только на лендинге, с задержкой 10 сек
  setTimeout(initSocialProofToast, 10000);

  // Auto theme check (без вывода toast при первой загрузке)
  const manualTheme = localStorage.getItem('manualTheme');
  if (!manualTheme) {
    const hour = new Date().getHours();
    const shouldBeDark = hour >= 22 || hour < 7;
    const target = shouldBeDark ? 'dark' : 'light';
    if (currentTheme !== target) {
      currentTheme = target;
      localStorage.setItem('theme', currentTheme);
      document.documentElement.setAttribute('data-theme', currentTheme);
    }
  }
})();
