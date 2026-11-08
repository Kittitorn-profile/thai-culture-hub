"""Normalize downloaded government artist CSVs; exclude residential addresses/contact details."""
import csv, hashlib, json, pathlib, re, sys, unicodedata
root=pathlib.Path(__file__).resolve().parents[1]
source_dir=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp')
packages=json.loads((source_dir/'hub-artist-datasets.json').read_text())['result']['results']
metadata={p['name']:p for p in packages}
metadata['art_31_01']=json.loads((source_dir/'hub-national-artists-package.json').read_text())['result']
source_keys=['art_31_01','artist','silpathorn','dataset_41_181','lct_51_01']
sources=[]
for key in source_keys:
 p=metadata[key];r=next(r for r in p['resources'] if r['format'].upper()=='CSV')
 sources.append({'key':key,'title':p['title'],'organization':p.get('organization',{}).get('title',''),'url':'https://data.go.th/dataset/'+key,'downloadUrl':r['url'],'license':p.get('license_title') or p.get('license_id'),'sourceModifiedAt':p.get('metadata_modified')})
# Resolve Thai province names using the same boundaries as the public province pages.
provinces=json.loads((root/'public/assets/maps/thailand-districts.index.json').read_text()) if (root/'public/assets/maps/thailand-districts.index.json').exists() else None
province_names={}
text=(root/'src/data/thailand-culture/provinces.ts').read_text()
for code,name in re.findall(r"code:\s*'(TH-\d+)'[\s\S]*?name:\s*'([^']+)'",text):province_names[name]=code
if len(province_names)!=77: raise ValueError('Province metadata must include 77 provinces')
province_aliases={'กรุงเทพ':'กรุงเทพมหานคร','เขียงราย':'เชียงราย'}
prefixes=['รองศาสตราจารย์','ผู้ช่วยศาสตราจารย์','ศาสตราจารย์','พลเรือตรี','พลตรี','พันเอก','หม่อมราชวงศ์','หม่อมหลวง','ม.ร.ว.','ม.ล.','ท่านผู้หญิง','คุณหญิง','นางสาว','นายแพทย์','ผศ.ดร.','รศ.ดร.','ผศ.','รศ.','ดร.','นาย','นาง']
def clean(value):return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',value or '').replace('ํา','ำ')).strip()
def name_of(value):
 value=clean((value or '').split('\n')[0]);value=re.sub(r'\((?:เสียชีวิต|ถึงแก่กรรม)[^)]*\)','',value)
 for _ in range(5):
  old=value
  for prefix in prefixes:
   if value.startswith(prefix):value=value[len(prefix):].strip();break
  if value==old:break
 return clean(value)
def canonical(value):return re.sub(r'[\s.()“”"\-]','',re.sub(r'\([^)]*\)','',name_of(value)))
artists={};raw_counts={}
def add(raw_name,kind,field,subfield,source,index,year=None,province=None,relationship=None,district=None):
 name=name_of(raw_name)
 if not name or name in ['ชื่อ-สกุล','-']:return
 key=canonical(name)
 if not key:return
 item=artists.setdefault(key,{'id':'artist-'+hashlib.sha256(key.encode()).hexdigest()[:20],'name':name,'aliases':[],'types':[],'fields':[],'genres':[],'recognitions':[],'provinceAssociations':[],'sources':[]})
 if name!=item['name'] and name not in item['aliases']:item['aliases'].append(name)
 if kind not in item['types']:item['types'].append(kind)
 branch=clean(field);specialty=clean(subfield)
 for f in [branch,specialty]:
  if f and f!='-' and f not in item['fields']:item['fields'].append(f)
 text=branch+' '+specialty
 for genre in ['หมอลำ','โปงลาง','โหวด','แคน','ดนตรีไทย','ดนตรีพื้นบ้าน','ดนตรีสากล','เพลงไทยสากล','เพลงลูกทุ่ง','เพลงพื้นบ้าน','คีตศิลป์','นาฏศิลป์','หนังตะลุง','โนรา','ลิเก','ลำตัด']:
  if genre in text and genre not in item['genres']:item['genres'].append(genre)
 if 'ดนตรี' in text and not item['genres']:item['genres'].append('ดนตรี')
 ref={'datasetKey':source,'recordIndex':index,'url':'https://data.go.th/dataset/'+source}
 item['sources'].append(ref)
 if year and str(year).strip().isdigit():
  recognition={'type':kind,'yearBE':int(year),'field':branch,'specialty':specialty,'sourceUrl':ref['url'],'status':'historical_registry'}
  if recognition not in item['recognitions']:item['recognitions'].append(recognition)
 if province:
  raw_province=clean(province);province=province_aliases.get(raw_province,raw_province)
  code=province_names.get(province)
  if not code:raise ValueError('Unrecognized province '+province)
  association={'provinceCode':code,'provinceName':province,'relationship':relationship,'sourceUrl':ref['url']}
  if district:association['district']=clean(district)
  if raw_province!=province:association['sourceProvinceName']=raw_province
  if not any(p['provinceCode']==code and p['relationship']==relationship for p in item['provinceAssociations']):item['provinceAssociations'].append(association)
