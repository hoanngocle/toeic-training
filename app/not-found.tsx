import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeIcon } from '@heroicons/react/24/outline';
import styles from './not-found.module.css';

export const metadata: Metadata = {
  title: '404 · Không tìm thấy trang | English Space',
};

export default function NotFound() {
  return <main className={styles.page}>
    <span className={styles.brand}>ENGLISH SPACE</span>
    <p className={styles.code}>404</p>
    <h1 className={styles.title}>Không tìm thấy trang</h1>
    <p className={styles.description}>Trang bạn đang tìm có thể đã được chuyển đi hoặc không còn tồn tại. Về trang chủ để tiếp tục hành trình học nhé.</p>
    <Link className={styles.homeButton} href="/">
      <HomeIcon width={20} height={20} aria-hidden="true" />
      Về trang chủ
    </Link>
  </main>;
}
