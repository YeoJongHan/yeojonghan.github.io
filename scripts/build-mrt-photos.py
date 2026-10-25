"""Build a credited local Commons collection: --per-station 3.

Requires Pillow for duplicate detection; downloaded photographs are not edited.
Existing images and IDs are retained. Requests are cached and progress is saved
after each small batch, so interrupted runs can resume.
"""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
import hashlib
from html import unescape
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import re
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'projects/static/mrt-photos'
CACHE=Path(tempfile.gettempdir())/'mrt-photo-source'
AGENT='JongHan-MRT-Photo-Quiz/1.1 (https://jonghan.xyz/projects.html; local image collection)'
CURATION=json.loads((OUT/'curation.json').read_text(encoding='utf-8')) if (OUT/'curation.json').exists() else {}

class PlainText(HTMLParser):
    def __init__(self,value):
        super().__init__();self.parts=[];self.feed(value)
    def handle_data(self,value):self.parts.append(value)
    def text(self):return re.sub(r'\s+',' ',unescape(''.join(self.parts))).strip()

def fetch(url):
    for attempt in range(4):
        try:
            with urlopen(Request(url,headers={'User-Agent':AGENT}),timeout=40) as response:
                return response.read(),response.headers.get('Content-Type','')
        except (HTTPError,URLError,TimeoutError) as error:
            if isinstance(error,HTTPError) and error.code not in [429,500,502,503,504]:raise
            if attempt==3:raise
            time.sleep(min(12,2**attempt))

def clean_url(value):
    bits=urlsplit(value)
    scheme='https' if bits.scheme=='http' and bits.netloc in ['creativecommons.org','commons.wikimedia.org','upload.wikimedia.org','thumb.wikimedia.org'] else bits.scheme
    return urlunsplit((scheme,bits.netloc,bits.path,'',''))

def normalize(value):return re.sub(r'[^a-z0-9]+',' ',value.lower()).strip()

def capture_date(title):
    match=re.search(r'\b(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)',title)
    return '-'.join(match.groups()) if match else ''

def allowed(station_id,title,source_url):
    earliest=CURATION.get('notBefore',{}).get(station_id,'')
    irrelevant=re.search(r'construction|nearing completion|heritage trail|station model|bus stop|worksite|soil investigation|btrtm as seen from',normalize(title))
    reviewed=CURATION.get('approvedSources')
    return (reviewed is None or source_url in reviewed) and not irrelevant and source_url not in CURATION.get('excludedSources',{}) and (not earliest or capture_date(title)>=earliest)

def station_catalog():
    geo=json.loads((ROOT/'projects/sgmrt.geojson').read_text(encoding='utf-8'))
    stations=[]
    for feature in geo['features']:
        p=feature.get('properties',{})
        # Include MRT/LRT interchanges, but exclude standalone LRT stations.
        if feature['geometry']['type']!='Point' or 'singapore-mrt' not in p.get('network','').split('.') or len(p.get('name',''))<3:continue
        name=p['name'];station_id=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
        stations.append({'id':station_id,'name':name,'code':p.get('station_codes',''),'aliases':[]})
    return sorted(stations,key=lambda s:s['name'].casefold())

def source_photos(station,broad=False):
    cache=CACHE/(station['id']+('-broad-v2' if broad else '-views-v2')+'.json')
    if cache.exists():return json.loads(cache.read_text(encoding='utf-8'))
    query=f'"{station["name"]}" MRT filetype:bitmap'
    if not broad:query+=' (platform OR exterior OR concourse OR entrance)'
    params={'action':'query','format':'json','generator':'search','gsrsearch':query,'gsrnamespace':6,'gsrlimit':50,'prop':'imageinfo','iiprop':'url|size|mime|extmetadata','iiurlwidth':1000}
    raw,_=fetch('https://commons.wikimedia.org/w/api.php?'+urlencode(params))
    result=json.loads(raw)
    if 'error' in result:raise ValueError(result['error'])
    cache.write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
    return result

