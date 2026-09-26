/* cube-section-app.js - отрисовка и интерфейс. Требует cube-section-core.js */
(function () {
  'use strict';
  var C = window.CubeSectionCore;

  var canvas = document.getElementById('scene');
  /* Цвета «тетрадного» режима: те же линии, но тёмными чернилами на бумаге. */
  var PAPER_COLORS = {
    'rgba(214,230,255,0.92)': 'rgba(38,48,68,0.95)',
    'rgba(150,175,215,0.40)': 'rgba(95,110,135,0.55)',
    'rgba(96,140,255,0.10)': 'rgba(70,120,190,0.10)',
    'rgba(96,140,255,0.045)': 'rgba(70,120,190,0.03)',
    'rgba(165,192,232,0.9)': 'rgba(35,55,95,0.95)',
    'rgba(190,215,255,0.55)': 'rgba(60,85,130,0.75)',
    'rgba(255,215,140,0.60)': 'rgba(180,120,15,0.8)',
    'rgba(8,13,24,0.92)': 'rgba(255,255,255,0.9)',
    'rgba(255,168,64,0.26)': 'rgba(235,150,30,0.16)',
    '#ffb84d': '#c07a00',
    '#ffd894': '#8a5a00',
    'rgba(94,222,166,0.13)': 'rgba(30,150,100,0.10)',
    'rgba(94,222,166,0.45)': 'rgba(15,125,80,0.5)',
    '#ffd166': '#c07a00',
    'rgba(255,209,102,0.5)': 'rgba(192,122,0,0.6)',
    '#ffe9b0': '#8a5a00',
    'rgba(255,233,176,0.55)': 'rgba(138,90,0,0.6)',
    '#78dcff': '#1272a8',
    'rgba(120,220,255,1)': 'rgba(18,114,168,1)',
    'rgba(120,220,255,0.95)': 'rgba(18,114,168,0.95)',
    'rgba(120,220,255,0.9)': 'rgba(18,114,168,0.9)',
    'rgba(120,220,255,0.85)': 'rgba(18,114,168,0.9)',
    'rgba(120,220,255,0.75)': 'rgba(18,114,168,0.8)',
    'rgba(120,220,255,0.5)': 'rgba(18,114,168,0.55)',
    'rgba(120,220,255,0.45)': 'rgba(18,114,168,0.5)',
    'rgba(120,220,255,0.30)': 'rgba(18,114,168,0.32)',
    'rgba(120,220,255,0.28)': 'rgba(18,114,168,0.3)',
    'rgba(120,220,255,0.16)': 'rgba(18,114,168,0.14)',
    'rgba(160,225,255,0.95)': 'rgba(18,114,168,0.95)',
    'rgba(160,225,255,0.6)': 'rgba(18,114,168,0.6)'
  };

  var rawCtx = canvas.getContext('2d');
  var ctx = new Proxy(rawCtx, {
    get: function (t, p) {
      var v = t[p];
      return (typeof v === 'function') ? v.bind(t) : v;
    },
    set: function (t, p, v) {
      if (state.notebook && (p === 'strokeStyle' || p === 'fillStyle') && typeof v === 'string' && PAPER_COLORS[v]) v = PAPER_COLORS[v];
      t[p] = v;
      return true;
    }
  });

  var resultEl = document.getElementById('result');
  var sidesEl = document.getElementById('sides');
  var pointsEl = document.getElementById('points');
  var buildBox = document.getElementById('buildBox');
  var stepTextEl = document.getElementById('stepText');
  var stepCounterEl = document.getElementById('stepCounter');

  var COLORS = ['#ff6b81', '#4ade80', '#63a4ff'];
  var LETTERS = ['M', 'N', 'K'];

  var state = {
    yaw: -0.62, pitch: 0.40, zoom: 1,
    points: C.presetHexagon(),
    drag: null, hover: -1,
    snapVertex: true, snapMid: false,
    showHidden: true, showFaces: true, autoRotate: true, showNames: true,
    build: false, method: 'trace', step: 0, steps: null, buildInfo: null, playing: false,
    freeMode: false, gesture: null,
    notebook: false, obliqK: 0.5, cellPx: 24
  };
  var pointers = {};

  var view = { cx: 0, cy: 0, scale: 200 };

  function camera() {
    return state.notebook ? C.makeObliqueCamera(state.obliqK) : C.makeCamera(state.yaw, state.pitch);
  }

  function project(p, cam) {
    var r = cam.rot(p);
    return { x: view.cx + view.scale * r[0], y: view.cy - view.scale * r[1], z: r[2] };
  }

  function applyView() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (state.notebook) {
      // Как на листе в клетку: ребро куба = 4 клетки, вершины ложатся на пересечения сетки.
      var cell = Math.max(14, Math.min(64, Math.round(Math.min(w, h) * 0.55 / 6 / 2) * 2));
      state.cellPx = cell;
      view.scale = cell * 4;
      view.cx = Math.round(w / 2 / cell) * cell;
      view.cy = Math.round(h / 2 / cell) * cell;
      return;
    }
    view.cx = w / 2;
    view.cy = h / 2;
    view.scale = Math.min(w, h) * 0.34 * state.zoom;
  }

  /* Клетки тетрадного листа. */
  function drawGrid() {
    var w = canvas.clientWidth, h = canvas.clientHeight, cell = state.cellPx || 24;
    ctx.save();
    ctx.strokeStyle = 'rgba(80,130,190,0.30)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = view.cx % cell; x <= w; x += cell) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); }
    for (var y = view.cy % cell; y <= h; y += cell) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); }
    ctx.stroke();
    ctx.restore();
  }

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    applyView();
  }

  function labelText(text, x, y, color) {
    ctx.font = 'bold 12px system-ui, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(8,13,24,0.92)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  /* ---------------- интерфейс ---------------- */
  function fmt(x) { return (Math.round(x * 1000) / 1000).toFixed(3); }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function planeEq(sec) {
    if (!sec.normal) return '-';
    var names = ['x', 'y', 'z'], s = '';
    for (var i = 0; i < 3; i++) {
      var c = sec.normal[i];
      if (Math.abs(c) < 1e-9) continue;
      s += (s ? (c > 0 ? ' + ' : ' - ') : (c < 0 ? '-' : '')) + fmt(Math.abs(c)) + names[i];
    }
    return (s || '0') + ' = ' + fmt(sec.d);
  }

  function renderFull(sec) {
    var n = sec.points.length;
    var html = '<div class="big">' + (n < 3 ? 'Плоскость не рассекает куб' : capitalize(C.describePolygon(sec.points))) + '</div>';
    if (n >= 3) {
      html += '<div class="stat">Сторон: <b>' + n + '</b> &middot; периметр: <b>' + fmt(C.polygonPerimeter(sec.points)) +
              '</b> &middot; площадь: <b>' + fmt(C.polygonArea(sec.points)) + '</b></div>';
      html += '<div class="stat small">Ребро куба = 1: длины в рёбрах, площадь в квадратных рёбрах.</div>';
    }
    html += '<div class="stat small">Плоскость: ' + planeEq(sec) + '</div>';
    resultEl.innerHTML = html;

    var sideHtml = '';
    if (n >= 3) {
      var ss = C.sideLengths(sec.points), parts = [];
      for (var i = 0; i < ss.length; i++) parts.push('<span>сторона ' + (i + 1) + ': ' + fmt(ss[i]) + '</span>');
      sideHtml = parts.join('');
    }
    sidesEl.innerHTML = sideHtml;
  }

  function renderPoints() {
    var inputs = pointsEl.querySelectorAll ? pointsEl.querySelectorAll('input[data-pt]') : [];
    if (inputs.length === state.points.length * 3) { updatePointFields(inputs); return; }
    var parts = [];
    for (var k = 0; k < state.points.length; k++) {
      var p = state.points[k], inp = '';
      for (var ax = 0; ax < 3; ax++) {
        inp += '<input type="number" step="0.05" data-pt="' + k + '" data-ax="' + ax + '" value="' + fmt(p[ax]) +
               '" aria-label="' + LETTERS[k] + ' ' + 'xyz'.charAt(ax) + '">';
      }
      parts.push('<div class="pt"><span class="dot" style="background:' + COLORS[k] + '"></span><b>' + LETTERS[k] + '</b>' +
        inp + '<span class="where" data-w="' + k + '">' + C.pointDescription(p) + '</span></div>');
    }
    pointsEl.innerHTML = parts.join('');
    var list = pointsEl.querySelectorAll ? pointsEl.querySelectorAll('input[data-pt]') : [];
    for (var q = 0; q < list.length; q++) list[q].addEventListener('input', onCoordInput);
  }

  function onCoordInput(e) {
    var t = e.target;
    var i = parseInt(t.getAttribute('data-pt'), 10), ax = parseInt(t.getAttribute('data-ax'), 10);
    var v = parseFloat(t.value);
    if (isNaN(v) || i < 0 || ax < 0) return;
    state.points[i][ax] = Math.max(-3, Math.min(3, v));
    updateInfo();
  }

  function updatePointFields(inputs) {
    for (var q = 0; q < inputs.length; q++) {
      var inp = inputs[q];
      if (document.activeElement === inp) continue;
      var i = parseInt(inp.getAttribute('data-pt'), 10), ax = parseInt(inp.getAttribute('data-ax'), 10);
      inp.value = fmt(state.points[i][ax]);
    }
    var wh = pointsEl.querySelectorAll ? pointsEl.querySelectorAll('.where') : [];
    for (var w = 0; w < wh.length; w++) {
      var k = wh[w].getAttribute('data-w');
      if (k !== null) wh[w].textContent = C.pointDescription(state.points[parseInt(k, 10)]);
    }
  }

  function renderStepBox() {
    buildBox.hidden = !state.build;
    if (!state.build) return;
    if (!state.steps) {
      stepCounterEl.textContent = '';
      stepTextEl.innerHTML = 'Плоскость не рассекает куб — подвиньте точки M, N, K.';
      document.getElementById('stepPrev').disabled = true;
      document.getElementById('stepNext').disabled = true;
      document.getElementById('stepEnd').disabled = true;
      return;
    }
    var T = state.steps.length - 1, k = state.step;
    var st = state.steps[k];
    stepCounterEl.textContent = 'Шаг ' + k + ' из ' + T + (k === T ? ' — сечение построено' : '');
    stepTextEl.innerHTML = st ? st.text : '';
    document.getElementById('stepPrev').disabled = (k <= 0);
    document.getElementById('stepNext').disabled = (k >= T);
    document.getElementById('stepEnd').disabled = (k >= T);
  }

  function updateInfo() {
    var sec = C.section(state.points[0], state.points[1], state.points[2]);
    if (state.build) {
      state.buildInfo = C.buildConstruction(state.points, sec, state.method);
      state.steps = state.buildInfo ? state.buildInfo.steps : null;
      var T = state.steps ? state.steps.length - 1 : 0;
      if (state.step > T) state.step = T;
      if (state.step < 0) state.step = 0;
    } else {
      state.buildInfo = null;
      state.steps = null;
    }

    if (state.build && state.steps) {
      var T2 = state.steps.length - 1;
      if (state.step < T2) {
        resultEl.innerHTML = '<div class="big">Идёт построение: ' + state.step + ' из ' + T2 + '</div>' +
          '<div class="stat small">Шаг за шагом строим сечение. Полные размеры появятся после последнего шага.</div>';
        sidesEl.innerHTML = '';
      } else {
        renderFull(sec);
      }
    } else {
      renderFull(sec);
    }
    renderPoints();
    renderStepBox();
  }

  /* ---------------- рисование ---------------- */
  function coincidesWithGiven(p) {
    for (var i = 0; i < state.points.length; i++) if (C.dist(p, state.points[i]) < 1e-6) return true;
    return false;
  }

  function shouldSkipLabel(label) {
    if (!label) return true;
    if (C.GIVEN_LETTERS.indexOf(label) >= 0) return true;
    if (state.showNames && C.VERTEX_NAMES.indexOf(label) >= 0) return true;
    return false;
  }

  function labelPoint(p, label, cam, color) {
    var s = project(p, cam);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (!shouldSkipLabel(label)) labelText(label, s.x, s.y - 14, color);
  }

  function drawClippedLine(p, dir, cam, color, radius) {
    var R = radius || 2.8;
    var b = C.dot(p, dir), c = C.dot(p, p) - R * R;
    var disc = b * b - c;
    if (disc < 0) return;
    var s = Math.sqrt(disc);
    var a = project(C.add(p, C.mul(dir, -b - s)), cam);
    var bb = project(C.add(p, C.mul(dir, -b + s)), cam);
    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(bb.x, bb.y);
    ctx.stroke();
    ctx.restore();
  }

  /* Первый шаг: след на нижней грани, точки S1/S2 и пересечения с рёбрами. */
  function drawBaseStep(st, cam, active) {
    if (!st || !st.from || !st.to) return;
    var R = Math.max(1.8, C.len(st.from), C.len(st.to)) + 0.5;
    drawClippedLine(st.from, st.dir, cam, active ? 'rgba(120,220,255,0.75)' : 'rgba(120,220,255,0.28)', R);
    if (st.solidFrom && st.solidTo) {
      var a = project(st.solidFrom, cam), b = project(st.solidTo, cam);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = active ? 'rgba(120,220,255,0.95)' : 'rgba(120,220,255,0.45)';
      ctx.lineWidth = active ? 2.4 : 1.6;
      ctx.stroke();
    }
    var a1 = active ? 1 : 0.5;
    if (!coincidesWithGiven(st.from)) labelPoint(st.from, 'S1', cam, 'rgba(120,220,255,' + a1 + ')');
    if (!coincidesWithGiven(st.to)) labelPoint(st.to, 'S2', cam, 'rgba(120,220,255,' + a1 + ')');
    var marks = st.marks || [];
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (m.inside) {
        labelPoint(m.p, m.label, cam, active ? '#ffe9b0' : 'rgba(255,233,176,0.55)');
      } else {
        var s = project(m.p, cam);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(120,220,255,0.16)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,220,255,' + (active ? 0.9 : 0.5) + ')';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        labelText(m.label, s.x, s.y - 13, 'rgba(160,225,255,' + (active ? 0.95 : 0.6) + ')');
      }
    }
  }

  /* Шаг-продление: продолжаем построенную сторону до прямой ребра. */
  function drawExtendStep(st, cam, active) {
    if (!st || !st.newPoint) return;
    var a = project(st.sideFrom, cam), b = project(st.sideTo, cam), t = project(st.newPoint, cam);
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = active ? 'rgba(120,220,255,0.95)' : 'rgba(120,220,255,0.30)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
    ctx.restore();
    labelPoint(st.newPoint, st.newLabel, cam, active ? 'rgba(120,220,255,0.95)' : 'rgba(120,220,255,0.45)');
  }

  function drawConstruction(cam, pv, sec) {
    var steps = state.steps;
    if (!steps) return;
    var T = steps.length - 1, k = state.step;
    var cur = (k >= 1 && k <= T) ? steps[k] : null;

    if (cur && cur.face >= 0) {
      var face = C.FACES[cur.face];
      ctx.beginPath();
      for (var i = 0; i < face.idx.length; i++) {
        var p = pv[face.idx[i]];
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(94,222,166,0.13)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(94,222,166,0.45)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }

    if (cur) {
      if (cur.kind === 'base') {
        drawBaseStep(cur, cam, true);
      } else if (cur.kind === 'extend') {
        drawExtendStep(cur, cam, true);
      } else if (cur.mode === 'trace') {
        drawExtLine(cur.from, cur.to, cam, 'rgba(120,220,255,0.85)', false);
      } else if (cur.mode === 'parallel' && cur.partner) {
        var dir = C.normalize(C.sub(cur.partner.to, cur.partner.from));
        drawExtLine(cur.known, C.add(cur.known, dir), cam, 'rgba(120,220,255,0.85)');
        var p0 = project(cur.partner.from, cam), p1 = project(cur.partner.to, cam);
        ctx.strokeStyle = 'rgba(120,220,255,0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        var kp = project(cur.known, cam);
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#78dcff';
        ctx.fill();
        if (!shouldSkipLabel(cur.knownLabel)) labelText(cur.knownLabel, kp.x, kp.y - 15, '#78dcff');
      }
    }

    var upto = Math.min(k, T);
    if (upto >= T && T >= 1 && sec.points.length >= 3) {
      var sp = sec.points.map(function (p) { return project(p, cam); });
      ctx.beginPath();
      for (var q = 0; q < sp.length; q++) {
        if (q === 0) ctx.moveTo(sp[q].x, sp[q].y); else ctx.lineTo(sp[q].x, sp[q].y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,209,102,0.16)';
      ctx.fill();
    }

    for (var s = 1; s <= upto; s++) {
      var st = steps[s];
      if (st.kind === 'base') {
        if (s !== k) drawBaseStep(st, cam, false);
        continue;
      }
      if (st.kind === 'extend') {
        if (s !== k) drawExtendStep(st, cam, false);
        continue;
      }
      var a = project(st.from, cam), b = project(st.to, cam);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineWidth = (s === k) ? 3.2 : 2;
      ctx.strokeStyle = (s === k) ? '#ffd166' : 'rgba(255,209,102,0.5)';
      ctx.stroke();
    }

    var seen = {};
    for (var s2 = 1; s2 <= upto; s2++) {
      drawVertLabel(steps[s2].fromLabel, steps[s2].from, cam, seen);
      drawVertLabel(steps[s2].toLabel, steps[s2].to, cam, seen);
    }
  }

  function drawVertLabel(label, p, cam, seen) {
    if (!label || seen[label] || shouldSkipLabel(label)) return;
    seen[label] = true;
    var s = project(p, cam);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe9b0';
    ctx.fill();
    labelText(label, s.x, s.y - 15, '#ffe9b0');
  }

  function drawExtLine(p0, p1, cam, color, solidMiddle) {
    var d = C.normalize(C.sub(p1, p0));
    var e0 = C.sub(p0, C.mul(d, 0.65));
    var e1 = C.add(p1, C.mul(d, 0.65));
    var s0 = project(e0, cam), s1 = project(e1, cam);
    var a = project(p0, cam), b = project(p1, cam);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    if (solidMiddle) {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(a.x, a.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(s1.x, s1.y); ctx.stroke();
    ctx.restore();
  }

  function draw() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    var cam = camera();

    ctx.clearRect(0, 0, w, h);
    if (state.notebook) {
      ctx.fillStyle = '#fbf8ee';
      ctx.fillRect(0, 0, w, h);
      drawGrid();
    } else {
      var bg = ctx.createRadialGradient(w * 0.5, h * 0.4, Math.min(w, h) * 0.05, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
      bg.addColorStop(0, '#16203a');
      bg.addColorStop(1, '#080d18');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    }

    var rv = C.VERTICES.map(function (v) { return cam.rot(v); });
    var pv = rv.map(function (r) { return { x: view.cx + view.scale * r[0], y: view.cy - view.scale * r[1], z: r[2] }; });

    var faceVis = C.FACES.map(function (f) { return cam.rot(f.normal)[2] > 0; });
    var faceDepth = C.FACES.map(function (f) {
      var s = 0;
      for (var k = 0; k < f.idx.length; k++) s += rv[f.idx[k]][2];
      return s / f.idx.length;
    });

    function seg(a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

    if (state.showHidden) {
      ctx.save();
      ctx.setLineDash([5, 6]);
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = 'rgba(150,175,215,0.40)';
      for (var e = 0; e < C.EDGES.length; e++) {
        var ef = C.EDGE_FACES[e];
        if (!faceVis[ef[0]] && !faceVis[ef[1]]) seg(pv[C.EDGES[e][0]], pv[C.EDGES[e][1]]);
      }
      ctx.restore();
    }

    if (state.showFaces) {
      var order = C.FACES.map(function (f, i) { return i; }).sort(function (a, b) { return faceDepth[a] - faceDepth[b]; });
      for (var q = 0; q < order.length; q++) {
        var f = C.FACES[order[q]];
        ctx.beginPath();
        for (var k = 0; k < f.idx.length; k++) {
          var p = pv[f.idx[k]];
          if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = faceVis[order[q]] ? 'rgba(96,140,255,0.10)' : 'rgba(96,140,255,0.045)';
        ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(214,230,255,0.92)';
    ctx.lineWidth = 1.7;
    ctx.lineJoin = 'round';
    for (var e2 = 0; e2 < C.EDGES.length; e2++) {
      var ef2 = C.EDGE_FACES[e2];
      if (faceVis[ef2[0]] || faceVis[ef2[1]]) seg(pv[C.EDGES[e2][0]], pv[C.EDGES[e2][1]]);
    }

    if (state.snapVertex) {
      ctx.fillStyle = 'rgba(190,215,255,0.55)';
      for (var vi = 0; vi < pv.length; vi++) { ctx.beginPath(); ctx.arc(pv[vi].x, pv[vi].y, 2.3, 0, Math.PI * 2); ctx.fill(); }
    }
    if (state.snapMid) {
      ctx.fillStyle = 'rgba(255,215,140,0.60)';
      for (var mi = 0; mi < C.EDGE_MIDPOINTS.length; mi++) {
        var ms = project(C.EDGE_MIDPOINTS[mi], cam);
        ctx.beginPath(); ctx.arc(ms.x, ms.y, 2.3, 0, Math.PI * 2); ctx.fill();
      }
    }

    if (state.showNames) {
      for (var vn = 0; vn < C.VERTICES.length; vn++) {
        var vs = project(C.VERTICES[vn], cam);
        var out = cam.rot(C.normalize(C.VERTICES[vn]));
        labelText(C.VERTEX_NAMES[vn], vs.x + out[0] * 15, vs.y - out[1] * 15, 'rgba(165,192,232,0.9)');
      }
    }

    var sec = C.section(state.points[0], state.points[1], state.points[2]);

    if (state.build && state.steps) {
      drawConstruction(cam, pv, sec);
    } else if (sec.points.length >= 3) {
      var sp = sec.points.map(function (p) { return project(p, cam); });
      ctx.beginPath();
      for (var i2 = 0; i2 < sp.length; i2++) { if (i2 === 0) ctx.moveTo(sp[i2].x, sp[i2].y); else ctx.lineTo(sp[i2].x, sp[i2].y); }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,168,64,0.26)';
      ctx.fill();
      ctx.strokeStyle = '#ffb84d';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.fillStyle = '#ffd894';
      for (var i3 = 0; i3 < sp.length; i3++) { ctx.beginPath(); ctx.arc(sp[i3].x, sp[i3].y, 2.6, 0, Math.PI * 2); ctx.fill(); }
    }

    for (var t = 0; t < state.points.length; t++) {
      var ps = project(state.points[t], cam);
      var active = state.hover === t || (state.drag && state.drag.kind === 'point' && state.drag.i === t);
      ctx.beginPath();
      ctx.arc(ps.x, ps.y, active ? 9.5 : 7.5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[t];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.stroke();
      labelText(LETTERS[t], ps.x, ps.y - 17, '#ffffff');
    }
  }

  /* ---------------- взаимодействие ---------------- */
  function pointerPos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function hitPoint(pos) {
    var cam = camera(), idx = -1, best = 24;
    for (var i = 0; i < state.points.length; i++) {
      var s = project(state.points[i], cam);
      var d = Math.hypot(s.x - pos.x, s.y - pos.y);
      if (d < best) { best = d; idx = i; }
    }
    return idx;
  }

  function snapTarget(p, cam) {
    var ps = project(p, cam);
    function nearest(targets, maxPx) {
      var best = null, bestD = maxPx;
      for (var i = 0; i < targets.length; i++) {
        var s = project(targets[i], cam);
        var d = Math.hypot(s.x - ps.x, s.y - ps.y);
        if (d < bestD) { bestD = d; best = targets[i]; }
      }
      return best;
    }
    if (state.snapVertex) { var a = nearest(C.VERTICES, 14); if (a) return a; }
    if (state.snapMid) { var b = nearest(C.EDGE_MIDPOINTS, 12); if (b) return b; }
    return null;
  }

  function movePoint(i, pos) {
    var cam = camera();
    var surf = C.surfacePointFromScreen(pos.x, pos.y, cam, view.cx, view.cy, view.scale);
    if (state.freeMode) {
      // Точку можно увести за куб: она скользит по прямой ближайшего ребра.
      var es = C.edgeSnapPoint(pos.x, pos.y, cam, view.cx, view.cy, view.scale, 1.2);
      if (es && (!surf || es.dist < 9)) {
        state.points[i] = es.point;
        updateInfo();
        return;
      }
    }
    if (!surf) return;
    var snapped = snapTarget(surf, cam);
    state.points[i] = snapped || surf;
    updateInfo();
  }

  function twoPointers() {
    var ids = Object.keys(pointers);
    return ids.length >= 2 ? [pointers[ids[0]], pointers[ids[1]]] : null;
  }

  function startGesture() {
    var tp = twoPointers();
    if (!tp) { state.gesture = null; return; }
    state.drag = null;
    state.gesture = {
      dist: Math.max(1, Math.hypot(tp[0].x - tp[1].x, tp[0].y - tp[1].y)),
      ang: Math.atan2(tp[1].y - tp[0].y, tp[1].x - tp[0].x),
      zoom: state.zoom
    };
  }

  canvas.addEventListener('pointerdown', function (e) {
    var pos = pointerPos(e);
    pointers[e.pointerId] = pos;
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    var idx = hitPoint(pos);
    if (Object.keys(pointers).length >= 2) {
      if (state.notebook) state.drag = null; else startGesture();
    } else if (idx >= 0) {
      state.drag = { kind: 'point', i: idx };
    } else {
      state.drag = state.notebook ? null : { kind: 'rotate', x: pos.x, y: pos.y };
    }
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', function (e) {
    var pos = pointerPos(e);
    if (pointers[e.pointerId]) pointers[e.pointerId] = pos;
    if (state.gesture) {
      var tp = twoPointers();
      if (tp) {
        var gd = Math.max(1, Math.hypot(tp[0].x - tp[1].x, tp[0].y - tp[1].y));
        var ga = Math.atan2(tp[1].y - tp[0].y, tp[1].x - tp[0].x);
        state.zoom = Math.max(0.45, Math.min(3, state.gesture.zoom * (gd / state.gesture.dist)));
        state.yaw += (ga - state.gesture.ang);
        state.gesture.ang = ga;
        applyView();
      }
      return;
    }
    if (!state.drag) {
      var idx = hitPoint(pos);
      if (idx !== state.hover) {
        state.hover = idx;
        canvas.style.cursor = idx >= 0 ? 'grab' : 'move';
      }
      return;
    }
    if (state.drag.kind === 'rotate') {
      var dx = pos.x - state.drag.x, dy = pos.y - state.drag.y;
      state.drag.x = pos.x;
      state.drag.y = pos.y;
      state.yaw += dx * 0.009;
      state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch + dy * 0.009));
    } else {
      movePoint(state.drag.i, pos);
    }
  });

  function endDrag(e) {
    if (e && e.pointerId !== undefined) delete pointers[e.pointerId];
    if (Object.keys(pointers).length < 2) state.gesture = null;
    if (Object.keys(pointers).length === 0) state.drag = null;
    if (e && canvas.releasePointerCapture) { try { canvas.releasePointerCapture(e.pointerId); } catch (err) {} }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointerleave', endDrag);
  canvas.addEventListener('pointercancel', function (e) {
    if (e && e.pointerId !== undefined) delete pointers[e.pointerId];
    state.drag = null;
    state.gesture = null;
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    if (state.notebook) return;
    state.zoom = Math.max(0.45, Math.min(3, state.zoom * Math.exp(-e.deltaY * 0.0012)));
    applyView();
  }, { passive: false });

  document.querySelectorAll('[data-preset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var p = btn.getAttribute('data-preset'), pts = null;
      if (p === 'triangle') pts = C.presetTriangle();
      else if (p === 'square') pts = C.presetSquare();
      else if (p === 'rectangle') pts = C.presetRectangle();
      else if (p === 'pentagon') pts = C.presetPentagon();
      else if (p === 'hexagon') pts = C.presetHexagon();
      else if (p === 'random') pts = C.randomSectionPoints();
      if (pts) { state.points = pts; updateInfo(); }
    });
  });

  document.querySelectorAll('[data-method]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.method = btn.getAttribute('data-method');
      document.querySelectorAll('[data-method]').forEach(function (b) {
        if (b.classList && b.classList.toggle) b.classList.toggle('on', b === btn);
      });
      state.step = 0;
      updateInfo();
    });
  });

  var optRotate = document.getElementById('optRotate');
  var optSnapV = document.getElementById('optSnapV');
  var optSnapM = document.getElementById('optSnapM');
  var optHidden = document.getElementById('optHidden');
  var optFaces = document.getElementById('optFaces');
  var optNames = document.getElementById('optNames');
  var optBuild = document.getElementById('optBuild');
  optRotate.addEventListener('change', function () { state.autoRotate = optRotate.checked; });
  optSnapV.addEventListener('change', function () { state.snapVertex = optSnapV.checked; });
  optSnapM.addEventListener('change', function () { state.snapMid = optSnapM.checked; });
  optHidden.addEventListener('change', function () { state.showHidden = optHidden.checked; });
  optFaces.addEventListener('change', function () { state.showFaces = optFaces.checked; });
  optNames.addEventListener('change', function () { state.showNames = optNames.checked; });
  optBuild.addEventListener('change', function () {
    state.build = optBuild.checked;
    state.step = 0;
    if (!state.build) setPlaying(false);
    updateInfo();
  });

  var optFree = document.getElementById('optFree');
  if (optFree) optFree.addEventListener('change', function () { state.freeMode = optFree.checked; });

  function syncCheckboxes() {
    var pairs = [['optRotate', 'autoRotate'], ['optFaces', 'showFaces'], ['optHidden', 'showHidden'], ['optNames', 'showNames']];
    for (var i = 0; i < pairs.length; i++) {
      var el = document.getElementById(pairs[i][0]);
      if (el) el.checked = state[pairs[i][1]];
    }
    var rot = document.getElementById('optRotate');
    if (rot) rot.disabled = state.notebook;
  }

  var optNotebook = document.getElementById('optNotebook');
  if (optNotebook) optNotebook.addEventListener('change', function () {
    state.notebook = optNotebook.checked;
    if (state.notebook) {
      state.autoRotate = false;
      state.showFaces = false;
      state.showHidden = true;
      state.showNames = true;
      state.drag = null;
      state.gesture = null;
      pointers = {};
    }
    syncCheckboxes();
    applyView();
    updateInfo();
  });

  var resetBtn = document.getElementById('resetView');
  if (resetBtn) resetBtn.addEventListener('click', function () {
    state.yaw = -0.62; state.pitch = 0.40; state.zoom = 1;
    applyView();
  });

  window.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (/input|textarea|select/i.test(tag)) return;
    var T = state.steps ? state.steps.length - 1 : 0;
    if (e.key === 'ArrowRight' || e.key === ' ') state.step = Math.min(T, state.step + 1);
    else if (e.key === 'ArrowLeft') state.step = Math.max(0, state.step - 1);
    else if (e.key === 'Home') state.step = 0;
    else if (e.key === 'End') { state.step = T; setPlaying(false); }
    else if ((e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') && !state.notebook) {
      state.autoRotate = !state.autoRotate;
      var or = document.getElementById('optRotate');
      if (or) or.checked = state.autoRotate;
    } else if (e.key === '+' || e.key === '=') { state.zoom = Math.min(3, state.zoom * 1.15); applyView(); }
    else if (e.key === '-' || e.key === '_') { state.zoom = Math.max(0.45, state.zoom / 1.15); applyView(); }
    else return;
    e.preventDefault();
    updateInfo();
  });

  var playTimer = null;
  function setPlaying(on) {
    state.playing = on;
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
    var btn = document.getElementById('stepPlay');
    if (btn) btn.textContent = on ? 'Пауза' : 'Авто';
    if (on) {
      playTimer = setInterval(function () {
        var T = state.steps ? state.steps.length - 1 : 0;
        if (state.step >= T) { setPlaying(false); return; }
        state.step++;
        updateInfo();
      }, 1700);
    }
  }

  document.getElementById('stepPrev').addEventListener('click', function () {
    state.step = Math.max(0, state.step - 1);
    updateInfo();
  });
  document.getElementById('stepNext').addEventListener('click', function () {
    var T = state.steps ? state.steps.length - 1 : 0;
    state.step = Math.min(T, state.step + 1);
    updateInfo();
  });
  document.getElementById('stepEnd').addEventListener('click', function () {
    state.step = state.steps ? state.steps.length - 1 : 0;
    setPlaying(false);
    updateInfo();
  });
  document.getElementById('stepPlay').addEventListener('click', function () { setPlaying(!state.playing); });

  document.getElementById('save').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'cube-section.png';
    a.click();
  });

  /* ---------------- цикл ---------------- */
  var last = 0;
  function frame(t) {
    if (!last) last = t;
    var dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (state.autoRotate && !state.drag && !state.notebook) state.yaw += dt * 0.5;
    draw();
    requestAnimationFrame(frame);
  }

  function init() {
    resize();
    updateInfo();
    draw();
    requestAnimationFrame(frame);
  }

  /* Небольшой внешний интерфейс: удобно встраивать и проверять. */
  window.CubeSectionApp = { state: state, view: view, camera: camera, applyView: applyView };

  if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(canvas);
  window.addEventListener('resize', resize);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
