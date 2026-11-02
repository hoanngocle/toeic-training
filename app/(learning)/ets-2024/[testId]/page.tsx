import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicEtsTest } from '../../../../lib/ets/catalog';
import { requireUser } from '../../../../lib/auth-server';
import EtsHistory from '../../../../components/ets/history';
type Props = { params: Promise<{ testId: string }> };
export default async function EtsTestPage({ params }: Props) {
  const user = await requireUser();
  const { testId } = await params;
  if (!/^[1-9]\d*$/.test(testId)) notFound();
  const test = getPublicEtsTest(Number(testId));
  if (!test) notFound();
  return <div className="ets-page"><Link className="ets-back" href="/ets-2024">← Tất cả đề</Link><header className="ets-hero"><p className="ets-eyebrow">ETS 2024</p><h1>{test.title}</h1><p>200 câu Listening & Reading. Luyện trọn đề hoặc chọn một Part.</p></header><section className="ets-fullCard"><div><h2>Làm trọn đề</h2><p>200 câu · 120 phút · Tự nộp khi hết giờ</p></div><Link className="ets-button ets-primary" href={`/ets-2024/${test.id}/practice`}>Bắt đầu làm đề →</Link></section><section aria-labelledby="ets-parts"><h2 id="ets-parts">Luyện từng Part</h2><div className="ets-partGrid">{test.parts.map(part => <Link className="ets-partCard" key={part.number} href={`/ets-2024/${test.id}/practice?part=${part.number}`}><span className="ets-eyebrow">PART {part.number}</span><h3>{part.title}</h3><p>{part.groups.reduce((sum, group) => sum + group.questions.length, 0)} câu · Không giới hạn thời gian</p><span className="ets-link">Luyện Part {part.number} →</span></Link>)}</div></section><EtsHistory key={`${user.id}:${test.id}`} testId={test.id}/></div>;
}
