"""Merge the reviewed CD2 listening data; runtime rendering needs no PDF/OCR.

Audio filenames follow lesson numbers (26–50), as supplied in 600_EWT_CD2.
Photographs are standalone crops of the original Part 1 exercise images.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def enrich_listening(lessons, directory=ROOT / 'data/essential/listening'):
    for lesson in lessons:
        if lesson['number'] < 26:
            continue
        content = json.loads((directory / f'lesson-{lesson["number"]}.json').read_text())
        assert content['audioSrc'] == f'/essential/audio/track-{lesson["number"]}.mp3'
        assert (ROOT / 'public' / content['audioSrc'].lstrip('/')).is_file()
        assert (ROOT / 'public' / content['listeningImage']['src'].lstrip('/')).is_file()
        questions = {q['id']: q for q in content['questions']}
        assert len(content['questions']) == 6 and set(questions) == set('456789')
        for index, unit in enumerate(lesson['sections']['listening']['units']):
            unit['audioSrc'] = content['audioSrc']
            unit['pages'] = []
            unit['note'] = 'Nghe bản thu gốc của bài; script và trang script gốc ở cuối để đối chiếu.'
            if index == 0:
                unit['listeningImage'] = content['listeningImage']
            for question in unit['questions']:
                if index < 2:
                    continue  # Spoken questions/choices stay in the collapsible script.
                text = questions[question['id']]
                assert text['prompt'].strip()
                assert set(text['choiceTexts']) == set(question['choices'])
                assert all(value.strip() for value in text['choiceTexts'].values())
                question.update(prompt=text['prompt'], choiceTexts=text['choiceTexts'])
    return lessons


if __name__ == '__main__':
    path = ROOT / 'data/essential/book.json'
    lessons = enrich_listening(json.loads(path.read_text()))
    path.write_text(json.dumps(lessons, ensure_ascii=False, indent=2) + '\n')
    print('Updated Listening lessons 26–50 with original audio and structured questions.')