for key in source_keys:
 file=source_dir/('hub-national-artists.csv' if key=='art_31_01' else 'hub-artist-'+key+'.csv')
 rows=list(csv.DictReader(file.open(encoding='cp874' if key in ['artist','silpathorn'] else 'utf-8-sig')));raw_counts[key]=sum(1 for row in rows if str(row.get('artist_year_received','')).strip().isdigit()) if key=='art_31_01' else len(rows)
 for i,row in enumerate(rows,1):
  if key=='art_31_01':
   if not (row.get('artist_year_received') or '').strip().isdigit():continue
   add(row['artist_name'],'national_artist',row['artist_field'],row['artist_subfield'],key,i,row['artist_year_received'])
  elif key=='artist':add(clean(row.get('ชื่อจริง'))+' '+clean(row.get('นามสกุล')),'contemporary_artist',row.get('สาขาศิลปิน'),'',key,i)
  elif key=='silpathorn':add(row.get('พระนาม ชื่อ และนามสกุล'),'silpathorn_artist',row.get('สาขา'),'',key,i,row.get('ปีที่ได้รับ'))
  elif key=='dataset_41_181':add(row.get('ชื่อ-สกุล'),'folk_artist',row.get('งาน/สาขา'),'',key,i,province='เพชรบุรี',relationship='work_area',district=row.get('อำเภอ'))
  elif key=='lct_51_01':add(row.get('artistname'),'national_artist',row.get('brance'),row.get('subbrance'),key,i,province=row.get('province'),relationship='learning_site')
# Province relationships verified against institutional biographies; no residential details.
curated=[
 {'match':'รากแก่น','code':'TH-34','province':'อุบลราชธานี','relationship':'birthplace','genres':['หมอลำ'],'url':'https://www.culture.go.th/culture_th/ewt_news.php?filename=index&nid=6692','name':'นิตยา รากแก่น'},
 {'match':'เคน ดาเหลา','code':'TH-40','province':'ขอนแก่น','relationship':'work_area','genres':['หมอลำ'],'url':'https://artculture.msu.ac.th/artindexnew?TYPE=MQ%3D%3D&art=NDMwMDM%3D&pages=page.viewart'},
 {'match':'ทรงศักดิ์ ประทุมสินธุ์','code':'TH-45','province':'ร้อยเอ็ด','relationship':'origin','genres':['โหวด','ดนตรีพื้นบ้าน'],'url':'https://news.msu.ac.th/mnews/halloffame/SDetail.php?hid=11063'},
 {'match':'ราตรีศรีวิไล บงสิทธิพร','code':'TH-44','province':'มหาสารคาม','relationship':'birthplace','genres':['หมอลำ'],'url':'https://news.msu.ac.th/mnews/halloffame/ShowD.php?Cid=1&Cn=%E0%B8%9B%E0%B8%A3%E0%B8%B4%E0%B8%8D%E0%B8%8D%E0%B8%B2%E0%B8%94%E0%B8%B8%E0%B8%A9%E0%B8%8E%E0%B8%B5%E0%B8%9A%E0%B8%B1%E0%B8%93%E0%B8%91%E0%B8%B4%E0%B8%95%E0%B8%81%E0%B8%B4%E0%B8%95%E0%B8%95%E0%B8%B4%E0%B8%A1%E0%B8%A8%E0%B8%B1%E0%B8%81%E0%B8%94%E0%B8%B4%E0%B9%8C&news_datee=&news_dates=&page=64&saction=&searchtxt='},
 {'match':'ราตรีศรีวิไล บงสิทธิพร','code':'TH-40','province':'ขอนแก่น','relationship':'work_area','genres':['หมอลำ'],'url':'https://council.kku.ac.th/wp-content/uploads/2020/11/Council4-63.pdf'},
]
for evidence in curated:
 matches=[a for a in artists.values() if (evidence.get('name') and canonical(evidence['name'])==canonical(a['name'])) or (not evidence.get('name') and canonical(evidence['match'])==canonical(a['name']))]
 if len(matches)!=1:raise ValueError('Ambiguous biography match '+evidence['match'])
 item=matches[0]
 item['provinceAssociations'].append({'provinceCode':evidence['code'],'provinceName':evidence['province'],'relationship':evidence['relationship'],'sourceUrl':evidence['url']})
 item['sources'].append({'datasetKey':'institutional_biography','url':evidence['url']})
 for genre in evidence['genres']:
  if genre not in item['genres']:item['genres'].append(genre)
