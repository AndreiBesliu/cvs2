import * as v from 'valibot';

/**
 * Configurația citită de la gazdă (`/config.json`), nu coaptă în build: același `dist/` rulează pe test și pe live, iar
 * fiecare instanță își servește propriul `config.json`. Local, el vine din `public/config.json`.
 */
export const SchemaConfig = v.object({
  instanta: v.picklist(['local', 'test', 'live']),
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

export async function incarcaConfig(cere: typeof fetch): Promise<RezultatConfig> {
  try {
    const raspuns = await cere('/config.json', { cache: 'no-store' });
    if (!raspuns.ok) return { ok: false, motiv: `config.json: HTTP ${raspuns.status}` };
    return citesteConfig(await raspuns.text());
  } catch (e) {
    return { ok: false, motiv: `config.json: ${e instanceof Error ? e.message : String(e)}` };
  }
}
