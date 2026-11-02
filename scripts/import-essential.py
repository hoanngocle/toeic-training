"""Build a source-faithful manifest from locally recognized book pages.

Run ocr-essential.swift and render-essential.py first. Original scans are the
authoritative exercise display; OCR supplies the checked keys and transcripts.
"""
import argparse
import json
import re
from pathlib import Path
from reading_content import enrich_reading
from review_content import enrich_reviews
from listening_content import enrich_listening

ROOT = Path(__file__).resolve().parents[1]
GROUPS = ['General Business','Office Issues','Personnel','Purchasing','Financing and Budgeting','Management Issues','Restaurants and Events','Travel','Entertainment','Health']
TITLES = ['Contracts','Marketing','Warranties','Business Planning','Conferences','Computers','Office Technology','Office Procedures','Electronics','Correspondence','Job Advertising and Recruiting','Applying and Interviewing','Hiring and Training','Salaries and Benefits','Promotions, Pensions, and Awards','Shopping','Ordering Supplies','Shipping','Invoices','Inventory','Banking','Accounting','Investments','Taxes','Financial Statements','Property and Departments','Board Meetings and Committees','Quality Control','Product Development','Renting and Leasing','Selecting a Restaurant','Eating Out','Ordering Lunch','Cooking as a Career','Events','General Travel','Airlines','Trains','Hotels','Car Rentals','Movies','Theater','Music','Museums','Media',"Doctor’s Office","Dentist’s Office",'Health Insurance','Hospitals','Pharmacy']

def rows(directory, page):
    return json.loads((directory / f'{page:03}.json').read_text())

def key_text(directory):
    result = []
    for page in range(333, 337):
        data = rows(directory, page)
        for left in [True, False]:
            result += [r['text'] for r in sorted(data, key=lambda r:r['y']) if (r['x'] < .5) == left and (.18 if page == 333 else .09) < r['y'] < .92]
    text = '\n'.join(result)
    # These OCR corrections were visually checked against PDF pages 335–336.
    text = re.sub(r'4\.crods[^\n]+', 'Words in Context: 1. subscribes 2. chooses 3. thoroughly\n4. constitutes 5. disseminated 6. investigative', text)
    text = text.replace('7. complete B. judged', '7. complete 8. judged')
    text = text.replace('9. tumover', '9. turnover').replace('12. subiect to', '12. subject to')
    return text

def parse_keys(directory):
    text = key_text(directory)
    blocks = re.split(r'Words [iI]n Context:', text)[1:]
    assert len(blocks) == 50, f'Expected 50 context keys, got {len(blocks)}'
    lessons = []
    for n, block in enumerate(blocks, 1):
        context, sep, rest = block.partition('Word Practice:')
        assert sep, n
        context = re.sub(r'Lesson.*', '', context)
        pairs = re.findall(r'(\d+)[.,]\s*(.*?)(?=\d+[.,]|$)', context.replace('\n',' '))
        assert len(pairs) == 12, (n, pairs)
        # The printed key itself says 21,22 instead of 11,12 in lessons 5,6.
        for i,(number,_) in enumerate(pairs,1):
            assert int(number)==i or (n in [5,6] and i in [11,12] and int(number)==i+10), (n,number,i)
        context_answers = {str(i): re.sub(r'\s+',' ',value).strip() for i,(_,value) in enumerate(pairs,1)}
        practice_text = re.split(r'Word Rev|Lesson', rest)[0]
        practice = dict(re.findall(r'(\d+)[.,]\s*([ABCD])', practice_text))
        if n == 8:
            # Omitted in the printed key; checked against questions PDF60 and transcript PDF345.
            practice.update({'5':'A','6':'D'})
        if n == 29:
            # Last row omitted by OCR, verified visually against PDF335.
            practice.update(dict(zip(map(str,range(18,24)),['B','A','D','C','D','A'])))
        assert set(practice)==set(map(str,range(1,24))), (n,practice)
        lessons.append({'context':context_answers,'practice':practice})
    reviews=[]
    for block in re.split(r'Word Rev(?:iew|lew)\s*#\s*\d+:',text)[1:]:
        answers=dict(re.findall(r'(\d+)[.,]\s*([ABCD])',re.split(r'Lesson',block)[0]))
        assert set(answers)==set(map(str,range(1,20))), answers
        reviews.append(answers)
    assert len(reviews)==10
    return lessons,reviews

