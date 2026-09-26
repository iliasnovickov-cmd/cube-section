/* cube-section-core.js - геометрия сечений куба.
 * Куб: ребро 1, центр в начале координат, вершины (±0.5, ±0.5, ±0.5).
 * Работает и в браузере (window.CubeSectionCore), и в Node (module.exports).
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CubeSectionCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var EPS = 1e-9;
  var H = 0.5;

  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function dist(a, b) { return len(sub(a, b)); }
  function normalize(a) { var l = len(a); return l < EPS ? [0, 0, 0] : mul(a, 1 / l); }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  var VERTICES = [
    [-H, -H, -H], [H, -H, -H], [H, H, -H], [-H, H, -H],
    [-H, -H, H], [H, -H, H], [H, H, H], [-H, H, H]
  ];

  var FACES = [
    { name: 'z-', idx: [0, 1, 2, 3], normal: [0, 0, -1] },
    { name: 'z+', idx: [4, 5, 6, 7], normal: [0, 0, 1] },
    { name: 'y-', idx: [0, 1, 5, 4], normal: [0, -1, 0] },
    { name: 'y+', idx: [2, 3, 7, 6], normal: [0, 1, 0] },
    { name: 'x-', idx: [0, 3, 7, 4], normal: [-1, 0, 0] },
    { name: 'x+', idx: [1, 2, 6, 5], normal: [1, 0, 0] }
  ];

  var EDGES = [];
  var EDGE_FACES = [];
  (function buildEdges() {
    for (var i = 0; i < VERTICES.length; i++) {
      for (var j = i + 1; j < VERTICES.length; j++) {
        var diff = 0;
        for (var k = 0; k < 3; k++) if (Math.sign(VERTICES[i][k]) !== Math.sign(VERTICES[j][k])) diff++;
        if (diff !== 1) continue;
        EDGES.push([i, j]);
        var fis = [];
        for (var f = 0; f < FACES.length; f++) {
          if (FACES[f].idx.indexOf(i) >= 0 && FACES[f].idx.indexOf(j) >= 0) fis.push(f);
        }
        EDGE_FACES.push(fis);
      }
    }
  })();

  var EDGE_MIDPOINTS = EDGES.map(function (e) { return mul(add(VERTICES[e[0]], VERTICES[e[1]]), 0.5); });

  /* Школьные обозначения: вершины ABCD A1B1C1D1, заданные точки M, N, K. */
  var VERTEX_NAMES = ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'];
  var GIVEN_LETTERS = ['M', 'N', 'K'];
  var FACE_NAMES = ['ABCD (нижняя)', 'A1B1C1D1 (верхняя)', 'ABB1A1 (передняя)', 'CDD1C1 (задняя)', 'ADD1A1 (левая)', 'BCC1B1 (правая)'];
  var OPPOSITE_FACE = [1, 0, 3, 2, 5, 4];
  var EDGE_NAMES = EDGES.map(function (e) { return VERTEX_NAMES[e[0]] + VERTEX_NAMES[e[1]]; });

  /* ---- камера (ортографическая проекция с поворотами yaw / pitch) ---- */
  function makeCamera(yaw, pitch) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var cp = Math.cos(pitch), sp = Math.sin(pitch);

    function rot(p) {
      var x1 = p[0] * cy + p[2] * sy;
      var z1 = -p[0] * sy + p[2] * cy;
      var y2 = p[1] * cp - z1 * sp;
      var z2 = p[1] * sp + z1 * cp;
      return [x1, y2, z2];
    }
    function inv(r) {
      var x2 = r[0], y2 = r[1], z2 = r[2];
      var y1 = y2 * cp + z2 * sp;
      var z1 = -y2 * sp + z2 * cp;
      var x0 = x2 * cy - z1 * sy;
      var z0 = x2 * sy + z1 * cy;
      return [x0, y1, z0];
    }
    return { rot: rot, inv: inv, dir: normalize(inv([0, 0, 1])), yaw: yaw, pitch: pitch };
  }

  /* ---- «тетрадная» проекция: передняя грань - ровный квадрат, глубина уходит
     под 45° вверх-вправо (косоугольная проекция). Интерфейс тот же, что у makeCamera,
     поэтому подходит для отрисовки, выбора точек и привязок. ---- */
  function makeObliqueCamera(k) {
    var kk = (k === undefined) ? 0.5 : k;
    var dv = [kk, -1, kk];                     // направление «на зрителя»
    function rot(p) { return [p[0] + kk * p[1], p[2] + kk * p[1], dot(p, dv)]; }
    function inv(r) {
      var y = -r[2];
      return [r[0] + kk * r[2], y, r[1] + kk * r[2]];
    }
    return { rot: rot, inv: inv, dir: normalize(dv), oblique: true, k: kk };
  }

  /* ---- пересечение луча с кубом (метод плит) ---- */
  function rayCube(origin, dir, half) {
    var h = (half === undefined) ? H : half;
    var tmin = -Infinity, tmax = Infinity;
    for (var i = 0; i < 3; i++) {
      if (Math.abs(dir[i]) < 1e-12) {
        if (origin[i] < -h - 1e-9 || origin[i] > h + 1e-9) return null;
      } else {
        var t1 = (-h - origin[i]) / dir[i];
        var t2 = (h - origin[i]) / dir[i];
        if (t1 > t2) { var tmp = t1; t1 = t2; t2 = tmp; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return null;
      }
    }
    return { tEnter: tmin, tExit: tmax };
  }

  /* Точка поверхности куба, которую видит камера в пикселе (sx, sy). */
  function clampToCube(p) {
    return [
      Math.max(-H, Math.min(H, p[0])),
      Math.max(-H, Math.min(H, p[1])),
      Math.max(-H, Math.min(H, p[2]))
    ];
  }

  function surfacePointFromScreen(sx, sy, cam, cx, cy, scale) {
    var x2 = (sx - cx) / scale;
    var y2 = (cy - sy) / scale;
    var origin = cam.inv([x2, y2, 0]);
    // Строгий вариант, затем чуть расширенный: так луч не "теряется"
    // на силуэтных рёбрах и вершинах из-за погрешности вычислений.
    var hit = rayCube(origin, cam.dir);
    if (!hit) hit = rayCube(origin, cam.dir, H + 0.02);
    if (!hit) return null;
    var t = Math.max(hit.tEnter, hit.tExit);
    return clampToCube(add(origin, mul(cam.dir, t)));
  }

  /* ---- сечение ---- */
  function dedupe(pts) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var dup = false;
      for (var j = 0; j < out.length; j++) if (dist(pts[i], out[j]) < 1e-6) { dup = true; break; }
      if (!dup) out.push(pts[i]);
    }
    return out;
  }

  function centroid(pts) {
    var c = [0, 0, 0];
    for (var i = 0; i < pts.length; i++) { c[0] += pts[i][0]; c[1] += pts[i][1]; c[2] += pts[i][2]; }
    return mul(c, 1 / pts.length);
  }

  function orderPolygon(pts, n) {
    var c = centroid(pts);
    var ref = null, best = -1;
    for (var i = 0; i < pts.length; i++) {
      var d = dist(pts[i], c);
      if (d > best) { best = d; ref = sub(pts[i], c); }
    }
    var u = normalize(ref);
    var w = cross(n, u);
    function ang(p) {
      var r = sub(p, c);
      return Math.atan2(dot(r, w), dot(r, u));
    }
    return pts.slice().sort(function (a, b) { return ang(a) - ang(b); });
  }

  /* Сечение плоскостью n·x = d (нормаль n нормируется вместе с d). */
  function sectionWithPlane(n, d) {
    var ln = len(n);
    if (ln < EPS) return { points: [], normal: null, d: 0, degenerate: true };
    var nn = mul(n, 1 / ln);
    var dd = d / ln;
    var raw = [];
    for (var e = 0; e < EDGES.length; e++) {
      var P = VERTICES[EDGES[e][0]];
      var Q = VERTICES[EDGES[e][1]];
      var fp = dot(nn, P) - dd;
      var fq = dot(nn, Q) - dd;
      var onP = Math.abs(fp) < 1e-7;
      var onQ = Math.abs(fq) < 1e-7;
      if (onP) raw.push(P);
      if (onQ) raw.push(Q);
      if (!onP && !onQ && fp * fq < 0) {
        var t = fp / (fp - fq);
        raw.push(lerp(P, Q, t));
      }
    }
    var pts = dedupe(raw);
    if (pts.length < 3) return { points: pts, normal: nn, d: dd, degenerate: true };
    return { points: orderPolygon(pts, nn), normal: nn, d: dd, degenerate: false };
  }

  /* Сечение плоскостью через три точки A, B, C. */
  function section(A, B, C) {
    var n = cross(sub(B, A), sub(C, A));
    if (len(n) < 1e-9) return { points: [], normal: null, d: 0, degenerate: true };
    return sectionWithPlane(n, dot(n, A));
  }

  /* ---- характеристики многоугольника ---- */
  function sideLengths(pts) {
    var out = [];
    for (var i = 0; i < pts.length; i++) out.push(dist(pts[i], pts[(i + 1) % pts.length]));
    return out;
  }

  function polygonPerimeter(pts) {
    var s = 0;
    for (var i = 0; i < pts.length; i++) s += dist(pts[i], pts[(i + 1) % pts.length]);
    return s;
  }

  function polygonArea(pts) {
    if (pts.length < 3) return 0;
    var s = [0, 0, 0];
    for (var i = 0; i < pts.length; i++) s = add(s, cross(pts[i], pts[(i + 1) % pts.length]));
    return 0.5 * len(s);
  }

  function interiorAngles(pts) {
    var n = pts.length, out = [];
    for (var i = 0; i < n; i++) {
      var prev = pts[(i - 1 + n) % n], cur = pts[i], next = pts[(i + 1) % n];
      var a = normalize(sub(prev, cur)), b = normalize(sub(next, cur));
      out.push(Math.acos(Math.max(-1, Math.min(1, dot(a, b)))));
    }
    return out;
  }

  function isRegular(pts) {
    if (pts.length < 3) return false;
    var s = sideLengths(pts);
    var avg = 0;
    for (var i = 0; i < s.length; i++) avg += s[i];
    avg /= s.length;
    for (i = 0; i < s.length; i++) if (Math.abs(s[i] - avg) > 1e-6) return false;
    var a = interiorAngles(pts);
    var avga = 0;
    for (i = 0; i < a.length; i++) avga += a[i];
    avga /= a.length;
    for (i = 0; i < a.length; i++) if (Math.abs(a[i] - avga) > 1e-6) return false;
    return true;
  }

  function polygonName(n) {
    var names = { 3: 'треугольник', 4: 'четырёхугольник', 5: 'пятиугольник', 6: 'шестиугольник', 7: 'семиугольник', 8: 'восьмиугольник' };
    return names[n] || (n + '-угольник');
  }

  function quadKind(pts) {
    var s = sideLengths(pts), ang = interiorAngles(pts);
    function eq(a, b) { return Math.abs(a - b) < 1e-6; }
    var allEq = eq(s[0], s[1]) && eq(s[1], s[2]) && eq(s[2], s[3]);
    var right = true;
    for (var i = 0; i < ang.length; i++) if (Math.abs(ang[i] - Math.PI / 2) > 1e-6) right = false;
    if (allEq && right) return 'квадрат';
    if (right) return 'прямоугольник';
    if (allEq) return 'ромб';
    if (eq(s[0], s[2]) && eq(s[1], s[3])) return 'параллелограмм';
    return 'четырёхугольник';
  }

  function describePolygon(pts) {
    if (pts.length < 3) return 'нет сечения';
    if (pts.length === 4) return quadKind(pts);
    return (isRegular(pts) ? 'правильный ' : '') + polygonName(pts.length);
  }

  /* ---- пошаговое построение сечения ---- */
  function faceIndexOfSide(a, b) {
    var m = mul(add(a, b), 0.5);
    var axis = 0, best = -1;
    for (var k = 0; k < 3; k++) if (Math.abs(m[k]) > best) { best = Math.abs(m[k]); axis = k; }
    if (best < 0.5 - 1e-7) return -1;
    var sign = m[axis] >= 0 ? 1 : -1;
    for (var f = 0; f < FACES.length; f++) {
      var n = FACES[f].normal;
      if (Math.abs(Math.abs(n[axis]) - 1) < 1e-9 && (n[axis] > 0 ? 1 : -1) === sign) return f;
    }
    return -1;
  }

  /* ---- точки вне куба: луч камеры, привязка к прямым рёбер ---- */

  /* Луч камеры, идущий в пиксель (sx, sy). Проекция ортографическая. */
  function screenRay(sx, sy, cam, cx, cy, scale) {
    return {
      origin: cam.inv([(sx - cx) / scale, (cy - sy) / scale, 0]),
      dir: cam.dir
    };
  }

  function projectScreen(p, cam, cx, cy, scale) {
    var r = cam.rot(p);
    return { x: cx + scale * r[0], y: cy - scale * r[1] };
  }

  /* Расстояние от пикселя до проекции прямой (не отрезка) на экране. */
  function distToScreenLine(px, py, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var L = Math.sqrt(dx * dx + dy * dy);
    if (L < 1e-6) return Math.sqrt((px - a.x) * (px - a.x) + (py - a.y) * (py - a.y));
    return Math.abs((px - a.x) * dy - (py - a.y) * dx) / L;
  }

  /* Ближайшая точка прямой (a, b) к лучу. */
  function closestOnLine(ray, a, b) {
    var v = sub(b, a), u = ray.dir, w0 = sub(ray.origin, a);
    var uu = dot(u, u), uv = dot(u, v), vv = dot(v, v), uw = dot(u, w0), vw = dot(v, w0);
    var den = uu * vv - uv * uv;
    if (Math.abs(den) < 1e-12) return null;
    var t = (uu * vw - uv * uw) / den;
    var s = (uv * vw - vv * uw) / den;
    var pLine = add(a, mul(v, t));
    return { point: pLine, t: t, s: s, dist: dist(add(ray.origin, mul(u, s)), pLine) };
  }

  /* Точка на прямой ребра куба, ближайшая к курсору: так задают точки вне куба
     (на продолжении ребра). maxT - на сколько рёбер можно уйти за вершину. */
  function edgeSnapPoint(sx, sy, cam, cx, cy, scale, maxT) {
    var lim = (maxT === undefined) ? 1.2 : maxT;
    var ray = screenRay(sx, sy, cam, cx, cy, scale);
    var best = null;
    for (var e = 0; e < EDGES.length; e++) {
      var A = VERTICES[EDGES[e][0]], B = VERTICES[EDGES[e][1]];
      var d = distToScreenLine(sx, sy, projectScreen(A, cam, cx, cy, scale), projectScreen(B, cam, cx, cy, scale));
      if (best && d >= best.d) continue;
      var hit = closestOnLine(ray, A, B);
      if (!hit) continue;
      best = { d: d, edge: e, t: hit.t, point: hit.point };
    }
    if (!best) return null;
    var t = Math.max(-lim, Math.min(1 + lim, best.t));
    var A2 = VERTICES[EDGES[best.edge][0]], B2 = VERTICES[EDGES[best.edge][1]];
    return { edge: best.edge, edgeName: EDGE_NAMES[best.edge], t: t, point: lerp(A2, B2, t), dist: best.d };
  }

  /* Где находится точка: вершина, ребро, грань, продолжение ребра и т.д. */
  function pointDescription(p) {
    var i, e, ax;
    for (i = 0; i < VERTICES.length; i++) if (dist(p, VERTICES[i]) < 1e-7) return 'вершина ' + VERTEX_NAMES[i];
    for (e = 0; e < EDGES.length; e++) {
      var A = VERTICES[EDGES[e][0]], B = VERTICES[EDGES[e][1]];
      var ab = sub(B, A), ap = sub(p, A);
      if (len(cross(ab, ap)) > 1e-7) continue;
      var t = dot(ap, ab) / dot(ab, ab);
      if (t >= -1e-7 && t <= 1 + 1e-7) {
        return Math.abs(t - 0.5) < 1e-7 ? 'середина ребра ' + EDGE_NAMES[e] : 'на ребре ' + EDGE_NAMES[e];
      }
      return 'на продолжении ребра ' + EDGE_NAMES[e] + ' (вне куба)';
    }
    for (i = 0; i < FACES.length; i++) {
      if (Math.abs(dot(FACES[i].normal, p) - H) > 1e-7) continue;
      var inFace = true;
      for (ax = 0; ax < 3; ax++) if (p[ax] < -H - 1e-7 || p[ax] > H + 1e-7) inFace = false;
      return inFace ? 'на грани ' + FACE_NAMES[i] : 'в плоскости грани ' + FACE_NAMES[i] + ' (вне куба)';
    }
    var inside = true;
    for (ax = 0; ax < 3; ax++) if (Math.abs(p[ax]) > H + 1e-7) inside = false;
    return inside ? 'внутри куба' : 'вне куба';
  }

  function edgeNameOfPoint(p) {
    for (var e = 0; e < EDGES.length; e++) {
      var A = VERTICES[EDGES[e][0]], B = VERTICES[EDGES[e][1]];
      var ab = sub(B, A);
      var t = dot(sub(p, A), ab) / dot(ab, ab);
      t = Math.max(0, Math.min(1, t));
      if (dist(p, add(A, mul(ab, t))) < 1e-6) return EDGE_NAMES[e];
    }
    return null;
  }

  function faceOfPoint(p, fi) {
    return Math.abs(dot(FACES[fi].normal, p) - 0.5) < 1e-7;
  }

  function edgeIndex(a, b) {
    for (var e = 0; e < EDGES.length; e++) {
      if ((EDGES[e][0] === a && EDGES[e][1] === b) || (EDGES[e][0] === b && EDGES[e][1] === a)) return e;
    }
    return -1;
  }

  /* Пересечение прямых p + a*dp и q + b*dq (в одной плоскости). */
  function lineLineHit(p, dp, q, dq) {
    var N = cross(dp, dq);
    var d2 = dot(N, N);
    if (d2 < 1e-14) return null;
    var w = sub(q, p);
    var a = dot(cross(w, dq), N) / d2;
    var b = dot(cross(w, dp), N) / d2;
    // проверка: точка должна лежать на второй прямой
    if (dist(add(p, mul(dp, a)), add(q, mul(dq, b))) > 1e-6) return null;
    return { p: add(p, mul(dp, a)), onFirst: a, onSecond: b };
  }

  /* Пересечение прямой pq с плоскостью dot(n, x) = dd (null, если параллельны). */
  function linePlaneHit(p, q, n, dd) {
    var d = sub(q, p);
    var den = dot(n, d);
    if (Math.abs(den) < 1e-9) return null;
    var t = (dd - dot(n, p)) / den;
    return add(p, mul(d, t));
  }

  function joinRu(list) {
    if (!list.length) return '';
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + ' и ' + list[list.length - 1];
  }

  /* Пошаговая инструкция построения сечения.
     method: 'trace' - метод следов, 'parallel' - метод параллельности, 'combined' - комбинированный.
     Каждый шаг опирается только на уже известные точки; новые точки появляются как
     пересечения главного следа с прямыми рёбер и как продолжения сторон до прямых рёбер. */
  function buildConstruction(given, sec, method) {
    if (!sec || !sec.normal || !sec.points || sec.points.length < 3) return null;
    method = method || 'trace';
    var pts = sec.points, n = pts.length;
    var sideFace = [], i, j, k;
    for (i = 0; i < n; i++) sideFace.push(faceIndexOfSide(pts[i], pts[(i + 1) % n]));

    /* ---------- метки точек ---------- */
    var labelList = [], vCount = 0, tCount = 0;
    function labelAt(p) {
      for (var t = 0; t < labelList.length; t++) if (dist(p, labelList[t].p) < 1e-6) return labelList[t].label;
      return null;
    }
    function existingLabel(p) {
      var t;
      for (t = 0; t < given.length; t++) if (dist(p, given[t]) < 1e-6) return GIVEN_LETTERS[t];
      for (t = 0; t < VERTICES.length; t++) if (dist(p, VERTICES[t]) < 1e-6) return VERTEX_NAMES[t];
      return labelAt(p);
    }
    function labelFor(p) {
      var lab = existingLabel(p);
      if (lab) return lab;
      vCount++;
      lab = 'X' + vCount;
      labelList.push({ p: p, label: lab });
      return lab;
    }
    function newTLabel(p) {
      var lab = existingLabel(p);
      if (lab) return lab;
      tCount++;
      lab = 'T' + tCount;
      labelList.push({ p: p, label: lab });
      return lab;
    }

    /* ---------- известные точки секущей плоскости ---------- */
    var known = [];
    function addKnown(p, label) {
      if (!p) return null;
      var t;
      for (t = 0; t < known.length; t++) if (dist(known[t].p, p) < 1e-6) return known[t];
      var lab = label || existingLabel(p) || labelFor(p);
      var used = false;
      for (t = 0; t < labelList.length; t++) if (labelList[t].label === lab) used = true;
      if (!used) labelList.push({ p: p, label: lab });
      var rec = { p: p, label: lab };
      known.push(rec);
      return rec;
    }
    function knownInFace(f) {
      var out = [], t;
      for (t = 0; t < known.length; t++) if (faceOfPoint(known[t].p, f)) out.push(known[t]);
      return out;
    }
    function isKnown(p) {
      for (var t = 0; t < known.length; t++) if (dist(known[t].p, p) < 1e-6) return true;
      return false;
    }
    function commonEdge(f1, f2) {
      if (f1 < 0 || f2 < 0) return -1;
      for (var e = 0; e < EDGES.length; e++) {
        var ef = EDGE_FACES[e];
        if (ef.indexOf(f1) >= 0 && ef.indexOf(f2) >= 0) return e;
      }
      return -1;
    }
    /* Точка лежит на ребре грани (а не на его продолжении)? */
    function onFaceEdge(p, f) {
      for (var e = 0; e < EDGES.length; e++) {
        if (EDGE_FACES[e].indexOf(f) < 0) continue;
        var A = VERTICES[EDGES[e][0]], B = VERTICES[EDGES[e][1]];
        var ab = sub(B, A), ap = sub(p, A);
        if (len(cross(ab, ap)) > 1e-9) continue;
        var u = dot(ap, ab) / dot(ab, ab);
        if (u >= -1e-9 && u <= 1 + 1e-9) return true;
      }
      return false;
    }
    /* 2 - вершина сечения на ребре грани, 1 - заданная точка, 0 - вспомогательная. */
    function rankOf(p, f) {
      if (onFaceEdge(p, f)) return 2;
      for (var g = 0; g < given.length; g++) if (dist(p, given[g]) < 1e-6) return 1;
      return 0;
    }

    for (i = 0; i < given.length; i++) addKnown(given[i], GIVEN_LETTERS[i]);

    var steps = [];
    steps.push({
      kind: 'intro', mode: 'intro', face: -1, from: null, to: null,
      text: 'Даны точки ' + joinRu(given.map(function (p, t) { return GIVEN_LETTERS[t]; })) +
            '. Через них проходит секущая плоскость. Строим сечение по шагам: каждую новую линию проводим через две уже известные точки, ' +
            'а новые точки получаем как пересечения с прямыми рёбер куба.'
    });

    /* ---------- шаг 1: главный след на плоскости нижней грани ---------- */
    var hits = [];
    for (i = 0; i < given.length; i++) {
      for (j = i + 1; j < given.length; j++) {
        var hp = linePlaneHit(given[i], given[j], FACES[0].normal, 0.5);
        if (hp) hits.push({ p: hp, a: i, b: j });
      }
    }
    var best = null;
    for (i = 0; i < hits.length; i++) {
      for (j = i + 1; j < hits.length; j++) {
        var dd = dist(hits[i].p, hits[j].p);
        if (dd > 1e-6 && (!best || dd > best.d)) best = { i: i, j: j, d: dd };
      }
    }

    if (best) {
      var pairA = hits[best.i], pairB = hits[best.j];
      var s1 = pairA.p, s2 = pairB.p, mainDir = normalize(sub(s2, s1));
      var baseEdges = [[0, 1], [1, 2], [2, 3], [3, 0]];
      var marks = [], solidFrom = null, solidTo = null, inside = [];
      for (i = 0; i < baseEdges.length; i++) {
        var E1 = VERTICES[baseEdges[i][0]], E2 = VERTICES[baseEdges[i][1]];
        var eIdx = edgeIndex(baseEdges[i][0], baseEdges[i][1]);
        var hl = lineLineHit(s1, mainDir, E1, sub(E2, E1));
        if (!hl) continue;
        var dup = false;
        for (j = 0; j < marks.length; j++) if (dist(marks[j].p, hl.p) < 1e-6) dup = true;
        if (dup) continue;
        var onEdge = hl.onSecond >= -1e-9 && hl.onSecond <= 1 + 1e-9;
        var rec = addKnown(hl.p, onEdge ? labelFor(hl.p) : newTLabel(hl.p));
        marks.push({ p: hl.p, inside: onEdge, edge: EDGE_NAMES[eIdx], label: rec.label });
        if (onEdge) {
          inside.push(marks[marks.length - 1]);
          if (!solidFrom) solidFrom = hl.p; else if (!solidTo) solidTo = hl.p;
        }
      }
      addKnown(s1, 'S1');
      addKnown(s2, 'S2');

      function coincideNote(pt) {
        var g2;
        for (g2 = 0; g2 < given.length; g2++) if (dist(pt, given[g2]) < 1e-6) return ' (совпадает с точкой ' + GIVEN_LETTERS[g2] + ')';
        for (g2 = 0; g2 < VERTICES.length; g2++) if (dist(pt, VERTICES[g2]) < 1e-6) return ' (совпадает с вершиной ' + VERTEX_NAMES[g2] + ')';
        return '';
      }
      var tail;
      if (inside.length >= 2) {
        tail = 'Главный след пересекает рёбра ' + inside[0].edge + ' и ' + inside[1].edge + ' в точках ' +
               inside[0].label + ' и ' + inside[1].label + ' — это первые вершины сечения.';
      } else {
        var tNames = [];
        for (i = 0; i < marks.length; i++) if (!marks[i].inside) tNames.push(marks[i].label);
        tail = tNames.length
          ? 'Главный след не задевает сами рёбра нижней грани, но его точки ' + joinRu(tNames) +
            ' лежат на прямых рёбер, а значит принадлежат и соседним граням.'
          : 'Главный след не пересекает нижнюю грань.';
      }
      steps.push({
        kind: 'base', mode: 'trace', face: 0,
        from: s1, to: s2, dir: mainDir, solidFrom: solidFrom, solidTo: solidTo, marks: marks,
        text: 'Главный след. Прямая ' + GIVEN_LETTERS[pairA.a] + GIVEN_LETTERS[pairA.b] +
              ' лежит в секущей плоскости, продолжаем её до пересечения с плоскостью нижней грани — получаем точку S1' + coincideNote(s1) + '. ' +
              'Прямую ' + GIVEN_LETTERS[pairB.a] + GIVEN_LETTERS[pairB.b] + ' продолжаем так же — получаем точку S2' + coincideNote(s2) + '. ' +
              'Прямая S1S2 — главный след секущей плоскости на плоскости нижней грани. ' + tail
      });
    } else {
      steps.push({
        kind: 'base', mode: 'none', face: -1, from: null, to: null,
        text: 'Прямые через заданные точки параллельны нижней грани, поэтому главного следа на ней нет. ' +
              'Начинаем со стороны, проходящей через две заданные точки в одной грани, а далее используем свойство параллельности.'
      });
    }

    /* ---------- шаг за шагом строим стороны ---------- */
    var remaining = [];
    for (i = 0; i < n; i++) if (sideFace[i] >= 0) remaining.push(i);
    var guard = 0;

    while (remaining.length > 0 && guard++ < 50) {
      var progress = false;

      // а) ищем грань, в плоскости которой уже известны две точки
      var cand = null;
      for (i = 0; i < remaining.length; i++) {
        var f = sideFace[remaining[i]];
        var kp = knownInFace(f);
        if (kp.length < 2) continue;
        var pair = null;
        for (var x1 = 0; x1 < kp.length; x1++) {
          for (var x2 = x1 + 1; x2 < kp.length; x2++) {
            var dd2 = dist(kp[x1].p, kp[x2].p);
            if (dd2 < 1e-9) continue;
            var sc = rankOf(kp[x1].p, f) + rankOf(kp[x2].p, f);
            if (!pair || sc > pair.score || (sc === pair.score && dd2 > pair.d)) pair = { a: kp[x1], b: kp[x2], d: dd2, score: sc };
          }
        }
        if (!pair) continue;
        var si = remaining[i];
        var preA = existingLabel(pts[si]), preB = existingLabel(pts[(si + 1) % n]);
        var key = ((preA && preB) ? 0 : 10) + (f === 0 ? 0 : 1);
        if (!cand || key < cand.key) cand = { si: si, face: f, pair: pair, preA: preA, preB: preB, key: key };
      }
      if (cand) {
        var from = pts[cand.si], to = pts[(cand.si + 1) % n];
        var la = addKnown(from, null).label, lb = addKnown(to, null).label;
        var e1 = edgeNameOfPoint(from), e2 = edgeNameOfPoint(to);
        var text;
        if (cand.preA && cand.preB) {
          text = 'Грань ' + FACE_NAMES[cand.face] + '. Точки ' + la + ' и ' + lb +
                 ' уже известны, обе лежат в этой грани, — соединяем их: отрезок ' + la + lb + ' — сторона сечения.';
        } else {
          var where = [], names = [];
          if (!cand.preA) { where.push(e1 ? 'ребро ' + e1 : 'границу грани'); names.push(la); }
          if (!cand.preB) { where.push(e2 ? 'ребро ' + e2 : 'границу грани'); names.push(lb); }
          text = 'Грань ' + FACE_NAMES[cand.face] + '. Через уже известные точки ' + cand.pair.a.label + ' и ' + cand.pair.b.label +
                 ' проводим след секущей плоскости на этой грани. След пересекает ' + joinRu(where) + ' в ' +
                 (names.length > 1 ? 'точках ' : 'точке ') + joinRu(names) + '. Отрезок ' + la + lb + ' — сторона сечения.';
        }
        steps.push({
          kind: 'side', mode: 'trace', face: cand.face, from: from, to: to, fromLabel: la, toLabel: lb,
          points: [cand.pair.a.label, cand.pair.b.label], text: text
        });
        remaining.splice(remaining.indexOf(cand.si), 1);
        progress = true;
      }
      if (progress) continue;

      // б) метод параллельности: на параллельной грани сторона уже построена
      if (method !== 'trace') {
        for (i = 0; i < remaining.length && !progress; i++) {
          var f2 = sideFace[remaining[i]];
          var kp2 = knownInFace(f2);
          if (!kp2.length) continue;
          var partner = null;
          for (var w = 0; w < steps.length; w++) {
            if (steps[w].kind === 'side' && OPPOSITE_FACE[steps[w].face] === f2) partner = steps[w];
          }
          if (!partner) continue;
          var si2 = remaining[i], from2 = pts[si2], to2 = pts[(si2 + 1) % n];
          var preA2 = existingLabel(from2), preB2 = existingLabel(to2);
          var la2 = addKnown(from2, null).label, lb2 = addKnown(to2, null).label;
          var eA2 = edgeNameOfPoint(from2), eB2 = edgeNameOfPoint(to2);
          var w2 = [], n2 = [];
          if (!preA2) { w2.push(eA2 ? 'ребро ' + eA2 : 'границу грани'); n2.push(la2); }
          if (!preB2) { w2.push(eB2 ? 'ребро ' + eB2 : 'границу грани'); n2.push(lb2); }
          steps.push({
            kind: 'side', mode: 'parallel', face: f2, from: from2, to: to2, fromLabel: la2, toLabel: lb2,
            known: kp2[0].p, knownLabel: kp2[0].label,
            partner: { from: partner.from, to: partner.to, face: partner.face, labels: [partner.fromLabel, partner.toLabel] },
            text: 'Грани ' + FACE_NAMES[f2] + ' и ' + FACE_NAMES[partner.face] + ' параллельны, поэтому линии их пересечения с секущей плоскостью параллельны. ' +
                  'На грани ' + FACE_NAMES[partner.face] + ' уже построена сторона ' + partner.fromLabel + partner.toLabel + '. ' +
                  'Через точку ' + kp2[0].label + ' проводим прямую, параллельную ' + partner.fromLabel + partner.toLabel + '. ' +
                  'Она пересекает ' + joinRu(w2) + ' в ' + (n2.length > 1 ? 'точках ' : 'точке ') + joinRu(n2) +
                  '. Отрезок ' + la2 + lb2 + ' — сторона сечения.'
          });
          remaining.splice(i, 1);
          progress = true;
        }
      }
      if (progress) continue;

      // в) продолжаем построенную сторону до прямой ребра — получаем новую точку в соседней грани
      for (i = 0; i < remaining.length && !progress; i++) {
        var f3 = sideFace[remaining[i]];
        for (var w3 = 0; w3 < steps.length && !progress; w3++) {
          var st3 = steps[w3];
          if (st3.kind !== 'side' || st3.face === f3) continue;
          var ce = commonEdge(st3.face, f3);
          if (ce < 0) continue;
          var EA = VERTICES[EDGES[ce][0]], EB = VERTICES[EDGES[ce][1]];
          var hit = lineLineHit(st3.from, normalize(sub(st3.to, st3.from)), EA, sub(EB, EA));
          if (!hit) continue;
          if (dist(hit.p, st3.from) < 1e-7 || dist(hit.p, st3.to) < 1e-7) continue;
          if (isKnown(hit.p)) continue;
          var nl = newTLabel(hit.p);
          addKnown(hit.p, nl);
          steps.push({
            kind: 'extend', mode: 'extend', face: st3.face, toFace: f3,
            sideFrom: st3.from, sideTo: st3.to, from: st3.from, to: st3.to,
            newPoint: hit.p, newLabel: nl,
            text: 'Продолжаем сторону ' + st3.fromLabel + st3.toLabel + ' (она лежит в грани ' + FACE_NAMES[st3.face] +
                  ') до пересечения с прямой, содержащей ребро ' + EDGE_NAMES[ce] + ', — получаем новую точку ' + nl +
                  '. Она принадлежит секущей плоскости и лежит в плоскости грани ' + FACE_NAMES[f3] + '.'
          });
          progress = true;
        }
      }
    }

    // страховка: если грань почему-то не построилась, добавляем её сторону по секущей плоскости
    for (i = 0; i < remaining.length; i++) {
      var fr = sideFace[remaining[i]], frA = pts[remaining[i]], frB = pts[(remaining[i] + 1) % n];
      var lr1 = addKnown(frA, null).label, lr2 = addKnown(frB, null).label;
      steps.push({
        kind: 'side', mode: 'trace', face: fr, from: frA, to: frB, fromLabel: lr1, toLabel: lr2, points: [],
        text: 'Грань ' + FACE_NAMES[fr] + ': сторона ' + lr1 + lr2 + ' — отрезок секущей плоскости в этой грани.'
      });
    }

    var parallelCount = 0, extendCount = 0;
    for (k = 1; k < steps.length; k++) {
      if (steps[k].kind === 'side' && steps[k].mode === 'parallel') parallelCount++;
      if (steps[k].kind === 'extend') extendCount++;
    }
    if (method === 'parallel' && parallelCount === 0) {
      steps[0].text += ' В этом сечении параллельных граней нет, поэтому все стороны строятся по следам.';
    }
    if (method === 'combined' && parallelCount > 0) {
      steps[0].text += ' Часть сторон строится по двум известным точкам, часть — по свойству параллельности.';
    }

    return {
      method: method, steps: steps, labels: labelList, faces: sideFace,
      parallelCount: parallelCount, extendCount: extendCount
    };
  }

  /* ---- готовые сечения ---- */
  function presetTriangle() { return [[H, H, 0], [H, 0, H], [0, H, H]]; }
  function presetSquare() { return [[0, -H, -H], [0, H, -H], [0, H, H]]; }
  function presetRectangle() { return [[H, -H, -H], [-H, H, -H], [H, -H, H]]; }
  function presetHexagon() { return [[H, -H, 0], [-H, 0, H], [0, H, -H]]; }
  /* Точка M - на продолжении ребра AB за вершиной B, то есть вне куба. */
  function presetOutside() { return [[1.1, -H, -H], [H, H, 0], [-H, H, H]]; }

  function triangleArea(a, b, c) { return 0.5 * len(cross(sub(b, a), sub(c, a))); }

  function pickWellSpread(points, k) {
    if (points.length < k) return null;
    var best = null, bestA = -1;
    for (var i = 0; i < points.length; i++) {
      for (var j = i + 1; j < points.length; j++) {
        for (var m = j + 1; m < points.length; m++) {
          var a = triangleArea(points[i], points[j], points[m]);
          if (a > bestA) { bestA = a; best = [points[i], points[j], points[m]]; }
        }
      }
    }
    return best;
  }

  function presetPentagon() {
    var sec = sectionWithPlane([1, 2, 3], 0.75);
    return pickWellSpread(sec.points, 3) || presetTriangle();
  }

  function randomSectionPoints(rng) {
    var r = rng || Math.random;
    for (var iter = 0; iter < 400; iter++) {
      var n = [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1];
      if (len(n) < 0.3) continue;
      var nn = normalize(n);
      var vals = VERTICES.map(function (v) { return dot(nn, v); });
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      var d = lo + r() * (hi - lo);
      var sec = sectionWithPlane(nn, d);
      if (sec.points.length < 3) continue;
      var pick = pickWellSpread(sec.points, 3);
      if (pick && triangleArea(pick[0], pick[1], pick[2]) > 0.02) return pick;
    }
    return presetTriangle();
  }

  return {
    EPS: EPS, H: H,
    VERTICES: VERTICES, FACES: FACES, EDGES: EDGES, EDGE_FACES: EDGE_FACES, EDGE_MIDPOINTS: EDGE_MIDPOINTS,
    add: add, sub: sub, mul: mul, dot: dot, cross: cross, len: len, dist: dist, normalize: normalize, lerp: lerp,
    makeCamera: makeCamera, makeObliqueCamera: makeObliqueCamera,
    rayCube: rayCube, clampToCube: clampToCube, surfacePointFromScreen: surfacePointFromScreen,
    section: section, sectionWithPlane: sectionWithPlane, orderPolygon: orderPolygon,
    sideLengths: sideLengths, polygonPerimeter: polygonPerimeter, perimeter: polygonPerimeter,
    polygonArea: polygonArea, interiorAngles: interiorAngles, isRegular: isRegular,
    polygonName: polygonName, quadKind: quadKind, describePolygon: describePolygon, centroid: centroid,
    buildConstruction: buildConstruction, faceIndexOfSide: faceIndexOfSide, edgeNameOfPoint: edgeNameOfPoint,
    screenRay: screenRay, closestOnLine: closestOnLine, edgeSnapPoint: edgeSnapPoint, pointDescription: pointDescription,
    VERTEX_NAMES: VERTEX_NAMES, GIVEN_LETTERS: GIVEN_LETTERS, FACE_NAMES: FACE_NAMES, EDGE_NAMES: EDGE_NAMES, OPPOSITE_FACE: OPPOSITE_FACE,
    presetTriangle: presetTriangle, presetSquare: presetSquare, presetRectangle: presetRectangle,
    presetPentagon: presetPentagon, presetHexagon: presetHexagon, presetOutside: presetOutside,
    pickWellSpread: pickWellSpread, triangleArea: triangleArea, randomSectionPoints: randomSectionPoints
  };
});
