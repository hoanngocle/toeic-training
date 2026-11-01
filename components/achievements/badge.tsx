import { BookOpenIcon, RectangleStackIcon, FireIcon, ClipboardDocumentCheckIcon, TrophyIcon, CalendarDaysIcon, AcademicCapIcon } from '@heroicons/react/24/solid';
import type { CategoryId } from '../../lib/achievements/collection';
const icons={sessions:AcademicCapIcon,lessons:BookOpenIcon,streak:FireIcon,words:RectangleStackIcon,tests:ClipboardDocumentCheckIcon,perfect:TrophyIcon,days:CalendarDaysIcon};
const palettes=[['#abc5e6','#e5efff','#45638d'],['#29cee2','#bdfaff','#087b98'],['#efbc49','#fff0ad','#ac7318'],['#b77af2','#eddaff','#7540b4'],['#ed719d','#ffdae8','#b02d61'],['#ec5865','#ffe0ae','#ae263d'],['#e8be65','#fff3ba','#8c6422']];
export default function Badge({category,value,tier=0,locked=false,small=false}:{category:CategoryId;value:number;tier?:number;locked?:boolean;small?:boolean}){
 const [color,light,dark]=palettes[Math.min(tier,6)]; const Icon=icons[category];
 return <div className={`collection-badge${locked?' is-locked':''}${small?' is-small':''}`} aria-hidden="true"><svg viewBox="0 0 200 210" fill="none">
  {tier>=3&&<g fill={light} stroke={dark} strokeWidth="2"><path d="M58 129C26 126 9 102 8 74L32 91 15 59 48 85 63 114Z"/><path d="M142 129C174 126 191 102 192 74L168 91 185 59 152 85 137 114Z"/></g>}
  {tier>=1&&<g fill={color} stroke={dark} strokeWidth="1.5">{[0,1,2,3].map(i=><g key={i}><ellipse cx={39+i*5} cy={112+i*14} rx="7" ry="14" transform={`rotate(${-35-i*8} ${39+i*5} ${112+i*14})`}/><ellipse cx={161-i*5} cy={112+i*14} rx="7" ry="14" transform={`rotate(${35+i*8} ${161-i*5} ${112+i*14})`}/></g>)}</g>}
  <path d="M100 23 159 49V116Q159 151 100 183Q41 151 41 116V49Z" fill={color} stroke={dark} strokeWidth="4"/>
  <path d="M100 35 148 57V114Q148 142 100 169Q52 142 52 114V57Z" fill="#142740" stroke={light} strokeWidth="2"/>
  <path d="m100 40 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1Z" fill={light}/>
  <Icon x="65" y="72" width="70" height="70" color={light}/>
  {category==='words'&&<path d="m88 106 9 9 20-22" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>}
  {tier>=4?<g fill={color} stroke={dark} strokeWidth="2"><path d="m72 30-7-22 22 12L100 2l13 18 22-12-7 22Z"/><path d="m100 7 5 9-5 8-5-8Z" fill={light}/></g>:<path d="m100 13 9 13-9 13-9-13Z" fill={light} stroke={dark} strokeWidth="2"/>}
  <path d="M66 148H134L142 158V179L100 197 58 179V158Z" fill={color} stroke={dark} strokeWidth="3"/>
  <path d="M68 154H132L136 160V175L100 190 64 175V160Z" stroke={light} strokeWidth="2"/>
  <text x="100" y="179" textAnchor="middle" fill="#142740" fontSize={value>=1000?'23':'28'} fontWeight="800" fontFamily="Arial, sans-serif">{value}</text>
 </svg></div>;
}
