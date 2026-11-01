"use client";

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

const stopEvent = 'vocabulary-stop-audio';

export default function OriginalAudio({ src, active }: { src: string; active: boolean }) {
  const player = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState('1');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const audio = player.current;
    function stop(event: Event) {
      if ((event as CustomEvent).detail !== audio) audio?.pause();
    }
    window.addEventListener(stopEvent, stop);
    return () => { audio?.pause(); window.removeEventListener(stopEvent, stop); };
  }, [src]);

  useEffect(() => {
    if (!active) player.current?.pause();
  }, [active]);

  return <div className="essential-audio essential-originalAudio">
    <label className="study-direction">Tốc độ <span className="essential-speedSelect"><select value={speed} onChange={event => {
      setSpeed(event.target.value);
      if (player.current) player.current.playbackRate = Number(event.target.value);
    }}>
      <option value="0.7">0.7×</option><option value="0.85">0.85×</option><option value="1">1×</option><option value="1.15">1.15×</option>
    </select><ChevronDownIcon aria-hidden="true" /></span></label>
    <audio ref={player} src={src} controls preload="none" aria-label="Audio gốc của bài Listening"
      onPlay={() => window.dispatchEvent(new CustomEvent(stopEvent, { detail: player.current }))}
      onLoadedMetadata={() => { if (player.current) player.current.playbackRate = Number(speed); }}
      onCanPlay={() => setFailed(false)} onError={() => setFailed(true)} />
    {failed && <p className="study-error" role="alert">Chưa tải được audio gốc. <button type="button" className="study-button" onClick={() => { setFailed(false); player.current?.load(); }}>Thử tải lại</button> <a href={src} target="_blank" rel="noreferrer">Mở file audio</a></p>}
  </div>;
}
