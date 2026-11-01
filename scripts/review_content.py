"""Merge checked Word Review transcriptions; keep imports independent of OCR."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def enrich_reviews(lessons):
    content = json.loads((ROOT / 'data/essential/reviews.json').read_text())
    by_id = {unit['id']: unit for unit in content}
    assert len(by_id) == 10
    for lesson in lessons:
        for unit in lesson['sections']['review']['units']:
            source = by_id[unit['id']]
            questions = {question['id']: question for question in source['questions']}
            assert set(questions) == {str(i) for i in range(1, 20)}
            assert len(source['questionPassages']) == 3
            for passage in source['questionPassages']:
                for id in passage['questionIds']:
                    assert passage['text'].count(f'[{id}]') == 1
            unit['questionPassages'] = source['questionPassages']
            for question in unit['questions']:
                text = questions[question['id']]
                assert '____' in text['prompt']
                assert set(text['choiceTexts']) == set(question['choices'])
                assert all(value.strip() for value in text['choiceTexts'].values())
                question.update(text)
            unit['pages'] = []
            unit['answerKeyPages'] = []
    return lessons


if __name__ == '__main__':
    path = ROOT / 'data/essential/book.json'
    lessons = enrich_reviews(json.loads(path.read_text()))
    path.write_text(json.dumps(lessons, ensure_ascii=False, indent=2) + '\n')
    print('Updated 10 Word Reviews across all 50 lessons.')
