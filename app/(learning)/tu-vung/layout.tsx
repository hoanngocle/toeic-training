import '../../../components/vocabulary/vocabulary.css';
import '../../../components/vocabulary/essential/essential.css';

export default function VocabularyLayout({ children }: { children: React.ReactNode }) {
  return <div className="vocab-library">
    <div id="vocabulary-main">{children}</div>
    <footer className="vocab-footer"><span>Học một chút, nhớ thêm mỗi ngày.</span><span>ENGLISH SPACE / TỪ VỰNG</span></footer>
  </div>;
}
