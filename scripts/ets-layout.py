"""Coordinate-aware ETS scan parser. Run after import-ets --prepare and ets-ocr."""
import json
import re
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT/'tmp/ets'
OUT = ROOT/'public/ets-2024/figures'
DATA = ROOT/'data/ets-2024'
OUT.mkdir(parents=True, exist_ok=True)
ANS = json.loads((DATA/'answers.json').read_text(encoding='utf-8'))
ISSUES = []

def rows(words, blanks=False):
    buckets=[]
    for w in sorted(words,key=lambda w:(w['y']+w['h']/2,w['x'])):
        cy=w['y']+w['h']/2
        bucket=next((b for b in reversed(buckets[-3:]) if abs(b[0]-cy)<max(7,w['h']*.45)),None)
        if bucket is None: bucket=[cy,[]]; buckets.append(bucket)
        bucket[1].append(w)
    result=[]
    for cy,ws in sorted(buckets):
        ws.sort(key=lambda w:w['x'])
        text=''; last=None
        for w in ws:
            gap=w['x']-(last['x']+last['w']) if last else 0
            if last: text+=' ____ ' if blanks and gap>max(33,w['h']*1.5) and not re.fullmatch(r'\d{2,3}\.',last['text']) else ' '
            text+=w['text'];last=w
        result.append({'y':min(w['y'] for w in ws),'bottom':max(w['y']+w['h'] for w in ws),'x':min(w['x'] for w in ws),'text':text,'words':ws})
    return result

def clean(s):
    s=re.sub(r'[—–]|-{3,}', '____',s)
    return re.sub(r'\s+',' ',s).strip()

def cropped(png,box,name):
    image=Image.open(png).convert('RGB').crop(tuple(round(v) for v in box))
    arr=np.asarray(image.convert('L'))
    ys,xs=np.where(arr<160)
    if len(xs):
        image=image.crop((max(0,int(xs.min())-8),max(0,int(ys.min())-8),min(image.width,int(xs.max())+9),min(image.height,int(ys.max())+9)))
    image.save(OUT/f'{name}.webp',quality=88)
    return {'type':'image','src':f'/ets-2024/figures/{name}.webp','alt':name.replace('-',' ')}

def photos(png,test,page):
    audited=DATA/'figure-audit.json'
    if audited.exists():
        entries=json.loads(audited.read_text(encoding='utf-8'))['photos']
        result=[]
        for q in range((page-3)*2+1,(page-3)*2+3):
            entry=next(v for v in entries if v['test']==test and v['question']==q)
            name=f'test-{test:02}-q-{q:03}'
            Image.open(png).convert('RGB').crop(entry['suggestedBoxPixels']).save(OUT/f'{name}.webp',quality=88)
            result.append({'type':'image','src':f'/ets-2024/figures/{name}.webp','alt':f'Hình câu {q}, Test {test:02}'})
        return result
    im=Image.open(png).convert('L'); a=np.asarray(im); h,w=a.shape
    # Photographs have sustained dense ink; printed labels and footers do not.
    density=(a[:,round(w*.13):round(w*.88)]<165).mean(axis=1)
    mask=np.flatnonzero((density>.18)&(np.arange(h)>h*.04)&(np.arange(h)<h*.90))
    bands=[]
    for y in mask:
        if not bands or y-bands[-1][-1]>45:bands.append([y])
        else: bands[-1].append(y)
    bands=sorted(sorted(bands,key=lambda b:b[-1]-b[0],reverse=True)[:2],key=lambda b:b[0])
    if len(bands)!=2: ISSUES.append(f'Test {test} photo page {page}: {len(bands)} photos')
    blocks=[]
    for idx,b in enumerate(bands):
        top,bottom=b[0],b[-1]+1
        xd=(a[top:bottom]<165).mean(axis=0)
        xs=np.flatnonzero((xd>.12)&(np.arange(w)>w*.13)&(np.arange(w)<w*.9))
        q=(page-3)*2+idx+1
        blocks.append(cropped(png,(int(xs.min()),top,int(xs.max())+1,bottom),f'test-{test:02}-q-{q:03}'))
    return blocks

