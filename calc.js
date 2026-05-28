/* ══════════════════════════════════════════════════════════════════
   КАЛЬКУЛЯТОР ДОХОДА — AI-прогноз (Claude API)
   ══════════════════════════════════════════════════════════════════ */

// ── Состояние калькулятора ─────────────────────────────────────
let calcSelectedMkt = 'kaspi';

// ── Прокси-эндпоинт (API-ключ хранится на сервере) ─────────────
const CALC_PROXY_URL = '/api/calc';

// ── Утилиты форматирования ────────────────────────────────────
function fmtMoney(n) {
  return n.toLocaleString('ru-KZ') + ' ₸';
}

// ── Выбор маркетплейса ────────────────────────────────────────
function selectCalcMkt(btn) {
  document.querySelectorAll('.lp-calc-mkt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  calcSelectedMkt = btn.dataset.mkt;
}

// ── Быстрый выбор товара по тегу ─────────────────────────────
function setCalcProduct(name) {
  const input = document.getElementById('lp-calc-input');
  if (input) {
    input.value = name;
    input.focus();
  }
}

// ── Сброс калькулятора ────────────────────────────────────────
function clearAiCalc() {
  const input = document.getElementById('lp-calc-input');
  if (input) input.value = '';
  _calcShow('lp-calc-empty');
  const cta = document.getElementById('lp-calc-cta');
  if (cta) cta.style.display = 'none';
}

function _calcShow(id) {
  ['lp-calc-empty', 'lp-calc-ai-loading', 'lp-calc-result-v2'].forEach(el => {
    const node = document.getElementById(el);
    if (node) node.style.display = (el === id) ? '' : 'none';
  });
}

// ── Enter в поле ввода ────────────────────────────────────────
// Скрипт загружается с defer — DOM уже готов, DOMContentLoaded уже сработал.
(function initCalcInput() {
  function _bind() {
    const inp = document.getElementById('lp-calc-input');
    if (inp) {
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') runAiCalc();
      });
    }
  }
  if (document.readyState !== 'loading') { _bind(); }
  else { document.addEventListener('DOMContentLoaded', _bind); }
})();

// ── Анимация прогресс-бара загрузки ──────────────────────────
function _startCalcProgress(steps) {
  let step = 0;
  const fill = document.getElementById('lp-calc-ai-progress-fill');
  const title = document.getElementById('lp-calc-ai-loading-title');
  const sub = document.getElementById('lp-calc-ai-loading-sub');

  function advance() {
    if (step >= steps.length - 1) return;
    step++;
    if (fill) fill.style.width = ((step / (steps.length - 1)) * 85) + '%';
    if (title) title.textContent = steps[step].title;
    if (sub) sub.textContent = steps[step].sub;
  }

  if (fill) fill.style.width = '5%';
  if (title) title.textContent = steps[0].title;
  if (sub) sub.textContent = steps[0].sub;

  const timers = [];
  const delays = [1200, 2400, 3600, 5000];
  delays.slice(0, steps.length - 1).forEach((d, i) => {
    timers.push(setTimeout(advance, d));
  });
  return timers;
}

// ── Анимация появления цифр ───────────────────────────────────
function _animateValue(el, target, duration) {
  if (!el) return;
  let start = 0;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = fmtMoney(Math.round(eased * target));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ── Анимация прогресс-баров ───────────────────────────────────
function _animateBars(m1, m2, m3) {
  const max = Math.max(m1, m2, m3);
  const bars = [
    { bar: 'lp-calc-bar-1', val: 'lp-calc-val-1', amount: m1 },
    { bar: 'lp-calc-bar-2', val: 'lp-calc-val-2', amount: m2 },
    { bar: 'lp-calc-bar-3', val: 'lp-calc-val-3', amount: m3 },
  ];

  bars.forEach(({ bar, val, amount }, i) => {
    const barEl = document.getElementById(bar);
    const valEl = document.getElementById(val);
    const pct = max > 0 ? (amount / max) * 100 : 0;

    setTimeout(() => {
      if (barEl) barEl.style.width = pct + '%';
      _animateValue(valEl, amount, 700);
    }, i * 180);
  });
}

// ── Парсинг ответа Claude ─────────────────────────────────────
function _parseCalcResponse(text) {
  // Ожидаем JSON: { month1, month2, month3, revenue, profit, startCapital, insight, tips[] }
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const obj = JSON.parse(clean);
    return obj;
  } catch(e) {
    // Попытка вытащить числа из текста как fallback
    const nums = (text.match(/\d{5,}/g) || []).map(s => parseInt(s, 10)).filter(n => n > 10000);
    return {
      month1: nums[0] || 120000,
      month2: nums[1] || 280000,
      month3: nums[2] || 520000,
      revenue: nums[3] || 920000,
      profit:  nums[4] || 380000,
      startCapital: nums[5] || 150000,
      insight: text.slice(0, 200),
      tips: [],
    };
  }
}

