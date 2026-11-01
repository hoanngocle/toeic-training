import type { BookPage } from '../../../lib/essential/types';

export default function BookPages({ pages }: { pages: BookPage[] }) {
  return <div className="essential-pages">{pages.map(page => <figure key={page.src}>
    <figcaption><span>Trang {page.page} · bản sách</span><a href={page.src} target="_blank" rel="noreferrer">Mở ảnh đầy đủ ↗<span className="essential-srOnly"> — trang {page.page}</span></a></figcaption>
    {/* Original scans must remain readable at their native resolution. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={page.src} alt={page.alt} loading="lazy" />
  </figure>)}</div>;
}
