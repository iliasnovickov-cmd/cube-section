/* Проверка геометрии: node cube-section-core.test.cjs */
const assert = require('assert');
const C = require('./cube-section-core.js');

let passed = 0;
function ok(name, cond, extra) {
  assert.ok(cond, name + (extra ? ' -> ' + extra : ''));
  passed++;
}
function near(a, b, eps, name) {
  eps = eps || 1e-9;
  assert.ok(Math.abs(a - b) <= eps, name + ': ожидалось ' + b + ', получено ' + a);
  passed++;
}

// Структура куба
ok('12 рёбер', C.EDGES.length === 12, 'получено ' + C.EDGES.length);
ok('6 граней', C.FACES.length === 6);
ok('у каждого ребра 2 грани', C.EDGE_FACES.every(function (f) { return f.length === 2; }));
ok('12 середин рёбер', C.EDGE_MIDPOINTS.length === 12);

// Правильный шестиугольник через середины рёбер
const hex = C.section(C.presetHexagon()[0], C.presetHexagon()[1], C.presetHexagon()[2]);
ok('шестиугольник: 6 сторон', hex.points.length === 6, 'получено ' + hex.points.length);
ok('шестиугольник правильный', C.isRegular(hex.points));
near(C.polygonArea(hex.points), 3 * Math.sqrt(3) / 4, 1e-9, 'площадь правильного шестиугольника');
near(C.polygonPerimeter(hex.points), 6 / Math.SQRT2, 1e-9, 'периметр правильного шестиугольника');
ok('описание = правильный шестиугольник', C.describePolygon(hex.points) === 'правильный шестиугольник', C.describePolygon(hex.points));

// Квадрат (плоскость x = 0)
const sq = C.section(C.presetSquare()[0], C.presetSquare()[1], C.presetSquare()[2]);
ok('квадрат: 4 стороны', sq.points.length === 4);
near(C.polygonArea(sq.points), 1, 1e-9, 'площадь квадрата');
ok('описание = квадрат', C.describePolygon(sq.points) === 'квадрат', C.describePolygon(sq.points));

// Прямоугольник 1 x sqrt(2)
const rect = C.section(C.presetRectangle()[0], C.presetRectangle()[1], C.presetRectangle()[2]);
ok('прямоугольник: 4 стороны', rect.points.length === 4);
near(C.polygonArea(rect.points), Math.SQRT2, 1e-9, 'площадь прямоугольника');
ok('описание = прямоугольник', C.describePolygon(rect.points) === 'прямоугольник', C.describePolygon(rect.points));

// Треугольник (отсечение угла)
const tri = C.section(C.presetTriangle()[0], C.presetTriangle()[1], C.presetTriangle()[2]);
ok('треугольник: 3 стороны', tri.points.length === 3);
near(C.polygonArea(tri.points), Math.sqrt(3) / 8, 1e-9, 'площадь треугольника');
C.sideLengths(tri.points).forEach(function (s, i) { near(s, 1 / Math.SQRT2, 1e-9, 'сторона треугольника ' + (i + 1)); });

// Пятиугольник
const pent = C.section(C.presetPentagon()[0], C.presetPentagon()[1], C.presetPentagon()[2]);
ok('пятиугольник: 5 сторон', pent.points.length === 5, 'получено ' + pent.points.length);
ok('описание = пятиугольник', C.describePolygon(pent.points) === 'пятиугольник', C.describePolygon(pent.points));

// Сечение по верхней грани: z = 0.5
const face = C.sectionWithPlane([0, 0, 1], 0.5);
ok('сечение по грани: 4 точки', face.points.length === 4);
near(C.polygonArea(face.points), 1, 1e-9, 'площадь грани');
ok('грань = квадрат', C.describePolygon(face.points) === 'квадрат');

// Касание вершины: ровно одна точка
const touch = C.sectionWithPlane([1, 1, 1], 1.5);
ok('касание даёт < 3 точек', touch.points.length < 3 && touch.degenerate, 'получено ' + touch.points.length);

