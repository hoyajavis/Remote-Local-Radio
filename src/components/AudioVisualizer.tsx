import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  color?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  color = '#0284c7'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      animId = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const freqData = audioEngine.getFrequencyData();
      const barCount = 32;
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i++) {
        let value = 0;
        if (isPlaying) {
          // Sample from frequency bins
          const binIndex = Math.floor((i / barCount) * freqData.length);
          value = freqData[binIndex] || 0;
        } else {
          // Idle low shimmer
          value = 3 + Math.sin(Date.now() / 400 + i * 0.2) * 2;
        }

        const barHeight = Math.max(2, (value / 255) * (height - 4));
        const x = i * barWidth;
        const y = height - barHeight;

        // Gradient bar
        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, color);
        grad.addColorStop(1, '#38bdf8');

        ctx.fillStyle = grad;
        ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, color]);

  return (
    <div id="audio-visualizer-container" className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 px-1">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'}`} />
          FM STEREO
        </span>
        <span className="tracking-widest">SPECTRUM ANALYZER</span>
      </div>
      <div className="w-full h-14 bg-neutral-950/80 rounded-md border border-neutral-800/80 p-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={320}
          height={48}
          className="w-full h-full block"
        />
        {/* Subtle grid line overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_49%,rgba(255,255,255,0.04)_50%)] bg-[length:100%_8px] pointer-events-none" />
      </div>
    </div>
  );
};