def parse_question(number,words,part,test,page):
    lines=rows(words,blanks=part==5)
    # Question number is positioned separately; preserve all other words in reading order.
    text='\n'.join(l['text'] for l in lines)
    text=re.sub(r'^\s*'+str(number)+r'[.,]?\s*','',text)
    text=re.split(r'(?:GO ON TO THE NEXT PAGE|This is the end of|Stop!|finish before time is called|TEST\s*\d+)',text,flags=re.I)[0]
    matches=list(re.finditer(r'(?m)(?:^|\s)[(（]?([ABCDabcd])[)）]\s*',text))
    choice_map={}
    for i,m in enumerate(matches):
        letter=m[1].upper()
        value=clean(text[m.end():matches[i+1].start() if i+1<len(matches) else len(text)])
        if letter not in choice_map: choice_map[letter]=value
    prompt=clean(text[:matches[0].start()] if matches else text)
    if part==6: prompt=f'Điền vào chỗ trống ({number}).'
    if not prompt and part>=3:ISSUES.append(f'Test {test} Q{number} page {page}: missing prompt')
    if set(choice_map)!=set('ABCD'):ISSUES.append(f'Test {test} Q{number} page {page}: choices {list(choice_map)} TEXT {text[:350]!r}')
    return {'number':number,'prompt':prompt,'choices':[{'label':c,'text':choice_map.get(c,'')} for c in 'ABCD'],'answer':ANS['lc' if part<5 else 'rc'][test-1][str(number)],'source':{'section':'lc' if part<5 else 'rc','page':page}}

