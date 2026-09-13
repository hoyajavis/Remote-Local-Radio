import React, { useRef, useState, useEffect } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  speedMultiplier?: number;
  separator?: string;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className = '',
  style,
  speedMultiplier = 1,
  separator = '•••',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textMeasureRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textMeasureRef.current) {
        setIsOverflowing(textMeasureRef.current.scrollWidth > containerRef.current.clientWidth + 2);
      }
    };

    checkOverflow();

    const timeout = setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  const duration = Math.max(10, Math.min(30, text.length * 0.45)) / speedMultiplier;

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden relative whitespace-nowrap select-none ${className}`}
      style={{
        maskImage: isOverflowing
          ? 'linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)'
          : undefined,
        WebkitMaskImage: isOverflowing
          ? 'linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)'
          : undefined,
        ...style,
      }}
    >
      <span
        ref={textMeasureRef}
        className="absolute -top-[9999px] -left-[9999px] opacity-0 pointer-events-none whitespace-nowrap"
        aria-hidden="true"
      >
        {text}
      </span>

      {isOverflowing ? (
        <div
          className="inline-flex items-center animate-marquee hover:[animation-play-state:paused]"
          style={{ animationDuration: `${duration}s` }}
        >
          <span className="inline-block pr-6">{text}</span>
          <span className="inline-block pr-6 opacity-40 font-mono text-[0.8em]">{separator}</span>
          <span className="inline-block pr-6">{text}</span>
          <span className="inline-block pr-6 opacity-40 font-mono text-[0.8em]">{separator}</span>
        </div>
      ) : (
        <span className="inline-block truncate">{text}</span>
      )}
    </div>
  );
};
