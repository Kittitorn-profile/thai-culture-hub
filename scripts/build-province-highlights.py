# -*- coding: utf-8 -*-
"""Match editorial candidates against official TAT catalog and existing province records."""
import collections,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[1]
official=next(iter(json.loads(pathlib.Path('/tmp/hub-official-attraction.json').read_text()).values()))
stored=json.loads(pathlib.Path('/tmp/hub-tat-highlight-candidates.json').read_text())
seeds=json.loads((ROOT/'data/province-highlights/curated-candidates.json').read_text())
provinces=dict(re.findall(r"code: '(TH-\d+)', name: '([^']+)'",(ROOT/'src/data/thailand-culture/provinces.ts').read_text()))
def norm(s):return re.sub(r'\s+','',s or '')
source='https://datacatalog.tat.or.th/dataset/87442079-88ec-42eb-b507-dcf135fc4301/resource/9348705e-18b4-4815-8d2c-0fd2f649e88e'
result={};skipped=[]
for code,terms in seeds.items():
 result[code]=[]
 for term in terms:
  matches=[a for a in official if a.get('PROVINCE_NAME_TH')==provinces[code] and norm(term) in norm(a.get('ATT_NAME_TH'))]
  matches.sort(key=lambda a:(norm(a['ATT_NAME_TH'])!=norm(term),len(a['ATT_NAME_TH'])))
  chosen=None
  for a in matches:
   rows=[r for r in stored if r['province_code']==code and norm(r['name'])==norm(a['ATT_NAME_TH'])]
   if rows:chosen=(a,rows);break
  if not chosen:skipped.append({'provinceCode':code,'candidate':term,'reason':'no exact official/stored name match'});continue
  a,rows=chosen
  if any(i['sourceRecordId']==str(a['ATT_ID']) for i in result[code]):continue
  result[code].append({'names':list(dict.fromkeys([a['ATT_NAME_TH']]+[r['name'] for r in rows])),'title':a['ATT_NAME_TH'],'theme':a.get('ATT_TYPE_LABEL') or a.get('ATT_CATEGORY_LABEL') or 'แหล่งท่องเที่ยว','summary':'','sourceUrl':source,'sourceRecordId':str(a['ATT_ID']),'provinceName':provinces[code]})
# Reviewed spelling variant of the same Yasothon landmark, not a fuzzy runtime match.
a=next(a for a in official if a.get('PROVINCE_NAME_TH')=='ยโสธร' and a['ATT_NAME_TH']=='ธาตุก่องข้าวน้อย')
rows=[r for r in stored if r['province_code']=='TH-35' and r['name']=='พระธาตุก่องข้าวน้อย']
if not rows:raise ValueError('Missing reviewed Yasothon alias')
result['TH-35'].append({'names':['ธาตุก่องข้าวน้อย','พระธาตุก่องข้าวน้อย'],'title':'พระธาตุก่องข้าวน้อย','theme':'ศรัทธาและประวัติศาสตร์','summary':'','sourceUrl':source,'sourceRecordId':str(a['ATT_ID']),'provinceName':'ยโสธร'})
if len(result)!=77 or any(len(items)<2 for items in result.values()):raise ValueError('Incomplete province coverage')
(ROOT/'data/province-highlights/highlights.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
report={'checkedAt':'2026-11-08','provinces':len(result),'attractions':sum(map(len,result.values())),'minimumPerProvince':min(map(len,result.values())),'maximumPerProvince':max(map(len,result.values())),'officialCatalogRows':len(official),'skippedCandidates':skipped,'source':source,'method':'Editorial candidate list; verify province and exact official/stored names, with one explicitly reviewed spelling alias. Not a popularity ranking.'}
(ROOT/'data/province-highlights/review-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['skippedCandidates','source','method']}))
