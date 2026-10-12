/** Un mesaj la plural. `few` e obligatoriu în română (2–19 erori) și opțional în engleză. */
export type Plural = { readonly one: string; readonly few?: string; readonly other: string };

/** Un mesaj: text cu locuri `{param}`, sau un plural ales de `Intl.PluralRules` după parametrul `n`. */
export type Mesaj = string | Plural;

export type Limba = 'ro' | 'en';

export const LIMBI: readonly Limba[] = ['ro', 'en'];

/** Aceeași formă ca mesajul în engleză: textul rămâne text, iar pluralul are toate cele trei forme românești. */
export type FormaRo<M> = M extends string ? string : { readonly one: string; readonly few: string; readonly other: string };

/** Dicționarul românesc al unui dicționar englezesc `D`: exact cheile lui, cu pluralul românesc complet. */
export type DictionarRoPentru<D> = { readonly [K in keyof D]: FormaRo<D[K]> };
