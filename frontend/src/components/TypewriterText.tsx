"use client";

import { useEffect, useState } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  delay?: number;
  hideCursorAfter?: number; // 마운트 후 N ms 뒤에 커서 숨김
  className?: string;
}

export function TypewriterText({ text, speed = 60, delay = 0, hideCursorAfter, className }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(delay === 0);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    setDisplayed("");
    setStarted(delay === 0);
    setCursorHidden(false);
    let i = 0;
    const start = setTimeout(() => {
      setStarted(true);
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(start);
  }, [text, speed, delay]);

  // hideCursorAfter ms 후 커서 숨김
  useEffect(() => {
    if (hideCursorAfter == null) return;
    const t = setTimeout(() => setCursorHidden(true), hideCursorAfter);
    return () => clearTimeout(t);
  }, [hideCursorAfter]);

  // 커서 깜빡임
  useEffect(() => {
    const blink = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(blink);
  }, []);

  const cursorVisible = started && !cursorHidden && showCursor;

  return (
    <span className={className}>
      {displayed}
      <span
        className="inline-block w-[3px] h-[0.85em] ml-[2px] align-middle rounded-sm bg-white"
        style={{ opacity: cursorVisible ? 1 : 0, transition: "opacity 0.1s" }}
      />
    </span>
  );
}
