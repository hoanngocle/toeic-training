"use client";

import { SpeakerWaveIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from '../ui/loading';

const stopEvent = "vocabulary-stop-audio";

export default function PronounceButton({ text }: { text: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "error">("idle");

  useEffect(() => {
    function stop() {
      if (audio.current) {
        audio.current.pause();
        audio.current.removeAttribute("src");
        audio.current.load();
        audio.current = null;
      }
      setStatus("idle");
    }
    window.addEventListener(stopEvent, stop);
    return () => {
      window.removeEventListener(stopEvent, stop);
      stop();
    };
  }, [text]);

  async function pronounce() {
    window.dispatchEvent(new Event(stopEvent));
    const player = new Audio(`/api/tts?text=${encodeURIComponent(text)}`);
    audio.current = player;
    setStatus("loading");
    player.onended = () => { if (audio.current === player) setStatus("idle"); };
    player.onerror = () => { if (audio.current === player) setStatus("error"); };
    try {
      await player.play();
      if (audio.current === player) setStatus("playing");
    } catch {
      if (audio.current === player) setStatus("error");
    }
  }

  return (
    <span className="pronunciation-control">
      <button type="button" className="pronounce-button" onClick={pronounce}
        disabled={status === "loading"} aria-busy={status === "loading"}
        aria-label={`Nghe phát âm ${text}`} title={`Nghe phát âm ${text}`}>
        {status === "loading" ? <LoadingSpinner size={22} /> : <SpeakerWaveIcon width={22} height={22} aria-hidden="true" />}
      </button>
      <span className="pronunciation-status" role="status">
        {status === "loading" ? "Đang tải…" : status === "error" ? "Chưa phát được. Nhấn loa để thử lại." : ""}
      </span>
    </span>
  );
}
