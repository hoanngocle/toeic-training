"""Convert the user's nine TOEIC references into native, auditable lesson data.

Run with the bundled Python (pdfplumber + pypdf), optionally passing source dir.
Only complete source examples are graded; no generated distractors or solutions.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

import pdfplumber
from pypdf import PdfReader
from grammar_tables import regions_for, extract_table

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r'C:/Users/NYX/Documents/TOEIC/TOEIC')

# Boundaries are actual subject headings, including headings halfway down a page.
SOURCES = [
    ('listening-part-2', 'Listening Part 2', 'Hỏi – đáp, cấu trúc câu và phản hồi trong giao tiếp.', 'Listening_Part 2.pdf', [
        ('tong-quan', 'Tổng quan và các dạng câu hỏi', None),
        ('when', 'When · Câu hỏi về thời gian', 'a. Câu hỏi “When”'),
        ('who', 'Who · Người, chức danh và công việc', 'b. Câu hỏi “Who"'),
        ('where', 'Where · Địa điểm và vị trí', 'c. Câu hỏi “Where”'),
        ('what', 'What · Sự vật và hành động', 'd. Câu hỏi “What”'),
        ('how', 'How · Cách thức, số lượng và thời lượng', 'e. Câu hỏi “How”'),
        ('why', 'Why · Lý do và mục đích', 'f. Câu hỏi “Why”'),
        ('yes-no', 'Câu hỏi Yes/No', '2.2. Câu hỏi Yes/ No'),
        ('phu-dinh', 'Câu hỏi phủ định', 'b. Câu hỏi phủ định:'),
        ('cau-hoi-duoi', 'Câu hỏi đuôi', 'c. Câu hỏi đuôi:'),
        ('cau-hoi-phuc', 'Câu hỏi phức', 'd. Câu hỏi phức:'),
        ('lua-chon', 'Câu hỏi lựa chọn', '2.3. Câu hỏi về nhu cầu/ thiên hướng'),
        ('tuong-trinh', 'Câu tường trình', '2.4. Câu tường trình'),
        ('goi-y-yeu-cau', 'Gợi ý và yêu cầu', '2.5. Gợi ý và yêu cầu'),
        ('bay-thuong-gap', 'Nhận diện bẫy thường gặp', 'III. Một số bẫy'),
        ('phan-hoi-gian-tiep', 'Phản hồi gián tiếp và hệ thống mẫu câu', 'BÍ KÍP MAX ĐIỂM'),
    ]),
    ('listening-part-3', 'Listening Part 3', 'Hiểu hội thoại, suy luận và liên kết thông tin.', 'Listening_Part 3.pdf', [
        ('chi-tiet', 'Câu hỏi về chi tiết cuộc hội thoại', None),
        ('hanh-dong-tuong-lai', 'Câu hỏi về hành động tương lai', 'Câu hỏi về hành động tương lai'),
        ('yeu-cau-goi-y', 'Câu hỏi về yêu cầu và gợi ý', 'Câu hỏi về yêu cầu, gợi ý'),
        ('ham-y', 'Câu hỏi về hàm ý câu nói', 'Câu hỏi hàm ý câu nói'),
        ('bang-bieu', 'Kết hợp hội thoại với bảng biểu', 'Câu hỏi kết hợp bảng biểu'),
        ('chien-thuat', 'Chiến thuật và tránh bẫy Part 3', 'BÍ KÍP FULL ĐIỂM'),
    ]),
    ('reading-part-6', 'Reading Part 6', 'Từ loại, ngữ pháp và liên kết ý trong đoạn văn.', 'Reading_part 6.pdf', [
        ('tong-quan', 'Cấu trúc và chiến thuật làm bài', None),
        ('tu-loai', 'Nhận diện từ loại', 'Dạng 1.'),
        ('ngu-phap', 'Động từ, thì và thể bị động', 'Dạng 2. Ngữ pháp'),
        ('tu-vung', 'Chọn từ phù hợp với ngữ cảnh', 'Dạng 3.'),
        ('dien-cau', 'Điền câu và liên kết mạch văn', 'Dạng 4.'),
        ('quy-trinh', 'Làm bài, chữa bài và luyện dịch', 'II. Quy trình luyện Part 6'),
    ]),
    ('reading-part-7', 'Reading Part 7', 'Đọc hiểu, paraphrase và xử lý nhiều văn bản.', 'Reading_part 7.pdf', [
        ('tong-quan', 'Tổng quan các dạng bài đọc', None),
        ('skimming', 'Skimming · Đọc lấy ý chính', '7.1. CHIẾN THUẬT'),
        ('scanning', 'Scanning và paraphrase', 'BÍ KIẾP SCANNING'),
        ('dang-cau-hoi', 'Nhận diện các dạng câu hỏi', 'Trong Part 7 có hai loại câu hỏi chính.'),
        ('thu-tin', 'Kết hợp văn bản thư tín', '1. Dạng bài đọc liên quan đến thư tín'),
        ('thong-bao', 'Kết hợp văn bản thông báo', '2. Dạng bài đọc liên quan đến thông báo'),
        ('bai-bao', 'Kết hợp bài báo và quảng cáo', 'a) Bài báo + bài báo'),
        ('quy-trinh', 'Quy trình tìm thông tin và chọn đáp án', 'BƯỚC 1:'),
    ]),
    ('tinh-tu', 'Tính từ', 'Hậu tố tính từ, so sánh và phân biệt -ed với -ing.', 'ADJ.pdf', [
        ('tu-dong-tu', 'Tạo tính từ từ động từ', None),
        ('tu-danh-tu', 'Tạo tính từ từ danh từ', 'Gắn đuôi tính từ trong tiếng Anh vào danh từ'),
        ('so-sanh', 'Hậu tố so sánh -er và -est', 'Gắn hậu tố'),
        ('hau-to', 'Các đuôi tính từ thường gặp', 'Các đuôi tính từ hay gặp'),
        ('ed-ing', 'Phân biệt tính từ đuôi -ed và -ing', 'So sánh sự khác nhau'),
        ('phan-tu', 'Phân từ dùng làm tính từ', 'Past Participle'),
    ]),
    ('gioi-tu-lien-tu-menh-de', 'Giới từ · Liên từ · Mệnh đề', 'Liên kết từ, cụm từ và mệnh đề để tạo câu đúng cấu trúc.', 'GIỚI TỪ - LIÊN TỪ - MỆNH ĐỀ.pdf', [
        ('gioi-tu', 'Khái niệm và vị trí của giới từ', None),
        ('thoi-gian', 'Giới từ chỉ thời gian', '3.1. Giới từ chỉ thời gian'),
        ('noi-chon', 'Giới từ chỉ nơi chốn', '3.2. Giới từ chỉ nơi chốn'),
        ('di-chuyen', 'Giới từ chỉ sự di chuyển', '3.3. Giới từ chỉ sự di chuyển'),
        ('muc-dich', 'Giới từ chỉ mục đích', '3.4. Giới từ chỉ mục đích'),
        ('cach-thuc', 'Giới từ chỉ cách thức', '3.5. Giới từ chỉ cách thức'),
        ('nguyen-nhan', 'Giới từ chỉ nguyên nhân', '3.6. Giới từ chỉ nguyên nhân'),
        ('cum-gioi-tu', 'Các cụm giới từ quan trọng', '3.7. Một số cụm giới từ'),
        ('lien-tu', 'Liên từ đẳng lập, tương hỗ và phụ thuộc', 'II. LIÊN TỪ'),
        ('menh-de', 'Mệnh đề chính và mệnh đề phụ', 'III. MỆNH ĐỀ'),
        ('trang-ngu', 'Mệnh đề trạng ngữ', 'IV. MỆNH ĐỀ TRẠNG NGỮ'),
        ('phan-biet', 'Phân biệt giới từ và liên từ', 'V. PHÂN BIỆT'),
        ('danh-ngu', 'Mệnh đề danh ngữ', 'VI. MỆNH ĐỀ DANH NGỮ'),
        ('quan-he', 'Mệnh đề quan hệ và cách rút gọn', 'VII. MỆNH ĐỀ QUAN HỆ'),
    ]),
    ('danh-tu', 'Danh từ', 'Số ít, số nhiều, danh từ ghép, sở hữu cách và vị trí trong câu.', 'Nouns.pdf', [
        ('tong-quan', 'Tổng quan về danh từ', None),
        ('so-it', 'Danh từ số ít và mạo từ a/an', 'I. HÌNH THỨC'),
        ('so-nhieu', 'Danh từ số nhiều và các ngoại lệ', '2. Danh từ Số nhiều'),
        ('phan-loai', 'Phân loại danh từ theo ý nghĩa', 'ii, PHÂN LOẠI'),
        ('tap-hop', 'Danh từ tập hợp và chia động từ', 'Danh từ Tập hợp'),
        ('dem-duoc', 'Danh từ đếm được và không đếm được', '2. Phân loại theo Cách dùng'),
        ('nghia-thay-doi', 'Danh từ thay đổi nghĩa theo cách dùng', 'CÁC TRƯỜNG HỢP ĐẶC BIỆT'),
        ('don-vi-do', 'Đơn vị đo lường và các trường hợp cần lưu ý', '1. Lưu ý về Danh từ đếm được'),
        ('danh-tu-ghep', 'Danh từ ghép và cụm danh từ', '2. Danh từ Ghép'),
        ('gioi-tinh', 'Danh từ chỉ giới tính', '2. Bảng phân biệt Giới tính'),
        ('so-huu', 'Sở hữu cách của danh từ', '3. Quy tắc Dạng sở hữu'),
        ('hau-to', 'Hậu tố cấu tạo danh từ', 'HẬU TỐ CẤU TẠO DANH TỪ'),
        ('vi-tri', 'Trật tự cụm danh từ và vị trí trong câu', 'VỊ TRÍ CỦA DANH TỪ'),
    ]),
    ('trat-tu-tu', 'Trật tự từ', 'Nhận diện vị trí và cấu tạo của danh từ, tính từ, trạng từ, động từ.', 'Trật tự từ.pdf', [
        ('danh-tu', 'Vị trí và dấu hiệu nhận biết danh từ', None),
        ('tinh-tu', 'Vị trí và dấu hiệu nhận biết tính từ', 'II. TÍNH TỪ'),
        ('trang-tu', 'Vị trí và dấu hiệu nhận biết trạng từ', 'III. TRẠNG TỪ'),
        ('dong-tu', 'Vị trí của động từ', 'IV. ĐỘNG TỪ'),
    ]),
    ('dong-tu', 'Động từ', 'Phân loại động từ, các thì và cách dùng to V, V-ing.', 'Verbs.pdf', [
        ('tong-quan', 'Định nghĩa và phân loại động từ', None),
        ('khuyet-thieu', 'Động từ khuyết thiếu', '3.1. Modal verbs'),
        ('tro-dong-tu', 'Trợ động từ và cách nhấn mạnh', '3.2. Trợ động từ'),
        ('to-be', 'Các dạng của động từ to be', '3.3. To be'),
        ('dong-tu-thuong', 'Nội động từ, ngoại động từ và tân ngữ', '4. Verb thường'),
        ('hien-tai-don', 'Thì hiện tại đơn', 'THÌ CỦA ĐỘNG TỪ'),
        ('hien-tai-tiep-dien', 'Thì hiện tại tiếp diễn', '1.2. Present continous'),
        ('hien-tai-hoan-thanh', 'Thì hiện tại hoàn thành', '1.3. Present perfect'),
        ('qua-khu', 'Các thì quá khứ và as soon as', '2. PAST TENSE'),
        ('tuong-lai', 'Các thì tương lai', '4. Tương lai'),
        ('nguyen-mau', 'Dạng động từ và nguyên mẫu không to', 'DẠNG ĐỘNG TỪ'),
        ('to-v', 'Các trường hợp dùng to V', '2.2. Dạng to V'),
        ('ving', 'Các trường hợp dùng V-ing', '2.3. Dạng Ving'),
        ('phan-biet', 'Đổi dạng động từ và sự khác biệt ý nghĩa', 'Lưu ý về sự khác biệt về ý nghĩa:'),
    ]),
]


def clean(text):
    return re.sub(r'[ \t]+', ' ', text or '').strip().replace('\u00ad', '')


def text_blocks(page, bbox=None):
    crop = page.crop(bbox) if bbox else page
    words = crop.extract_words(extra_attrs=['fontname', 'size'], x_tolerance=2, y_tolerance=3)
    lines = []
    for word in words:
        if not lines or abs(word['top'] - lines[-1][0]['top']) > 4:
            lines.append([word])
        else:
            lines[-1].append(word)
    result = []
    for line in lines:
        text = clean(' '.join(w['text'] for w in sorted(line, key=lambda w: w['x0'])))
        bold = sum(len(w['text']) for w in line if 'bold' in w['fontname'].lower())
        total = sum(len(w['text']) for w in line)
        kind = 'paragraph'
        if bold > total * .75 and len(text) < 180:
            kind = 'heading'
        elif text.startswith(('●', '○', '– ', '- ', '=>', '→')):
            kind = 'list'
        if text:
            result.append({'type': kind, 'text': text, '_top': min(w['top'] for w in line), '_bottom': max(w['bottom'] for w in line)})
    return result


def convert_page(page, page_number, boundaries=(), regions=(), skip_tables=False):
    tables = [] if regions or skip_tables else page.find_tables()
    # Ignore spurious one-column rectangles.
    tables = [t for t in tables if any(sum(bool(c) for c in row) >= 2 for row in t.extract())]
    objects = [extract_table(page, region, clean) for region in regions]
    for table in tables:
        rows = [[clean(c) if c else '' for c in row] for row in table.extract()]
        nonempty_columns = [i for i in range(len(rows[0])) if any(row[i] for row in rows)]
        rows = [[row[i] for i in nonempty_columns] for row in rows]
        # A ruled container with no horizontal row separators (e.g. the modal
        # verb pairs) is one PDF cell per column. Restore its actual line rows.
        if len(rows) == 1 and rows[0][0].startswith('Hiện tại\n'):
            columns = [cell.split('\n') for cell in rows[0]]
            rows = [[column[i] if i < len(column) else '' for column in columns] for i in range(max(map(len, columns))) ]
            objects.append({'type': 'table', 'rows': rows, '_top': table.bbox[1]})
            continue
        # Poppler-generated PDFs sometimes extend their detected table into the
        # following prose. A one-cell spanning row is prose, not a data row.
        chunk = []
        for row, geometry in zip(rows, table.rows):
            nonempty = [c for c in row if c]
            if len(nonempty) >= 2:
                chunk.append(row)
            else:
                if chunk:
                    objects.append({'type': 'table', 'rows': chunk, '_top': geometry.bbox[1] - .01})
                    chunk = []
                if nonempty:
                    objects.extend(text_blocks(page, geometry.bbox))
        if chunk:
            objects.append({'type': 'table', 'rows': chunk, '_top': table.bbox[3] - .01})
    excluded = [t.bbox for t in tables] + [(0, region[0], page.width, region[1]) for region in regions]
    outside = page.filter(lambda obj: not any(
        box[0] <= (obj.get('x0', 0)+obj.get('x1', 0))/2 <= box[2]
        and box[1] <= (obj.get('top', 0)+obj.get('bottom', 0))/2 <= box[3] for box in excluded))
    objects.extend(text_blocks(outside))
    for block in objects:
        if block['type'] == 'table':
            # A detector can share grid lines between separate tables on the
            # same page. Compact each emitted table, rather than that whole grid.
            rows = block['rows']
            columns = [i for i in range(len(rows[0])) if any(row[i] for row in rows)]
            block['rows'] = [[row[i] for i in columns] for row in rows]
    objects.sort(key=lambda b: b['_top'])
    result = []
    for block in objects:
        if any(block.get('text', '').startswith(marker) for marker in boundaries):
            block['type'] = 'heading'
        # Combine wrapped prose but retain actual lists, headings and tables.
        if (result and block['type'] == result[-1]['type'] == 'paragraph'
                and block['_top'] - result[-1].get('_bottom', 0) < 7):
            result[-1]['text'] += ' ' + block['text']
            result[-1]['_bottom'] = block.get('_bottom', block['_top'])
        else:
            result.append({**block, 'sourcePage': page_number})
    return [{k: v for k, v in b.items() if not k.startswith('_')} for b in result]


def native_table(page, rows):
    return {'type': 'table', 'rows': rows, 'sourcePage': page}


def has_header(rows):
    return any(re.search(r'Dạng câu|Câu hỏi|Từ hỏi|Lựa chọn|Tên người đặt|Giordano Wedding|Đuôi|Ý nghĩa|Chức năng|Cách dùng|Cấu trúc|Giới từ|Liên từ|Đại từ|Giống đực|Hiện tại|STT|Danh từ|V-ing', cell) for cell in rows[0])


# Informative embedded images transcribed after visual inspection. Decorative
# photographs are deliberately excluded; none contains instructional content.
IMAGE_BLOCKS = {
    ('listening-part-2', 2): [native_table(2, [['Từ hỏi', 'Ý nghĩa'], ['Who', 'a person'], ['What', 'a thing or an action'], ['When', 'a time'], ['Where', 'a place'], ['Why', 'the reason something happened'], ['How', 'a number, or the way something is done']])],
    ('listening-part-2', 5): [native_table(5, [['Từ hỏi', 'Câu hỏi', 'Câu trả lời'], ['Who?', 'Who is that boy?', 'My brother Tom.'], ['When?', 'When is the party?', "On Friday at 2 o’clock."], ['What?', 'What is on the table?', 'There is a pencil.'], ['Why?', 'Why are you late?', 'Because I missed my bus.'], ['Where?', 'Where is your book?', 'It is in the bag.'], ['Which?', 'Which is your apple?', 'The green one.']])],
    ('listening-part-2', 33): [
        {'type': 'heading', 'text': 'Chú ý phải học thuộc lòng (ghi chú trong tài liệu)', 'sourcePage': 33},
        {'type': 'list', 'text': 'Câu hỏi lấy thông tin (WH question – Who, how, when…) → Loại ngay câu trả lời có Yes/no (Chính xác 100%).', 'sourcePage': 33},
        {'type': 'list', 'text': 'Loại đáp án chỉ là 1 cụm danh từ mà không phải là 1 câu (trừ câu hỏi what, which, who) (Chính xác 90%).', 'sourcePage': 33},
        {'type': 'list', 'text': 'Loại đáp án có từ đồng âm với câu hỏi (Chính xác 80%).', 'sourcePage': 33},
        {'type': 'note', 'text': 'Các tỷ lệ và cách gọi “luôn đúng” phía trên là ghi chú của tài liệu gốc. Khi làm bài vẫn cần kiểm tra ý nghĩa và ngữ cảnh; đây không phải đáp án bảo đảm cho mọi câu hỏi.', 'sourcePage': 33},
    ],
    ('listening-part-3', 20): [native_table(20, [['Tên người đặt', 'Đặc điểm chiếc bánh'], ['Richard', '2 layers, crown'], ['Alison', '3 layers, star'], ['Tomas', '3 layers, number 25'], ['Janet', '3 layers, snowflake']])],
    ('listening-part-3', 22): [native_table(22, [['Giordano Wedding · Service', 'Cost'], ['Flowers', '$4,456'], ['Photography', '$1,300'], ['Catering', '$10,200'], ['Shuttle bus', '$400'], ['Total', '$16,356']])],
}


WHAT_EXAMPLES = [
    ('What has Roger been doing?', ["He’s been busy with his job.", "He’s fine, I’m sure.", "He’s in New York City."], 'A', 'Câu hỏi hỏi hoạt động gần đây; câu A mô tả Roger bận với công việc.'),
    ("What’s the name of that restaurant?", ['They mainly serve seafood.', 'On Harborside Boulevard.', "It’s called the Dolphin Café."], 'C', 'Hỏi tên nhà hàng, không hỏi món ăn hoặc vị trí.'),
    ("What’s the matter with the CD player?", ['I think the batteries are dead.', 'I bought it at an electronics store.', "Yes, it’s a good brand."], 'A', 'What’s the matter hỏi vấn đề; pin hết giải thích vì sao máy không hoạt động.'),
    ('What kind of music does that band play?', ['At a nightclub.', 'Around 8 o’clock.', 'Rock and roll, mostly.'], 'C', 'What kind of music hỏi thể loại âm nhạc.'),
    ("What time is Mr. Abe’s flight due?", ['In June.', 'Three in the afternoon.', "He’ll be leaving soon."], 'B', 'What time cần giờ cụ thể: ba giờ chiều.'),
    ('What does Lily do for a living?', ["She’s an architect.", 'She lives in Montreal.', 'She has a nice apartment.'], 'A', 'Do for a living hỏi nghề nghiệp; Lily là kiến trúc sư.'),
    ("What’s it like out today?", ["It’s sunny and warm.", "I’d like to go to the beach today.", 'I was out all day.'], 'A', 'Trong ví dụ này, câu hỏi hỏi thời tiết bên ngoài hôm nay.'),
    ('What do you think of the new software?', ["I’ve been thinking about it for an hour.", 'It certainly seems easy to use.', "It’s available now."], 'B', 'Hỏi ý kiến về phần mềm; dễ sử dụng là một nhận xét phù hợp.'),
    ('What flight are you taking to Rio?', ['Flight 649, leaving at 9 p.m.', 'It was quite pleasant, thanks.', 'Nearly eight hours.'], 'A', 'What flight hỏi chuyến bay nào; câu A cung cấp số chuyến và giờ khởi hành.'),
    ('What does Mr. Weis look like?', ['He enjoys sports a lot.', "He’s looking for another position.", "He’s tall and has dark hair and a beard."], 'C', 'Look like hỏi ngoại hình; câu C mô tả chiều cao, tóc và râu.'),
]


def exercise(unit_id, title, prompt, choices, answer, explanation, pages, transcript=None, table=None):
    keys = list('ABCD'[:len(choices)])
    unit = {'id': unit_id, 'title': title, 'pages': [], 'questions': [{
        'id': '1', 'label': 'Câu 1', 'prompt': prompt, 'choices': keys,
        'choiceTexts': dict(zip(keys, choices)), 'answer': answer, 'explanation': explanation,
        'sourceNote': 'Ví dụ trong tài liệu gốc, trang ' + ', '.join(map(str, pages)) + '.',
    }]}
    if transcript:
        unit['transcript'] = transcript
    if table:
        unit['referenceTable'] = table
    return unit


def import_book():
    categories = []
    audit = []
    for slug, title, description, filename, definitions in SOURCES:
        category = {'slug': slug, 'title': title, 'description': description,
                    'source': {'file': filename, 'pages': 0}, 'lessons': []}
        with pdfplumber.open(SOURCE / filename) as pdf:
            category['source']['pages'] = len(pdf.pages)
            # PDFs have no embedded sound files; audio is referenced, not attached.
            assert not PdfReader(SOURCE / filename).attachments, 'Review unexpected embedded attachments'
            current = None
            next_definition = 0
            for index, page in enumerate(pdf.pages, 1):
                blocks = convert_page(page, index, [definition[2] for definition in definitions if definition[2]],
                                      regions_for(slug, index), skip_tables=slug == 'dong-tu' and index == 7)
                additions = IMAGE_BLOCKS.get((slug, index), [])
                if index == 1 and slug == 'listening-part-2':
                    additions = []
                    for n, (q, choices, answer, _) in enumerate(WHAT_EXAMPLES, 1):
                        additions.extend([
                            {'type': 'heading', 'text': f'Ví dụ {n}: {q}', 'sourcePage': 1},
                            native_table(1, [['Lựa chọn', 'Nội dung']] + [[key, value] for key, value in zip('ABC', choices)]),
                            {'type': 'paragraph', 'text': f'Đáp án trong tài liệu: {answer}.', 'sourcePage': 1},
                        ])
                # Put figure content at its actual location (before the question
                # for Part 3, after the first heading for the Part 2 reference).
                if additions and slug == 'listening-part-3':
                    blocks = additions + blocks
                elif additions:
                    blocks += additions
                for block in blocks:
                    if block['type'] == 'table':
                        block.setdefault('hasHeader', has_header(block['rows']))
                original = Counter(re.sub(r'\s|\u00ad', '', page.extract_text() or ''))
                converted = ' '.join(b.get('text', '') + ' ' + ' '.join(' '.join(row) for row in b.get('rows', [])) for b in blocks)
                missing = original - Counter(re.sub(r'\s|\u00ad', '', converted))
                assert not missing, (slug, index, 'Missing source characters', missing)
                for block in blocks:
                    text = block.get('text', '')
                    if next_definition < len(definitions):
                        key, lesson_title, marker = definitions[next_definition]
                        if marker is None or text.startswith(marker):
                            current = {'slug': slug + '-' + key, 'title': lesson_title, 'blocks': [], 'exercises': []}
                            category['lessons'].append(current)
                            next_definition += 1
                    assert current is not None
                    current['blocks'].append(block)
                audit.append({'category': slug, 'page': index, 'sourceWords': len(page.extract_words()),
                              'blocks': len(blocks), 'tables': sum(b['type'] == 'table' for b in blocks), 'missingCharacters': sum(missing.values())})
            assert next_definition == len(definitions), (slug, 'Missing boundary', definitions[next_definition:])
        categories.append(category)

    lp2 = categories[0]
    overview = lp2['lessons'][0]
    # Keep native theory in reading order: the picture is below the introduction.
    for i, (q, choices, answer, explanation) in enumerate(WHAT_EXAMPLES, 1):
        overview['exercises'].append(exercise(f'grammar-lp2-what-{i:02}', f'What · Ví dụ {i}', q, choices, answer, explanation, [1],
            q + '\n' + '\n'.join(f'({k}) {v}' for k, v in zip('ABC', choices))))
    lesson = next(l for l in lp2['lessons'] if l['slug'].endswith('-when'))
    lesson['exercises'].append(exercise('grammar-lp2-passport', 'Phản hồi gián tiếp', 'When did you pick up your passport?',
        ["No, I didn’t drop it.", "It’s for Tuesday.", 'I had it delivered to my office.'], 'C',
        'Người nói không đi lấy hộ chiếu mà nhờ giao đến văn phòng. Phản hồi gián tiếp vẫn phù hợp; pick up không đồng nghĩa với drop.', [6],
        'When did you pick up your passport?\n(A) No, I didn’t drop it.\n(B) It’s for Tuesday.\n(C) I had it delivered to my office.'))
    indirect = lp2['lessons'][-1]
    indirect['exercises'].append(exercise('grammar-lp2-susan', 'Câu hỏi gián tiếp', 'Do you know when Susan can finish editing the article?',
        ['Because of heavy traffic.', 'I finished it yesterday.', "Sorry, I don’t know."], 'C',
        'Câu hỏi hỏi về thời điểm Susan hoàn thành việc biên tập. C phản hồi việc người nghe không biết; A sai loại thông tin, B nói về người khác.', [31],
        'Do you know when Susan can finish editing the article?\n(A) Because of heavy traffic.\n(B) I finished it yesterday.\n(C) Sorry, I don’t know.'))
    # Source prints three interchangeable suggestion openings, not three
    # simultaneous questions. Use its complete Why don't we example.
    indirect['exercises'].append(exercise('grammar-lp2-tickets', 'Phản hồi lời đề nghị', "Why don’t we get tickets for the play first?",
        ['I will go to the movie.', 'OK, let me call the theater now.', 'At least an hour before the performance.'], 'B',
        'Why don’t we đưa ra lời gợi ý. B đồng ý và đề xuất gọi nhà hát để mua vé, không phải giải thích lý do.', [31],
        'Why don’t we get tickets for the play first?\n(A) I will go to the movie.\n(B) OK, let me call the theater now.\n(C) At least an hour before the performance.'))

    add_part3_exercises(categories[1])
    from grammar_foundations import add_foundation_exercises
    add_foundation_exercises(categories)
    dest = ROOT / 'data/grammar'
    dest.mkdir(parents=True, exist_ok=True)
    (dest / 'book.json').write_text(json.dumps(categories, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (dest / 'conversion-audit.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'categories': len(categories), 'lessons': sum(len(c['lessons']) for c in categories),
                      'pages': len(audit), 'exercises': sum(len(l['exercises']) for c in categories for l in c['lessons'])}))


def add_part3_exercises(category):
    with pdfplumber.open(SOURCE / 'Listening_Part 3.pdf') as pdf:
        source = clean(' '.join(p.extract_text() or '' for p in pdf.pages))
        source = re.sub(r'\s+', ' ', source)

    def script(start, end):
        begin = source.index(start)
        finish = source.index(end, begin + len(start))
        text = source[begin:finish].strip()
        return re.sub(r'\s+(Man(?: [12])?|Woman):', r'\n\1:', text)

    items = [
        (0, 'tire', 'Nguyên nhân', 'What does the woman say caused the problem?',
         ['A repair cost has increased.', 'A reservation has been canceled.', 'A client arrived too late.', 'A tire needed to be replaced.'], 'D',
         'Người phụ nữ nói Mark bị xịt lốp (got a flat tire). Cụm này được diễn đạt lại thành lốp cần thay, không phải chi phí sửa chữa hay hủy đặt chỗ.', [1, 2],
         'Man: Hi, Tiffany.', '● Chọn đáp án:'),
        (0, 'growth', 'Ý kiến', 'What does the woman imply about the company?',
         ['They have been very lucky to grow so fast.', 'Some of the staff is not working hard.', 'The company worked hard to grow fast.', "The new offices aren't very nice."], 'C',
         'Người phụ nữ nhấn mạnh long nights and hard work: công ty phát triển nhờ làm việc chăm chỉ, không phải do may mắn.', [2, 3],
         'Man: I know we had some slow years', '● Chọn đáp án:'),
        (0, 'store', 'Cách thức', 'How did the man learn about the store?',
         ['By watching a television.', 'By talking to a friend.', 'By reading a brochure.', 'By listening to the radio.'], 'A',
         'I saw your advertisement on TV cho biết người đàn ông biết cửa hàng qua quảng cáo trên truyền hình.', [3, 4],
         'Man: Hello, I saw your advertisement', '● Chọn đáp án:'),
        (0, 'cable', 'Hành động đã thực hiện', 'What did the man recently do?',
         ['Purchased a house.', 'Went on a business trip.', 'Signed up for a service.', 'Installed a television.'], 'C',
         'Last Thursday, I arranged to have cable television installed nghĩa là đã đăng ký dịch vụ lắp truyền hình cáp. Việc lắp đặt chưa diễn ra; installed là thông tin gây nhiễu.', [4, 5],
         'Man: Hello. Last Thursday', '● Chọn đáp án:'),
        (0, 'login', 'Thông tin trong email', 'What will the woman include in an e-mail?',
         ['A receipt.', 'Login information.', 'A membership contract.', 'Driving directions.'], 'B',
         'Người phụ nữ sẽ gửi user name and temporary password, tức thông tin đăng nhập (login information).', [5, 6],
         'Man: Oh, I see. My name is Charlie Kramer.', '● Chọn đáp án:'),
        (1, 'babysitter', 'Dự định của nhân vật', 'What does the woman say she will have to do?',
         ['Hire a babysitter.', 'Go to another company.', 'Ask her husband.', 'Finish her sales reports.'], 'A',
         'Người phụ nữ tự nói I will need to hire a babysitter while I’m doing the overtime. Cấu trúc will need to + V chỉ việc cô ấy sẽ cần làm.', [8, 9],
         'Man 1: Tom and Julie', 'Q: What does the woman say'),
        (1, 'call', 'Hành động đầu tiên', 'What most likely will the man do first tomorrow?',
         ['Order a replacement part.', 'Consult an instruction manual.', 'Contact the woman.', 'Fill out a work order.'], 'C',
         'Người phụ nữ yêu cầu please call me before you come tomorrow. Do đó, trước khi tới lắp TV, người đàn ông cần liên hệ cô ấy.', [9, 10],
         "Man: Hello, I'm Steven", 'Q: What most likely'),
        (1, 'wedding', 'Chi tiết có yếu tố tương lai', 'What will the woman do after work?',
         ['Organize a party.', 'Try on a dress.', 'Attend a wedding.', 'Purchase office supplies.'], 'C',
         'Người phụ nữ nói nghỉ làm sớm in order to attend my sister’s wedding. Đây là lịch trình đã có từ trước, không phải yêu cầu phát sinh sau đó.', [10, 11],
         'Man: Good morning, Ms. Spencer.', 'Q45:'),
        (1, 'staples', 'Hành động tiếp theo', 'What will the man probably do next?',
         ['Reply to an invitation.', 'Write an e-mail.', 'Order a supply closet.', 'Go to the second floor.'], 'D',
         'Người phụ nữ nhờ lấy ghim từ supply closet on the second floor. Đi lên tầng hai là một phần của hành động đó; supply closet trong C là bẫy lặp từ.', [10, 11, 12],
         'Man: Good morning, Ms. Spencer.', 'Q45:'),
        (2, 'online', 'Gợi ý tìm sản phẩm', 'What does the man suggest the woman do?',
         ['Purchase a warranty.', 'Return some merchandise.', 'Call a specialist.', 'Find an item online.'], 'D',
         'Người đàn ông giới thiệu một Web site bán phụ tùng và gợi ý tìm sản phẩm ở đó. Web site được diễn đạt lại thành online.', [13, 14, 15],
         'Man: Welcome to Pavilion Appliance Store.', '- Chọn đáp án:'),
        (2, 'bus', 'Gợi ý của người đàn ông', 'What does the man suggest doing?',
         ['Updating an event calendar', 'Trying some local food', 'Taking a bus tour', 'Making reservations'], 'C',
         'Người đàn ông nói còn bus passes for a tour of the city rồi hỏi How about that? Đây là gợi ý đi tour xe buýt; thuê xe đạp là ý kiến của người phụ nữ.', [15, 16],
         "Woman: Since our meetings with the clients don't start", '- Chọn đáp án:'),
        (2, 'help', 'Đề nghị giúp đỡ', 'What does the woman offer to do?',
         ['Provide assistance.', 'Pay in cash.', 'Fill in for the man.', 'E-mail a user manual.'], 'A',
         'Feel free to ask me for help là lời đề nghị giúp đỡ. Help được diễn đạt lại thành provide assistance.', [16, 17],
         'Man: Joanne, did you hear', '- Chọn đáp án:'),
        (3, 'paperwork', 'Hiểu hàm ý', 'Why does the man say, "it normally takes a few days"?',
         ['To reject a request.', 'To address a concern.', 'To complain about a delay.', 'To acknowledge an accomplishment.'], 'B',
         'Ngay trước đó, người phụ nữ thắc mắc chưa nhận được giấy tờ lao động. Người đàn ông giải đáp băn khoăn ấy bằng việc nói thủ tục thường mất vài ngày.', [17, 18, 19],
         'Man: Hi, Emiko.', '- Phân tích:'),
        (4, 'cake', 'Nhận diện đơn hàng', 'Look at the graphic. Who placed the order the woman is picking up?',
         ['Richard.', 'Alison.', 'Tomas.', 'Janet.'], 'C',
         'Người phụ nữ cần bánh có số 25. Bảng đặc điểm cho thấy đó là đơn của Tomas; Richard là tên được nêu ban đầu để gây nhiễu.', [20, 21],
         "Woman: Hi, I'm here to pick up a cake", '- Chọn đáp án:'),
        (4, 'catering', 'Kết hợp bảng giá', "Look at the graphic. How much did the man's company charge for its service?",
         ['$4,456', '$1,300', '$10,200', '$400'], 'C',
         'Packing up our dishes và the food was delicious cho thấy đây là dịch vụ Catering. Đối chiếu bảng Giordano Wedding: Catering có giá $10,200.', [22, 23],
         'Man: Ms. Giordano,', '- Chọn đáp án:'),
    ]
    for index, key, title, prompt, choices, answer, explanation, pages, start, end in items:
        table = None
        if key in ('cake', 'catering'):
            table = IMAGE_BLOCKS[('listening-part-3', 20 if key == 'cake' else 22)][0]['rows']
        unit = exercise(f'grammar-lp3-{key}', title, prompt, choices, answer, explanation, pages, script(start, end), table)
        category['lessons'][index]['exercises'].append(unit)


if __name__ == '__main__':
    import_book()
