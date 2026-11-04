// Ce găsesc sursele planificatorului gata făcut în pagină, fără să fie scris de ele (ADR 0162): bibliotecile din `vendor/`
// (JavaScript, cu licențele lor), puse înaintea surselor, și ce pune gazda pe `window` (cvs2, claude.ai).
// Numele scrise de surse (`TrenCNC`, `TrenGCode`, `Lego`, `Profiluri`, `Atelier3D`, `TrenPentru3D`) nu stau aici:
// fiecare sursă e un script clasic, iar compilatorul le vede direct, cu tipurile deduse din cod.

/** Un vârf al unei polilinii Cavalier. */
interface CavalierVarf { readonly x: number; readonly y: number; readonly bulge: number }

/** O polilinie Cavalier (cavalier-contours-js 0.1.1, `vendor/cavalier.min.js`), cât folosesc sursele. */
interface CavalierPline {
  readonly vertexCount: number;
  at(i: number): CavalierVarf;
  /** Aria cu semn: pozitivă în sens trigonometric. */
  area(): number;
  extents(): { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } | null;
  boolean(alta: CavalierPline, op: 'or' | 'and' | 'not' | 'xor'): {
    /** De exemplu `disjoint` sau `invalidInput`. */
    readonly resultInfo: string;
    readonly posPlines: readonly { readonly pline: CavalierPline }[];
    readonly negPlines: readonly { readonly pline: CavalierPline }[];
  };
  parallelOffset(d: number): CavalierPline[];
}

/** Vârfurile unei polilinii: [x, y, bulge]. */
type CavalierVarfuri = readonly (readonly number[])[];

declare var Cavalier: {
  plineClosed(varfuri: CavalierVarfuri): CavalierPline;
  plineOpen(varfuri: CavalierVarfuri): CavalierPline;
};

/** earcut 2.2.4 (`vendor/earcut.min.js`): triunghiurile unui poligon cu găuri, ca indici ai vârfurilor. */
declare var earcut: (coordonate: readonly number[], gauri?: readonly number[] | null, dimensiuni?: number) => number[];

/** three.js r128 (`atelier.ts`, vederea 3D), cât folosește atelierul. Pagina de sine stătătoare îl aduce de pe cdnjs, iar în
 *  cvs2 vine din pachetul extensiei (`vendor/three.min.js`, ADR 0163); ambele, la prima intrare în 3D. Doar tipuri: niciun nume
 *  global nu se declară (biblioteca pune `window.THREE`). */
declare namespace Trei {
  interface Vector3 { x: number; y: number; z: number; set(x: number, y: number, z: number): this; copy(v: Vector3): this }
  interface Vector2 { x: number; y: number }
  interface Euler { x: number; y: number; z: number }
  interface Object3D {
    position: Vector3; rotation: Euler; up: Vector3; visible: boolean; userData: Record<string, unknown>; children: Object3D[];
    add(...o: Object3D[]): this; remove(...o: Object3D[]): this; lookAt(v: Vector3): void;
  }
  interface Material { transparent: boolean; opacity: number; color: { set(c: string | number): void }; dispose(): void }
  interface Box3 { min: Vector3; max: Vector3; setFromObject(o: Object3D): this; set(min: Vector3, max: Vector3): this; getCenter(v: Vector3): Vector3 }
  interface BufferAttribute { readonly count: number }
  interface BufferGeometry {
    boundingBox: Box3 | null; setAttribute(nume: string, a: BufferAttribute): this; computeVertexNormals(): void; computeBoundingBox(): void;
    translate(x: number, y: number, z: number): this; dispose(): void;
  }
  interface Mesh extends Object3D { geometry: BufferGeometry; material: Material }
  interface GridHelper extends Object3D { geometry: BufferGeometry; material: Material }
  interface PerspectiveCamera extends Object3D { aspect: number; updateProjectionMatrix(): void }
  interface WebGLRenderer { domElement: HTMLCanvasElement; setPixelRatio(r: number): void; setSize(w: number, h: number, stil?: boolean): void; render(s: Object3D, c: PerspectiveCamera): void }
  interface Raycaster { setFromCamera(p: Vector2, c: PerspectiveCamera): void; intersectObjects(o: Object3D[], recursiv?: boolean): { object: Object3D }[] }
  interface Biblioteca {
    Vector3: new (x?: number, y?: number, z?: number) => Vector3;
    Vector2: new (x?: number, y?: number) => Vector2;
    Scene: new () => Object3D;
    Group: new () => Object3D;
    PerspectiveCamera: new (fov: number, aspect: number, aproape: number, departe: number) => PerspectiveCamera;
    HemisphereLight: new (cer: number, sol: number, intensitate: number) => Object3D;
    DirectionalLight: new (culoare: number, intensitate: number) => Object3D;
    MeshStandardMaterial: new (p: { color: string | number; roughness: number; metalness: number; emissive?: number }) => Material;
    BufferAttribute: new (date: Float32Array, marime: number) => BufferAttribute;
    BufferGeometry: new () => BufferGeometry;
    Box3: new () => Box3;
    Mesh: new (g: BufferGeometry, m: Material) => Mesh;
    GridHelper: new (marime: number, diviziuni: number, c1: number, c2: number) => GridHelper;
    WebGLRenderer: new (p: { antialias: boolean; alpha: boolean }) => WebGLRenderer;
    Raycaster: new () => Raycaster;
  }
}

/** Ce dă claude.ai artefactelor (`window.claude.use`), cât folosește planificatorul: baza de date și descărcările. */
interface ClaudeDocument {
  set(date: Record<string, unknown>): Promise<void>;
  get(): Promise<{ readonly exists: boolean; data(): Record<string, unknown> }>;
  delete(): Promise<void>;
}
interface ClaudeDb {
  doc(cale: string): ClaudeDocument;
  collection(cale: string): {
    doc(): { readonly id: string };
    orderBy(camp: string, sens: 'asc' | 'desc'): {
      onSnapshot(f: (s: { readonly docs: readonly { readonly id: string; data(): Record<string, unknown> }[] }) => void, eroare?: (e: unknown) => void): () => void;
    };
  };
}
interface ClaudeDescarcari { save(f: { filename: string; data: Blob | string }): Promise<void> }

interface Window {
  readonly claude?: { use(ce: 'db'): Promise<ClaudeDb>; use(ce: 'downloads'): Promise<ClaudeDescarcari> };
  /** Pus de intrarea extensiei în cvs2 (`extensii/trenulet/intrare.ts`): gazda, senderul (null fără permisiunea mașinii) și
   *  three.js din pachet, adus la prima cerere (ADR 0163). */
  readonly cvs2?: { readonly gazda: 'cvs2'; readonly masina: import('../../api.ts').HostApi['masina'] | null;
    readonly three: () => Promise<Trei.Biblioteca | null> };
  readonly THREE?: Trei.Biblioteca;
}

/** Un câmp de formular în care pagina scrie și numere: DOM-ul le face text (`input.value = 3`). */
type CampNumeric = Omit<HTMLInputElement, 'value'> & { value: string | number };
