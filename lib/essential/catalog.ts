import source from '../../data/essential/book.json';
import type { EssentialLesson, EssentialTab, PublicBookSection, BookUnit } from './types';
import { toPublicBookUnit } from './public';

export const essentialLessons = source as EssentialLesson[];
export function getPublicSections(lesson: EssentialLesson): Record<EssentialTab, PublicBookSection> {
  return Object.fromEntries(Object.entries(lesson.sections).map(([key,section])=>[key,{
    title:section.title,units:section.units.map(toPublicBookUnit),
  }])) as Record<EssentialTab, PublicBookSection>;
}
const units=new Map<string,BookUnit>();
for(const lesson of essentialLessons) for(const section of Object.values(lesson.sections)) for(const unit of section.units) units.set(unit.id,unit);
export function getBookUnit(id: string) {return units.get(id);}
