# -*- coding: utf-8 -*-
"""Download known province seal references once; never fetch in page rendering."""
import concurrent.futures, json, subprocess, urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'data/province-identities/identities.json').read_text())
folder=ROOT/'public/assets/province-seals'
folder.mkdir(parents=True,exist_ok=True)
def cache(row):
 url=row.get('sealUrl')
 if (folder/(row['code']+'.webp')).exists(): return row['code'], '/assets/province-seals/'+row['code']+'.webp'
 if not url:return None
 ext=Path(urllib.parse.unquote(urllib.parse.urlparse(url).path)).suffix.lower()
 if ext not in ['.svg','.png','.jpg','.jpeg']:return None
 target=folder/(row['code']+ext)
 if not target.exists() and (folder/(row['code']+'.png')).exists(): target=folder/(row['code']+'.png')
 if not target.exists():
  suffix = '.png' if ext == '.svg' else ''
  file_name = url.rsplit('/', 1)[-1]
  url = url.replace('https://upload.wikimedia.org/wikipedia/commons/', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/') + '/120px-' + file_name + suffix
  if ext == '.svg':
   ext = '.png'
   target = folder/(row['code']+ext)
  temp=target.with_suffix(ext+'.tmp')
  result=subprocess.run(['curl','-fLsS','--max-time','15','-A','ThaiCultureHub/1.0 (province seal reference cache)',url,'-o',str(temp)],capture_output=True)
  if result.returncode or not temp.exists():
   temp.unlink(missing_ok=True);return None
  data=temp.read_bytes()
  valid=(b'<svg' in data[:2000]) if ext=='.svg' else (data.startswith(b'\x89PNG') or data.startswith(b'\xff\xd8'))
  if not valid:temp.unlink(missing_ok=True);return None
  temp.replace(target)
 return row['code'], '/assets/province-seals/'+target.name
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 paths=dict(x for x in pool.map(cache,rows) if x)
(ROOT/'data/province-identities/local-seals.json').write_text(json.dumps(paths,indent=2)+'\n')
print(json.dumps({'cached':len(paths),'missing':[r['code'] for r in rows if r['code'] not in paths]}))