// Вырожденный случай: три коллинеарные точки
const degen = C.section([-0.5, -0.5, -0.5], [0, 0, 0], [0.5, 0.5, 0.5]);
ok('коллинеарные точки -> нет сечения', degen.points.length === 0 && degen.degenerate);

// Обратное проецирование: пиксель -> точка на поверхности куба
const cams = [[0, 0], [0.7, 0.4], [-1.2, -0.9], [2.5, 1.2], [-0.62, 0.40]];
const pts = [[0.5, 0.2, 0.3], [-0.5, 0.1, -0.4], [0.2, 0.5, 0.1], [0.1, -0.5, 0.2], [0.3, 0.3, -0.5]];
cams.forEach(function (ang) {
  const cam = C.makeCamera(ang[0], ang[1]);
  pts.forEach(function (p) {
    const r = cam.rot(p);
    const sx = 300 + 180 * r[0];
    const sy = 250 - 180 * r[1];
    const q = C.surfacePointFromScreen(sx, sy, cam, 300, 250, 180);
    ok('луч попал в куб', !!q);
    const rq = cam.rot(q);
    near(300 + 180 * rq[0], sx, 1e-6, 'обратная проекция x');
    near(250 - 180 * rq[1], sy, 1e-6, 'обратная проекция y');
    const onSurface = Math.abs(Math.abs(q[0]) - 0.5) < 1e-6 || Math.abs(Math.abs(q[1]) - 0.5) < 1e-6 || Math.abs(Math.abs(q[2]) - 0.5) < 1e-6;
    ok('точка лежит на поверхности куба', onSurface, JSON.stringify(q));
  });
});

// Луч мимо куба
const cam0 = C.makeCamera(0, 0);
ok('луч мимо куба -> null', C.surfacePointFromScreen(3000, 3000, cam0, 300, 250, 180) === null);

// Случайные сечения не вырождаются (100 запусков)
let bad = 0;
for (let i = 0; i < 100; i++) {
  const rp = C.randomSectionPoints();
  const s = C.section(rp[0], rp[1], rp[2]);
  if (s.points.length < 3 || C.polygonArea(s.points) < 1e-3) bad++;
}
ok('случайные сечения корректны', bad === 0, 'плохих: ' + bad);