def transcript_segments(directory):
    segments={};lesson=0;part=0
    for page in range(340,374):
        data=rows(directory,page)
        for left in [True,False]:
            column=[r for r in data if (r['x']<.48)==left and .085<r['y']<.92]
            # Merge labels and text on the same baseline before reading down a column.
            lines=[]
            for r in sorted(column,key=lambda r:r['y']):
                if lines and abs(lines[-1][0]-r['y'])<.007:
                    lines[-1][1].append(r)
                else:lines.append([r['y'],[r]])
            for _,line in lines:
                value=' '.join(r['text'] for r in sorted(line,key=lambda r:r['x']))
                match=re.search(r'LESSON\s+(\d+)',value)
                if match:lesson=int(match[1]);part=0;continue
                match=re.search(r'Part\s*([1-4])\s*:',value)
                if match:part=int(match[1]);continue
                if lesson and part:
                    s=segments.setdefault((lesson,part),{'pages':set(),'lines':[]})
                    s['pages'].add(page);s['lines'].append(value)
    assert len(segments)==200, f'Missing transcript segments: {set((l,p) for l in range(1,51) for p in range(1,5))-set(segments)}'
    return segments

def page(n, title):
    return {'src':f'/essential/pages/{n:03}.webp','page':n,'alt':f'{title} — trang PDF {n} của sách 600 Essential Words for the TOEIC'}

