import Link from 'next/link';
import { ArrowRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { listEtsTests } from '../../../lib/ets/catalog';
export default function EtsTestsPage() {
  const tests = listEtsTests();
  return <div className="ets-page"><header className="ets-hero"><p className="ets-eyebrow">LUYỆN ĐỀ TOEIC</p><h1>ETS 2024</h1><p>Listening & Reading. Chọn một đề và luyện theo nhịp của bạn.</p><div className="ets-tags"><span>10 đề gốc</span><span>200 câu / đề</span><span>7 Parts</span></div></header>{tests.length ? <div className="ets-testGrid">{tests.map(test => <Link className="ets-testCard" href={`/ets-2024/${test.id}`} key={test.id}><div className="ets-cardTop"><DocumentTextIcon width={26} height={26} aria-hidden="true"/><span>{String(test.id).padStart(2, '0')}</span></div><h2>{test.title}</h2><p>Listening 100 câu · Reading 100 câu</p><div className="ets-tags"><span>{test.total} câu</span><span>120 phút</span></div><div className="ets-cardAction">Chọn chế độ luyện <ArrowRightIcon width={18} height={18} aria-hidden="true"/></div></Link>)}</div> : <div className="ets-panel"><h2>Đang đối chiếu nội dung đề</h2><p>Các đề sẽ xuất hiện sau khi câu hỏi, đáp án và audio được kiểm tra đầy đủ từ tài liệu gốc.</p></div>}</div>;
}
