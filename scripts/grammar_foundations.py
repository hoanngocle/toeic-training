"""Practice transcriptions from the five foundation references.

Each blank replaces a word/phrase in a complete worked source example. No new
sentences or multiple-choice distractors are authored. Incomplete or inconsistent
source exercises remain in theory only.
"""


def add_foundation_exercises(categories):
    by_slug = {category['slug']: category for category in categories}

    def add(category_slug, lesson_key, key, title, rows, pages, word_bank=None):
        category = by_slug[category_slug]
        lesson = next(item for item in category['lessons'] if item['slug'] == f'{category_slug}-{lesson_key}')
        questions = []
        passage = []
        for index, (template, answer, explanation) in enumerate(rows, 1):
            assert template.count('____') == 1
            passage.append(template.replace('____', '{{' + str(index) + '}}'))
            questions.append({
                'id': str(index), 'label': f'Câu {index}', 'prompt': template,
                'answer': answer, 'explanation': explanation,
                'sourceNote': category['source']['file'] + ' · trang ' + ', '.join(map(str, pages)) + '. Khôi phục từ/cụm từ trong ví dụ gốc.',
            })
        unit = {'id': f'grammar-{category_slug}-{key}', 'title': title, 'pages': [],
                'note': 'Hoàn thiện các cấu trúc và ví dụ đã học trong tài liệu. Điền từ hoặc cụm từ vào từng chỗ trống.',
                'passage': '\n\n'.join(passage), 'questions': questions}
        if word_bank:
            unit['wordBank'] = word_bank
        lesson['exercises'].append(unit)

    add('tinh-tu', 'tu-dong-tu', 'hau-to-dong-tu', 'Tạo tính từ từ động từ', [
        ('comfort + -able → ____ (thoải mái)', 'comfortable', 'Ví dụ trong bảng: comfort → comfortable, tính từ có nghĩa thoải mái.'),
        ('understand + -able → ____ (có thể hiểu được)', 'understandable', 'Thêm -able vào understand tạo understandable.'),
        ('care + -ful → ____ (cẩn thận)', 'careful', 'Careful là tính từ trong ví dụ care + -ful.'),
        ('think + -ful → ____ (chu đáo)', 'thoughtful', 'Bảng dùng dạng thoughtful; chú ý gốc thought trong tính từ này.'),
        ('create + -ive → ____ (sáng tạo)', 'creative', 'Create bỏ e cuối trước -ive: creative.'),
        ('attract + -ive → ____ (hấp dẫn)', 'attractive', 'Attract + -ive tạo attractive.'),
        ('destroy → ____ (có tính hủy hoại)', 'destructive', 'Dạng tính từ được nêu trong bảng là destructive.'),
        ('care + -less → ____ (lơ là)', 'careless', 'Careless có nghĩa thiếu cẩn thận; -less biểu thị sự thiếu vắng.'),
        ('excite + -ing → ____ (thú vị, phấn khích)', 'exciting', 'Excite bỏ e cuối trước -ing: exciting.'),
        ('surprise + -ing → ____ (gây kinh ngạc)', 'surprising', 'Surprise bỏ e cuối trước -ing: surprising.'),
    ], [1, 2])
    add('tinh-tu', 'tu-danh-tu', 'hau-to-danh-tu', 'Tạo tính từ từ danh từ', [
        ('beauty + -ful → ____ (xinh đẹp)', 'beautiful', 'Beauty chuyển y thành i trước -ful: beautiful.'),
        ('color + -ful → ____ (sặc sỡ)', 'colorful', 'Color + -ful tạo colorful, như trong bảng.'),
        ('power + -ful → ____ (mạnh mẽ)', 'powerful', 'Powerful là tính từ tương ứng với power.'),
        ('home + -less → ____ (vô gia cư)', 'homeless', 'Homeless là ví dụ cho hậu tố -less.'),
        ('fear + -less → ____ (dũng cảm)', 'fearless', 'Fearless mang nghĩa không sợ hãi, dũng cảm.'),
        ('friend + -ly → ____ (thân thiện)', 'friendly', 'Friendly có đuôi -ly nhưng là tính từ trong ví dụ này.'),
        ('danger + -ous → ____ (nguy hiểm)', 'dangerous', 'Dangerous là dạng tính từ của danger trong bảng.'),
        ('culture + -al → ____ (thuộc về văn hóa)', 'cultural', 'Culture bỏ e cuối trước -al: cultural.'),
        ('reason + -able → ____ (hợp lý)', 'reasonable', 'Reason + -able tạo reasonable.'),
        ('self + -ish → ____ (ích kỷ)', 'selfish', 'Selfish là tính từ trong bảng self + -ish.'),
    ], [2, 3])
    add('tinh-tu', 'so-sanh', 'so-sanh', 'So sánh hơn và so sánh nhất', [
        ('Tall → ____ (cao hơn)', 'taller', 'Ví dụ gốc: tall → taller/tallest; -er biểu thị so sánh hơn.'),
        ('Tall → ____ (cao nhất)', 'tallest', 'Tall thêm -est tạo tallest.'),
        ('Short → ____ (thấp hơn)', 'shorter', 'Short thêm -er tạo shorter.'),
        ('Short → ____ (thấp nhất)', 'shortest', 'Short thêm -est tạo shortest.'),
    ], [3])
    add('tinh-tu', 'phan-tu', 'phan-tu', 'Phân từ làm tính từ trong ngữ cảnh', [
        ('____ country = quốc gia đang phát triển.', 'developing', 'Developing miêu tả quá trình đang diễn ra.'),
        ('____ country = quốc gia đã phát triển.', 'developed', 'Developed là tính từ trong ví dụ quốc gia đã phát triển.'),
        ('____ flight = chuyến bay dùng để nối chuyến.', 'connecting', 'Cụm được nêu trong tài liệu là connecting flight.'),
        ('____ devices = các thiết bị đã được kết nối.', 'connected', 'Connected chỉ trạng thái đã được kết nối.'),
        ('____ report = báo cáo đã được cập nhật.', 'updated', 'Updated là phân từ quá khứ dùng làm tính từ trong ví dụ này.'),
    ], [5, 6], ['developing', 'developed', 'connecting', 'connected', 'updated'])

    add('gioi-tu-lien-tu-menh-de', 'phan-biet', 'because', 'Because và because of', [
        ('____ the weather was bad, the match was canceled.', 'because', 'Because đứng trước mệnh đề the weather was bad (có chủ ngữ và động từ).'),
        ('____ the bad weather, the match was canceled.', 'because of', 'Because of đứng trước cụm danh từ the bad weather.'),
    ], [8, 9], ['Because', 'Because of'])
    add('gioi-tu-lien-tu-menh-de', 'quan-he', 'rut-gon', 'Rút gọn mệnh đề quan hệ', [
        ('The man who is standing there → The man ____ there.', 'standing', 'Ví dụ gốc rút gọn who is standing thành standing.'),
        ('The bridge which was built in 2010 → The bridge ____ in 2010.', 'built', 'Mệnh đề bị động which was built rút gọn thành phân từ quá khứ built.'),
        ('Employees who are responsible for safety → Employees ____ for safety.', 'responsible', 'Bỏ who are, giữ tính từ responsible và phần bổ nghĩa đi kèm.'),
    ], [9, 10])

    add('danh-tu', 'so-it', 'mao-tu', 'Mạo từ a và an trong các ví dụ', [
        ('____ attendant', 'an', 'Attendant bắt đầu bằng âm nguyên âm nên dùng an.'),
        ('____ uniform', 'a', 'Uniform bắt đầu bằng âm /j/ nên dùng a, như ghi chú trong tài liệu.'),
        ('____ university', 'a', 'University bắt đầu bằng âm /j/ nên dùng a.'),
        ('____ apple', 'an', 'Apple bắt đầu bằng âm nguyên âm nên dùng an.'),
    ], [1], ['a', 'an'])
    add('danh-tu', 'so-nhieu', 'so-nhieu', 'Biến đổi sang danh từ số nhiều', [
        ('teacher → ____', 'teachers', 'Danh từ thông thường thêm -s: teacher → teachers.'),
        ('watch → ____', 'watches', 'Watch kết thúc bằng -ch, thêm -es.'),
        ('virus → ____', 'viruses', 'Virus có s trong gốc từ; số nhiều là viruses.'),
        ('photo → ____', 'photos', 'Photo là ngoại lệ tận cùng -o chỉ thêm -s.'),
        ('piano → ____', 'pianos', 'Piano là ngoại lệ tận cùng -o chỉ thêm -s.'),
        ('mosquito → ____', 'mosquitoes/mosquitos', 'Tài liệu nêu cả hai dạng: mosquitoes và mosquitos.'),
        ('baby → ____', 'babies', 'Phụ âm trước y: đổi y thành -ies.'),
        ('boy → ____', 'boys', 'Nguyên âm trước y: giữ y và thêm -s.'),
        ('knife → ____', 'knives', 'Ví dụ gốc đổi -fe thành -ves.'),
        ('mouse → ____', 'mice', 'Mice là dạng số nhiều bất quy tắc của mouse.'),
        ('ox → ____', 'oxen', 'Oxen là dạng số nhiều bất quy tắc của ox.'),
        ('sheep → ____', 'sheep', 'Sheep giữ nguyên khi chuyển sang số nhiều.'),
    ], [2, 3])
    add('danh-tu', 'danh-tu-ghep', 'danh-tu-ghep', 'Hoàn thiện cụm danh từ ghép', [
        ('Shoes made of leather are ____.', 'leather shoes', 'Theo danh sách trong tài liệu: leather shoes. Leather bổ nghĩa cho danh từ chính shoes.'),
        ('A boy who is five years old is ____. (Điền cụm từ, không thêm mạo từ.)', '5-year-old boy/five-year-old boy', 'Ví dụ gốc là 5-year-old boy; year không có -s trong tính từ ghép.'),
        ('Clothes for working in are ____.', 'working clothes', 'Cụm tương ứng trong tài liệu là working clothes.'),
        ('Somebody whose job is to inspect factories is ____. (Không thêm mạo từ.)', 'factory inspector', 'Factory bổ nghĩa cho danh từ chính inspector.'),
        ('The Director of Marketing is ____. (Không thêm mạo từ.)', 'marketing director', 'Danh sách đáp án ví dụ dùng marketing director.'),
        ('A card that gives you credit is ____. (Không thêm mạo từ.)', 'credit card', 'Credit card là cụm danh từ tương ứng trong bảng.'),
    ], [7, 8, 9])
    add('danh-tu', 'so-huu', 'so-huu', 'Viết sở hữu cách trong ví dụ', [
        ('The book of the kid → The ____ book.', "kid's/kid’s", 'Danh từ số ít kid dùng sở hữu cách kid’s.'),
        ('The books of the kids → The ____ books.', "kids'/kids’", 'Kids là số nhiều có -s, chỉ thêm dấu nháy sau s.'),
        ('The books of the children → The ____ books.', "children's/children’s", 'Children là số nhiều bất quy tắc không có -s, nên thêm ’s.'),
        ('The leg of Mary → ____ leg.', "Mary's/Mary’s", 'Tên riêng Mary thêm ’s để biểu thị sở hữu.'),
    ], [9, 10])

    add('trat-tu-tu', 'danh-tu', 'cum-danh-tu', 'Cấu trúc cụm danh từ', [
        ('a/an/the + adjective + ____', 'noun/n', 'Cấu trúc được ghi trong tài liệu là a/an/the + adjective + noun.'),
    ], [1], ['noun', 'adjective', 'adverb', 'verb'])
    add('trat-tu-tu', 'tinh-tu', 'vi-tri-tinh-tu', 'Hoàn thiện cấu trúc chứa tính từ', [
        ('____ + N', 'adj/adjective', 'Tính từ đứng trước danh từ: Adj + N.'),
        ('S + be + adjective + ____', 'enough', 'Enough đứng sau tính từ trong cấu trúc này.'),
        ('be/seem/look/feel... + so + adjective + ____', 'that', 'Cấu trúc trong tài liệu là so + adjective + that.'),
        ('How + ____ + S + V!', 'adjective/adj', 'Câu cảm thán theo cấu trúc How + adjective + S + V!'),
        ('What + (a/an) + adjective + ____!', 'noun/n', 'Sau tính từ là danh từ trong cấu trúc cảm thán với What.'),
    ], [1, 2], ['adjective', 'enough', 'that', 'noun'])
    add('trat-tu-tu', 'trang-tu', 'vi-tri-trang-tu', 'Hoàn thiện cấu trúc chứa trạng từ', [
        ('be/feel/look... + ____ + adjective', 'adverb/adv', 'Trạng từ đứng trước tính từ để bổ nghĩa cho tính từ.'),
        ('V (thường) + adverb + ____', 'enough', 'Enough đứng sau trạng từ trong công thức này.'),
        ('V (thường) + so + adverb + ____', 'that', 'Công thức được ghi trong tài liệu là so + adverb + that.'),
    ], [2], ['adverb', 'enough', 'that'])

    add('dong-tu', 'nguyen-mau', 'want-enjoy', 'To V và V-ing trong ví dụ mở đầu', [
        ('I want ____ a teacher. (be)', 'to be', 'Ví dụ trong tài liệu: I want to be a teacher. Want theo sau bởi to V.'),
        ('I enjoy ____ the guitar. (play)', 'playing', 'Ví dụ trong tài liệu: I enjoy playing the guitar. Enjoy theo sau bởi V-ing.'),
    ], [6])
    add('dong-tu', 'to-v', 'to-v', 'Khôi phục dạng to V trong ví dụ', [
        ('I have something ____ you. (tell)', 'to tell', 'Sau đại từ bất định something, ví dụ dùng to tell.'),
        ('A wise man knows when ____. (stop)', 'to stop', 'Ví dụ dùng when to stop: từ hỏi + to V.'),
        ('I am the last one ____ to class. (come)', 'to come', 'Sau the last one, tài liệu dùng to come.'),
        ('It is too difficult for me ____ her the truth. (tell)', 'to tell', 'Cấu trúc too difficult for me + to tell trong ví dụ.'),
        ('We made great efforts ____ that difficult time. (overcome)', 'to overcome', 'Sau danh từ efforts, ví dụ dùng to overcome.'),
    ], [6, 7])
    add('dong-tu', 'ving', 'ving', 'Khôi phục dạng động từ theo ngữ cảnh', [
        ('____ breakfast is a bad habit. (skip)', 'skipping', 'Skipping là danh động từ làm chủ ngữ trong ví dụ.'),
        ('The book is worth ____. (read)', 'reading', 'Ví dụ gốc: worth reading.'),
        ('My house needs ____. (clean)', 'cleaning', 'Chủ ngữ chỉ vật + need + V-ing mang nghĩa bị động trong ví dụ này.'),
        ('I need ____ my house. (clean)', 'to clean', 'Chủ ngữ chỉ người thực hiện hành động: need + to V.'),
    ], [7, 8])
    add('dong-tu', 'phan-biet', 'doi-nghia', 'Dạng động từ và ý nghĩa', [
        ('Try ____ your dream come true. (make)', 'to make', 'Ví dụ dùng try to make, nghĩa là cố gắng làm gì.'),
        ("I don’t mean ____ you. (hurt)", 'to hurt', 'Mean to V biểu thị ý định; ví dụ dùng to hurt.'),
        ('Eating a lot of sugar means ____ risks. (take)', 'taking', 'Mean + V-ing có nghĩa là, đồng nghĩa với việc; ví dụ dùng taking risks.'),
        ('It stopped ____. (rain)', 'raining', 'Stop + V-ing là dừng hành động đang diễn ra: trời ngừng mưa.'),
    ], [8])
