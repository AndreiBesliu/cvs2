/**
 * Sonda din cncvs2 (07.10.2026), rulată DOAR în copia din scratchpad, nu în repo-ul vechi.
 * Întrebarea: la o tăiere PRIN material, cu supracursă, ce grosime are puntea de sub ureche?
 * Cerința din câmpul `tabHeight` („material left under the tab”): exact tabHeight.
 */
import { generateGcode, DEFAULT_GCODE_SETTINGS, type GcodeSettings } from '../src/export/gcode';
import type { Shape, Workpiece } from '../src/types/shapes';

const GROSIME = 18;
const placa: Workpiece = { width: 300, height: 200, thickness: GROSIME, units: 'mm', originCorner: 'bottom-left' };
const piesa: Shape = {
  id: 'p', kind: 'rect', x: 50, y: 50, w: 100, h: 60, cornerRadius: 0, cutRole: 'cut',
  strokeColor: '#000', strokeWidth: 1, fillColor: null,
};

for (const supracursa of [0, 0.3, 0.5]) {
  const S: GcodeSettings = {
    ...DEFAULT_GCODE_SETTINGS, toolDiameter: 6, totalDepth: GROSIME, depthPerPass: 6,
    tabs: true, tabCount: 4, tabWidth: 8, tabHeight: 2, throughOvercut: supracursa,
    rampEntry: false, leadInOut: false,
  };
  const g = generateGcode([piesa], placa, S);
  let peUreche = false;
  let zMin = 0;
  let palier = -Infinity;
  for (const linie of g.split('\n')) {
    if (/feat tab/.test(linie)) peUreche = true;
    if (/feat end/.test(linie)) peUreche = false;
    const m = /Z(-?\d+(?:\.\d+)?)/.exec(linie.replace(/\(.*?\)|;.*$/g, ''));
    if (!m) continue;
    const z = Number(m[1]);
    zMin = Math.min(zMin, z);
    if (peUreche) palier = Math.max(palier, z);
  }
  const punte = GROSIME + palier;
  console.log(`supracursa ${supracursa} mm: cea mai adâncă trecere Z${zMin.toFixed(3)}, palierul urechii Z${palier.toFixed(3)}`
    + ` → puntea rămasă ${punte.toFixed(3)} mm (cerută: ${S.tabHeight})`);
}
