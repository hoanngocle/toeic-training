import styles from './loading.module.css';

/** Decorative icon: the surrounding button or status supplies the accessible label. */
export function LoadingSpinner({ size = 18 }: { size?: number }) {
  return <svg className={styles.spinner} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity=".2" />
    <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>;
}

export function LoadingStatus({ label = 'Đang tải…' }: { label?: string }) {
  return <span className={styles.status} role="status"><LoadingSpinner /><span>{label}</span></span>;
}

export function LoadingScreen({ fullScreen = false }: { fullScreen?: boolean }) {
  return <div className={`${styles.screen}${fullScreen ? ` ${styles.fullScreen}` : ''}`} role="status" aria-label="Đang tải nội dung">
    <div className={styles.mark} aria-hidden="true"><LoadingSpinner size={76} /><span>e<span>.</span></span></div>
    <span className={styles.brand}>ENGLISH SPACE</span>
    <h2 className={styles.title}>Đang chuẩn bị không gian học…</h2>
    <p className={styles.description}>Chờ một chút nhé, nội dung sẽ sẵn sàng ngay.</p>
  </div>;
}
