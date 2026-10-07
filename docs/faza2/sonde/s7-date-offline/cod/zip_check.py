# Cititor independent (Python zipfile + hashlib, zero cod comun cu fflate/Node): CRC, manifest, hash-uri.
import sys, json, zipfile, hashlib
z = zipfile.ZipFile(sys.argv[1])
bad = z.testzip()
m = json.loads(z.read('manifest.json'))
doc = z.read(m['document'])
res = {'crc_ok': bad is None, 'entries': [i.filename for i in z.infolist()],
       'date_time': sorted({str(i.date_time) for i in z.infolist()}),
       'compress': sorted({i.compress_type for i in z.infolist()}),
       'doc_sha_ok': hashlib.sha256(doc).hexdigest() == m['documentSha256'],
       'assets_ok': all(hashlib.sha256(z.read(a['path'])).hexdigest() == a['hash'] == a['path'].split('/')[-1] and len(z.read(a['path'])) == a['bytes'] for a in m['assets']),
       'doc_nodes': len(json.loads(doc)['nodes'])}
print(json.dumps(res))