def questions(answers, numbers, choices=True):
    return [{'id':str(i),'label':f'Câu {i}',**({'choices':['A','B','C'] if i in [2,3] else ['A','B','C','D']} if choices else {}),'answer':answers[str(i)]} for i in numbers]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ocr',type=Path,required=True)
    args=parser.parse_args()
    keys,reviews=parse_keys(args.ocr)
    trans=transcript_segments(args.ocr)
    # Reviewed against the source images; keep fixes separate from raw OCR so
    # importing again cannot reintroduce missing dialogue or answer choices.
    for correction_file in sorted((ROOT/'data/essential').glob('transcript-corrections-*.json')):
        for key,text in json.loads(correction_file.read_text()).items():
            lesson,part=map(int,key.split('-'))
            assert (lesson,part) in trans and text.strip(), (correction_file,key)
            trans[(lesson,part)]['lines']=text.splitlines()
    terms=json.loads((ROOT/'data/essential/terms.json').read_text())
    meanings=json.loads((ROOT/'data/essential/meanings.json').read_text())
    details=json.loads((ROOT/'data/essential/word-details.json').read_text())
    assert set(details)=={f'essential-{n:02}' for n in range(1,51)}, 'Expected word details for all 50 lessons'
    for slug,entries in details.items():
        assert set(entries)==set(map(str,range(1,13))), f'Expected 12 word details: {slug}'
        for word_id,detail in entries.items():
            assert set(detail)=={'pronunciation','example'}, (slug,word_id,'Unexpected word detail fields')
            ipa=detail['pronunciation']
            assert isinstance(ipa,str) and len(ipa)>2 and ipa.startswith('/') and ipa.endswith('/'), (slug,word_id,'Missing IPA')
            assert set(detail['example'])=={'english','vietnamese'}, (slug,word_id,'Missing example language')
            assert all(isinstance(value,str) and value.strip() for value in detail['example'].values()), (slug,word_id,'Empty example')
    context_passages=json.loads((ROOT/'data/essential/context-passages.json').read_text())
    context_review=json.loads((ROOT/'data/essential/context-review.json').read_text())
    word_families=json.loads((ROOT/'data/essential/word-families.json').read_text())
    assert len(terms)==50 and all(len(ws)==12 for ws in terms)
    lessons=[]
    for i,title in enumerate(TITLES):
        n=i+1;group=i//5+1;start=13+6*i+2*(i//5);slug=f'essential-{n:02}'
        key=keys[i]
        key_pages = [333] if n<=11 else [334] if n<=24 else [335,336] if n==37 else [335] if n<=36 else [336]
        def unit(suffix,label,pages,qs):
            return {'id':f'{slug}-{suffix}','title':label,'pages':[page(p,label) for p in pages],'questions':qs,'answerKeyPages':[page(p,'Đáp án gốc') for p in key_pages] if qs else []}
        context=unit('context','Words in Context',[start+1],questions(key['context'],range(1,13),False))
        context.update(context_passages[slug])
        review_content=context_review[slug]
        assert len(review_content['explanations'])==len(context['questions']), (slug,'Missing context explanations')
        context['passageTranslation']=review_content['translation']
        for question,explanation in zip(context['questions'],review_content['explanations']):
            question['explanation']=explanation
        families=unit('families','Word Families',[start+2],[])
        families['wordFamilies']=word_families[slug]
        reading=[unit(f'reading-{p}',f'Part {p} · '+label,[start+offset],questions(key['practice'],nums)) for p,label,offset,nums in [(5,'Incomplete Sentences',4,range(10,16)),(6,'Text Completion',4,range(16,19)),(7,'Reading Comprehension',5,range(19,24))]]
        listening=[]
        for p,label,nums in [(1,'Photographs',[1]),(2,'Question–Response',[2,3]),(3,'Conversation',[4,5,6]),(4,'Talk',[7,8,9])]:
            u=unit(f'listening-{p}',f'Part {p} · {label}',[start+3],questions(key['practice'],nums))
            segment=trans[(n,p)]
            u['transcript']='\n'.join(segment['lines'])
            u['transcriptPages']=[page(x,'Transcript') for x in sorted(segment['pages'])]
            u['note']='Transcript được nhận dạng từ bản scan; mở trang gốc để đối chiếu. Âm thanh là giọng đọc tổng hợp, không phải bản thu của sách.'
            if n==8 and p==3:u['note']+=' Đáp án câu 5 (A), 6 (D) bị thiếu ở cuối sách; đã đối chiếu trực tiếp với hội thoại trang PDF 345.'
            listening.append(u)
        review_start=43+32*(group-1)
        review={'id':f'essential-review-{group:02}','title':f'Word Review #{group} · Bài {(group-1)*5+1}–{group*5}', 'pages':[page(review_start,'Word Review'),page(review_start+1,'Word Review')], 'questions':questions(reviews[group-1],range(1,20))}
        review['answerKeyPages']=[page(333 if group<=2 else 334 if group<=4 else 335 if group<=7 else 336,'Đáp án gốc')]
        # All review questions use four options (unlike Listening Part 2).
        for q in review['questions']:q['choices']=['A','B','C','D']
        words=[]
        for j,term in enumerate(terms[i],1):
            assert term in meanings and meanings[term].strip(), (n,term)
            detail=details[slug][str(j)]
            words.append({'id':j,'term':term,'spokenText':term,'pronunciation':'','meaning':meanings[term],'definition':'',**detail})
        lessons.append({'slug':slug,'number':n,'title':title,'sourceTitle':'600 Essential Words for the TOEIC · Third Edition','source':'essential','group':group,'groupTitle':GROUPS[group-1],'words':words,'vocabularyPages':[page(start,'Định nghĩa và ví dụ')],'sections':{'context':{'title':'Words in Context','units':[context]},'families':{'title':'Word Families','units':[families]},'reading':{'title':'Reading','units':reading},'listening':{'title':'Listening','units':listening},'review':{'title':'Word Review','units':[review]}}})
    enrich_reading(lessons)
    enrich_reviews(lessons)
    enrich_listening(lessons)
    target=ROOT/'data/essential/book.json'
    target.write_text(json.dumps(lessons,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'data/essential/answer-keys.json').write_text(json.dumps({'lessons':keys,'reviews':reviews},ensure_ascii=False,indent=2)+'\n')
    print(f'Imported {len(lessons)} lessons, {sum(len(l["words"]) for l in lessons)} words, 10 reviews, 200 listening transcripts.')

if __name__=='__main__':main()
