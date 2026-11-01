"""Merge reviewed Reading transcriptions and explicitly documented key corrections.

Run directly to update an existing book.json, or import from import-essential.py.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def enrich_reading(lessons, directory=ROOT / 'data/essential/reading'):
    for lesson in lessons:
        filename = directory / f'lesson-{lesson["number"]:02}.json'
        content = json.loads(filename.read_text())
        units = lesson['sections']['reading']['units']
        assert len(content) == len(units) == 3, filename
        assert {unit['id'] for unit in content} == {unit['id'] for unit in units}, filename
        for unit in units:
            source = next(item for item in content if item['id'] == unit['id'])
            assert len(source['questions']) == len(unit['questions']), unit['id']
            assert {q['id'] for q in source['questions']} == {q['id'] for q in unit['questions']}, unit['id']
            if not unit['id'].endswith('-5'):
                assert isinstance(source.get('readingPassage'), str) and len(source['readingPassage']) > 150, unit['id']
                unit['readingPassage'] = source['readingPassage']
            for question in unit['questions']:
                text = next(q for q in source['questions'] if q['id'] == question['id'])
                assert isinstance(text.get('prompt'), str) and len(text['prompt']) > 15, (unit['id'], question['id'])
                assert set(text['choiceTexts']) == set(question['choices']), (unit['id'], question['id'])
                assert all(isinstance(value, str) and value.strip() for value in text['choiceTexts'].values())
                assert isinstance(text.get('explanation'), str) and len(text['explanation']) > 30
                for field in ('prompt', 'choiceTexts', 'explanation'):
                    question[field] = text[field]
                if 'answerOverride' in text:
                    assert text['answerOverride'] in question['choices']
                    assert isinstance(text.get('sourceNote'), str) and len(text['sourceNote']) > 30
                    question['answer'] = text['answerOverride']
                if 'sourceNote' in text:
                    assert isinstance(text['sourceNote'], str) and len(text['sourceNote']) > 30
                    question['sourceNote'] = text['sourceNote']
    return lessons


if __name__ == '__main__':
    path = ROOT / 'data/essential/book.json'
    lessons = enrich_reading(json.loads(path.read_text()))
    path.write_text(json.dumps(lessons, ensure_ascii=False, indent=2) + '\n')
    print(f'Updated Reading content for {len(lessons)} lessons, including documented key corrections.')