def view_type(title):
    text=normalize(title)
    if re.search(r'\b(exterior|outside|facade|aerial|building)\b',text):return 'exterior'
    if re.search(r'\b(entrance|exit|entrances|exits)\b',text):return 'entrance'
    if re.search(r'\b(platform|platforms)\b',text):return 'platform'
    if re.search(r'\b(concourse|concourses|atrium|escalator|escalators)\b',text):return 'concourse'
    return 'station'

def candidates_for(station,broad=False):
    result=source_photos(station,broad)
    candidates=[]
    for page in result.get('query',{}).get('pages',{}).values():
        info=(page.get('imageinfo') or [{}])[0];meta=info.get('extmetadata',{})
        value=lambda key:PlainText(str(meta.get(key,{}).get('value',''))).text()
        title=page['title'];text=normalize(title);categories=normalize(value('Categories'))
        if not allowed(station['id'],title,info.get('descriptionurl','')):continue
        if not re.search(r'\b'+re.escape(normalize(station['name']))+r'\b',text):continue
        exact=normalize(station['name'])+' mrt station'
        if exact not in categories and exact not in text and normalize(station['name'])+' mrt' not in text:continue
        if exact not in text and normalize(station['name'])+' mrt' not in text and not re.search(r'\b(station|platforms?|concourse|entrances?|exits?|exterior)\b',text):continue
        if re.search(r'construction|signboard|signage|diagram|route map|logo|station code|platform sign|ticket machine|train interior|track work|worksite',text):continue
        if 'lrt' in text and 'mrt' not in text:continue
        if re.search(r'\b(map|sign|panel|poster|screen|fare|artwork|mural)\b',text) and not re.search(r'\b(platform|concourse|exterior|entrance)\b',text):continue
        license_name=value('LicenseShortName');license_id=value('License')
        if not (re.match(r'^CC BY(?:-SA)? \d',license_name,re.I) or license_id in ['cc0','pd'] or license_name in ['CC0','Public domain']):continue
        if info.get('mime')!='image/jpeg' or info.get('width',0)<640 or info.get('height',0)<360:continue
        ratio=info['width']/info['height']
        if ratio<1.05 or ratio>2.4:continue
        view=view_type(title)
        score={'platform':18,'exterior':17,'concourse':16,'entrance':14,'station':5}[view]+6*(exact in categories)+3*(1.3<ratio<1.9)
        author=value('Artist')
        if not author:continue
        license_url=clean_url(value('LicenseUrl') or ('https://creativecommons.org/publicdomain/zero/1.0/' if license_id=='cc0' else 'https://creativecommons.org/publicdomain/mark/1.0/'))
        candidates.append({'score':score,'view':view,'info':info,'title':title.removeprefix('File:'),'author':author,'license':license_name,'licenseUrl':license_url,'sourceUrl':info['descriptionurl']})
    return candidates

def fingerprint(raw):
    # Compare small grayscale copies in memory; keep the actual files unchanged.
    with Image.open(io.BytesIO(raw)) as image:
        image=ImageOps.exif_transpose(image).convert('L').resize((9,8))
        pixels=image.tobytes()
    bits=0
    for y in range(8):
        for x in range(8):bits=(bits<<1)|int(pixels[y*9+x]>pixels[y*9+x+1])
    return bits

def choose(station,existing,target):
    selected=list(existing);added=[]
    urls={p['credit']['sourceUrl'] for p in existing}
    hashes=[fingerprint((ROOT/'projects'/p['src']).read_bytes()) for p in existing]
    views=Counter(p.get('view',view_type(p['credit']['title'])) for p in existing)
    for broad in [False,True]:
        if len(selected)>=target:break
        candidates=[p for p in candidates_for(station,broad) if p['sourceUrl'] not in urls]
        while candidates and len(selected)<target:
            # Prefer a different part of the station, then photographic quality.
            candidate=max(candidates,key=lambda p:(p['score']+22*(views[p['view']]==0),capture_date(p['title'])))
            candidates.remove(candidate);urls.add(candidate['sourceUrl'])
            info=candidate['info'];image_url=clean_url(info.get('thumburl') or info['url'])
            filename=hashlib.sha256(candidate['sourceUrl'].encode()).hexdigest()[:16]+'.jpg'
            local=OUT/filename
            try:
                if local.exists():raw=local.read_bytes()
                else:
                    raw,content_type=fetch(image_url)
                    if not raw.startswith(b'\xff\xd8\xff') or 'image' not in content_type:continue
                image_hash=fingerprint(raw)
                if any((image_hash^h).bit_count()<=9 for h in hashes):continue
                credit={key:candidate[key] for key in ['title','author','license','licenseUrl','sourceUrl']}
                record={'id':'photo-'+station['id']+'-'+filename[:8],'stationId':station['id'],'src':'static/mrt-photos/'+filename,'width':info.get('thumbwidth',info['width']),'height':info.get('thumbheight',info['height']),'view':candidate['view'],'credit':{**credit,'originalUrl':clean_url(info['url']),'downloadUrl':image_url,'note':'Wikimedia Commons thumbnail; no creative edits.'}}
                apply_review(record)
                if not local.exists():local.write_bytes(raw)
                hashes.append(image_hash);views[candidate['view']]+=1;selected.append(record);added.append(record)
            except Exception as error:print('IMAGE RETRY',station['name'],str(error),flush=True)
    return added