def parse_test(test):
    parts=[{'number':i+1,'title':title,'groups':[]} for i,title in enumerate(['Photographs','Question–Response','Conversations','Talks','Incomplete Sentences','Text Completion','Reading Comprehension'])]
    for p in parts[:4]:p['audio']={'src':f'/api/ets/audio?test={test}&part={p["number"]}'}
    timing_file=DATA/'audio-timings.json'
    if timing_file.exists() and test>=6:
        timing=next(v for v in json.loads(timing_file.read_text(encoding='utf-8'))['tests'] if v['id']==test)
        for p,boundary in zip(parts[:4],timing['parts']):
            p['audio'].update({'start':boundary['start'],'end':boundary['end']})
    for section in ['lc','rc']:
        question_map={}; headers=[]; graphics={}; active_range=None
        for source in sorted((WORK/f'{section}-{test:02}').glob('*.ocr.json')):
            page=int(re.search(r'page-(\d+)',source.name)[1]);d=json.loads(source.read_text(encoding='utf-8'));w,h=d['width'],d['height'];png=source.with_name(source.name.replace('.ocr.json','.png'))
            allwords=[word for l in d['lines'] for word in l['words'] if word['y']<h*.90]
            if section=='lc' and page in [3,4,5]:
                for idx,block in enumerate(photos(png,test,page)):
                    n=(page-3)*2+idx+1
                    parts[0]['groups'].append({'id':f'ets-{test}-q{n}','blocks':[block],'questions':[{'number':n,'prompt':'Chọn mô tả phù hợp với hình.','choices':[{'label':c,'text':''} for c in 'ABCD'],'answer':ANS['lc'][test-1][str(n)]}]})
            if section=='lc' and page<7:continue
            if section=='rc' and page<2:continue
            source_rows=rows(allwords)
            source_heading=next((r for r in source_rows if re.search(r'Questions?\s*\d{3}',r['text'],re.I)),None)
            if source_heading:
                match=re.search(r'Questions?\s*(\d{3})\D{0,6}(\d{3})',source_heading['text'],re.I)
                if match:active_range=tuple(map(int,match.groups()))
            bounds=((32,70) if page<=10 else (71,100)) if section=='lc' else ((101,130) if page<=4 else (131,146) if page<=8 else (147,200))
            if section=='rc' and page>=9 and active_range:bounds=active_range
            anchors=[]
            for word in allwords:
                match=re.fullmatch(r'(\d{2,3})[.,]?',word['text'])
                if match and bounds[0]<=int(match[1])<=bounds[1] and (w*.065<word['x']<w*.14 or w*.40<word['x']<w*.60):
                    anchors.append({'n':int(match[1]),'x':word['x'],'y':word['y'],'col':0 if word['x']<w*.30 else 1})
            if section=='rc' and 5<=page<=8:
                anchors=[a for a in anchors if any(re.fullmatch(r'\(?[BCD]\)',v['text']) and 0<=v['y']-a['y']<h*.09 and w*.025<v['x']-a['x']<w*.085 for v in allwords)]
            # Blank labels inside the passage are not question anchors. Actual
            # question numbers share a consistent left edge in each column.
            for col in [0,1]:
                candidates=[a for a in anchors if a['col']==col]
                if candidates:
                    best=max(candidates,key=lambda a:sum(abs(a['x']-b['x'])<w*.009 for b in candidates))
                    anchors=[a for a in anchors if a['col']!=col or abs(a['x']-best['x'])<w*.009]
            rightanchors=[a['x'] for a in anchors if a['col']==1]
            split=min(rightanchors)-w*.008 if rightanchors else w*.50
            # Two source labels are absent from the OCR. Positions below were
            # inspected against the original page, not inferred question text.
            if section=='rc' and test==5 and page==8:
                anchors.append({'n':144,'x':w*.108,'y':h*.622,'col':0})
            if section=='rc' and test==10 and page==27:
                anchors.append({'n':194,'x':w*.515,'y':h*.393,'col':1})
            for col in [0,1]:
                aa=sorted([a for a in anchors if a['col']==col],key=lambda a:a['y'])
                for idx,a in enumerate(aa):
                    n=a['n'];bottom=aa[idx+1]['y']-5 if idx+1<len(aa) else h*.90
                    qwords=[v for v in allwords if (0 if v['x']+v['w']/2<split else 1)==col and v['y']>=a['y']-9 and v['y']<bottom]
                    part=3 if n<=70 else 4 if n<=100 else 5 if n<=130 else 6 if n<=146 else 7
                    if n in question_map:ISSUES.append(f'Test {test} duplicate Q{n} page {page}')
                    question_map[n]=parse_question(n,qwords,part,test,page)
                if section=='lc' and aa and not any(re.search(r'PART\s*[34]|Directions:',l['text']) for l in d['lines']):
                    top=h*.055; bottom=aa[0]['y']-22
                    if bottom-top>h*.055:
                        colwords=[v for v in allwords if (0 if v['x']+v['w']/2<w*.50 else 1)==col and v['y']>top and v['y']<bottom]
                        if colwords or bottom-top>h*.13:
                            graphics[aa[0]['n']]=cropped(png,(w*(.08 if col==0 else .50),top,w*(.50 if col==0 else .94),bottom),f'test-{test:02}-graphic-{aa[0]["n"]}')
            if section=='rc' and page>=5:
                heading=source_heading
                if heading:
                    match=re.search(r'Questions?\s*(\d{3})\D{0,6}(\d{3})',heading['text'],re.I)
                    if not match:
                        ISSUES.append(f'Test {test} page {page}: bad heading {heading["text"]!r}')
                    else:
                        first,last=map(int,match.groups())
                        top=heading['bottom']+6
                        bottom=min((a['y'] for a in anchors),default=h*.90)-15
                        passagewords=[v for v in allwords if v['y']>top and v['y']<bottom and w*.09<v['x']<w*.93]
                        if first<=146:
                            # Printed subscript blank numbers are source anchors,
                            # not paragraph text or independent question numbers.
                            passagewords=[v for v in passagewords if not re.fullmatch(r'1[34]\d[.,]?',v['text'])]
                        passage=rows(passagewords,blanks=False)
                        blocks=[{'type':'text','text':'\n'.join(r['text'] for r in passage)}] if passage else []
                        headers.append({'first':first,'last':last,'page':page,'blocks':blocks})
                elif headers:
                    # Multi-document groups continue on their question page.
                    # Keep that third email/notice with the previous source group.
                    bottom=min((a['y'] for a in anchors),default=h*.90)-15
                    continuation=rows([v for v in allwords if h*.04<v['y']<bottom and w*.09<v['x']<w*.93])
                    text='\n'.join(r['text'] for r in continuation)
                    if len(text)>30:headers[-1]['blocks'].append({'type':'text','text':text})
        if section=='lc':
            parts[1]['groups']=[{'id':f'ets-{test}-q{n}','blocks':[],'questions':[{'number':n,'prompt':'Nghe và chọn câu trả lời phù hợp.','choices':[{'label':c,'text':''} for c in 'ABC'],'answer':ANS['lc'][test-1][str(n)]}]} for n in range(7,32)]
            for first in list(range(32,71,3))+list(range(71,101,3)):
                group={'id':f'ets-{test}-q{first}-{first+2}','blocks':[graphics[first]] if first in graphics else [],'questions':[question_map[n] for n in range(first,first+3) if n in question_map]}
                parts[2 if first<=70 else 3]['groups'].append(group)
        else:
            parts[4]['groups']=[{'id':f'ets-{test}-q{n}','blocks':[],'questions':[question_map[n]]} for n in range(101,131) if n in question_map]
            for group in headers:
                first,last=group['first'],group['last']
                part=5 if first<=146 else 6
                if first<131 or last>200 or last-first>5:
                    ISSUES.append(f'Test {test}: invalid range {first}-{last}');continue
                parts[part]['groups'].append({'id':f'ets-{test}-q{first}-{last}','blocks':group['blocks'],'questions':[question_map[n] for n in range(first,last+1) if n in question_map],'source':{'section':'rc','page':group['page']}})
            for n in range(101,201):
                if n not in question_map:ISSUES.append(f'Test {test} missing Q{n}')
    for p in parts:
        expected=[6,25,39,30,30,16,54][p['number']-1]
        actual=sum(len(g['questions']) for g in p['groups'])
        if actual!=expected:ISSUES.append(f'Test {test} Part {p["number"]}: {actual}/{expected} questions')
    return {'id':test,'title':f'Test {test:02}','audioSrc':f'/api/ets/audio?test={test}&part=0','parts':parts}

