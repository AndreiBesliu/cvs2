// Sonda 2 (în browser): OPFS vs IndexedDB, plus strategiile de salvare pentru proba de cădere.
// Datele se generează determinist (xorshift32, doar întregi), deci Node calculează aceleași hash-uri independent.
export function gen(bytes, seed) {
  const u8 = new Uint8Array(bytes);
  const u32 = new Uint32Array(u8.buffer, 0, bytes >>> 2);
  let x = seed >>> 0 || 1;
  for (let i = 0; i < u32.length; i++) { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; u32[i] = x; }
  return u8;
}
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
export async function sha(u8) { return hex(await crypto.subtle.digest('SHA-256', u8)); }
export async function chunkShas(u8, chunk = 1 << 20) {
  const out = [];
  for (let o = 0; o < u8.length; o += chunk) out.push((await sha(u8.subarray(o, Math.min(u8.length, o + chunk)))).slice(0, 16));
  return out;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- IndexedDB ----------
export function idb() {
  return new Promise((ok, ko) => {
    const r = indexedDB.open('s7', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('blobs'); r.result.createObjectStore('chunks'); r.result.createObjectStore('head'); };
    r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
  });
}
const done = (tx) => new Promise((ok, ko) => { tx.oncomplete = ok; tx.onerror = () => ko(tx.error); tx.onabort = () => ko(tx.error); });
const req = (r) => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
export async function idbPut(store, key, val, durability = 'default') {
  const db = await idb(); const tx = db.transaction(store, 'readwrite', { durability }); tx.objectStore(store).put(val, key); await done(tx); db.close();
}
export async function idbGet(store, key) { const db = await idb(); const v = await req(db.transaction(store).objectStore(store).get(key)); db.close(); return v; }

// ---------- OPFS ----------
const root = () => navigator.storage.getDirectory();
export async function opfsWrite(name, u8) {
  const fh = await (await root()).getFileHandle(name, { create: true });
  const w = await fh.createWritable(); await w.write(u8); await w.close();
}
export async function opfsRead(name) { const f = await (await (await root()).getFileHandle(name)).getFile(); return new Uint8Array(await f.arrayBuffer()); }
export async function opfsList() { const out = []; for await (const [n, h] of (await root()).entries()) out.push(n + (h.kind === 'file' ? ':' + (await h.getFile()).size : '/')); return out.sort(); }

let W = null, seq = 0; const pend = new Map();
function worker() {
  if (!W) { W = new Worker('opfs-worker.js', { type: 'module' }); W.onmessage = (e) => { if (e.data.progress) { console.log(e.data.progress); return; } const p = pend.get(e.data.id); pend.delete(e.data.id); e.data.err ? p.ko(new Error(e.data.err)) : p.ok(e.data); }; }
  return W;
}
export function callW(msg, transfer = []) { return new Promise((ok, ko) => { const id = ++seq; pend.set(id, { ok, ko }); worker().postMessage({ ...msg, id }, transfer); }); }

// ---------- măsurători de debit ----------
export async function bench(kind, bytes, seed, reps) {
  const res = { kind, MB: bytes / 1048576, write: [], read: [], hashOk: [] };
  const src = gen(bytes, seed);
  const expect = await sha(src);
  for (let i = 0; i < reps; i++) {
    let t, back;
    if (kind === 'idb') {
      const copy = src.slice();
      t = performance.now(); await idbPut('blobs', 'k', copy.buffer); res.write.push(performance.now() - t);
      t = performance.now(); back = new Uint8Array(await idbGet('blobs', 'k')); res.read.push(performance.now() - t);
    } else if (kind === 'idb-blob') {
      t = performance.now(); await idbPut('blobs', 'b', new Blob([src])); res.write.push(performance.now() - t);
      t = performance.now(); back = new Uint8Array(await (await idbGet('blobs', 'b')).arrayBuffer()); res.read.push(performance.now() - t);
    } else if (kind === 'opfs-writable') {
      t = performance.now(); await opfsWrite('bench.bin', src); res.write.push(performance.now() - t);
      t = performance.now(); back = await opfsRead('bench.bin'); res.read.push(performance.now() - t);
    } else if (kind === 'opfs-sync') {
      const copy = src.slice();
      t = performance.now(); await callW({ op: 'write', name: 'benchs.bin', buf: copy.buffer }, [copy.buffer]); res.write.push(performance.now() - t);
      t = performance.now(); const r = await callW({ op: 'read', name: 'benchs.bin' }); back = new Uint8Array(r.buf); res.read.push(performance.now() - t);
    }
    const th = performance.now(); res.hashOk.push((await sha(back)) === expect); res.hashMs = performance.now() - th;
  }
  return { ...res, sha: expect };
}

export async function storageInfo() {
  const e = await navigator.storage.estimate();
  return { usageMB: +(e.usage / 1048576).toFixed(1), quotaGB: +(e.quota / 1073741824).toFixed(1), persisted: await navigator.storage.persisted(), persistResult: await navigator.storage.persist(), details: e.usageDetails ?? null };
}

// ---------- strategiile de salvare pentru proba de cădere (64 de bucăți de 1 MiB) ----------
const CH = 1 << 20, NCH = 64;
export async function crashSetup(seedV1) {
  const v1 = gen(NCH * CH, seedV1);
  await callW({ op: 'write', name: 'inplace.bin', buf: v1.slice().buffer });            // S1
  await opfsWrite('writable.bin', v1);                                                  // S2
  const name1 = 'doc-' + (await sha(v1)).slice(0, 16) + '.bin';                         // S3
  await callW({ op: 'write', name: name1, buf: v1.slice().buffer });
  await idbPut('head', 'current', { name: name1 }, 'strict');
  const db = await idb(); const tx = db.transaction('chunks', 'readwrite', { durability: 'strict' }); // S4
  for (let i = 0; i < NCH; i++) tx.objectStore('chunks').put(v1.slice(i * CH, (i + 1) * CH).buffer, i);
  await done(tx); db.close();
  return { sha: await sha(v1) };
}

// Scrie v2 încet, ca procesul să poată fi omorât la mijloc. Raportează progresul pe console ("PROGRES <i>").
export async function crashWrite(strategy, seedV2, delay = 60) {
  const v2 = gen(NCH * CH, seedV2);
  if (strategy === 'S1') return callW({ op: 'slowInplace', name: 'inplace.bin', buf: v2.buffer, delay }, [v2.buffer]);
  if (strategy === 'S2') {
    const fh = await (await root()).getFileHandle('writable.bin');
    const w = await fh.createWritable();
    for (let i = 0; i < NCH; i++) { await w.write(v2.subarray(i * CH, (i + 1) * CH)); console.log('PROGRES ' + i); await sleep(delay); }
    await w.close(); console.log('GATA'); return;
  }
  if (strategy === 'S3') {
    const name2 = 'doc-' + (await sha(v2)).slice(0, 16) + '.bin';
    await callW({ op: 'slowNew', name: name2 + '.tmp', buf: v2.buffer, delay }, [v2.buffer]); // scrie fișierul nou
    await callW({ op: 'rename', from: name2 + '.tmp', to: name2 });                         // abia apoi pointerul
    await idbPut('head', 'current', { name: name2 }, 'strict'); console.log('GATA'); return;
  }
  if (strategy === 'S4') {
    const db = await idb();
    const tx = db.transaction('chunks', 'readwrite', { durability: 'strict' });
    const st = tx.objectStore('chunks');
    await new Promise((ok, ko) => {
      let i = 0, last = performance.now();
      const pump = () => {
        if (i >= NCH) return;
        if (performance.now() - last >= delay) { const r = st.put(v2.slice(i * CH, (i + 1) * CH).buffer, i); console.log('PROGRES ' + i); i++; last = performance.now(); r.onsuccess = pump; }
        else st.get(-1).onsuccess = pump; // ține tranzacția activă fără să comită
      };
      tx.oncomplete = ok; tx.onerror = () => ko(tx.error); pump();
    });
    db.close(); console.log('GATA');
  }
}

// După repornire: ce a supraviețuit în fiecare strategie (hash întreg + hash pe bucăți).
export async function crashInspect() {
  const out = { files: await opfsList() };
  const rd = async (n) => { try { return await opfsRead(n); } catch { return null; } };
  for (const [k, n] of [['S1', 'inplace.bin'], ['S2', 'writable.bin']]) { const b = await rd(n); out[k] = b ? { size: b.length, sha: await sha(b), chunks: await chunkShas(b) } : null; }
  const head = await idbGet('head', 'current'); const b3 = head ? await rd(head.name) : null;
  out.S3 = { head, size: b3?.length, sha: b3 ? await sha(b3) : null, chunks: b3 ? await chunkShas(b3) : null };
  const db = await idb(); const parts = [];
  for (let i = 0; i < NCH; i++) parts.push(new Uint8Array(await req(db.transaction('chunks').objectStore('chunks').get(i))));
  db.close();
  const all = new Uint8Array(NCH * CH); parts.forEach((p, i) => all.set(p, i * CH));
  out.S4 = { size: all.length, sha: await sha(all), chunks: await chunkShas(all) };
  return out;
}
Object.assign(window, { gen, sha, bench, storageInfo, crashSetup, crashWrite, crashInspect, opfsList, callW });
window.__ready = true;
