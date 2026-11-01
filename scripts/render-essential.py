"""Render source book pages; these are the authoritative exercise text and layout."""
import argparse
from pathlib import Path
import pypdfium2 as pdfium

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('pdf')
args = parser.parse_args()
out = Path(__file__).resolve().parents[1] / 'public/essential/pages'
out.mkdir(parents=True, exist_ok=True)
pdf = pdfium.PdfDocument(args.pdf)
for n in [*range(13, 337), *range(340, 374)]:
    path = out / f'{n:03}.webp'
    if path.exists():
        continue
    page = pdf[n-1]
    bitmap = page.render(scale=2.3)
    bitmap.to_pil().convert('RGB').save(path, 'WEBP', quality=90, method=4)
    bitmap.close()
    page.close()
    if n % 25 == 0:
        print(f'Rendered through PDF page {n}', flush=True)
