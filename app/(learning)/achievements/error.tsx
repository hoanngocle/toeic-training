'use client';
export default function AchievementsError({reset}: {reset: () => void}) {
  return <section className="main-content" role="alert"><h1>Chưa tải được thành tích</h1><p>Vui lòng thử lại để xem lịch sử học của bạn.</p><button className="primary-button" onClick={reset}>Thử lại</button></section>;
}
