"""Import the official, paired-column vocabulary CSV without changing its text."""
import argparse
import csv
import json
import re
from pathlib import Path


def parse_lessons(rows, start_number=1):
    lessons = []
    for column in range(1, len(rows[0]), 2):
        number = start_number + len(lessons)
        words = []
        for row in rows[2:]:
            term = row[column].strip() if column < len(row) else ''
            definition = row[column + 1].strip() if column + 1 < len(row) else ''
            if not term and not definition:
                continue
            if not term or not definition:
                raise ValueError(f'Incomplete entry in lesson {number}')
            match = re.match(r'^(/.*?/)\s*(?:-\s*)?(.*)$', definition, re.S)
            words.append({
                'id': len(words) + 1,
                'term': term,
                'pronunciation': match[1] if match else '',
                'meaning': match[2] if match else definition,
                'definition': definition,
                'spokenText': re.sub(r'\s*\([^)]*\)\s*$', '', term),
            })
        if not words:
            continue
        lessons.append({'slug': f'lesson-{number}', 'number': number,
                        'title': f'Lesson {number}', 'sourceTitle': rows[0][column], 'words': words})
    return lessons


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source')
    parser.add_argument('--append', action='store_true', help='Append nonempty lessons after the existing catalog')
    args = parser.parse_args()
    target = Path(__file__).resolve().parents[1] / 'data/vocabulary/lessons.json'
    existing = json.loads(target.read_text()) if args.append else []
    with Path(args.source).open(encoding='utf-8-sig', newline='') as source:
        lessons = parse_lessons(list(csv.reader(source)), max((l['number'] for l in existing), default=0) + 1)
    if args.append and any(l['sourceTitle'] in {old['sourceTitle'] for old in existing} for l in lessons):
        raise ValueError('These source lessons have already been imported; refusing to append duplicates.')
    target.write_text(json.dumps(existing + lessons, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported {len(lessons)} lessons, {sum(len(l["words"]) for l in lessons)} entries.')