// --- пошаговое построение ---
(function () {
  function mkBuild(given, method) {
    const sec = C.section(given[0], given[1], given[2]);
    return { sec: sec, res: C.buildConstruction(given, sec, method) };
  }
  function sideKey(s) { return s.from.join(',') + '|' + s.to.join(','); }
  function sidesOf(res) { return res.steps.filter(function (s) { return s.kind === 'side'; }); }
  function textOf(res) { return res.steps.map(function (s) { return s.text; }).join(' '); }
  function pointOfLabel(res, label) {
    for (let i = 0; i < res.labels.length; i++) if (res.labels[i].label === label) return res.labels[i].p;
    const vi = C.VERTEX_NAMES.indexOf(label);
    return vi >= 0 ? C.VERTICES[vi] : null;
  }
  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function sectionKeys(sec) {
    const out = [];
    for (let i = 0; i < sec.points.length; i++) out.push(sideKey({ from: sec.points[i], to: sec.points[(i + 1) % sec.points.length] }));
    return out.sort();
  }

  const hexGiven = C.presetHexagon();
  const hexBuild = mkBuild(hexGiven, 'trace');
  const hexRes = hexBuild.res;
  const hexSides = sidesOf(hexRes);

  ok('шестиугольник: построено 6 сторон', hexSides.length === 6, 'получено ' + hexSides.length);
  ok('шестиугольник: стороны совпадают с сечением', sameSet(hexSides.map(sideKey).sort(), sectionKeys(hexBuild.sec)));
  ok('шестиугольник: есть главный след', hexRes.steps[1].kind === 'base' && !!hexRes.steps[1].from);
  ok('шестиугольник: главный след даёт 2 вершины', hexRes.steps[1].marks.filter(function (m) { return m.inside; }).length === 2);
  ok('шестиугольник: сплошной участок следа', !!hexRes.steps[1].solidFrom && !!hexRes.steps[1].solidTo);
  ok('шестиугольник: 4 пересечения с прямыми рёбер', hexRes.steps[1].marks.length === 4);
  ok('главный след: точки в плоскости нижней грани', hexRes.steps[1].marks.every(function (m) { return Math.abs(m.p[2] + 0.5) < 1e-9; }));
  ok('главный след: точки на прямых рёбер', hexRes.steps[1].marks.every(function (m) {
    return Math.abs(Math.abs(m.p[0]) - 0.5) < 1e-9 || Math.abs(Math.abs(m.p[1]) - 0.5) < 1e-9;
  }));
  ok('главный след: точки в секущей плоскости', hexRes.steps[1].marks.every(function (m) {
    return Math.abs(C.dot(hexBuild.sec.normal, m.p) - hexBuild.sec.d) < 1e-9;
  }));
  ok('каждый шаг-след опирается на две разные точки', hexSides.every(function (s) {
    return s.mode !== 'trace' || (s.points && s.points.length === 2 && s.points[0] !== s.points[1]);
  }));
  ok('опорные точки лежат в грани шага и в секущей плоскости', hexSides.every(function (s) {
    if (!s.points || s.points.length < 2) return true;
    return s.points.every(function (lab) {
      const p = pointOfLabel(hexRes, lab);
      return p && Math.abs(C.dot(C.FACES[s.face].normal, p) - 0.5) < 1e-7 &&
             Math.abs(C.dot(hexBuild.sec.normal, p) - hexBuild.sec.d) < 1e-7;
    });
  }));
  ok('сторона лежит в своей грани', hexSides.every(function (s) {
    const mid = C.mul(C.add(s.from, s.to), 0.5);
    return Math.abs(C.dot(C.FACES[s.face].normal, mid) - 0.5) < 1e-7;
  }));
  ok('концы стороны лежат на рёбрах куба', hexSides.every(function (s) {
    return C.edgeNameOfPoint(s.from) && C.edgeNameOfPoint(s.to);
  }));
  ok('метки точек уникальны', (function () {
    const labs = hexRes.labels.map(function (o) { return o.label; });
    return new Set(labs).size === labs.length;
  })());
  ok('каждая вершина сечения подписана', (function () {
    const labs = [];
    hexSides.forEach(function (s) { labs.push(s.fromLabel, s.toLabel); });
    return new Set(labs).size === hexBuild.sec.points.length;
  })());
  ok('заданная точка M упомянута', textOf(hexRes).indexOf('M') >= 0);
  ok('тексты шагов содержательные', hexRes.steps.every(function (s) { return s.text.length > 25; }));
  ok('в тексте упоминаются рёбра куба', /ребр/.test(textOf(hexRes)));

  // метод параллельности
  const sqGiven = C.presetSquare();
  const sqPar = mkBuild(sqGiven, 'parallel');
  const sqParSides = sidesOf(sqPar.res);
  ok('квадрат: 4 стороны', sqParSides.length === 4, 'получено ' + sqParSides.length);
  ok('квадрат: есть шаги параллельности', sqParSides.some(function (s) { return s.mode === 'parallel'; }));
  ok('параллельность: указан партнёр', sqParSides.every(function (s) {
    return s.mode !== 'parallel' || (s.partner && s.partner.from && s.partner.to);
  }));
  ok('параллельность: известная точка лежит в грани', sqParSides.every(function (s) {
    return s.mode !== 'parallel' || Math.abs(C.dot(C.FACES[s.face].normal, s.known) - 0.5) < 1e-7;
  }));
  ok('параллельность: сторона параллельна партнёру', sqParSides.every(function (s) {
    if (s.mode !== 'parallel') return true;
    const d1 = C.normalize(C.sub(s.to, s.from)), d2 = C.normalize(C.sub(s.partner.to, s.partner.from));
    return C.len(C.cross(d1, d2)) < 1e-6;
  }));
  ok('параллельность: сторона лежит в своей грани', sqParSides.every(function (s) {
    const mid = C.mul(C.add(s.from, s.to), 0.5);
    return Math.abs(C.dot(C.FACES[s.face].normal, mid) - 0.5) < 1e-7;
  }));
  ok('метод следов: шагов параллельности нет', sidesOf(mkBuild(sqGiven, 'trace').res).every(function (s) { return s.mode !== 'parallel'; }));
  ok('комбинированный: 4 стороны', sidesOf(mkBuild(sqGiven, 'combined').res).length === 4);

  // треугольник: параллельных граней нет
  const triBuild = mkBuild(C.presetTriangle(), 'parallel');
  ok('треугольник: 3 стороны', sidesOf(triBuild.res).length === 3);
  ok('треугольник: шагов параллельности нет', sidesOf(triBuild.res).every(function (s) { return s.mode !== 'parallel'; }));
  ok('треугольник: пояснение в первом шаге', triBuild.res.steps[0].text.indexOf('параллельных граней нет') >= 0);

  // случай пользователя
  const userGiven = [[0.5, -0.236, -0.5], [-0.5, 0.3, 0.5], [0.266, 0.5, 0.466]];
  const userBuild = mkBuild(userGiven, 'trace');
  ok('случай пользователя: 6 сторон', sidesOf(userBuild.res).length === 6);
  ok('случай пользователя: S1 совпадает с M', C.dist(userBuild.res.steps[1].from, userGiven[0]) < 1e-6);
  ok('случай пользователя: пояснение про совпадение', userBuild.res.steps[1].text.indexOf('совпадает с точкой M') >= 0);
  ok('случай пользователя: все стороны совпадают с сечением', sameSet(sidesOf(userBuild.res).map(sideKey).sort(), sectionKeys(userBuild.sec)));

  // продление стороны (новая точка из пересечения с прямой ребра)
  let extCase = null;
  for (let t = 0; t < 400 && !extCase; t++) {
    const g = C.randomSectionPoints();
    const sec = C.section(g[0], g[1], g[2]);
    if (sec.points.length < 4) continue;
    const b = C.buildConstruction(g, sec, 'trace');
    if (b && b.extendCount > 0) extCase = { sec: sec, res: b };
  }
  ok('найдено сечение с продлением стороны', !!extCase);
  if (extCase) {
    const ext = extCase.res.steps.filter(function (s) { return s.kind === 'extend'; });
    ok('продление: точка лежит в секущей плоскости', ext.every(function (e) {
      return Math.abs(C.dot(extCase.sec.normal, e.newPoint) - extCase.sec.d) < 1e-7;
    }));
    ok('продление: точка лежит в целевой грани', ext.every(function (e) {
      return Math.abs(C.dot(C.FACES[e.toFace].normal, e.newPoint) - 0.5) < 1e-7;
    }));
    ok('продление: точка лежит на прямой продолженной стороны', ext.every(function (e) {
      const d = C.normalize(C.sub(e.sideTo, e.sideFrom));
      return C.len(C.cross(C.sub(e.newPoint, e.sideFrom), d)) < 1e-7;
    }));
    ok('продление: у новой точки есть имя', ext.every(function (e) { return !!e.newLabel; }));
    ok('продление: все стороны построены', sidesOf(extCase.res).length === extCase.sec.points.length);
    ok('продление: шаг опирается на построенную сторону', ext.every(function (e) { return !!e.sideFrom && !!e.sideTo; }));
  }

  // общие свойства для всех методов и пресетов
  [['trace', hexGiven], ['parallel', hexGiven], ['combined', hexGiven],
   ['trace', C.presetPentagon()], ['combined', C.presetRectangle()], ['parallel', C.presetTriangle()]]
    .forEach(function (pair) {
      const b = mkBuild(pair[1], pair[0]);
      const sides = sidesOf(b.res);
      ok('метод ' + pair[0] + ': построены все стороны', sides.length === b.sec.points.length,
         'сторон ' + sides.length + ' из ' + b.sec.points.length);
      ok('метод ' + pair[0] + ': стороны совпадают с сечением', sameSet(sides.map(sideKey).sort(), sectionKeys(b.sec)));
      ok('метод ' + pair[0] + ': у каждой стороны два разных имени', sides.every(function (s) {
        return s.fromLabel && s.toLabel && s.fromLabel !== s.toLabel;
      }));
      ok('метод ' + pair[0] + ': тексты непустые', b.res.steps.every(function (s) { return s.text.length > 25; }));
      ok('метод ' + pair[0] + ': метки уникальны', (function () {
        const labs = b.res.labels.map(function (o) { return o.label; });
        return new Set(labs).size === labs.length;
      })());
    });
})();


