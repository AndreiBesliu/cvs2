/**
 * Clientul API al firebase-tools instalat global (`npm root -g`), pentru citirile și scrierile pe care CLI-ul nu le are
 * ca o comandă: cheia App Check (ADR 0043 §7) și amprenta publicării (ADR 0044). Aceeași identitate ca la publicări: pe
 * mașina owner-ului, contul lui `firebase login`; în workflow, acreditările implicite (WIF, `google-github-actions/auth`),
 * pe care `requireAuth` le ia singur când nu există niciun cont.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

export interface Raspuns {
  readonly status: number;
  readonly body: unknown;
}

/** Cât folosim din `apiv2.Client` al firebase-tools: un status ≥ 400 aruncă, afară de `resolveOnHTTPError: true`. */
export interface ClientApi {
  get(url: string, optiuni?: { resolveOnHTTPError?: boolean }): Promise<Raspuns>;
  patch(url: string, corp: unknown, optiuni?: { queryParams?: URLSearchParams; resolveOnHTTPError?: boolean }): Promise<Raspuns>;
}

type Cont = { user: unknown; tokens: unknown } | undefined;

export async function clientFirebaseTools(urlPrefix: string): Promise<ClientApi> {
  const radacina = execFileSync('npm', ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' }).trim();
  const lib = join(radacina, 'firebase-tools', 'lib');
  const require = createRequire(join(lib, 'index.js'));
  const { requireAuth } = require(join(lib, 'requireAuth')) as { requireAuth: (o: unknown) => Promise<unknown> };
  const { getGlobalDefaultAccount } = require(join(lib, 'auth')) as { getGlobalDefaultAccount: () => Cont };
  const { Client } = require(join(lib, 'apiv2')) as { Client: new (o: { urlPrefix: string; auth: boolean; apiVersion: string }) => ClientApi };
  const cont = getGlobalDefaultAccount();
  // Fără cont (workflow-ul): `requireAuth` cade pe acreditările implicite (GOOGLE_APPLICATION_CREDENTIALS).
  await requireAuth(cont ? { user: cont.user, tokens: cont.tokens } : {});
  return new Client({ urlPrefix, auth: true, apiVersion: 'v1' });
}
