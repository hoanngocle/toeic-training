"""Visually verified regions of unruled tables in the supplied source PDFs.

Coordinates use original PDF points. Columns/rows are reconstructed from words,
not screenshots or OCR, and remain covered by the importer's character audit.
"""

# (top, bottom, internal column boundaries, has_header)
PREPOSITION_TABLES = {
    1: [(470, 600, (208, 375), True), (685, 780, (185, 382), True)],
    2: [(70, 330, (185, 382), False), (380, 780, (330,), True)],
    3: [(70, 275, (300,), False), (325, 660, (275,), True), (715, 780, (240,), True)],
    4: [(70, 165, (240,), False), (215, 410, (230,), True), (465, 750, (290,), True)],
    5: [(97, 650, (235,), True)],
    6: [(105, 235, (158,), True), (303, 520, (230,), True), (560, 725, (280,), True)],
    7: [(134, 350, (280,), True), (595, 695, (150,), True)],
    8: [(191, 450, (290,), True), (494, 565, (195,), True), (602, 780, (210,), True)],
    9: [(288, 445, (285,), True), (524, 725, (165, 270), True)],
    10: [(76, 185, (280,), True)],
}


def regions_for(slug, page):
    if slug == 'gioi-tu-lien-tu-menh-de':
        return PREPOSITION_TABLES.get(page, [])
    return []


def extract_table(page, region, clean):
    top, bottom, cuts, has_header = region
    words = page.crop((0, top, page.width, bottom)).extract_words(x_tolerance=2, y_tolerance=3)
    lines = []
    for word in words:
        if not lines or abs(word['top'] - lines[-1][0]['top']) > 4:
            lines.append([word])
        else:
            lines[-1].append(word)
    rows = []
    last_y = None
    for line in lines:
        cells = [[] for _ in range(len(cuts) + 1)]
        for word in sorted(line, key=lambda w: w['x0']):
            column = sum((word['x0'] + word['x1']) / 2 >= cut for cut in cuts)
            cells[column].append(word['text'])
        row = [clean(' '.join(cell)) for cell in cells]
        y = min(word['top'] for word in line)
        if last_y is not None and y - last_y < 20:
            rows[-1] = ['\n'.join(filter(None, [old, new])) for old, new in zip(rows[-1], row)]
        else:
            rows.append(row)
        last_y = y
    return {'type': 'table', 'rows': rows, 'hasHeader': has_header, '_top': top, '_bottom': bottom}
