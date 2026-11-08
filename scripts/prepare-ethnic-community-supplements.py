# -*- coding: utf-8 -*-
"""Extract factual community metadata and explicit coordinates from reviewed SAC pages."""
import concurrent.futures,html,json,pathlib,re,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE='https://wikicommunity.sac.or.th'
SEEDS=[850,70,391,2171,1143,488,1431,110,1259,113,1025]
LISTS=[139,329,3476,42]
def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'ThaiCultureHub/1.0 (public cultural metadata review)'})
 with urllib.request.urlopen(req,timeout=25) as r:return r.read().decode('utf-8')
def clean(value):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',value))).strip()
def field(s,label):
 found=re.search(r'<label[^>]*>'+re.escape(label)+r'</label>(.*?)</div>',s,re.S)
 return clean(found.group(1)) if found else ''
ids=set(SEEDS)
for keyword in LISTS:
 s=fetch(BASE+'/community/index?CommunitySearch%5Bkeyword_id%5D='+str(keyword))
 ids.update(int(i) for i in re.findall(r'href="/community/(\d+)"',s)[:10])
# ผู้ไท list keyed by explicit ethnic group.
s=fetch(BASE+'/community/index?CommunitySearch%5Bethnic_group_id%5D=191')
ids.update(int(i) for i in re.findall(r'href="/community/(\d+)"',s)[:10])
def parse(entry):
 s=fetch(BASE+'/community/'+str(entry));url=BASE+'/community/'+str(entry)
 group_section=re.search(r'กลุ่มชาติพันธุ์ต่าง ๆ ในชุมชน:</label>(.*?)(?:<div|</div)',s,re.S)
 groups=re.findall(r'<a[^>]*>(.*?)</a>',group_section.group(1),re.S) if group_section else []
 groups=[clean(g) for g in groups if clean(g)]
 name=field(s,'ชื่อทางการ:')
 if not name:
  title=re.search(r'<h3>.*?<a[^>]*>([^<]+)',s,re.S);name=clean(title.group(1)) if title else ''
 province=field(s,'จังหวัด:');district=field(s,'อำเภอ/เขต:');sub=field(s,'ตำบล/แขวง:')
 try:lat=float(field(s,'ละติจูด:'));lng=float(field(s,'ลองจิจูด:'))
 except ValueError:return None,{'id':entry,'reason':'missing explicit coordinates'}
 if not name or not groups or not province:return None,{'id':entry,'reason':'missing community/ethnicity evidence'}
 if not (5<=lat<=21 and 97<=lng<=106):return None,{'id':entry,'reason':'coordinate outside Thailand review range'}
 # Compare published map marker with the labelled coordinate pair.
 marker=re.search(r'new L.LatLng\(\s*([-\d.]+),\s*([-\d.]+)',s)
 if marker and (abs(float(marker[1])-lat)>0.0001 or abs(float(marker[2])-lng)>0.0001):return None,{'id':entry,'reason':'coordinate text/map mismatch'}
 return {'id':'sac-community-'+str(entry),'title':name,'group':' · '.join(groups),'groups':groups,'province':province,'provinceEnglish':'','district':district,'subDistrict':sub,'village':name,'villageEnglish':'','region':'','description':'ชุมชน'+name+' จังหวัด'+province+' ที่ฐานข้อมูลวิกิชุมชนระบุกลุ่มชาติพันธุ์ '+ ' และ '.join(groups)+' ข้อมูลพิกัดเป็นจุดอ้างอิงชุมชนตามต้นทาง ไม่ใช่ขอบเขตที่อยู่อาศัยทั้งหมดของกลุ่มชาติพันธุ์','latitude':lat,'longitude':lng,'sourceUrl':url,'coordinateSourceUrl':url,'sourceName':'วิกิชุมชน — ศูนย์มานุษยวิทยาสิรินธร','coordinateKind':'community_reference','checkedAt':'2026-11-08'},None
items=[];skipped=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 futures={pool.submit(parse,i):i for i in sorted(ids)}
 for future in concurrent.futures.as_completed(futures):
  try:
   item,reason=future.result()
   if item:items.append(item)
   else:skipped.append(reason)
  except Exception as e:skipped.append({'id':futures[future],'reason':type(e).__name__})
deferred={478:'same-community coordinate conflict with 1521',1521:'same-community coordinate conflict with 478'}
for item in items[:]:
 num=int(item['id'].split('-')[-1])
 if num in deferred:items.remove(item);skipped.append({'id':num,'reason':deferred[num]})
items.sort(key=lambda item:int(item['id'].split('-')[-1]))
existing_path=ROOT/'data/ethnic-groups/community-supplements.json'
if existing_path.exists():
 reviewed={item['id']:item for item in json.loads(existing_path.read_text())}
 for item in items:
  old=reviewed.get(item['id'])
  if old and old['sourceUrl']==item['sourceUrl']:item['description']=old['description']
(ROOT/'data/ethnic-groups/community-supplements.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'data/ethnic-groups/preparation-report.json').write_text(json.dumps({'checkedAt':'2026-11-08','reviewed':len(ids),'accepted':len(items),'skipped':skipped},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'reviewed':len(ids),'accepted':len(items),'provinces':len({i['province'] for i in items}),'groups':len({g for i in items for g in i['groups']}),'skipped':skipped},ensure_ascii=False))