def apply_review(photo):
    review=CURATION.get('approvedSources',{}).get(photo['credit']['sourceUrl'])
    if isinstance(review,dict) and review.get('crop'):
        photo['crop']=dict(review['crop'])
        photo['credit']['note']='Wikimedia Commons thumbnail; displayed as a natural crop. Original photograph unchanged.'
    else:photo.pop('crop',None)

def main(per_station,only=None,limit=None):
    OUT.mkdir(parents=True,exist_ok=True);CACHE.mkdir(exist_ok=True)
    stations=station_catalog();existing=OUT/'manifest.json'
    photos=json.loads(existing.read_text(encoding='utf-8'))['photos'] if existing.exists() else []
    photos=[p for p in photos if allowed(p['stationId'],p['credit']['title'],p['credit']['sourceUrl'])]
    for photo in photos:
        apply_review(photo)
        for key in ['licenseUrl','sourceUrl','originalUrl','downloadUrl']:
            if key in photo['credit']:photo['credit'][key]=clean_url(photo['credit'][key])
    def save_manifest():
        today=datetime.now(timezone(timedelta(hours=8))).date().isoformat()
        payload={'version':1,'timeZone':'Asia/Singapore','updated':today,'stations':stations,'photos':sorted(photos,key=lambda p:p['id'])}
        pending=existing.with_suffix('.json.tmp')
        pending.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        pending.replace(existing)
    # Cover every station before filling alternate views.
    for target in sorted(set([1,per_station])):
        candidates=[s for s in stations if (not only or s['id'] in only) and sum(p['stationId']==s['id'] for p in photos)<target]
        for start in range(0,len(candidates),3):
            if limit is not None and len(photos)>=limit:break
            with ThreadPoolExecutor(max_workers=3) as pool:
                tasks={pool.submit(choose,s,[p for p in photos if p['stationId']==s['id']],target):s for s in candidates[start:start+3]}
                for future in as_completed(tasks):
                    station=tasks[future]
                    try:
                        added=future.result();photos.extend(added)
                        count=sum(p['stationId']==station['id'] for p in photos)
                        print('STATION',station['name'],f'{count}/{target}',f'+{len(added)} photos',flush=True)
                    except Exception as error:print('SOURCE ERROR',station['name'],str(error),flush=True)
            save_manifest()
    save_manifest()
    counts=Counter(p['stationId'] for p in photos)
    missing=[s['name'] for s in stations if not counts[s['id']]]
    few=[s['name'] for s in stations if counts[s['id']]<per_station]
    print('FINISHED',len(photos),'photos;',len(counts),'/',len(stations),'stations;',sum(f.stat().st_size for f in OUT.glob('*.jpg')),'image bytes',flush=True)
    print('MISSING',json.dumps(missing),flush=True)
    print('BELOW TARGET',json.dumps(few),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--per-station',type=int,default=3)
    parser.add_argument('--station',action='append',dest='only',help='Only process this station slug; may be repeated.')
    parser.add_argument('--limit',type=int,help='Optional approximate total cap; omitted for full coverage.')
    args=parser.parse_args()
    if args.per_station<1:parser.error('--per-station must be positive')
    main(args.per_station,args.only,args.limit)
