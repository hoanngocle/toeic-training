import { buildCollection } from '../achievements/collection.ts';
import type { AchievementEvent } from '../achievements/collection.ts';
import type { Session, SaveRequest } from '../learning/types.ts';
import type { ExerciseResult, ExerciseRequest } from '../essential/types.ts';
export type HistoryRow={id:string;sequence:number;created_at:string;lesson?:string;unit?:string;mode?:string;request:SaveRequest|ExerciseRequest;result:Session|ExerciseResult};
export function collectionFromHistory(sessions:HistoryRow[],exercises:HistoryRow[],days:string[],testSize:(lesson:string)=>number) {
  const events:AchievementEvent[]=[];
  for (const [table,rows] of [['sessions',sessions],['essential_sessions',exercises]] as const) {
    for (const row of rows) {
      const vocabulary=table==='sessions';
      const lesson=vocabulary?row.lesson!:row.unit!.match(/^essential-\d{2}/)?.[0]??row.unit!;
      const result=row.result;
      events.push({id:`${table}:${String(row.sequence).padStart(12,'0')}`,at:new Date(row.created_at).toISOString(),lesson,
        mode:vocabulary?row.mode:undefined,
        fullTest:vocabulary?(result as Session).fullTest??(row.mode==='test'&&!row.request.retryOf&&result.total===testSize(lesson)):!row.request.retryOf,
        test:vocabulary?`vocab:${lesson}`:`exercise:${row.unit}`,perfect:result.total>0&&result.score===result.total,
        answers:vocabulary?(result as Session).results:[]});
    }
  }
  return buildCollection(events,days);
}
