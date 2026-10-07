// Worker OPFS cu createSyncAccessHandle (API-ul sincron, disponibil doar în worker).
const root = () => navigator.storage.getDirectory();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
onmessage = async (e) => {
  const m = e.data;
  try {
    const dir = await root();
    if (m.op === 'write') {
      const h = await (await dir.getFileHandle(m.name, { create: true })).createSyncAccessHandle();
      h.truncate(0); h.write(new Uint8Array(m.buf), { at: 0 }); h.flush(); h.close();
      postMessage({ id: m.id });
    } else if (m.op === 'read') {
      const h = await (await dir.getFileHandle(m.name)).createSyncAccessHandle();
      const buf = new ArrayBuffer(h.getSize()); h.read(new Uint8Array(buf), { at: 0 }); h.close();
      postMessage({ id: m.id, buf }, [buf]);
    } else if (m.op === 'slowInplace' || m.op === 'slowNew') {
      const h = await (await dir.getFileHandle(m.name, { create: true })).createSyncAccessHandle();
      const u8 = new Uint8Array(m.buf), CH = 1 << 20;
      for (let i = 0; i * CH < u8.length; i++) { h.write(u8.subarray(i * CH, (i + 1) * CH), { at: i * CH }); postMessage({ progress: 'PROGRES ' + i }); await sleep(m.delay); }
      h.flush(); h.close(); postMessage({ id: m.id });
    } else if (m.op === 'rename') {
      const fh = await dir.getFileHandle(m.from);
      await fh.move(m.to); // mutare în același director OPFS
      postMessage({ id: m.id });
    }
  } catch (err) { postMessage({ id: m.id, err: String(err) }); }
};
