// _worker.js — Cloudflare Pages Worker (серверная сторона)
//
// Переменные среды задаются в Cloudflare Dashboard →
//   Pages → Settings → Environment variables:
//     SHEET_ID   = ID таблицы «Уроки» (только уроки/настройки сайта, без личных данных)
//     SCRIPT_URL = ваш Apps Script URL (веб-приложение)
//     ADMIN_KEY  = тот же секретный ключ, что и ADMIN_KEY в Apps Script —
//                  нужен, чтобы админка могла получить список студентов,
//                  не читая таблицу «Доступ» напрямую из браузера.
//
// БЕЗ переменных Worker вернёт 500 — это намеренно (секреты не должны быть в коде).

const ALLOWED_ORIGIN = 'https://amanat.school';

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    const SHEET_ID   = env.SHEET_ID;
    const SCRIPT_URL = env.SCRIPT_URL;
    const ADMIN_KEY  = env.ADMIN_KEY;

    if (!SHEET_ID || !SCRIPT_URL) {
      return new Response('Worker environment variables not configured', { status: 500 });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store'
    };

    // Preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // === /api/auth — проксирует запросы авторизации в Apps Script ===
    if (url.pathname === '/api/auth' && request.method === 'POST') {
      const body = await request.text();
      const upstream = await fetch(SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body
      });
      const data = await upstream.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // === /api/sheet2 — конфиг платформы из Лист2 (без данных студентов) ===
    if (url.pathname === '/api/sheet2' && request.method === 'GET') {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Лист2&_cb=${Date.now()}`;
      const upstream = await fetch(sheetUrl);
      const csv = await upstream.text();
      return new Response(csv, {
        headers: { 'Content-Type': 'text/plain;charset=utf-8', ...corsHeaders }
      });
    }

    // === /api/students — список студентов для админки (защищено ADMIN_KEY на сервере) ===
    if (url.pathname === '/api/students' && request.method === 'GET') {
      if (!ADMIN_KEY) {
        return new Response(JSON.stringify({ ok: false, error: 'ADMIN_KEY not configured' }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      const upstream = await fetch(`${SCRIPT_URL}?action=getStudentList&key=${encodeURIComponent(ADMIN_KEY)}`);
      const data = await upstream.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Все остальные запросы — отдаём статические файлы как обычно
    return env.ASSETS.fetch(request);
  }
};
