import * as v from 'valibot';

/**
 * Configurația citită de la gazdă (`/config.json`), nu coaptă în build: același `dist/` rulează pe test și pe live, iar
 * fiecare instanță își servește propriul `config.json`. Local, el vine din `public/config.json`.
 */
const Text = v.pipe(v.string(), v.minLength(1), v.maxLength(300));

export const SchemaConfig = v.object({
  instanta: v.picklist(['local', 'test', 'live']),
  /** Configurația web Firebase a instanței (ADR 0040 §2): valori publice, scrise la publicare din `apps:sdkconfig`. */
  firebase: v.optional(v.object({ apiKey: Text, authDomain: Text, projectId: Text, appId: Text })),
  /** Cheia de site reCAPTCHA Enterprise pentru App Check (ADR 0039); lipsă = App Check stins în client. */
  appCheck: v.optional(v.object({ cheieSite: Text })),
  /** Doar pentru probele locale (ADR 0040 §9): emulatoarele, folosite numai pe `localhost` / `127.0.0.1`. */
  emulatoare: v.optional(v.object({ auth: v.pipe(v.string(), v.url()), firestore: Text, functions: Text })),
});

export type Config = v.InferOutput<typeof SchemaConfig>;

export type RezultatConfig =
  | { readonly ok: true; readonly config: Config }
  | { readonly ok: false; readonly motiv: string };

/** Pură: validează textul primit. Orice abatere de la schemă e un motiv scris, nu o excepție. */
export function citesteConfig(text: string): RezultatConfig {
  let brut: unknown;
  try {
    brut = JSON.parse(text);
  } catch {
    return { ok: false, motiv: 'config.json nu e JSON valid' };
  }
  const r = v.safeParse(SchemaConfig, brut);
  if (!r.success) {
    const prima = r.issues[0];
    const cale = prima?.path?.map((p) => String(p.key)).join('.') ?? '';
    return { ok: false, motiv: `config.json${cale ? ` (${cale})` : ''}: ${prima?.message ?? 'schemă nevalidă'}` };
  }
  return { ok: true, config: r.output };
}

/** Cât așteaptă pornirea după config.json (ms): o cerere agățată nu mai ține pagina albă (recenzia A). */
export const TERMEN_CONFIG_MS = 4000;

export async function incarcaConfig(cere: typeof fetch): Promise<RezultatConfig> {
  try {
    const raspuns = await cere('/config.json', { cache: 'no-store', signal: AbortSignal.timeout(TERMEN_CONFIG_MS) });
    if (!raspuns.ok) return { ok: false, motiv: `config.json: HTTP ${raspuns.status}` };
    return citesteConfig(await raspuns.text());
  } catch (e) {
    return { ok: false, motiv: `config.json: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Ruta paginii de administrare (ADR 0040 §1): `/admin` și tot ce e sub ea. */
export function esteRutaAdmin(cale: string): boolean {
  return cale === '/admin' || cale.startsWith('/admin/');
}
