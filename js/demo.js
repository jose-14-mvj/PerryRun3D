/* ==========================================================
   Perry en acción · demostración AUTOMÁTICA (Canvas 2D, pseudo-3D)
   - Perry corre, salta las vallas y se desliza bajo las barras solo.
   - Funciona sin WebGL ni CSS animations: solo Canvas 2D + requestAnimationFrame.
   - Movimiento por tiempo real (dt): misma velocidad en PCs lentas y rápidas.
   - Calidad adaptable: si el equipo va lento baja detalles sola.
   - Se pausa fuera de pantalla y con la pestaña oculta (ahorra batería).
   ========================================================== */
(function () {
  'use strict';

  var stage = document.getElementById('drStage');
  var cv = document.getElementById('drCanvas');
  if (!stage || !cv) return;
  var ctx = cv.getContext && cv.getContext('2d', { alpha: false });
  if (!ctx) { stage.className += ' sin-canvas'; return; }

  var $ = function (id) { return document.getElementById(id); };
  var elCoins = $('drCoins'), elPass = $('drPass'), elSpeed = $('drSpeed'), elMsg = $('drMsg');
  var elKUp = $('drKUp'), elKDn = $('drKDn'), btnPause = $('drPause');

  /* "calm" = el usuario pidió menos movimiento: sin partículas ni líneas de velocidad */
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var calm = !!(mq && mq.matches);
  if (mq && mq.addEventListener) mq.addEventListener('change', function (e) { calm = e.matches; });

  /* ---------- sprite de Perry ---------- */
  var img = new Image(), ready = false, triedFallback = false, iw = 440, ih = 633;
  img.onload = function () { iw = img.naturalWidth; ih = img.naturalHeight; ready = true; if (!running) render(); };
  img.onerror = function () { if (!triedFallback) { triedFallback = true; img.src = 'assets/personaje.png'; } };
  img.src = 'assets/perry-demo.png';

  /* ---------- estado ---------- */
  var W = 0, H = 0, dpr = 1, u = 1, yH = 0, vpx = 0, px = 0, gy = 0;
  var quality = 0;                       // 0 completo · 1 sin partículas ni sombras suaves · 2 mínimo
  var DPR_CAP = [2, 1.5, 1];
  var running = false, paused = false, inView = true, raf = 0, last = 0, ema = 0.0167, slow = 0;
  var t = 0, scroll = 0, speedU = 11;    // speedU en "u/s" como el juego real (11 + 0,18/s)
  var obs = [], coins = [], parts = [];
  var distToNext = 0, lastTypes = [];
  var act = null;                         // acción actual { type, t, dur }
  var passed = 0, streak = 0, coinTotal = 0, phase = 0, prevSin = 0, trailT = 0;
  var bg = {}, msgTimer = 0, kTimer1 = 0, kTimer2 = 0;
  var JUMP_DUR = 0.78, SLIDE_DUR = 0.85, JUMP_H = 100, PERRY_H = 126;

  /* ---------- utilidades ---------- */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var r = Math.imul(seed ^ seed >>> 15, 1 | seed); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr)); var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return { c: c, g: g, w: w, h: h }; }
  function smooth(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function emit(name, detail) {
    var ev; try { ev = new CustomEvent(name, { detail: detail }); } catch (e) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent(name, false, false, detail); }
    window.dispatchEvent(ev);
  }
  function box(g, x, y, w, h, fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); }

  /* ---------- tamaño y fondos en caché ---------- */
  function resize() {
    /* clientWidth/Height = tamaño de layout (no lo afectan las animaciones de entrada ni la inclinación 3D) */
    var w = stage.clientWidth, h = stage.clientHeight;
    if (w < 40 || h < 40) return;
    var d = Math.min(window.devicePixelRatio || 1, DPR_CAP[quality]);
    if (w === W && h === H && d === dpr) return;
    W = w; H = h; dpr = d; u = H / 300;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    yH = H * 0.5; vpx = W * 0.56; px = W * (W < 520 ? 0.24 : 0.22); gy = H * 0.85;
    buildBackgrounds();
    if (!running) render();
  }

  function buildBackgrounds() {
    var g, i, s;
    /* cielo + sol */
    s = bg.sky = mkCanvas(W, yH + 2); g = s.g;
    var gr = g.createLinearGradient(0, 0, 0, yH);
    gr.addColorStop(0, '#0b2238'); gr.addColorStop(0.45, '#2c6a93'); gr.addColorStop(0.8, '#f0a853'); gr.addColorStop(1, '#ffcf7a');
    g.fillStyle = gr; g.fillRect(0, 0, W, yH + 2);
    var sx = W * 0.72, sy = yH - 26 * u, sg = g.createRadialGradient(sx, sy, 0, sx, sy, 150 * u);
    sg.addColorStop(0, 'rgba(255,244,200,.95)'); sg.addColorStop(0.15, 'rgba(255,215,130,.65)'); sg.addColorStop(1, 'rgba(255,190,90,0)');
    g.fillStyle = sg; g.fillRect(0, 0, W, yH + 2);

    /* montañas (se repiten sin costura: frecuencias enteras) */
    var tw = Math.round(Math.max(W * 1.6, 900));
    s = bg.mount = mkCanvas(tw, 150 * u); g = s.g;
    var mg = g.createLinearGradient(0, 0, 0, s.h); mg.addColorStop(0, '#3d6b8c'); mg.addColorStop(1, '#16344c');
    g.fillStyle = mg; g.beginPath(); g.moveTo(0, s.h);
    for (i = 0; i <= tw; i += 6) {
      var a = i / tw * Math.PI * 2;
      var y = s.h - (46 * u + 26 * u * Math.sin(a * 2 + 1) + 18 * u * Math.sin(a * 5 + 2) + 9 * u * Math.sin(a * 11));
      g.lineTo(i, y);
    }
    g.lineTo(tw, s.h); g.closePath(); g.fill();
    /* nieve en las cumbres */
    g.fillStyle = 'rgba(255,255,255,.22)';
    for (i = 0; i <= tw; i += 6) {
      var a2 = i / tw * Math.PI * 2, yy = s.h - (46 * u + 26 * u * Math.sin(a2 * 2 + 1) + 18 * u * Math.sin(a2 * 5 + 2) + 9 * u * Math.sin(a2 * 11));
      if (yy < s.h * 0.34) g.fillRect(i, yy, 6, 7 * u);
    }

    /* ciudad (La Paz): edificios con ventanas */
    var rnd = rng(7);
    s = bg.city = mkCanvas(tw, 150 * u); g = s.g;
    var x = 0;
    while (x < tw) {
      var bw = (26 + rnd() * 44) * u, bh = (36 + rnd() * 96) * u, tone = Math.floor(18 + rnd() * 20);
      for (var rep = 0; rep < 2; rep++) {
        var bx = x - rep * tw; if (bx + bw < 0 || bx > tw) continue;
        g.fillStyle = 'rgb(' + tone + ',' + (tone + 22) + ',' + (tone + 40) + ')';
        g.fillRect(bx, s.h - bh, bw, bh);
        g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(bx, s.h - bh, bw, 3 * u);
        var rnd2 = rng(Math.floor(x) + 3);
        for (var wy = s.h - bh + 8 * u; wy < s.h - 8 * u; wy += 12 * u) for (var wx = bx + 6 * u; wx < bx + bw - 8 * u; wx += 11 * u) {
          if (rnd2() > 0.58) { g.fillStyle = rnd2() > 0.3 ? 'rgba(255,214,120,.85)' : 'rgba(255,160,90,.8)'; g.fillRect(wx, wy, 5 * u, 6 * u); }
        }
      }
      x += bw + rnd() * 6 * u;
    }

    /* suelo: asfalto + vereda */
    s = bg.ground = mkCanvas(W, H - yH + 1); g = s.g;
    var ag = g.createLinearGradient(0, 0, 0, s.h);
    ag.addColorStop(0, '#2a3b46'); ag.addColorStop(0.16, '#1b2a34'); ag.addColorStop(1, '#0b1820');
    g.fillStyle = ag; g.fillRect(0, 0, W, s.h);
    var sg2 = g.createLinearGradient(0, 0, 0, 22 * u); sg2.addColorStop(0, '#6d7d86'); sg2.addColorStop(1, '#3e515c');
    g.fillStyle = sg2; g.fillRect(0, 0, W, 22 * u);
    g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(0, 22 * u, W, 2);
    g.fillStyle = '#ffb347'; g.fillRect(0, 0, W, 2);

    /* viñeta */
    s = bg.vig = mkCanvas(W, H); g = s.g;
    var vg = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,8,14,.55)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }

  /* ---------- HUD (DOM, texto nítido en cualquier pantalla) ---------- */
  var hud = { c: -1, p: -1, s: '' };
  function updateHud() {
    if (hud.c !== coinTotal) { hud.c = coinTotal; if (elCoins) elCoins.textContent = coinTotal; }
    if (hud.p !== passed) { hud.p = passed; if (elPass) elPass.textContent = passed; }
    var sp = speedU.toFixed(1).replace('.', ',');
    if (hud.s !== sp) { hud.s = sp; if (elSpeed) elSpeed.textContent = sp; }
  }
  function say(text, cls) {
    if (!elMsg) return;
    elMsg.textContent = text; elMsg.className = 'dr-msg on ' + cls;
    clearTimeout(msgTimer); msgTimer = setTimeout(function () { elMsg.className = 'dr-msg'; }, 800);
  }
  function lightKey(type) {
    var el = type === 'jump' ? elKUp : elKDn; if (!el) return;
    el.className = 'on';
    if (type === 'jump') { clearTimeout(kTimer1); kTimer1 = setTimeout(function () { el.className = ''; }, 650); }
    else { clearTimeout(kTimer2); kTimer2 = setTimeout(function () { el.className = ''; }, 800); }
  }

  /* ---------- mundo ---------- */
  function resetWorld() {
    obs.length = 0; coins.length = 0; parts.length = 0; act = null; lastTypes = [];
    passed = 0; streak = 0; coinTotal = 0; speedU = 11; t = 0; distToNext = 140 * u;
    spawnPlaced = false;
  }
  var spawnPlaced = false;
  function spawn() {
    var type = Math.random() < 0.5 ? 'valla' : 'barra';
    if (lastTypes.length >= 2 && lastTypes[0] === type && lastTypes[1] === type) type = type === 'valla' ? 'barra' : 'valla';
    lastTypes.unshift(type); if (lastTypes.length > 2) lastTypes.pop();
    var w = type === 'valla' ? 84 * u : 92 * u, x = W + 70 * u;
    obs.push({ type: type, x: x, w: w, handled: false, counted: false });
    var v = speedU * 30 * u, gapT = 1.5 + Math.random() * 0.9, gap = v * gapT;
    distToNext = gap;
    /* tres monedas a mitad de camino hasta el siguiente obstáculo */
    var cx = x + w / 2 + gap * 0.5;
    for (var i = 0; i < 3; i++) coins.push({ x: cx + (i - 1) * 34 * u, got: false, ph: Math.random() * 6 });
  }

  function puff(x, y, n, big) {
    if (quality > 0 || calm) return;
    for (var i = 0; i < n && parts.length < 28; i++) parts.push({ x: x + (Math.random() - 0.5) * 8 * u, y: y, vx: -(30 + Math.random() * 50) * u, vy: -(10 + Math.random() * 30) * u, l: 0, max: 0.45 + Math.random() * 0.3, r: (big ? 5 : 3.2) * u });
  }
  function spark(x, y) {
    if (quality > 0 || calm) return;
    for (var i = 0; i < 6 && parts.length < 28; i++) { var a = Math.random() * 6.28; parts.push({ x: x, y: y, vx: Math.cos(a) * 70 * u, vy: Math.sin(a) * 70 * u - 20 * u, l: 0, max: 0.4, r: 2.4 * u, gold: true }); }
  }

  function update(dt) {
    t += dt;
    if (speedU < 22) speedU += 0.18 * dt;
    var v = speedU * 30 * u;
    scroll += v * dt;

    /* aparición de obstáculos */
    distToNext -= v * dt;
    if (distToNext <= 0) spawn();

    var i, o, c;
    for (i = obs.length - 1; i >= 0; i--) {
      o = obs[i]; o.x -= v * dt;
      if (o.x + o.w < -40 * u) { obs.splice(i, 1); continue; }
      /* piloto automático: salta / se desliza justo a tiempo */
      if (!o.handled && !act) {
        var tc = (o.x + o.w / 2 - px) / v;
        var dur = o.type === 'valla' ? JUMP_DUR : SLIDE_DUR;
        if (tc <= dur / 2 + 0.02 && tc > -0.2) {
          o.handled = true;
          act = { type: o.type === 'valla' ? 'jump' : 'slide', t: 0, dur: dur };
          lightKey(act.type);
          say(act.type === 'jump' ? '¡Salta! ↑' : '¡Deslízate! ↓', 'bien');
          emit('perry:demo', { action: act.type, streak: streak });
          if (act.type === 'jump') puff(px, gy, 3, true);
        }
      }
      if (!o.counted && o.x + o.w < px - 36 * u) {
        o.counted = true; passed++; streak++;
        emit('perry:demo', { action: 'pass', streak: streak });
      }
    }
    for (i = coins.length - 1; i >= 0; i--) {
      c = coins[i]; c.x -= v * dt;
      if (c.x < -40 * u) { coins.splice(i, 1); continue; }
      if (!c.got && Math.abs(c.x - px) < 30 * u) { c.got = true; coinTotal++; spark(c.x, gy - 58 * u); }
    }

    /* acción actual */
    if (act) { act.t += dt; if (act.t >= act.dur) { if (act.type === 'jump') puff(px, gy, 4, true); act = null; } }

    /* paso de carrera */
    phase += dt * (7 + speedU * 0.32);
    var sn = Math.sin(phase);
    if (!act && ((prevSin < 0 && sn >= 0) || (prevSin > 0 && sn <= 0))) puff(px - 18 * u, gy, 1, false);
    prevSin = sn;
    if (act && act.type === 'slide') { trailT -= dt; if (trailT <= 0) { trailT = 0.06; puff(px - 24 * u, gy, 1, true); } }

    /* partículas */
    for (i = parts.length - 1; i >= 0; i--) {
      c = parts[i]; c.l += dt; if (c.l >= c.max) { parts.splice(i, 1); continue; }
      c.x += c.vx * dt; c.y += c.vy * dt; if (!c.gold) c.vy += 10 * u * dt; else c.vy += 160 * u * dt;
    }
    updateHud();
  }

  /* ---------- dibujo ---------- */
  function drawTile(tile, off, y, parallax) {
    var tw = tile.w, o = ((scroll * parallax) % tw + tw) % tw, x = -o;
    while (x < W) { ctx.drawImage(tile.c, x, y, tw, tile.h); x += tw; }
  }

  function drawBackdrop() {
    ctx.drawImage(bg.sky.c, 0, 0, W, yH + 2);
    /* nubes suaves */
    if (quality < 2) {
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      for (var i = 0; i < 3; i++) {
        var cx = ((i * 0.37 * W + W - scroll * (0.012 + i * 0.006)) % (W + 240 * u)) - 120 * u, cy = (34 + i * 26) * u;
        ctx.beginPath(); ctx.ellipse(cx, cy, 60 * u, 11 * u, 0, 0, 6.283); ctx.ellipse(cx + 34 * u, cy - 7 * u, 40 * u, 10 * u, 0, 0, 6.283); ctx.fill();
      }
    }
    drawTile(bg.mount, 0, yH - bg.mount.h + 2 * u, 0.05);
    /* teleférico */
    if (quality < 2) {
      var y0 = yH - 128 * u, y1 = yH - 168 * u;
      ctx.strokeStyle = 'rgba(220,235,240,.4)'; ctx.lineWidth = Math.max(1, u); ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y1); ctx.stroke();
      for (var k = 0; k < 2; k++) {
        var f = ((t * 0.035 + k * 0.5) % 1), cxx = f * W, cyy = y0 + (y1 - y0) * f;
        ctx.strokeStyle = 'rgba(220,235,240,.6)'; ctx.beginPath(); ctx.moveTo(cxx, cyy); ctx.lineTo(cxx, cyy + 9 * u); ctx.stroke();
        box(ctx, cxx - 8 * u, cyy + 9 * u, 16 * u, 11 * u, k ? '#ff5468' : '#ffd23f');
        box(ctx, cxx - 6 * u, cyy + 11 * u, 12 * u, 4 * u, 'rgba(255,255,255,.75)');
      }
    }
    drawTile(bg.city, 0, yH - bg.city.h + 1, 0.2);
    ctx.drawImage(bg.ground.c, 0, yH, W, H - yH + 1);
  }

  /* líneas del suelo con perspectiva: las cercanas se mueven más rápido */
  function drawFloor() {
    var gh = H - yH, i;
    /* juntas del pavimento: convergen hacia el punto de fuga */
    var gap = 150 * u, span = W * 3, n = Math.ceil(span / gap) + 1;
    var off = scroll % gap;
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = Math.max(1, u * 1.4); ctx.beginPath();
    for (i = 0; i < n; i++) {
      var xb = -W + i * gap - off;
      if (xb < -gap || xb > W + gap) continue;
      ctx.moveTo(xb, H); ctx.lineTo(vpx + (xb - vpx) * 0.1, yH + 24 * u);
    }
    ctx.stroke();
    /* líneas de carril discontinuas */
    var lanes = [0.56, 0.86];
    for (i = 0; i < 2; i++) {
      var d = lanes[i], y = yH + gh * d, sc = 0.45 + d * 0.9, dash = 58 * u * sc, per = dash * 2.1, o2 = (scroll * sc) % per;
      ctx.strokeStyle = 'rgba(255,236,170,' + (0.32 + d * 0.2).toFixed(2) + ')'; ctx.lineWidth = (1.6 + d * 3.2) * u;
      ctx.beginPath();
      for (var x = -per + (-o2); x < W + per; x += per) { ctx.moveTo(x, y); ctx.lineTo(x + dash, y); }
      ctx.stroke();
    }
    /* borde vereda (marcas de bordillo) */
    var cb = 24 * u, bp = 46 * u, bo = (scroll * 0.45) % bp;
    ctx.fillStyle = 'rgba(255,157,31,.5)';
    for (var xx = -bp - bo; xx < W + bp; xx += bp) ctx.fillRect(xx, yH + cb - 1, bp * 0.5, Math.max(2, 3 * u));
  }

  function shadow(cx, cy, w, h, a) {
    if (quality >= 1) { ctx.fillStyle = 'rgba(0,0,0,' + (a * 0.8).toFixed(2) + ')'; ctx.fillRect(cx - w / 2, cy - h / 2, w, h); return; }
    ctx.fillStyle = 'rgba(0,0,0,' + a.toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, 6.283); ctx.fill();
  }

  /* cara superior y lateral con desplazamiento hacia el punto de fuga = efecto 3D */
  function box3d(x, y, w, h, front, topC, sideC, dep, stripes) {
    var lean = (vpx - (x + w / 2)) / W, sx = lean * 26 * u, sy = -dep;
    /* cara lateral (la que mira hacia el centro) */
    ctx.fillStyle = sideC; ctx.beginPath();
    if (sx > 0) { ctx.moveTo(x + w, y); ctx.lineTo(x + w + sx, y + sy); ctx.lineTo(x + w + sx, y + h + sy); ctx.lineTo(x + w, y + h); }
    else { ctx.moveTo(x, y); ctx.lineTo(x + sx, y + sy); ctx.lineTo(x + sx, y + h + sy); ctx.lineTo(x, y + h); }
    ctx.closePath(); ctx.fill();
    /* cara superior */
    ctx.fillStyle = topC; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sx, y + sy); ctx.lineTo(x + w + sx, y + sy); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
    /* frente */
    ctx.fillStyle = front; ctx.fillRect(x, y, w, h);
    if (stripes) {
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.62)';
      var sw = 11 * u;
      for (var s = -h; s < w + h; s += sw * 2) { ctx.beginPath(); ctx.moveTo(x + s, y + h); ctx.lineTo(x + s + sw, y + h); ctx.lineTo(x + s + sw + h, y); ctx.lineTo(x + s + h, y); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(1.5, 2.4 * u); ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  function drawValla(o) {
    var h = 42 * u;
    shadow(o.x + o.w / 2, gy + 3 * u, o.w * 1.05, 9 * u, 0.4);
    box3d(o.x, gy - h, o.w, h, '#ff9d1f', '#ffc766', '#c26d00', 14 * u, true);
  }
  function drawBarra(o) {
    var bw = o.w, bh = 26 * u, by = gy - 106 * u, post = 9 * u;
    shadow(o.x + bw / 2, gy + 3 * u, bw * 1.05, 9 * u, 0.4);
    box3d(o.x + 2 * u, by + bh, post, 106 * u - bh, '#cfd9dd', '#f1f6f7', '#8a989e', 12 * u, false);
    box3d(o.x + bw - post - 2 * u, by + bh, post, 106 * u - bh, '#cfd9dd', '#f1f6f7', '#8a989e', 12 * u, false);
    box3d(o.x, by, bw, bh, '#2f80d6', '#6fb1ff', '#1a5aa3', 14 * u, true);
  }

  function drawCoin(c) {
    var cy = gy - 56 * u + Math.sin(t * 3 + c.ph) * 3 * u, sx = Math.abs(Math.cos(t * 4 + c.ph)), r = 10 * u;
    shadow(c.x, gy + 2 * u, r * 1.6, 4 * u, 0.25);
    ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.ellipse(c.x, cy, Math.max(1.5, r * sx), r, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(c.x, cy, Math.max(1, (r - 2.2 * u) * sx), r - 2.2 * u, 0, 0, 6.283); ctx.fill();
    if (sx > 0.5) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(c.x - 1 * u, cy - 5 * u, 2 * u, 8 * u); }
  }

  function drawPerry() {
    var sc = PERRY_H * u / ih, dw = iw * sc, dh = ih * sc;
    var sn = Math.sin(phase), lift = 0, tilt = 0, sy = 1, sx = 1, legA = 0, legB = 0, liftA = 0, liftB = 0, bob = 0;
    if (!act) {
      bob = Math.abs(sn) * 5 * u; lift = bob; tilt = sn * 0.045;
      legA = sn * 0.42; legB = -sn * 0.42; liftA = Math.max(0, sn) * 12 * u; liftB = Math.max(0, -sn) * 12 * u;
      sy = 1 - 0.03 * (1 - Math.abs(sn)); sx = 1 + 0.02 * (1 - Math.abs(sn));
    } else if (act.type === 'jump') {
      var p = act.t / act.dur;
      lift = 4 * JUMP_H * u * p * (1 - p);
      var ant = p < 0.12 ? (0.12 - p) / 0.12 : 0, lan = p > 0.88 ? (p - 0.88) / 0.12 : 0;
      sy = 1 + 0.08 * Math.sin(p * Math.PI) - 0.1 * (ant + lan); sx = 1 - 0.04 * Math.sin(p * Math.PI) + 0.07 * (ant + lan);
      tilt = -0.14 * Math.sin(p * Math.PI * 2) * (p < 0.5 ? 1 : 1);
      legA = -0.55; legB = -0.25; liftA = 16 * u; liftB = 10 * u;
    } else {
      var q = act.t / act.dur, pose = smooth(Math.min(1, q / 0.18, (1 - q) / 0.22));
      sy = 1 - 0.5 * pose; sx = 1 + 0.18 * pose; tilt = -0.2 * pose;
      legA = 0.5 * pose; legB = 0.35 * pose; liftA = 3 * u * pose; liftB = 0;
      lift = 0;
    }
    /* sombra según altura */
    var hgt = lift / (JUMP_H * u), sw = (act && act.type === 'slide' ? 62 : 46) * u * (1 - 0.35 * Math.min(1, hgt));
    shadow(px, gy + 3 * u, sw, 9 * u * (1 - 0.3 * hgt), 0.45 * (1 - 0.5 * Math.min(1, hgt)));
    if (!ready) return;

    ctx.save();
    ctx.translate(px, gy - lift); ctx.rotate(tilt); ctx.scale(sx, sy);
    var x0 = -dw / 2, y0 = -dh, cutY = ih * 0.79, legTop = ih * 0.74, hipY = ih * 0.78;
    var pivots = [[iw * 0.38, 0, iw * 0.53, legA, liftA], [iw * 0.62, iw * 0.47, iw * 0.53, legB, liftB]];
    for (var i = 0; i < 2; i++) {
      var pv = pivots[i], pX = x0 + pv[0] * sc, pY = y0 + hipY * sc;
      ctx.save(); ctx.translate(pX, pY - pv[4]); ctx.rotate(pv[3]);
      ctx.drawImage(img, pv[1], legTop, pv[2], ih - legTop, x0 + pv[1] * sc - pX, y0 + legTop * sc - pY, pv[2] * sc, (ih - legTop) * sc);
      ctx.restore();
    }
    ctx.drawImage(img, 0, 0, iw, cutY, x0, y0, dw, cutY * sc);
    ctx.restore();
  }

  function drawFx() {
    var i, c;
    for (i = 0; i < parts.length; i++) {
      c = parts[i]; var a = 1 - c.l / c.max;
      ctx.fillStyle = c.gold ? 'rgba(255,214,70,' + a.toFixed(2) + ')' : 'rgba(200,215,220,' + (a * 0.35).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r * (c.gold ? a : 1.2 - a * 0.4), 0, 6.283); ctx.fill();
    }
    if (quality === 0 && !calm) {
      ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = Math.max(1, u * 1.5); ctx.beginPath();
      for (i = 0; i < 7; i++) {
        var x = W - ((i * 233 + scroll * 1.7) % (W + 200 * u)) + 40 * u, y = yH + 30 * u + ((i * 67) % 100) * u * 1.15, len = (40 + (i * 29) % 50) * u;
        ctx.moveTo(x, y); ctx.lineTo(x + len, y);
      }
      ctx.stroke();
    }
  }

  function render() {
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackdrop();
    drawFloor();
    var i;
    for (i = 0; i < coins.length; i++) if (!coins[i].got) drawCoin(coins[i]);
    for (i = 0; i < obs.length; i++) if (obs[i].type === 'valla') drawValla(obs[i]);
    drawPerry();
    for (i = 0; i < obs.length; i++) if (obs[i].type === 'barra') drawBarra(obs[i]);
    drawFx();
    if (quality < 2) ctx.drawImage(bg.vig.c, 0, 0, W, H);
  }

  /* ---------- bucle ---------- */
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!last) { last = ts; return; }
    var raw = (ts - last) / 1000; last = ts;
    var dt = raw > 0.05 ? 0.05 : raw;
    /* calidad adaptable: si el equipo va lento, baja detalles (nunca vuelve a subir para no parpadear) */
    ema = ema * 0.94 + Math.min(raw, 0.1) * 0.06;
    if (ema > 0.034 && quality < 2) { if (++slow > 80) { slow = 0; ema = 0.02; quality++; resize(); } } else if (slow > 0) slow--;
    update(dt); render();
  }
  function start() { if (running || paused || !inView || document.hidden) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  function setPaused(p) {
    paused = p;
    if (btnPause) { btnPause.textContent = p ? '▶ Reanudar' : '⏸ Pausar'; btnPause.setAttribute('aria-pressed', p ? 'true' : 'false'); }
    if (p) stop(); else start();
  }
  if (btnPause) btnPause.addEventListener('click', function () { setPaused(!paused); });

  /* pausa fuera de pantalla / pestaña oculta */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { inView = e[0].isIntersecting; if (inView) start(); else stop(); }, { threshold: 0.05 }).observe(stage);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });

  /* tamaño responsivo */
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });

  /* inclinación 3D del escenario con el mouse (solo PC con puntero fino) */
  var tiltEl = stage.parentNode;
  if (window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches && !calm) {
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      stage.style.transform = 'perspective(1100px) rotateY(' + (x * 3.2).toFixed(2) + 'deg) rotateX(' + (-y * 2.4).toFixed(2) + 'deg)';
    });
    stage.addEventListener('pointerleave', function () { stage.style.transform = ''; });
  }

  resetWorld(); resize(); render(); start();
  /* por si las fuentes/diseño cambian el tamaño tras cargar */
  window.addEventListener('load', function () { resize(); });
})();