# Local musicians are not promoted to national-artist status.
add('จรัล มโนเพ็ชร','local_artist','ดนตรี','โฟล์คซองคำเมือง','institutional_biography',1,province='เชียงใหม่',relationship='cultural_legacy')
jaran=artists[canonical('จรัล มโนเพ็ชร')]
jaran['sources']=[{'datasetKey':'institutional_biography','url':'https://creativelanna.cmu.ac.th/th/ArticleDetail/2/869cc7e5-1b0b-4671-a355-9179b8ec169c'}]
jaran['provinceAssociations'][0]['sourceUrl']=jaran['sources'][0]['url']
jaran['genres']=['โฟล์คซองคำเมือง']
# Additional profiles verified from publishers/artist biographies, not government registrations.
for filename in ['supplements.json', 'performers.json']:
 supplements_path=root/'data/cultural-artists'/filename
 if not supplements_path.exists():continue
 for supplement in json.loads(supplements_path.read_text()):
  key=canonical(supplement['name'])
  if key in artists:
   item=artists[key]
   for field in ['aliases','types','fields','genres','recognitions','provinceAssociations','sources','awards']:
    item.setdefault(field,[])
    for value in supplement.get(field,[]):
     if value not in item[field]:item[field].append(value)
  else:artists[key]=supplement
items=list(artists.values())
for item in items:item['provinceStatus']='verified' if item['provinceAssociations'] else 'pending_verification'
result={'schemaVersion':1,'checkedAt':'2026-11-08','nationalRegistryCoverage':{'fromBE':2528,'toBE':2566},'notes':['เป็นข้อมูลตามทำเนียบต้นทาง ไม่ใช่การรับรองสถานะการยกย่องปัจจุบัน','ความเกี่ยวข้องกับจังหวัดแยกเป็นจังหวัดเกิด ภูมิลำเนา พื้นที่ทำงาน บ้านศิลปิน/แหล่งเรียนรู้ หรือมรดกผลงานวัฒนธรรม และไม่ใช้แทนกัน','รายชื่อที่ไม่มีหลักฐานจังหวัดคงสถานะรอตรวจสอบ','ไม่จัดเก็บที่อยู่บ้าน เบอร์โทรศัพท์ส่วนตัว หรือข้อมูลติดต่อส่วนตัว'],'sources':sources,'rawCounts':raw_counts,'artists':items}
(root/'data/cultural-artists/registry.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'artists':len(items),'verifiedProvince':sum(bool(a['provinceAssociations']) for a in items),'pendingProvince':sum(not a['provinceAssociations'] for a in items),'provinces':len({p['provinceCode'] for a in items for p in a['provinceAssociations']}),'music':sum(bool(a['genres']) for a in items),'rawCounts':raw_counts},ensure_ascii=False))
