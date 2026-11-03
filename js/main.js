/* ==========================================================
   PERRY RUNNER 3D · Portal  —  Interacciones
   Índice: 1 Utilidades · 2 Logros · 3 Navegación · 4 Aparición
           5 Hero · 6 Historia · 7 Personaje · 8 Mecánicas
           9 Datos · 10 Galería · 11 Jugar · 12 Música
   ========================================================== */
(function () {
  'use strict';

  /* ---------- 1. UTILIDADES ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = (n, d = 0) => n.toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d });
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const hover = matchMedia('(hover:hover)').matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('perry.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('perry.' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
  };
  function once(el, cb, opts) {
    const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { o.disconnect(); cb(el); } }, opts || { threshold: .2 });
    o.observe(el);
  }
  function countUp(el, fin, dec = 0, dur = 1300) {
    if (reduce) { el.textContent = fmt(fin, dec); return; }
    const t0 = performance.now();
    requestAnimationFrame(function f(t) {
      const k = Math.min((t - t0) / dur, 1);
      el.textContent = fmt(fin * (1 - Math.pow(1 - k, 3)), dec);
      if (k < 1) requestAnimationFrame(f);
    });
  }

  /* Confeti */
  const cfCv = $('#confeti'), cfCtx = cfCv.getContext('2d'); let cfP = [], cfOn = false;
  function confeti(n = 140) {
    if (reduce) return;
    cfCv.width = innerWidth; cfCv.height = innerHeight;
    const cols = ['#2bc4bd', '#ff9d1f', '#ffd23f', '#ff5468', '#2f80d6', '#fff'];
    for (let i = 0; i < n; i++) cfP.push({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .6, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 6, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length], l: 1 });
    if (!cfOn) { cfOn = true; requestAnimationFrame(cfLoop); }
  }
  function cfLoop() {
    cfCtx.clearRect(0, 0, cfCv.width, cfCv.height);
    cfP.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .35; p.vx *= .99; p.r += p.vr; p.l -= .006; cfCtx.save(); cfCtx.globalAlpha = Math.max(0, p.l); cfCtx.translate(p.x, p.y); cfCtx.rotate(p.r); cfCtx.fillStyle = p.c; cfCtx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); cfCtx.restore(); });
    cfP = cfP.filter(p => p.l > 0 && p.y < cfCv.height + 40);
    if (cfP.length) requestAnimationFrame(cfLoop); else { cfOn = false; cfCtx.clearRect(0, 0, cfCv.width, cfCv.height); }
  }

  /* Toast */
  function toast(ico, titulo, texto) {
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<span class="li">${ico}</span><div><b>${titulo}</b><small>${texto}</small></div>`;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4100);
  }

  /* Ripple en botones */
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn'); if (!b || reduce) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height), s = document.createElement('span');
    s.className = 'ripple'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(s); setTimeout(() => s.remove(), 650);
  });

  /* ---------- 2. LOGROS ---------- */
  const LOGROS = [
    { id: 'explorador', ico: '🧭', t: 'Explorador', d: 'Visita todas las secciones del portal' },
    { id: 'detective', ico: '🕵️', t: 'Detective', d: 'Inspecciona los 5 detalles de Perry' },
    { id: 'animador', ico: '🎬', t: 'Animador', d: 'Prueba las 4 animaciones de Perry' },
    { id: 'reflejos', ico: '⚡', t: 'Reflejos', d: 'Mira a Perry superar 5 obstáculos seguidos' },
    { id: 'analista', ico: '📊', t: 'Analista', d: 'Ejecuta el simulador de partida' },
    { id: 'fotografo', ico: '📸', t: 'Fotógrafo', d: 'Mira las 5 imágenes de la galería' },
    { id: 'corredor', ico: '🏃', t: 'Corredor', d: 'Pulsa jugar y arranca el juego de Unity' },
    { id: 'cine', ico: '🎬', t: 'Modo cine', d: 'Juega en pantalla completa' },
  ];
  const ganados = new Set(store.get('logros', []).filter(id => LOGROS.some(l => l.id === id)));
  function pintaLogros() {
    $('#logrosN').textContent = ganados.size + '/' + LOGROS.length;
    $('#barraLogros').style.width = (ganados.size / LOGROS.length * 100) + '%';
    $('#listaLogros').innerHTML = LOGROS.map(l => `<div class="logro ${ganados.has(l.id) ? 'ok' : ''}"><span class="li">${l.ico}</span><div><b>${l.t}</b><small>${l.d}</small></div></div>`).join('');
  }
  function logro(id) {
    if (ganados.has(id)) return; const l = LOGROS.find(x => x.id === id); if (!l) return;
    ganados.add(id); store.set('logros', [...ganados]); pintaLogros();
    toast(l.ico, '¡Logro desbloqueado!', l.t + ' · ' + l.d);
    if (ganados.size === LOGROS.length) setTimeout(() => { confeti(220); toast('🎉', '¡Lo lograste todo!', 'Completaste los 8 logros'); }, 900);
  }
  pintaLogros();

  /* Modales */
  function abrir(m) { m.classList.add('on'); m._prev = document.activeElement; const b = $('[data-cerrar]', m); if (b) b.focus(); }
  function cerrar(m) { m.classList.remove('on'); if (m._prev) m._prev.focus(); }
  $('#btnLogros').addEventListener('click', () => abrir($('#mLogros')));
  $$('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-cerrar]')) cerrar(m); });
  });

  /* ---------- 3. NAVEGACIÓN ---------- */
  const burger = $('#burger'), menu = $('#menu');
  burger.addEventListener('click', () => { const a = menu.classList.toggle('abierto'); burger.setAttribute('aria-expanded', a); burger.textContent = a ? '✕' : '☰'; });
  $$('a', menu).forEach(a => a.addEventListener('click', () => { menu.classList.remove('abierto'); burger.textContent = '☰'; burger.setAttribute('aria-expanded', 'false'); }));

  const secciones = $$('section[id]');
  const enlaces = $$('a.enlace'), visitadas = new Set();
  // puntos laterales
  const dots = $('#dots');
  dots.innerHTML = secciones.map(s => `<a href="#${s.id}" aria-label="${s.dataset.nombre || 'Inicio'}"><span>${s.dataset.nombre || 'Inicio'}</span></a>`).join('');
  const dotA = $$('a', dots);
  const obsNav = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const id = e.target.id;
    enlaces.forEach(a => a.classList.toggle('activo', a.getAttribute('href') === '#' + id));
    dotA.forEach(a => a.classList.toggle('activo', a.getAttribute('href') === '#' + id));
    visitadas.add(id); if (visitadas.size >= secciones.length) logro('explorador');
  }), { rootMargin: '-45% 0px -50% 0px' });
  secciones.forEach(s => obsNav.observe(s));

  const barra = $('#progreso'), cab = $('header'), arriba = $('#arriba');
  function alScroll() {
    const h = document.documentElement.scrollHeight - innerHeight;
    barra.style.transform = 'scaleX(' + (h > 0 ? scrollY / h : 0) + ')';
    cab.classList.toggle('scrolled', scrollY > 20);
    arriba.classList.toggle('on', scrollY > 700);
  }
  addEventListener('scroll', alScroll, { passive: true }); alScroll();
  arriba.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- 4. APARICIÓN + CONTADORES ---------- */
  $$('.rev').forEach(el => {
    const sib = [...el.parentElement.children].filter(c => c.classList.contains('rev')), i = sib.indexOf(el);
    if (!reduce && i > 0) el.style.transitionDelay = (i * 100) + 'ms,' + (i * 100) + 'ms,0s,0s';
    once(el, () => {
      el.classList.add('vis');
      $$('.valor[data-n]', el).forEach(v => countUp(v, +v.dataset.n));
      setTimeout(() => el.style.transitionDelay = '', 1500);
    }, { threshold: .18 });
  });

  /* ---------- 5. HERO ---------- */
  // texto que se escribe
  const frase = $('.frase');
  if (frase && !reduce) {
    const t = frase.dataset.texto; frase.textContent = ''; frase.classList.add('escribiendo'); let i = 0;
    setTimeout(function w() { frase.textContent = t.slice(0, ++i); if (i < t.length) setTimeout(w, 38); else setTimeout(() => frase.classList.remove('escribiendo'), 1600); }, 900);
  }
  $$('[data-cuenta]').forEach(el => { const f = +el.dataset.cuenta; if (!reduce) { el.textContent = '0'; setTimeout(() => countUp(el, f, 0, 1500), 700); } });

  // parallax 3D del arte
  const esc = $('#escena3d'), escIn = $('#escIn'), prof = $$('[data-prof]', esc);
  if (hover && !reduce) {
    esc.addEventListener('pointermove', e => {
      const r = esc.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      escIn.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
      $('img', escIn).style.transform = `translate(${-x * 26}px,${-y * 18}px)`;
      prof.forEach(p => p.style.translate = `${x * +p.dataset.prof}px ${y * +p.dataset.prof}px`);
    });
    esc.addEventListener('pointerleave', () => { escIn.style.transform = ''; $('img', escIn).style.transform = ''; prof.forEach(p => p.style.translate = ''); });
    // luz que sigue al cursor
    const luz = $('#luz');
    addEventListener('pointermove', e => { luz.style.opacity = 1; luz.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, { passive: true });
    document.addEventListener('mouseleave', () => luz.style.opacity = 0);
  }

  // partículas interactivas
  (function () {
    const cv = $('#fx'); if (!cv || reduce) return; const c = cv.getContext('2d'); let w, h, ps = [], vis = true, mx = -999, my = -999;
    function size() { w = cv.width = cv.offsetWidth; h = cv.height = cv.offsetHeight; const n = Math.min(70, (w * h / 22000) | 0); ps = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: 1 + Math.random() * 2, g: Math.random() < .18 })); }
    size(); addEventListener('resize', size);
    new IntersectionObserver(e => vis = e[0].isIntersecting).observe(cv);
    cv.parentElement.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    cv.parentElement.addEventListener('pointerleave', () => { mx = my = -999; });
    (function loop() {
      requestAnimationFrame(loop); if (!vis) return; c.clearRect(0, 0, w, h);
      for (const p of ps) {
        const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
        if (d < 130) { p.vx += dx / d * .06; p.vy += dy / d * .06; }
        p.vx *= .99; p.vy *= .99; p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        c.fillStyle = p.g ? 'rgba(255,210,63,.8)' : 'rgba(143,241,235,.45)'; c.beginPath(); c.arc(p.x, p.y, p.g ? p.r + 1.5 : p.r, 0, 6.3); c.fill();
      }
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const d = Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y);
        if (d < 110) { c.strokeStyle = `rgba(43,196,189,${.18 * (1 - d / 110)})`; c.beginPath(); c.moveTo(ps[i].x, ps[i].y); c.lineTo(ps[j].x, ps[j].y); c.stroke(); }
      }
    })();
  })();

  /* ---------- 6. HISTORIA ---------- */
  (function () {
    const st = $('#story'), tabs = $$('.s-tabs button', st), imgs = $$('.s-vista img', st), tx = $('#sTexto');
    const D = [
      ['Planteamiento', 'Perry sale con el tiempo justo y debe cruzar toda la ciudad antes de que empiece la clase.'],
      ['Conflicto', 'La avenida está bloqueada por vallas bajas y barras altas. Cada choque le quita una de sus tres vidas, y el ritmo de la carrera aumenta sin parar.'],
      ['Motivación', 'Las monedas doradas son el premio al riesgo: suman puntos extra y acercan a Perry a su objetivo.'],
      ['Resolución', 'Si reúne 1000 puntos, llega a tiempo y logra el “nuevo récord”. Si pierde sus vidas, el juego termina y toca intentarlo de nuevo.'],
    ];
    let i = 0, timer = null, hov = false, vis = false;
    function ir(n) {
      i = (n + D.length) % D.length;
      tabs.forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-selected', k === i); });
      imgs.forEach((m, k) => m.classList.toggle('on', k === i));
      $('h3', tx).textContent = D[i][0]; $('p', tx).textContent = D[i][1]; $('#sCont').textContent = (i + 1) + ' / 4';
      // reinicia animación de la barra
      const on = tabs[i]; on.classList.remove('on'); void on.offsetWidth; on.classList.add('on');
      programa();
    }
    function programa() { clearTimeout(timer); if (!reduce && vis && !hov) timer = setTimeout(() => ir(i + 1), 8000); }
    tabs.forEach((t, k) => t.addEventListener('click', () => ir(k)));
    $('#sPrev').addEventListener('click', () => ir(i - 1)); $('#sNext').addEventListener('click', () => ir(i + 1));
    st.addEventListener('pointerenter', () => { hov = true; st.classList.add('pausa'); clearTimeout(timer); });
    st.addEventListener('pointerleave', () => { hov = false; st.classList.remove('pausa'); ir(i); });
    new IntersectionObserver(e => { vis = e[0].isIntersecting; vis ? ir(i) : clearTimeout(timer); }, { threshold: .4 }).observe(st);
    ir(0);
  })();

  /* ---------- 7. PERSONAJE ---------- */
  (function () {
    const wrap = $('#pWrap'), info = $('#pinInfo'), pins = $$('.pin', wrap), seen = new Set();
    const P = [
      ['Sombrero de detective', 'Marrón y de ala ancha: su sello de aventurero. Le da un aire de investigador universitario.'],
      ['Pico de ornitorrinco', 'Naranja y con mirada decidida. Perry nunca pierde la concentración mientras corre.'],
      ['Chaqueta universitaria', 'Color vino con rayas y escudo. Es el uniforme que lo identifica como estudiante.'],
      ['Cola de castor', 'Su cola naranja le da equilibrio: ayuda a los saltos de hasta 2,6 m.'],
      ['Patas palmeadas', 'Perfectas para correr a 11 u/s y crecer hasta casi 29 u/s sin frenar.'],
    ];
    pins.forEach(p => {
      const sel = () => { const k = +p.dataset.i; pins.forEach(q => q.classList.toggle('on', q === p)); info.innerHTML = `<b>${k + 1}. ${P[k][0]}</b>${P[k][1]}`; seen.add(k); if (seen.size === P.length) logro('detective'); };
      p.addEventListener('click', sel); p.addEventListener('pointerenter', sel); p.addEventListener('focus', sel);
    });
    // animaciones
    const hechas = new Set(), tms = {}; const dur = { correr: 2600, saltar: 900, agachar: 1100, morir: 2100 };
    function anima(a) {
      wrap.className = 'p-wrap'; void wrap.offsetWidth; wrap.classList.add('a-' + a);
      clearTimeout(tms.t); tms.t = setTimeout(() => wrap.className = 'p-wrap', dur[a]);
      hechas.add(a); if (hechas.size === 4) logro('animador');
      $$('.hab').forEach(h => h.classList.toggle('on', h.dataset.a === a && h.classList.contains('hab')));
    }
    $$('.anims button, .hab').forEach(b => b.addEventListener('click', () => { anima(b.dataset.a); if (b.classList.contains('hab')) $('#retrato').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }));
  })();

  /* ---------- 8. MECÁNICAS ---------- */
  // teclas que se iluminan
  addEventListener('keydown', e => $$('kbd[data-key]').forEach(k => { if (k.dataset.key === e.code) k.classList.add('press'); }));
  addEventListener('keyup', e => $$('kbd[data-key]').forEach(k => { if (k.dataset.key === e.code) k.classList.remove('press'); }));
  // tarjetas que se voltean al tocar
  $$('.ob').forEach(o => o.addEventListener('click', () => o.classList.toggle('vuelta')));

  // demostración automática (js/demo.js): ilumina las teclas y desbloquea el logro
  window.addEventListener('perry:demo', e => {
    const d = e.detail || {};
    const k = d.action === 'jump' ? 'ArrowUp' : d.action === 'slide' ? 'ArrowDown' : null;
    if (k) $$('.control kbd[data-key="' + k + '"]').forEach(el => { el.classList.add('press'); setTimeout(() => el.classList.remove('press'), 380); });
    if (d.action === 'pass' && d.streak >= 5) logro('reflejos');
  });

  // inclinación 3D suave de las tarjetas (solo PC con mouse; en táctiles no se activa)
  (function () {
    if (!window.matchMedia || !matchMedia('(hover:hover) and (pointer:fine)').matches || reduce) return;
    $$('.control, .victoria, .derrota, .gauge, .reglas > .tarjeta').forEach(c => {
      c.classList.add('tilt3d');
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.setProperty('--ry', (x * 8).toFixed(2) + 'deg'); c.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
      });
      c.addEventListener('pointerleave', () => { c.style.setProperty('--ry', '0deg'); c.style.setProperty('--rx', '0deg'); });
    });
  })();

  /* ---------- 9. DATOS ---------- */
  (function () {
    // anillos de parámetros
    const G = [['Altura del salto', 2.6, 'm', 87, '⬆️'], ['Duración del deslizamiento', 1.1, 's', 55, '⬇️'], ['Invulnerabilidad tras golpe', 1.2, 's', 60, '🛡️'], ['Intervalo entre obstáculos (máx.)', 2.4, 's', 80, '⏱️'], ['Intervalo entre obstáculos (mín.)', 1.3, 's', 43, '⚡']];
    const C = 2 * Math.PI * 34;
    $('#gauges').innerHTML = G.map(g => `<div class="tarjeta gauge rev"><div class="gw"><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="pg" cx="40" cy="40" r="34"/><circle class="arco" cx="40" cy="40" r="34" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-p="${g[3]}"/></svg><div class="num"><span data-v="${g[1]}">0</span><small>${g[2]}</small></div></div><h4>${g[4]} ${g[0]}</h4></div>`).join('');
    $$('.gauge').forEach((el, i) => {
      if (!reduce) el.style.transitionDelay = (i * 110) + 'ms,' + (i * 110) + 'ms,0s,0s';
      once(el, () => {
        el.classList.add('vis'); setTimeout(() => el.style.transitionDelay = '', 1500);
        const arc = $('.arco', el); arc.style.strokeDashoffset = C * (1 - arc.dataset.p / 100);
        const sp = $('[data-v]', el); countUp(sp, +sp.dataset.v, 1, 1500);
      }, { threshold: .4 });
    });

    // gráfica velocidad(t)
    const svg = $('#graf2'), x0 = 38, x1 = 306, y0 = 180, y1 = 14, vmax = 32, v0 = 11, a = .18, T = 100;
    const X = t => x0 + (x1 - x0) * t / T, Y = v => y0 - (y0 - y1) * v / vmax;
    let g = '';
    [0, 10, 20, 30].forEach(v => g += `<line x1="${x0}" x2="${x1}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,.1)"/><text x="${x0 - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`);
    [0, 25, 50, 75, 100].forEach(t => g += `<text x="${X(t)}" y="${y0 + 16}" text-anchor="middle">${t}s</text>`);
    g += `<text x="12" y="${(y0 + y1) / 2}" transform="rotate(-90 12 ${(y0 + y1) / 2})" text-anchor="middle">velocidad (u/s)</text>`;
    const L = Math.hypot(X(T) - X(0), Y(v0 + a * T) - Y(v0));
    g += `<defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9d1f" stop-opacity=".35"/><stop offset="1" stop-color="#ff9d1f" stop-opacity="0"/></linearGradient></defs>`;
    g += `<path d="M${X(0)} ${Y(v0)} L${X(T)} ${Y(v0 + a * T)} L${X(T)} ${y0} L${X(0)} ${y0} Z" fill="url(#gA)"/>`;
    g += `<line class="ln" id="ln" x1="${X(0)}" y1="${Y(v0)}" x2="${X(T)}" y2="${Y(v0 + a * T)}" stroke="#2bc4bd" stroke-width="3" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L}"/>`;
    g += `<line id="mkl" y1="${y1}" y2="${y0}" stroke="#ff9d1f" stroke-dasharray="4 4" opacity=".8"/><circle id="mkc" r="6" fill="#ff9d1f" stroke="#fff" stroke-width="2"/><text id="mkt" style="fill:#fff;font-weight:700"></text>`;
    svg.innerHTML = g;

    // simulador
    const rt = $('#rt'), rc = $('#rc'), R = 314.16, pista = $('#pista2');
    const pj = document.createElement('img'); pj.src = 'assets/personaje.png'; pj.alt = ''; pj.className = 'perry'; pista.appendChild(pj);
    let t = 0, play = false, last = 0, ganado = false;
    const tw = () => Math.max(0, (1000 - 25 * rc.value) / 10);
    const estadoBtn = () => $('#bplay').textContent = play ? '⏸ Pausar' : '▶ Simular partida';
    function render() {
      const c = +rc.value, v = v0 + a * t, d = v0 * t + a * t * t / 2, pts = 10 * t + 25 * c, pct = Math.min(100, pts / 10), ok = pts >= 1000;
      $('#o-t').textContent = fmt(t, 0) + ' s'; $('#o-c').textContent = c;
      $('#v-v').textContent = fmt(v, 1); $('#v-d').textContent = fmt(d, 0); $('#v-o').textContent = Math.floor(t / 1.85); $('#v-s').textContent = fmt(pts, 0);
      $('#v-p').textContent = fmt(pct, 0) + '%'; $('#anillo').style.strokeDashoffset = R * (1 - pct / 100);
      $('#fill').style.width = pct + '%'; pj.style.left = Math.min(94, Math.max(5, pct)) + '%'; pj.classList.toggle('corre', play && !ok);
      $$('.mk', pista).forEach(m => m.classList.toggle('off', pct >= +m.dataset.p));
      const e = $('#estado');
      if (ok) { if (!ganado) { e.classList.remove('ok'); void e.offsetWidth; } e.classList.add('ok'); e.textContent = '🏆 ¡NUEVO RÉCORD! Superaste los 1000 puntos'; }
      else { e.classList.remove('ok'); e.textContent = 'Faltan ' + fmt(1000 - pts, 0) + ' puntos · victoria en ' + fmt(Math.max(0, tw() - t), 0) + ' s'; }
      ganado = ok;
      const x = X(t), y = Y(v), mk = $('#mkt');
      $('#mkl').setAttribute('x1', x); $('#mkl').setAttribute('x2', x); $('#mkc').setAttribute('cx', x); $('#mkc').setAttribute('cy', y);
      mk.textContent = fmt(v, 1) + ' u/s'; mk.setAttribute('x', x + (t > 70 ? -10 : 10)); mk.setAttribute('y', y - 12); mk.setAttribute('text-anchor', t > 70 ? 'end' : 'start');
    }
    function paso(now) {
      if (!play) return; t = Math.min(100, t + (now - last) / 1000 * 8); last = now; rt.value = t; render();
      if (t >= 100 || (+rc.value * 25 + 10 * t >= 1000)) { play = false; estadoBtn(); render(); return; }
      requestAnimationFrame(paso);
    }
    function iniciar() { if (t >= 100 || 10 * t + 25 * rc.value >= 1000) { t = 0; rt.value = 0; } play = true; last = performance.now(); estadoBtn(); requestAnimationFrame(paso); }
    const parar = () => { play = false; estadoBtn(); };
    $('#bplay').addEventListener('click', () => { if (play) { parar(); render(); } else { iniciar(); logro('analista'); } });
    $('#breset').addEventListener('click', () => { parar(); t = 0; rt.value = 0; render(); });
    rt.addEventListener('input', () => { parar(); t = +rt.value; render(); logro('analista'); });
    rc.addEventListener('input', () => { render(); logro('analista'); });
    function mover(e) { const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 320; parar(); t = Math.max(0, Math.min(T, (x - x0) / (x1 - x0) * T)); rt.value = t; render(); }
    svg.addEventListener('pointermove', mover); svg.addEventListener('pointerdown', mover);
    render();
    const sim = $('#sim');
    once(sim, () => { $('#ln').style.strokeDashoffset = 0; if (!reduce) setTimeout(() => { if (!play && t === 0) iniciar(); }, 900); }, { threshold: .35 });
  })();

  /* ---------- 10. GALERÍA ---------- */
  (function () {
    const grid = $('#galeria-g'), figs = $$('figure', grid), lb = $('#lb'), im = $('img', lb), tx = $('p', lb);
    grid.classList.add('todo');
    $$('.filtros button').forEach(b => b.addEventListener('click', () => {
      $$('.filtros button').forEach(x => x.classList.toggle('on', x === b));
      const f = b.dataset.f; grid.classList.toggle('todo', f === 'todo');
      figs.forEach(fg => fg.classList.toggle('oculta', f !== 'todo' && fg.dataset.c !== f));
    }));
    let cur = 0, vistas = new Set();
    const lista = () => figs.filter(f => !f.classList.contains('oculta'));
    function show(n, anim = true) {
      const L = lista(); cur = (n + L.length) % L.length; const fg = L[cur], a = $('img', fg);
      const set = () => { im.src = a.currentSrc || a.src; im.alt = a.alt; tx.textContent = $('figcaption', fg).textContent + '  ·  ' + (cur + 1) + ' / ' + L.length; im.classList.remove('cambia'); };
      if (anim && lb.classList.contains('on')) { im.classList.add('cambia'); setTimeout(set, 180); } else set();
      vistas.add(a.getAttribute('src')); if (vistas.size >= figs.length) logro('fotografo');
    }
    function abre(fg) { const L = lista(); lb.classList.add('on'); lb._prev = document.activeElement; show(L.indexOf(fg), false); $('.x', lb).focus(); }
    const cierra = () => { lb.classList.remove('on'); if (lb._prev) lb._prev.focus(); };
    figs.forEach(fg => { fg.addEventListener('click', () => abre(fg)); fg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abre(fg); } }); });
    $('.x', lb).addEventListener('click', cierra); $('.pv', lb).addEventListener('click', e => { e.stopPropagation(); show(cur - 1); }); $('.nx', lb).addEventListener('click', e => { e.stopPropagation(); show(cur + 1); });
    lb.addEventListener('click', e => { if (e.target === lb) cierra(); });
    addEventListener('keydown', e => {
      if (lb.classList.contains('on')) { if (e.key === 'Escape') cierra(); if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1); }
      else if (e.key === 'Escape') $$('.modal.on').forEach(cerrar);
    });
    let sx = 0; lb.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
    lb.addEventListener('touchend', e => { const d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 50) show(cur + (d < 0 ? 1 : -1)); });
  })();

  /* ---------- 11. JUGAR (Unity WebGL) ---------- */
  (function () {
    const tapa = $('#tapa'), frame = $('#juego'), visor = $('#visor'), msg = $('#tapaMsg'), cab = $('#cabina');
    async function cargarUnity() {
      if (!frame.getAttribute('src')) {
        // abierto como archivo (file://) no se puede comprobar: se intenta cargar igual
        if (location.protocol !== 'file:') {
          try { const r = await fetch(frame.dataset.src, { method: 'HEAD', cache: 'no-store' }); if (!r.ok) throw 0; }
          catch (e) { tapa.classList.add('error'); msg.textContent = 'Falta el juego: copia index.html, Build/ y TemplateData/ dentro de la carpeta juego/ y abre el portal con un servidor local o GitHub Pages.'; return false; }
        }
        frame.setAttribute('src', frame.dataset.src);
      }
      tapa.classList.add('oculta'); cab.classList.add('jugando'); frame.focus(); logro('corredor'); return true;
    }
    tapa.addEventListener('click', cargarUnity);
    tapa.addEventListener('keydown', e => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); cargarUnity(); } });
    $('#pantallaCompleta').addEventListener('click', async () => {
      if (!(await cargarUnity())) return;
      (visor.requestFullscreen || visor.webkitRequestFullscreen || function () { }).call(visor);
      logro('cine'); setTimeout(() => frame.focus(), 300);
    });
    // que las flechas y la barra espaciadora no muevan la página mientras el cursor está sobre el juego
    let sobreUnity = false; visor.addEventListener('mouseenter', () => sobreUnity = true); visor.addEventListener('mouseleave', () => sobreUnity = false);
    addEventListener('keydown', e => { if (sobreUnity && ['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault(); }, { passive: false });
  })();

  /* ---------- 12. MÚSICA (Web Audio) ---------- */
  (function () {
    const b = $('#musica'); let ctx = null, timer = null, step = 0;
    const N = [196, 196, 293.66, 392, 349.23, 293.66, 261.63, 293.66, 196, 246.94, 293.66, 440, 392, 349.23, 293.66, 246.94];
    function nota(f, t, d, ty, v) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = ty; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + .02); }
    function secuencia() { if (!ctx) return; const now = ctx.currentTime + .03; for (let i = 0; i < 8; i++) { const x = N[(step + i) % N.length]; nota(x, now + i * .19, .15, 'sawtooth', .014); if (i % 2 === 0) nota(x / 2, now + i * .19, .28, 'triangle', .03); } step = (step + 8) % N.length; }
    function parar() { clearInterval(timer); timer = null; if (ctx) ctx.suspend(); b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'Activar música'); }
    b.addEventListener('click', async () => {
      try {
        if (timer) { parar(); return; }
        if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) throw 0; ctx = new A(); }
        await ctx.resume(); secuencia(); timer = setInterval(secuencia, 1520);
        b.setAttribute('aria-pressed', 'true'); b.setAttribute('aria-label', 'Silenciar música');
      } catch (e) { $('.t', b).textContent = 'Sin audio'; }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && timer) parar(); });
  })();
})();