tests=[parse_test(n) for n in range(1,11)]
correction_path=DATA/'question-corrections.json'
corrections=json.loads(correction_path.read_text(encoding='utf-8')) if correction_path.exists() else {}
for name in ['part5-corrections.json','listening-corrections.json']:
    file=DATA/name
    if file.exists():
        for key,value in json.loads(file.read_text(encoding='utf-8')).items():
            corrections.setdefault(key,{}).update(value)
passage_path=DATA/'passage-corrections.json'
passages=json.loads(passage_path.read_text(encoding='utf-8')) if passage_path.exists() else {}
for name in ['part7-layout-corrections.json','part7-insertion-corrections.json']:
    file=DATA/name
    if file.exists():passages.update(json.loads(file.read_text(encoding='utf-8')))
for t in tests:
    for p in t['parts']:
        for g in p['groups']:
            if g['questions']:
                passage_key=f'{t["id"]}-{g["questions"][0]["number"]}'
                if passage_key in passages:g['blocks']=passages[passage_key]
            for q in g['questions']:
                key=f'{t["id"]}-{q["number"]}'
                if key in corrections:
                    q.update(corrections[key])
                    ISSUES[:]=[issue for issue in ISSUES if not issue.startswith(f'Test {t["id"]} Q{q["number"]} ')]
(DATA/'tests.json').write_text(json.dumps(tests,ensure_ascii=False,indent=2),encoding='utf-8')
(DATA/'import-issues.json').write_text(json.dumps(ISSUES,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Imported {sum(len(g["questions"]) for t in tests for p in t["parts"] for g in p["groups"])} questions; {len(ISSUES)} issues')
for issue in ISSUES[:30]:print(issue)