// ── Отображение результата ────────────────────────────────────
function _renderCalcResult(product, mkt, data) {
  // Шапка
  const nameEl = document.getElementById('lp-calc-product-name');
  const badgeEl = document.getElementById('lp-calc-res-mkt-badge');
  const mktLabels = { kaspi: 'Kaspi', wb: 'Wildberries', ozon: 'Ozon' };

  if (nameEl) nameEl.textContent = product;
  if (badgeEl) {
    badgeEl.textContent = mktLabels[mkt] || mkt;
    badgeEl.className = 'lp-calc-res-mkt-badge lp-calc-res-mkt-badge--' + mkt;
  }

  // AI-инсайт
  const insightBox = document.getElementById('lp-calc-ai-insight');
  const insightText = document.getElementById('lp-calc-ai-insight-text');
  if (data.insight && insightText) {
    insightText.textContent = data.insight;
    if (insightBox) insightBox.style.display = '';
  }

  // Прогресс-бары по месяцам
  _animateBars(data.month1, data.month2, data.month3);

  // Итоговые суммы
  _animateValue(document.getElementById('lp-calc-revenue'), data.revenue, 900);
  _animateValue(document.getElementById('lp-calc-profit'), data.profit, 900);
  _animateValue(document.getElementById('lp-calc-start-capital'), data.startCapital, 900);

  // Советы
  const tipsBox = document.getElementById('lp-calc-tips');
  const tipsList = document.getElementById('lp-calc-tips-list');
  if (data.tips && data.tips.length && tipsList) {
    tipsList.innerHTML = data.tips.map(t => `<li>${t}</li>`).join('');
    if (tipsBox) tipsBox.style.display = '';
  }

  // Показываем блок результата
  _calcShow('lp-calc-result-v2');

  // CTA
  const cta = document.getElementById('lp-calc-cta');
  const ctaWa = document.getElementById('lp-calc-cta-wa');
  if (cta) {
    cta.style.display = '';
    if (ctaWa) {
      const mktName = mktLabels[mkt] || mkt;
      const waText = t('lpCalcWaText').replace('__PRODUCT__', product).replace('__MKT__', mktName);
      ctaWa.href = `https://wa.me/77776020216?text=${encodeURIComponent(waText)}`;
    }
  }
}

// ── Основная функция запуска AI-расчёта ──────────────────────
async function runAiCalc() {
  const input = document.getElementById('lp-calc-input');
  const product = (input ? input.value : '').trim();

  if (!product) {
    if (input) {
      input.style.borderColor = 'var(--gold)';
      setTimeout(() => { input.style.borderColor = ''; }, 1200);
      input.focus();
    }
    return;
  }

  if (product.length > 200) {
    if (typeof showToast === 'function') showToast('Название товара слишком длинное (макс. 200 символов)', 'error');
    if (input) input.focus();
    return;
  }

  const mkt = calcSelectedMkt;
  const mktNames = { kaspi: 'Kaspi', wb: 'Wildberries', ozon: 'Ozon' };
  const mktName = mktNames[mkt] || mkt;

  // Показываем лоадер
  _calcShow('lp-calc-ai-loading');
  const progressTimers = _startCalcProgress([
    { title: t('lpCalcLoadStep1Title'), sub: t('lpCalcLoadStep1Sub') },
    { title: t('lpCalcLoadStep2Title'), sub: t('lpCalcLoadStep2Sub') },
    { title: t('lpCalcLoadStep3Title'), sub: t('lpCalcLoadStep3Sub') },
    { title: t('lpCalcLoadStep4Title'), sub: t('lpCalcLoadStep4Sub') },
  ]);

  try {
    const response = await fetch(CALC_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, mkt }),
    });

    progressTimers.forEach(clearTimeout);

    if (!response.ok) throw new Error('API error ' + response.status);

    const apiData = await response.json();
    // Прокси возвращает { text: "..." } — уже извлечённый ответ модели
    const text = apiData.text || (apiData.content || []).map(b => b.text || '').join('');
    const data = _parseCalcResponse(text);

    // Завершаем прогресс-бар до 100%
    const fill = document.getElementById('lp-calc-ai-progress-fill');
    if (fill) fill.style.width = '100%';

    setTimeout(() => _renderCalcResult(product, mkt, data), 400);

  } catch (err) {
    progressTimers.forEach(clearTimeout);
    console.error('AI calc error:', err);

    // Fallback: локальный расчёт
    const base = { kaspi: 1.0, wb: 1.15, ozon: 1.05 }[mkt] || 1;
    // Хеш от содержимого строки (charCode сумма), а не только длина
    const seed = Array.from(product).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 100;
    const m1 = Math.round((80000 + seed * 1200) * base / 10000) * 10000;
    const m2 = Math.round(m1 * 2.1 / 10000) * 10000;
    const m3 = Math.round(m1 * 3.8 / 10000) * 10000;
    const revenue = m1 + m2 + m3;
    const profit = Math.round(revenue * 0.38 / 10000) * 10000;
    const startCapital = Math.round((m1 * 0.6) / 10000) * 10000;

    const fill = document.getElementById('lp-calc-ai-progress-fill');
    if (fill) fill.style.width = '100%';

    setTimeout(() => _renderCalcResult(product, mkt, {
      month1: m1, month2: m2, month3: m3,
      revenue, profit, startCapital,
      insight: t('lpCalcFallbackInsight').replace('__PRODUCT__', product).replace('__MKT__', { kaspi: 'Kaspi', wb: 'Wildberries', ozon: 'Ozon' }[mkt] || mkt),
      tips: [
        t('lpCalcFallbackTip1'),
        t('lpCalcFallbackTip2'),
        t('lpCalcFallbackTip3'),
      ],
    }), 400);
  }
}