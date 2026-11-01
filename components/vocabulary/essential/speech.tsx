"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const stopEvent = 'vocabulary-stop-audio';
const subscribe = () => () => {};
const browserSupportsSpeech = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const serverSupportsSpeech = () => false;

export default function SyntheticSpeech({ text, active }: { text: string; active: boolean }) {
  const supported = useSyncExternalStore(subscribe, browserSupportsSpeech, serverSupportsSpeech);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState('0.85');
  const [error, setError] = useState('');
  const generation = useRef(0);
  const current = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    function stop() {
      generation.current += 1;
      if (current.current && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      current.current = null;
      setPlaying(false);
    }
    window.addEventListener(stopEvent, stop);
    return () => { stop(); window.removeEventListener(stopEvent, stop); };
  }, [text]);

  useEffect(() => {
    if (!active && current.current) window.dispatchEvent(new Event(stopEvent));
  }, [active]);

  function play() {
    window.dispatchEvent(new Event(stopEvent));
    setError('');
    const token = ++generation.current;
    // Short utterances avoid browser speech engines stalling on long passages.
    const words = text.trim().split(/\s+/);
    const chunks: string[] = [];
    let chunk = '';
    for (const word of words) {
      if (chunk.length + word.length > 180 && chunk) { chunks.push(chunk); chunk = ''; }
      chunk += `${chunk ? ' ' : ''}${word}`;
    }
    if (chunk) chunks.push(chunk);
    let index = 0;
    const speakNext = () => {
      if (generation.current !== token) return;
      if (index >= chunks.length) { current.current = null; setPlaying(false); return; }
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utterance.lang = 'en-US';
      utterance.rate = Number(speed);
      const voice = window.speechSynthesis.getVoices().find(item => item.lang === 'en-US')
        ?? window.speechSynthesis.getVoices().find(item => item.lang.startsWith('en'));
      if (voice) utterance.voice = voice;
      utterance.onend = speakNext;
      utterance.onerror = () => {
        if (generation.current !== token) return;
        current.current = null;
        setPlaying(false);
        setError('Chưa đọc được. Hãy thử lại hoặc xem bản chép lời.');
      };
      current.current = utterance;
      try { window.speechSynthesis.speak(utterance); }
      catch { current.current = null; setPlaying(false); setError('Trình duyệt chưa đọc được nội dung.'); }
    };
    setPlaying(true);
    speakNext();
  }

  return <div className="essential-audio">
    <strong>Giọng đọc tổng hợp (không phải audio gốc)</strong>
    <p className="study-hint">Giọng đọc từ bản chép lời trong sách. Ngữ điệu và tốc độ có thể khác bản thu gốc.</p>
    <div className="essential-audioControls">
      <button type="button" className="study-button primary" disabled={!supported || playing} onClick={play}>▶ Nghe bài</button>
      <button type="button" className="study-button" disabled={!playing} onClick={() => window.dispatchEvent(new Event(stopEvent))}>■ Dừng</button>
      <label className="study-direction">Tốc độ <select value={speed} disabled={playing} onChange={event => setSpeed(event.target.value)}>
        <option value="0.7">0.7×</option><option value="0.85">0.85×</option><option value="1">1×</option><option value="1.15">1.15×</option>
      </select></label>
    </div>
    <p className="study-hint" role="status">{supported === false ? 'Trình duyệt này không hỗ trợ giọng đọc tổng hợp. Bạn có thể xem bản chép lời bên dưới.' : error || (playing ? 'Đang đọc…' : '')}</p>
  </div>;
}
