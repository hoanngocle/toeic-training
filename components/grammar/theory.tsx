import type { GrammarBlock } from '../../lib/grammar/types';

export default function GrammarTheory({ blocks }: { blocks: GrammarBlock[] }) {
  const groups: GrammarBlock[][] = [];
  for (const block of blocks) {
    if (block.type === 'list' && groups.at(-1)?.[0].type === 'list') groups[groups.length - 1].push(block);
    else groups.push([block]);
  }
  return <article className="grammar-theory" aria-label="Lý thuyết và ví dụ">{groups.map((group, index) => {
    const block = group[0];
    if (block.type === 'table') return <div className="grammar-tableWrap" key={index} role="region" aria-label="Bảng ví dụ" tabIndex={0}><table>{block.hasHeader && <thead><tr>{block.rows[0].map((cell, i) => <th scope="col" key={i}>{cell}</th>)}</tr></thead>}<tbody>{block.rows.slice(block.hasHeader ? 1 : 0).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
    if (block.type === 'heading') return <h2 key={index}>{block.text}</h2>;
    if (block.type === 'note') return <aside key={index} className="grammar-note">{block.text}</aside>;
    if (block.type === 'list') return <ul key={index}>{group.map((item, i) => 'text' in item && <li key={i}>{item.text.replace(/^[●○–]\s*|^-\s+/, '')}</li>)}</ul>;
    return <p key={index}>{block.text}</p>;
  })}</article>;
}
