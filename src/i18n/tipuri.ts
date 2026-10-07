/** Un mesaj la plural. `few` e obligatoriu în română (2–19 erori) și opțional în engleză. */
export type Plural = { readonly one: string; readonly few?: string; readonly other: string };

/** Un mesaj: text cu locuri `{param}`, sau un plural ales de `Intl.PluralRules` după parametrul `n`. */
export type Mesaj = string | Plural;

export type Limba = 'ro' | 'en';

export const LIMBI: readonly Limba[] = ['ro', 'en'];
