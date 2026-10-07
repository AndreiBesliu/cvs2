// reference.mjs - desenul de referinta (pachetul owner-ului) si corpusul de stres.
// Valorile "pe hartie" NU se calculeaza aici: ele stau scrise de mana in oracle/paper.py.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TAU, arc, line, cubic, circleShape, ellipseShape, roundedRectShape, transformShape, rotateDeg, mul, translate, scale,
} from './geom.mjs';
import { loadFont, textToShapes } from './text.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const FONT_PATH = path.join(here, '..', 'node_modules', 'pdfjs-dist', 'standard_fonts', 'LiberationSans-Regular.ttf');

export function referenceDrawing() {
  const shapes = [];
  shapes.push(circleShape('cerc D100', 'DECUPARE', [70, 227], 50));
  // dreptunghi rotunjit 200x100 R10, rotit 30 grade in jurul centrului (270,200) - transformarea e EXACTA
  shapes.push(transformShape(roundedRectShape('dreptunghi rotunjit 200x100 R10 rotit 30', 'DECUPARE', 270, 200, 200, 100, 10), rotateDeg(30, 270, 200)));
  shapes.push(ellipseShape('elipsa 120x60 rotita 20', 'DECUPARE', [75, 95], 60, 30, 20));
  shapes.push({ name: 'curba S (Bezier cubic)', layer: 'GRAVARE', subpaths: [{ segs: [cubic([160, 60], [210, 120], [260, 0], [310, 60])], closed: false }] });
  const font = loadFont(FONT_PATH);
  const t = textToShapes(font, 'CNC 20 mm', 20, 15, 20, 'GRAVARE');
  shapes.push(...t.shapes);
  return { shapes, page: [400, 300], layers: [['DECUPARE', 1], ['GRAVARE', 5]], text: { em: t.em, cap: t.cap, upem: t.upem } };
}

export function stressCorpus() {
  const L = 'CORPUS';
  const s = [];
  s.push({ name: 'placa 2440x1220', layer: L, subpaths: [{ segs: [line([0, 0], [2440, 0]), line([2440, 0], [2440, 1220]), line([2440, 1220], [0, 1220]), line([0, 1220], [0, 0])], closed: true }] });
  s.push(circleShape('cerc mare R600', L, [1220, 610], 600));
  s.push(circleShape('cerc mic R0.01', L, [2000.005, 1000.003], 0.01));
  s.push({ name: 'linie 0.01', layer: L, subpaths: [{ segs: [line([100, 100], [100.01, 100])], closed: false }] });
  const d = Math.PI / 180;
  s.push({ name: 'arc 30', layer: L, subpaths: [{ segs: [arc([300, 300], 40, 10 * d, 30 * d)], closed: false }] });
  s.push({ name: 'arc 45', layer: L, subpaths: [{ segs: [arc([300, 300], 50, 50 * d, 45 * d)], closed: false }] });
  s.push({ name: 'arc 60', layer: L, subpaths: [{ segs: [arc([300, 300], 60, 100 * d, 60 * d)], closed: false }] });
  s.push({ name: 'arc 90', layer: L, subpaths: [{ segs: [arc([300, 300], 70, 170 * d, 90 * d)], closed: false }] });
  s.push({ name: 'arc CW -120', layer: L, subpaths: [{ segs: [arc([300, 300], 80, 300 * d, -120 * d)], closed: false }] });
  s.push({ name: 'arc 359', layer: L, subpaths: [{ segs: [arc([300, 500], 30, 0, 359 * d)], closed: false }] });
  // patrat cu gaura (gaura in sens invers)
  s.push({ name: 'patrat 100 cu gaura R30', layer: L, subpaths: [
    { segs: [line([550, 250], [650, 250]), line([650, 250], [650, 350]), line([650, 350], [550, 350]), line([550, 350], [550, 250])], closed: true },
    { segs: [arc([600, 300], 30, 0, -TAU)], closed: true },
  ] });
  s.push(circleShape('tangent A', L, [900, 300], 20));
  s.push(circleShape('tangent B', L, [940, 300], 20));
  s.push({ name: 'linie dubla 1', layer: L, subpaths: [{ segs: [line([1000, 100], [1100, 100])], closed: false }] });
  s.push({ name: 'linie dubla 2', layer: L, subpaths: [{ segs: [line([1000, 100], [1100, 100])], closed: false }] });
  s.push(circleShape('aproape tangent cerc', L, [1200, 300], 20));
  s.push({ name: 'aproape tangent linie', layer: L, subpaths: [{ segs: [line([1150, 320.001], [1250, 320.001])], closed: false }] });
  // arc oglindit: arc CCW de la 0 la 90 grade, centru (1500,300), oglindit fata de x = 1500 -> devine CW de la 180 la 90
  s.push(transformShape({ name: 'arc oglindit', layer: L, subpaths: [{ segs: [arc([1500, 300], 40, 0, 90 * d)], closed: false }] }, mul(translate(3000, 0), scale(-1, 1))));
  // cerc scalat neuniform (1.5, 1) apoi rotit 30 -> elipsa rx 75 ry 50 rot 30, centru (1800, 300)
  s.push(transformShape(circleShape('cerc scalat neuniform', L, [0, 0], 50), mul(translate(1800, 300), mul(rotateDeg(30), scale(1.5, 1)))));
  return { shapes: s, page: [2440, 1220], layers: [[L, 3]] };
}
