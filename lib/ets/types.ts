export interface EtsChoice { label: string; text: string }
export interface EtsBlock { type: 'text' | 'image' | 'table'; text?: string; src?: string; alt?: string; rows?: string[][] }
export interface EtsQuestion { number: number; prompt: string; choices: EtsChoice[]; answer: string }
export interface EtsGroup { id: string; blocks: EtsBlock[]; questions: EtsQuestion[]; transcript?: string }
export interface EtsPart { number: number; title: string; groups: EtsGroup[]; audio?: { src: string; start?: number; end?: number } }
export interface EtsTest { id: number; title: string; audioSrc: string; parts: EtsPart[] }
export type PublicEtsQuestion = Omit<EtsQuestion, 'answer'>;
export type PublicEtsGroup = Omit<EtsGroup, 'questions' | 'transcript'> & { questions: PublicEtsQuestion[] };
export type PublicEtsPart = Omit<EtsPart, 'groups'> & { groups: PublicEtsGroup[] };
export type PublicEtsTest = Omit<EtsTest, 'parts'> & { parts: PublicEtsPart[] };
export interface EtsTestSummary { id: number; title: string; total: number; parts: { number: number; title: string; total: number }[] }
export interface EtsRequest { id: string; testId: number; part: number; answers: Record<string, string>; durationMs: number }
export interface EtsResult { id: string; testId: number; part: number; score: number; total: number; durationMs: number; createdAt: string; results: { number: number; selected: string; expected: string; correct: boolean }[]; transcripts?: Record<string, string> }
