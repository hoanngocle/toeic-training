"""Import the user's ETS scans using local OCR; retain an auditable source map."""
import argparse
import concurrent.futures
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'ETS 2024'
WORK = ROOT / 'tmp/ets'
DATA = ROOT / 'data/ets-2024'

def prepare_one(item):
    section, number = item
    folder = SOURCE / ('ETS 2024 - LISTENING' if section == 'lc' else 'ETS 2024 - READING')
    pdf = folder / f'TEST {number} {section.upper()} (1).pdf'
    target = WORK / f'{section}-{number:02}'
    target.mkdir(parents=True, exist_ok=True)
    if not (target / 'rendered.txt').exists():
        subprocess.run(['pdftoppm', '-scale-to', '2400', '-png', str(pdf), str(target / 'page')], check=True, capture_output=True)
        (target / 'rendered.txt').write_text(str(pdf), encoding='utf-8')
    return f'{section}-{number:02}'

def answer_keys(section):
    from pypdf import PdfReader
    pdf = next(p for p in (SOURCE/'ANSWER + TRANSCRIPT').glob('*.pdf') if p.name.startswith('ĐÁP') and section.upper() in p.name)
    text = '\n'.join(p.extract_text() for p in PdfReader(pdf).pages)
    matches = list(re.finditer(r'(?<!\d)(\d{1,3})\s*\(\s*([A-D])\s*\)', text))
    pairs = [(int(m[1]), m[2]) for m in matches]
    assert len(pairs) == 1000, (section, len(pairs))
    first = 1 if section == 'lc' else 101
    keys = {}
    for n in range(10):
        batch = pairs[n*100:(n+1)*100]
        assert [p[0] for p in batch] == list(range(first, first+100)), (section, n)
        # PDF object order is 1,2,3,4,5,7,8,6,9,10 in BOTH answer
        # PDFs. The printed label trailing each block is authoritative.
        tail = text[matches[(n+1)*100-1].end():matches[(n+1)*100].start() if n<9 else len(text)]
        labels = re.findall(r'TEST\s*(\d{1,2})',tail)
        assert len(labels)==1, (section,n,tail)
        test_id = int(labels[0])
        assert test_id not in keys, (section,test_id)
        keys[test_id] = dict(batch)
    assert set(keys)==set(range(1,11)), (section,keys.keys())
    return [keys[i] for i in range(1,11)]

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--prepare', action='store_true')
    parser.add_argument('--keys', action='store_true')
    args = parser.parse_args()
    DATA.mkdir(parents=True, exist_ok=True)
    if args.prepare:
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            for result in pool.map(prepare_one, [(s,n) for s in ['lc','rc'] for n in range(1,11)]):
                print('Rendered', result, flush=True)
    if args.keys:
        (DATA/'answers.json').write_text(json.dumps({'lc':answer_keys('lc'),'rc':answer_keys('rc')},ensure_ascii=False,indent=2),encoding='utf-8')
        print('Validated 2,000 original answer key entries',flush=True)
