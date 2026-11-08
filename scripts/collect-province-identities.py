# -*- coding: utf-8 -*-
"""Collect attributed provincial infobox facts. Unknown colours remain unverified."""
import concurrent.futures
import datetime
import json
import re
import subprocess
import urllib.parse
from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]
provinces = re.findall(r"code: '(TH-\d+)', name: '([^']+)'", (ROOT/'src/data/thailand-culture/provinces.ts').read_text())

existing_path = ROOT/'data/province-identities/identities.json'
existing = {x['code']: x for x in json.loads(existing_path.read_text())} if existing_path.exists() else {}

def collect(province):
    code, name = province
    if existing.get(code, {}).get('motto') and existing.get(code, {}).get('sealUrl'): return existing[code]
    title = name if name == 'กรุงเทพมหานคร' else 'จังหวัด' + name
    url = 'https://th.wikipedia.org/wiki/' + urllib.parse.quote(title)
    row = dict(code=code, name=name, motto=None, sealUrl=None, sealSourceUrl=None, colors=[], colorsStatus='unverified', sourceUrl=url, sourceName='วิกิพีเดียภาษาไทย / Wikimedia Commons', checkedAt=datetime.date.today().isoformat())
    cached = Path('/tmp/hub-province-wiki.html') if code == 'TH-44' else None
    html = cached.read_text() if cached and cached.exists() else subprocess.run(['curl', '-LsS', '--max-time', '18', '--retry', '1', url], capture_output=True, text=True, errors='replace').stdout
    soup = BeautifulSoup(html, 'html.parser')
    table = soup.select_one('table.infobox')
    if not table: return row
    for tr in table.select('tr'):
        text = tr.get_text(' ', strip=True)
        if text.startswith('คำขวัญ'):
            motto = re.sub(r'\[\d+\]', '', re.sub(r'^คำขวัญ\s*:?\s*', '', text)).strip()
            if motto and len(motto) < 1000: row['motto'] = motto
    for image in table.select('img'):
        alt = image.get('alt', '')
        if 'ตรา' not in alt or ('จังหวัด' not in alt and code != 'TH-10'): continue
        src = image.get('src', '').split('?')[0]
        if '/commons/thumb/' not in src: continue
        path = src.split('/commons/thumb/')[1].rsplit('/', 1)[0]
        row['sealUrl'] = 'https://upload.wikimedia.org/wikipedia/commons/' + path
        row['sealSourceUrl'] = 'https://commons.wikimedia.org/wiki/File:' + path.split('/')[-1]
        break
    return row

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(collect, provinces))
overrides = json.loads((ROOT/'data/province-identities/verified-overrides.json').read_text())
for row in results: row.update(overrides.get(row['code'], {}))
output = ROOT/'data/province-identities/identities.json'
output.write_text(json.dumps(results, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'provinces':len(results),'mottos':sum(bool(x['motto']) for x in results),'seals':sum(bool(x['sealUrl']) for x in results),'incomplete':[x['code'] for x in results if not x['motto'] or not x['sealUrl']]}))