// --- точки вне куба и луч камеры ---
(function () {
  const cam = C.makeCamera(-0.62, 0.4), cx = 400, cy = 300, scale = 200;

  let rayOk = 0, rayTot = 0;
  [-200, -80, 0, 60, 150].forEach(function (dx) {
    [-120, -30, 0, 40, 110].forEach(function (dy) {
      const sp = C.surfacePointFromScreen(cx + dx, cy + dy, cam, cx, cy, scale);
      if (!sp) return;
      rayTot++;
      const ray = C.screenRay(cx + dx, cy + dy, cam, cx, cy, scale);
      const hit = C.rayCube(ray.origin, ray.dir) || C.rayCube(ray.origin, ray.dir, C.H + 0.02);
      if (hit) {
        const p = C.clampToCube(C.add(ray.origin, C.mul(ray.dir, Math.max(hit.tEnter, hit.tExit))));
        if (C.dist(p, sp) < 1e-9) rayOk++;
      }
    });
  });
  ok('луч камеры согласован с точкой поверхности', rayTot > 10 && rayOk === rayTot, rayOk + '/' + rayTot);

  const ray = C.screenRay(cx + 40, cy, cam, cx, cy, scale);
  const A = C.VERTICES[0], B = C.VERTICES[1];
  const cl = C.closestOnLine(ray, A, B);
  ok('ближайшая точка лежит на прямой ребра', (function () {
    const ab = C.sub(B, A);
    return C.len(C.cross(ab, C.sub(cl.point, A))) < 1e-9;
  })());
  ok('отрезок до луча перпендикулярен обеим прямым', (function () {
    const v = C.sub(B, A), u = ray.dir, w0 = C.sub(ray.origin, A);
    const uu = C.dot(u, u), uv = C.dot(u, v), vv = C.dot(v, v), uw = C.dot(u, w0), vw = C.dot(v, w0);
    const s = (uv * vw - vv * uw) / (uu * vv - uv * uv);
    const d = C.sub(cl.point, C.add(ray.origin, C.mul(u, s)));
    return Math.abs(C.dot(d, ray.dir)) < 1e-9 && Math.abs(C.dot(d, v)) < 1e-9;
  })());

  let snapOnLine = 0, snapTot = 0, outsideFound = 0, limitOk = true;
  for (let e = 0; e < C.EDGES.length; e++) {
    const A2 = C.VERTICES[C.EDGES[e][0]], B2 = C.VERTICES[C.EDGES[e][1]];
    const targets = [C.mul(C.add(A2, B2), 0.5), C.add(B2, C.mul(C.sub(B2, A2), 0.7))];
    targets.forEach(function (target) {
      const r = cam.rot(target);
      const snap = C.edgeSnapPoint(cx + scale * r[0], cy - scale * r[1], cam, cx, cy, scale, 1.2);
      if (!snap) return;
      snapTot++;
      if (C.len(C.cross(C.sub(B2, A2), C.sub(snap.point, A2))) < 1e-7) snapOnLine++;
      if (snap.t < -1e-9 || snap.t > 1 + 1e-9) outsideFound++;
    });
    for (let k = -3; k <= 4; k++) {
      const r = cam.rot(C.lerp(A2, B2, k * 0.5));
      const snap = C.edgeSnapPoint(cx + scale * r[0], cy - scale * r[1], cam, cx, cy, scale, 1.2);
      if (snap && (snap.t < -1.2001 || snap.t > 2.2001)) limitOk = false;
    }
  }
  ok('привязка попадает на прямую ребра', snapTot > 20 && snapOnLine === snapTot, snapOnLine + '/' + snapTot);
  ok('привязка умеет выходить за вершину куба', outsideFound > 0, String(outsideFound));
  ok('привязка держится в заданных пределах', limitOk);

  ok('описание: вершина', C.pointDescription([0.5, -0.5, -0.5]) === 'вершина B', C.pointDescription([0.5, -0.5, -0.5]));
  ok('описание: середина ребра', C.pointDescription([0, -0.5, -0.5]) === 'середина ребра AB', C.pointDescription([0, -0.5, -0.5]));
  ok('описание: на ребре', C.pointDescription([0.25, -0.5, -0.5]) === 'на ребре AB', C.pointDescription([0.25, -0.5, -0.5]));
  ok('описание: продолжение ребра', C.pointDescription([1.1, -0.5, -0.5]).indexOf('продолжении ребра AB') >= 0, C.pointDescription([1.1, -0.5, -0.5]));
  ok('описание: на грани', C.pointDescription([0.2, 0.2, -0.5]).indexOf('на грани ABCD') >= 0, C.pointDescription([0.2, 0.2, -0.5]));
  ok('описание: внутри куба', C.pointDescription([0, 0, 0]) === 'внутри куба', C.pointDescription([0, 0, 0]));
  ok('описание: вне куба', C.pointDescription([2, 2, 2]) === 'вне куба', C.pointDescription([2, 2, 2]));

  const outGiven = C.presetOutside();
  ok('готовое сечение: точка на продолжении ребра', C.pointDescription(outGiven[0]).indexOf('продолжении') >= 0, C.pointDescription(outGiven[0]));
  const outSec = C.section(outGiven[0], outGiven[1], outGiven[2]);
  ok('сечение с внешней точкой существует', outSec.points.length >= 3, 'точек ' + outSec.points.length);
  const outBuild = C.buildConstruction(outGiven, outSec, 'trace');
  const outSides = outBuild.steps.filter(function (s) { return s.kind === 'side'; });
  ok('вне куба: построены все стороны', outSides.length === outSec.points.length, outSides.length + '/' + outSec.points.length);
  ok('вне куба: стороны совпадают с сечением', (function () {
    const key = function (s) { return s.from.join(',') + '|' + s.to.join(','); };
    const got = outSides.map(key).sort(), want = [];
    for (let i = 0; i < outSec.points.length; i++) {
      want.push(outSec.points[i].join(',') + '|' + outSec.points[(i + 1) % outSec.points.length].join(','));
    }
    want.sort();
    return got.length === want.length && got.every(function (v, i) { return v === want[i]; });
  })());
  ok('вне куба: главный след есть', !!outBuild.steps[1].from);
  ok('вне куба: все числа конечны', outBuild.steps.every(function (s) {
    const vals = [];
    if (s.from) vals.push.apply(vals, s.from);
    if (s.to) vals.push.apply(vals, s.to);
    if (s.newPoint) vals.push.apply(vals, s.newPoint);
    if (s.known) vals.push.apply(vals, s.known);
    if (s.partner) { vals.push.apply(vals, s.partner.from); vals.push.apply(vals, s.partner.to); }
    return vals.every(function (v) { return isFinite(v); });
  }));
  ok('вне куба: все методы строят столько же сторон', ['trace', 'parallel', 'combined'].every(function (m) {
    const bb = C.buildConstruction(outGiven, outSec, m);
    return bb.steps.filter(function (s) { return s.kind === 'side'; }).length === outSec.points.length;
  }));
  ok('очень далёкая точка: сечение считается', C.section([3, -0.5, -0.5], [0.5, 0.5, 0], [-0.5, 0.5, 0.5]).points.length >= 3);
})();


