/* Eins MGU demo — animated mock of the custom cluster centre panel and the custom HUD.
   Original artwork, no manufacturer marks. Drop a <div class="eins-demo" data-view="cluster|hud|both"></div>
   anywhere and include this script; it draws SVG and runs a looping "pull" through the data.
   Values are simulated for the demo. */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    var t = el('text', Object.assign({ x: x, y: y }, attrs || {}), parent);
    t.textContent = s;
    return t;
  }
  function polar(cx, cy, r, deg) {
    var a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  function arcPath(cx, cy, r, a0, a1) {
    var p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
    var large = (a1 - a0) > 180 ? 1 : 0;
    return 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  var FONT_D = "'Barlow Condensed','Arial Narrow',Arial,sans-serif";
  var FONT_M = "'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace";

  /* ---------- simulated drive: a 12 s loop (idle → pull → shift → pull → lift) ---------- */
  function sample(t) {
    var T = 12, s = ((t % T) + T) % T;
    var rpm, thr, gear;
    if (s < 1.6)      { rpm = lerp(1900, 2600, ease(s / 1.6)); thr = lerp(.10, .35, s / 1.6); gear = 2; }
    else if (s < 4.6) { var u = (s - 1.6) / 3; rpm = lerp(2600, 7200, u * u * (3 - 2 * u)); thr = 1; gear = 2; }
    else if (s < 5.0) { var v = (s - 4.6) / .4; rpm = lerp(7200, 5100, ease(v)); thr = lerp(1, .2, v); gear = 3; }
    else if (s < 8.2) { var w = (s - 5.0) / 3.2; rpm = lerp(5100, 7150, w * w * (3 - 2 * w)); thr = 1; gear = 3; }
    else if (s < 9.0) { var x = (s - 8.2) / .8; rpm = lerp(7150, 3400, ease(x)); thr = lerp(1, 0, x); gear = 4; }
    else              { var y = (s - 9.0) / 3; rpm = lerp(3400, 1900, ease(y)); thr = lerp(0, .1, y); gear = y < .6 ? 4 : 2; }

    /* boost follows throttle with spool lag; vacuum when lifted */
    var target = thr > .5 ? 22.5 : (thr > .15 ? 4 : -9.5);
    var boostNow = sample._b === undefined ? 0 : sample._b;
    var dt = sample._t === undefined ? 0 : clamp(s - sample._t, 0, .1);
    if (s < sample._t) boostNow = -9.5;               /* loop restart */
    var rate = target > boostNow ? (rpm > 3500 ? 11 : 5) : 32;
    boostNow += clamp(target - boostNow, -rate * dt, rate * dt);
    sample._b = boostNow; sample._t = s;

    var wot = thr > .5;
    var speed = 28 + (gear === 2 ? (rpm - 1900) / 5300 * 36 : gear === 3 ? 48 + (rpm - 5100) / 2050 * 38 : 86 + (3400 - rpm) / 3400 * 2);
    speed = clamp(speed, 26, 94);
    var oilT = 195 + 14 * clamp((s - 1.2) / 7.5, 0, 1);
    var oilP = 38 + rpm / 7200 * 48;
    var iat = 71 + 15 * clamp(boostNow / 22.5, 0, 1);
    var hpfp = wot ? 2950 + Math.sin(s * 23) * 120 : 1500 + rpm / 7200 * 500;
    var lam = wot ? (0.78 + Math.sin(s * 9) * .012) : 1.0 + Math.sin(s * 2) * .01;
    var lamT = wot ? 0.78 : 1.0;
    return { rpm: rpm, thr: thr, gear: gear, boost: boostNow, target: wot ? 22.5 : 0, speed: speed,
             oilT: oilT, oilP: oilP, iat: iat, hpfp: hpfp, lam1: lam, lam2: lam - .008, lamT: lamT, eth: 52 };
  }
  var S0 = sample(0);

  /* ---------- cluster: stock-style dials either side, custom engine panel in the centre ---------- */
  function buildCluster(root) {
    var svg = el('svg', { viewBox: '0 0 1200 440', role: 'img', 'aria-label': 'Custom cluster demo: boost, oil, IAT, HPFP and ethanol in the centre of the gauge cluster' }, root);
    var defs = el('defs', {}, svg);
    var g1 = el('linearGradient', { id: 'ed-screen', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#17181c' }, g1); el('stop', { offset: 1, 'stop-color': '#0a0a0c' }, g1);
    var g2 = el('linearGradient', { id: 'ed-bar', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el('stop', { offset: 0, 'stop-color': '#f2c300' }, g2); el('stop', { offset: 1, 'stop-color': '#e2231a' }, g2);
    var glow = el('filter', { id: 'ed-glow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
    el('feGaussianBlur', { stdDeviation: 3, result: 'b' }, glow);
    var m = el('feMerge', {}, glow); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);

    /* bezel + screen */
    el('path', { d: 'M40 60 Q40 20 80 20 H1120 Q1160 20 1160 60 V380 Q1160 420 1120 420 H80 Q40 420 40 380 Z', fill: '#050506' }, svg);
    el('path', { d: 'M60 76 Q60 40 96 40 H1104 Q1140 40 1140 76 V364 Q1140 400 1104 400 H96 Q60 400 60 364 Z', fill: 'url(#ed-screen)', stroke: '#2a2a2e' }, svg);

    function dial(cx, label, unit, max, major, redFrom) {
      var g = el('g', {}, svg), CY = 196;
      var r = 120;
      el('path', { d: arcPath(cx, CY, r, -130, 130), fill: 'none', stroke: '#2e2f35', 'stroke-width': 14, 'stroke-linecap': 'round' }, g);
      if (redFrom) el('path', { d: arcPath(cx, CY, r, lerp(-130, 130, redFrom / max), 130), fill: 'none', stroke: '#e2231a', 'stroke-width': 14, 'stroke-linecap': 'round', opacity: .85 }, g);
      for (var i = 0; i <= max; i += major) {
        var a = lerp(-130, 130, i / max), p = polar(cx, CY, r - 22, a), q = polar(cx, CY, r - 10, a);
        el('line', { x1: p[0], y1: p[1], x2: q[0], y2: q[1], stroke: '#8d8f96', 'stroke-width': 2 }, g);
        var tp = polar(cx, CY, r - 44, a);
        txt(g, tp[0], tp[1] + 7, String(i), { fill: '#c9cacf', 'font-family': FONT_D, 'font-size': 22, 'font-weight': 700, 'text-anchor': 'middle' });
      }
      var fill = el('path', { d: arcPath(cx, CY, r, -130, -129.9), fill: 'none', stroke: '#f2f2f0', 'stroke-width': 14, 'stroke-linecap': 'round' }, g);
      var needle = el('line', { x1: cx, y1: CY, x2: cx, y2: CY - r + 6, stroke: '#e2231a', 'stroke-width': 4, 'stroke-linecap': 'round', transform: 'rotate(-130 ' + cx + ' ' + CY + ')' }, g);
      el('circle', { cx: cx, cy: CY, r: 9, fill: '#1b1b1e', stroke: '#8d8f96', 'stroke-width': 2 }, g);
      var val = txt(g, cx, 322, '0', { fill: '#f2f2f0', 'font-family': FONT_D, 'font-size': 50, 'font-weight': 800, 'text-anchor': 'middle' });
      txt(g, cx, 346, unit, { fill: '#a3a39e', 'font-family': FONT_M, 'font-size': 13, 'letter-spacing': 2, 'text-anchor': 'middle' });
      txt(g, cx, 386, label, { fill: '#6f6f6b', 'font-family': FONT_M, 'font-size': 11, 'letter-spacing': 3, 'text-anchor': 'middle' });
      return { fill: fill, needle: needle, val: val, cx: cx, r: r, max: max };
    }
    var tach = dial(230, 'ENGINE SPEED · x1000', 'RPM', 8, 1, 7.2);
    var spd = dial(970, 'ROAD SPEED', 'MPH', 160, 20, 0);

    /* centre panel: engine data only (no speedo/tach repeat) */
    var cx0 = 392, w = 416;
    el('rect', { x: cx0, y: 56, width: w, height: 328, rx: 10, fill: '#0e0e10', stroke: '#2a2a2e' }, svg);
    txt(svg, cx0 + 18, 86, 'BOOST', { fill: '#a3a39e', 'font-family': FONT_M, 'font-size': 12, 'letter-spacing': 3 });
    txt(svg, cx0 + w - 18, 86, 'PSI', { fill: '#6f6f6b', 'font-family': FONT_M, 'font-size': 12, 'letter-spacing': 3, 'text-anchor': 'end' });
    var boostV = txt(svg, cx0 + w / 2, 170, '0.0', { fill: '#f2f2f0', 'font-family': FONT_D, 'font-size': 104, 'font-weight': 800, 'text-anchor': 'middle', filter: 'url(#ed-glow)' });
    /* bar: -10 … 25 psi */
    el('rect', { x: cx0 + 18, y: 188, width: w - 36, height: 10, rx: 5, fill: '#1f1f23' }, svg);
    var zeroX = cx0 + 18 + (w - 36) * (10 / 35);
    el('line', { x1: zeroX, y1: 184, x2: zeroX, y2: 202, stroke: '#6f6f6b', 'stroke-width': 2 }, svg);
    var boostBar = el('rect', { x: zeroX, y: 188, width: 0, height: 10, rx: 5, fill: 'url(#ed-bar)' }, svg);
    var vacBar = el('rect', { x: zeroX, y: 188, width: 0, height: 10, rx: 5, fill: '#4a7aa8' }, svg);

    var tiles = [
      ['OIL TEMP', '°F'], ['OIL PRES', 'PSI'], ['IAT', '°F'],
      ['HPFP', 'PSI'], ['ETHANOL', '%'], ['LAMBDA', 'λ']
    ];
    var tv = [];
    tiles.forEach(function (t, i) {
      var col = i % 3, row = Math.floor(i / 3);
      var x = cx0 + 18 + col * ((w - 36) / 3), y = 222 + row * 78;
      el('rect', { x: x + 3, y: y, width: (w - 36) / 3 - 6, height: 70, rx: 6, fill: '#141416', stroke: '#222226' }, svg);
      txt(svg, x + 12, y + 20, t[0], { fill: '#a3a39e', 'font-family': FONT_M, 'font-size': 10.5, 'letter-spacing': 2.2 });
      tv.push(txt(svg, x + 12, y + 56, '—', { fill: '#f2f2f0', 'font-family': FONT_D, 'font-size': 36, 'font-weight': 800 }));
      txt(svg, x + (w - 36) / 3 - 12, y + 56, t[1], { fill: '#6f6f6b', 'font-family': FONT_M, 'font-size': 10, 'letter-spacing': 1.5, 'text-anchor': 'end' });
    });

    function setDial(d, v) {
      var a = lerp(-130, 130, clamp(v / d.max, 0, 1));
      d.needle.setAttribute('transform', 'rotate(' + a.toFixed(2) + ' ' + d.cx + ' 196)');
      d.fill.setAttribute('d', arcPath(d.cx, 196, d.r, -130, Math.max(-129.9, a)));
    }
    return function (s) {
      setDial(tach, s.rpm / 1000); tach.val.textContent = Math.round(s.rpm / 10) * 10;
      setDial(spd, s.speed); spd.val.textContent = Math.round(s.speed);
      boostV.textContent = (s.boost >= 0 ? s.boost : -s.boost).toFixed(1);
      boostV.setAttribute('fill', s.boost < 0 ? '#9fb7cf' : '#f2f2f0');
      var full = (w - 36);
      if (s.boost >= 0) { boostBar.setAttribute('width', (full * s.boost / 35).toFixed(1)); vacBar.setAttribute('width', 0); }
      else { var vw = full * (-s.boost) / 35; vacBar.setAttribute('x', (zeroX - vw).toFixed(1)); vacBar.setAttribute('width', vw.toFixed(1)); boostBar.setAttribute('width', 0); }
      tv[0].textContent = Math.round(s.oilT); tv[1].textContent = Math.round(s.oilP); tv[2].textContent = Math.round(s.iat);
      tv[3].textContent = Math.round(s.hpfp / 10) * 10; tv[4].textContent = 'E' + s.eth;
      tv[5].textContent = s.lam1.toFixed(2) + ' ' + s.lam2.toFixed(2);
      tv[5].setAttribute('font-size', 27);
    };
  }

  /* ---------- HUD: what's projected on the glass ---------- */
  function buildHud(root) {
    var svg = el('svg', { viewBox: '0 0 1200 320', role: 'img', 'aria-label': 'Custom head-up display demo: speed, gear, boost, oil temperature and ethanol projected on the windshield' }, root);
    var defs = el('defs', {}, svg);
    var sky = el('linearGradient', { id: 'ed-glass', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#0b1522' }, sky); el('stop', { offset: 1, 'stop-color': '#1c2430' }, sky);
    var hg = el('filter', { id: 'ed-hglow', x: '-20%', y: '-40%', width: '140%', height: '180%' }, defs);
    el('feGaussianBlur', { stdDeviation: 4, result: 'b' }, hg);
    var m = el('feMerge', {}, hg); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);

    el('rect', { x: 0, y: 0, width: 1200, height: 320, fill: 'url(#ed-glass)' }, svg);
    /* a hint of road */
    el('path', { d: 'M0 320 L470 200 L730 200 L1200 320 Z', fill: '#121418', opacity: .9 }, svg);
    el('path', { d: 'M590 200 L600 320 M610 200 L600 320', stroke: '#2b2e33', 'stroke-width': 2, 'stroke-dasharray': '18 22' }, svg);

    var H = '#f3efdc';     /* warm white, the way a HUD reads on glass */
    var A = '#f2c300';
    /* speed + gear */
    var spd = txt(svg, 250, 170, '0', { fill: H, 'font-family': FONT_D, 'font-size': 150, 'font-weight': 800, 'text-anchor': 'end', filter: 'url(#ed-hglow)' });
    txt(svg, 262, 170, 'MPH', { fill: H, opacity: .7, 'font-family': FONT_M, 'font-size': 16, 'letter-spacing': 3 });
    var gear = txt(svg, 262, 110, 'D2', { fill: A, 'font-family': FONT_D, 'font-size': 44, 'font-weight': 800, filter: 'url(#ed-hglow)' });

    /* boost arc, centre */
    el('path', { d: arcPath(600, 150, 92, -120, 120), fill: 'none', stroke: H, opacity: .22, 'stroke-width': 10, 'stroke-linecap': 'round' }, svg);
    var barc = el('path', { d: arcPath(600, 150, 92, -120, -119.9), fill: 'none', stroke: A, 'stroke-width': 10, 'stroke-linecap': 'round', filter: 'url(#ed-hglow)' }, svg);
    var bv = txt(svg, 600, 166, '0.0', { fill: H, 'font-family': FONT_D, 'font-size': 64, 'font-weight': 800, 'text-anchor': 'middle', filter: 'url(#ed-hglow)' });
    txt(svg, 600, 196, 'BOOST PSI', { fill: H, opacity: .7, 'font-family': FONT_M, 'font-size': 13, 'letter-spacing': 3, 'text-anchor': 'middle' });

    /* right stack */
    function row(y, label) {
      txt(svg, 820, y, label, { fill: H, opacity: .65, 'font-family': FONT_M, 'font-size': 13, 'letter-spacing': 3 });
      return txt(svg, 1120, y, '—', { fill: H, 'font-family': FONT_D, 'font-size': 46, 'font-weight': 800, 'text-anchor': 'end', filter: 'url(#ed-hglow)' });
    }
    var oil = row(100, 'OIL TEMP °F'), eth = row(160, 'ETHANOL'), iat = row(220, 'IAT °F');
    /* rpm shift lights */
    var lights = [];
    for (var i = 0; i < 8; i++) lights.push(el('circle', { cx: 455 + i * 42, cy: 46, r: 8, fill: H, opacity: .15 }, svg));

    return function (s) {
      spd.textContent = Math.round(s.speed);
      gear.textContent = 'D' + s.gear;
      bv.textContent = (s.boost >= 0 ? s.boost : -s.boost).toFixed(1);
      bv.setAttribute('fill', s.boost < 0 ? '#9fb7cf' : H);
      var a = lerp(-120, 120, clamp((s.boost + 10) / 35, 0, 1));
      barc.setAttribute('d', arcPath(600, 150, 92, -120, Math.max(-119.9, a)));
      oil.textContent = Math.round(s.oilT); eth.textContent = 'E' + s.eth; iat.textContent = Math.round(s.iat);
      var lit = Math.round(clamp((s.rpm - 4800) / 2400, 0, 1) * 8);
      lights.forEach(function (c, i) {
        var on = i < lit;
        c.setAttribute('opacity', on ? 1 : .15);
        c.setAttribute('fill', on ? (i >= 6 ? '#e2231a' : i >= 3 ? A : H) : H);
      });
    };
  }

  /* ---------- mount ---------- */
  function mount(host) {
    var view = host.getAttribute('data-view') || 'both';
    var updaters = [];
    function panel(kind, caption) {
      var fig = document.createElement('figure');
      fig.className = 'eins-demo__panel eins-demo__panel--' + kind;
      var cap = document.createElement('figcaption');
      cap.textContent = caption;
      updaters.push((kind === 'cluster' ? buildCluster : buildHud)(fig));
      fig.appendChild(cap);
      host.appendChild(fig);
    }
    if (view === 'cluster' || view === 'both') panel('cluster', 'Cluster · centre panel');
    if (view === 'hud' || view === 'both') panel('hud', 'Head-up display');

    /* phones: crop to the part that matters so the numbers stay readable */
    var narrow = window.matchMedia ? window.matchMedia('(max-width: 700px)') : null;
    function fit() {
      var n = narrow && narrow.matches;
      Array.prototype.forEach.call(host.querySelectorAll('.eins-demo__panel--cluster svg'), function (v) { v.setAttribute('viewBox', n ? '380 44 440 352' : '0 0 1200 440'); });
      Array.prototype.forEach.call(host.querySelectorAll('.eins-demo__panel--hud svg'), function (v) { v.setAttribute('viewBox', n ? '60 20 1100 260' : '0 0 1200 320'); });
      host.classList.toggle('eins-demo--narrow', !!n);
    }
    fit();
    if (narrow) (narrow.addEventListener ? narrow.addEventListener('change', fit) : narrow.addListener(fit));

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var running = false, start = null, raf = 0;
    function frame(ts) {
      if (!running) return;
      if (start === null) start = ts;
      var s = sample((ts - start) / 1000);
      for (var i = 0; i < updaters.length; i++) updaters[i](s);
      raf = requestAnimationFrame(frame);
    }
    function play() { if (running || reduce) return; running = true; start = null; sample._t = undefined; raf = requestAnimationFrame(frame); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); }

    /* static but believable frame if motion is reduced */
    var still = sample(3.9);
    for (var i = 0; i < updaters.length; i++) updaters[i](still);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? play() : stop(); }); }, { threshold: .15 }).observe(host);
    } else play();
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : (host.getBoundingClientRect().top < innerHeight && play()); });
  }

  function init() { Array.prototype.forEach.call(document.querySelectorAll('.eins-demo:not([data-ready])'), function (h) { h.setAttribute('data-ready', '1'); mount(h); }); }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
