import { activityDay, shiftDay } from './summary.ts';
export const CATEGORIES = [
 {id:'sessions',title:'Lượt học tích lũy',unit:'lượt học',description:'Mỗi lần đánh dấu flashcard, trả lời luyện viết hoặc nộp bài được lưu là một lượt.',milestones:[1,10,50,100,250,500,1000]},
 {id:'lessons',title:'Học phần đã học',unit:'học phần',description:'Các học phần khác nhau có hoạt động học. Học lại không đếm thêm.',milestones:[1,3,5,10,25,50]},
 {id:'streak',title:'Chuỗi ngày học',unit:'ngày liên tiếp',description:'Chuỗi dài nhất từng đạt. Huy hiệu vẫn được giữ khi chuỗi bị ngắt.',milestones:[3,7,14,30,60,100]},
 {id:'words',title:'Từ vựng đã nhớ',unit:'từ đã nhớ',description:'Mỗi mục từ lần đầu đạt “Đã nhớ” được tính một lần, kể cả khi cần ôn lại sau đó.',milestones:[10,50,100,250,500,600]},
 {id:'tests',title:'Bài kiểm tra hoàn thành',unit:'bài hoàn thành',description:'Lượt nộp đầy đủ bài kiểm tra hoặc bài tập. Không tính lượt chỉ ôn câu sai.',milestones:[1,5,10,25,50,100]},
 {id:'perfect',title:'Điểm tuyệt đối',unit:'bài đạt 100%',description:'Các bài khác nhau đạt đúng 100% trong lượt làm đầy đủ. Mỗi bài chỉ tính một lần.',milestones:[1,3,5,10,25,50]},
 {id:'days',title:'Tổng ngày học',unit:'ngày học',description:'Cộng dồn ngày có hoạt động học, không cần liên tiếp.',milestones:[7,30,60,100,180,365]},
] as const;
export type CategoryId = typeof CATEGORIES[number]['id'];
export type Collection = {counts: Record<CategoryId,number>; awards: Record<string,string>};
export type AchievementEvent = {id:string; at:string; lesson:string; mode?:string; test?:string; fullTest?:boolean; perfect?:boolean; answers:{wordId:number;correct:boolean}[]};
export function buildCollection(events: AchievementEvent[], activityDays: string[] = []): Collection {
 const counts: Collection['counts'] = {sessions:0,lessons:0,streak:0,words:0,tests:0,perfect:0,days:0};
 const awards: Record<string,string> = {};
 const lessons=new Set<string>(), perfect=new Set<string>(), mastered=new Set<string>();
 const progress=new Map<string,{run:number;learned:boolean}>();
 const award=(day:string) => { for(const category of CATEGORIES) for(const value of category.milestones) if(counts[category.id]>=value) awards[`${category.id}:${value}`]??=day; };
 const ordered=[...events].sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
 for(const event of ordered){
  const day=activityDay(new Date(event.at)); counts.sessions++;
  lessons.add(event.lesson); counts.lessons=lessons.size;
  if(event.fullTest && event.test){counts.tests++; if(event.perfect)perfect.add(event.test);}
  counts.perfect=perfect.size;
  for(const answer of event.answers){
   const key=`${event.lesson}:${answer.wordId}`, old=progress.get(key)??{run:0,learned:false};
   const run=answer.correct?old.run+(event.mode==='flashcard'?0:1):0;
   const learned=answer.correct&&(event.mode==='flashcard'||run>=3||old.learned);
   progress.set(key,{run,learned}); if(learned)mastered.add(key);
  }
  counts.words=mastered.size; award(day);
 }
 const days=[...new Set([...activityDays,...ordered.map(e=>activityDay(new Date(e.at)))])].sort();
 let run=0;
 for(let i=0;i<days.length;i++){
  run=i>0&&shiftDay(days[i-1],1)===days[i]?run+1:1;
  counts.days++; counts.streak=Math.max(counts.streak,run);
  // Only award daily categories here; other metrics were dated during replay.
  for(const category of CATEGORIES.filter(c=>c.id==='days'||c.id==='streak')) for(const value of category.milestones) if(counts[category.id]>=value)awards[`${category.id}:${value}`]??=days[i];
 }
 return {counts,awards};
}