// --- «тетрадная» проекция ---
(function () {
  const oc = C.makeObliqueCamera(0.5), cx = 400, cy = 300, sc = 200;
  const proj = function (p) { const r = oc.rot(p); return { x: cx + sc * r[0], y: cy - sc * r[1] }; };

  const faceIdx = C.FACES[2].idx;
  const fp = faceIdx.map(function (i) { return proj(C.VERTICES[i]); });
  ok('тетрадная проекция: передняя грань - квадрат', (function () {
    const d = [];
    for (let i = 0; i < 4; i++) d.push(Math.hypot(fp[(i + 1) % 4].x - fp[i].x, fp[(i + 1) % 4].y - fp[i].y));
    return d.every(function (v) { return Math.abs(v - sc) < 1e-9; });
  })());
  ok('тетрадная проекция: стороны квадрата ровно по клеткам', (function () {
    for (let i = 0; i < 4; i++) {
      const dx = Math.abs(fp[(i + 1) % 4].x - fp[i].x), dy = Math.abs(fp[(i + 1) % 4].y - fp[i].y);
      if (!(dx < 1e-9 || dy < 1e-9)) return false;
    }
    return true;
  })());

  const rA = oc.rot(C.VERTICES[0]), rD = oc.rot(C.VERTICES[3]);
  ok('тетрадная проекция: глубина уходит под 45° вверх-вправо',
    Math.abs((rD[0] - rA[0]) - (rD[1] - rA[1])) < 1e-12 && (rD[0] - rA[0]) > 0 && (rD[1] - rA[1]) > 0);
  ok('тетрадная проекция: длина ребра в глубину = 0.5*sqrt(2)',
    Math.abs(Math.hypot(rD[0] - rA[0], rD[1] - rA[1]) - Math.SQRT1_2) < 1e-12);

  const vis = C.FACES.map(function (f) { return oc.rot(f.normal)[2] > 0; });
  ok('тетрадная проекция: видны передняя, правая и верхняя грани',
    vis[2] && vis[5] && vis[1] && !vis[0] && !vis[3] && !vis[4], JSON.stringify(vis));

  let oOk = 0, oTot = 0;
  for (let i = 0; i < 9; i++) {
    const px = cx + (i % 3 - 1) * 60, py = cy + (Math.floor(i / 3) - 1) * 60;
    const sp = C.surfacePointFromScreen(px, py, oc, cx, cy, sc);
    const ray = C.screenRay(px, py, oc, cx, cy, sc);
    const hit = C.rayCube(ray.origin, ray.dir);
    if (sp && hit) {
      oTot++;
      const p = C.clampToCube(C.add(ray.origin, C.mul(ray.dir, Math.max(hit.tEnter, hit.tExit))));
      if (C.dist(p, sp) < 1e-9) oOk++;
    }
  }
  ok('тетрадная проекция: выбор точки на поверхности работает', oTot > 3 && oOk === oTot, oOk + '/' + oTot);

  ok('тетрадная проекция: привязка к прямым рёбер работает', (function () {
    const target = C.add(C.VERTICES[1], C.mul(C.sub(C.VERTICES[1], C.VERTICES[0]), 0.8));
    const r = oc.rot(target);
    const snap = C.edgeSnapPoint(cx + sc * r[0], cy - sc * r[1], oc, cx, cy, sc, 1.2);
    if (!snap) return false;
    return C.EDGE_FACES[0].every(function (f) { return Math.abs(C.dot(C.FACES[f].normal, snap.point) - 0.5) < 1e-7; });
  })());

  const hx = C.presetHexagon(), hSec = C.section(hx[0], hx[1], hx[2]);
  ok('тетрадная проекция: сечение и построение не меняются',
    hSec.points.length === 6 && !!C.buildConstruction(hx, hSec, 'trace'));
  ok('тетрадная проекция: внешняя точка тоже работает', (function () {
    const g = C.presetOutside(), s = C.section(g[0], g[1], g[2]);
    const b = C.buildConstruction(g, s, 'trace');
    return s.points.length >= 3 && b.steps.filter(function (x) { return x.kind === 'side'; }).length === s.points.length;
  })());
})();

console.log('Все проверки пройдены: ' + passed);
