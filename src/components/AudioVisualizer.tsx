import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  color?: string;
  isVfd?: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  color = '#0284c7',
  isVfd = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const peaksRef = useRef<number[]>([]);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      animId = requestAnimationFrame(render);

      // Auto-sync canvas internal pixel dimensions with its container for razor-sharp rendering
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      if (targetW > 0 && targetH > 0 && (canvas.width !== targetW || canvas.height !== targetH)) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);

      const freqData = audioEngine.getFrequencyData();

      if (isVfd) {
        // Authentic VFD Segmented Ladder Analyzer: 20 columns, 9 rungs per column
        const colCount = 20;
        const colWidth = width / colCount;
        const totalRungs = 9;
        const rungGap = Math.max(1, 1.5 * dpr);
        const rungHeight = Math.max(2, (height - (totalRungs * rungGap)) / totalRungs);
        const xPad = Math.max(1, 1.5 * dpr);
        const barW = Math.max(2, colWidth - xPad * 2);

        if (peaksRef.current.length !== colCount) {
          peaksRef.current = new Array(colCount).fill(0);
        }

        for (let c = 0; c < colCount; c++) {
          let value = 0;
          if (isPlaying) {
            const binIndex = Math.floor((c / colCount) * freqData.length);
            value = freqData[binIndex] || 0;
          } else {
            value = 15 + Math.sin(Date.now() / 450 + c * 0.3) * 10;
          }

          const litRungs = Math.min(totalRungs, Math.round((value / 255) * totalRungs));
          peaksRef.current[c] = Math.max(litRungs, (peaksRef.current[c] || 0) - 0.15);
          const peakRung = Math.min(totalRungs - 1, Math.floor(peaksRef.current[c]));

          const x = c * colWidth + xPad;

          for (let r = 0; r < totalRungs; r++) {
            const y = height - (r + 1) * (rungHeight + rungGap);
            const isLit = r < litRungs;
            const isPeak = r === peakRung && peakRung > litRungs;

            if (isLit || isPeak) {
              if (r >= 8) {
                // Coral Red overload peak (+3dB / +6dB)
                ctx.fillStyle = '#ff4757';
                ctx.shadowColor = '#ff4757';
                ctx.shadowBlur = 4 * dpr;
              } else if (r >= 6) {
                // Fluorescent Amber warning (0dB)
                ctx.fillStyle = '#ffb703';
                ctx.shadowColor = '#ffb703';
                ctx.shadowBlur = 4 * dpr;
              } else {
                // 505nm Electric Cyan phosphor body
                ctx.fillStyle = '#38efc6';
                ctx.shadowColor = '#38efc6';
                ctx.shadowBlur = 4 * dpr;
              }
              ctx.fillRect(x, y, barW, rungHeight);
              ctx.shadowBlur = 0;
            } else {
              // Physical unlit phosphor pad
              ctx.fillStyle = 'rgba(14, 45, 42, 0.22)';
              ctx.fillRect(x, y, barW, rungHeight);
            }
          }
        }
      } else {
        // Color Active-Matrix TFT-LCD Segmented Level Ladder (Green -> Amber -> Red Peaks)
        const colCount = 22;
        const colWidth = width / colCount;
        const totalRungs = 8;
        const rungGap = Math.max(1, 1.5 * dpr);
        const rungHeight = Math.max(2, (height - (totalRungs * rungGap)) / totalRungs);
        const xPad = Math.max(1, 1.2 * dpr);
        const barW = Math.max(2, colWidth - xPad * 2);

        if (peaksRef.current.length !== colCount) {
          peaksRef.current = new Array(colCount).fill(0);
        }

        for (let c = 0; c < colCount; c++) {
          let value = 0;
          if (isPlaying) {
            const binIndex = Math.floor((c / colCount) * freqData.length);
            value = freqData[binIndex] || 0;
          } else {
            value = 12 + Math.sin(Date.now() / 450 + c * 0.3) * 8;
          }

          const litRungs = Math.min(totalRungs, Math.round((value / 255) * totalRungs));
          peaksRef.current[c] = Math.max(litRungs, (peaksRef.current[c] || 0) - 0.12);
          const peakRung = Math.min(totalRungs - 1, Math.floor(peaksRef.current[c]));

          const x = c * colWidth + xPad;

          for (let r = 0; r < totalRungs; r++) {
            const y = height - (r + 1) * (rungHeight + rungGap);
            const isLit = r < litRungs;
            const isPeak = r === peakRung && peakRung > litRungs;

            if (isLit || isPeak) {
              if (r >= 6) {
                // Peak / Overload: Coral Red (#ef4444)
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 3 * dpr;
              } else if (r >= 4) {
                // High / Headroom: Amber Gold (#f59e0b)
                ctx.fillStyle = '#f59e0b';
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 3 * dpr;
              } else {
                // Base / Normal: Emerald Green (#10b981)
                ctx.fillStyle = '#10b981';
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 3 * dpr;
              }
              ctx.fillRect(x, y, barW, rungHeight);
              ctx.shadowBlur = 0;
            } else {
              // Inactive liquid crystal cell in TFT panel
              ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
              ctx.fillRect(x, y, barW, rungHeight);
            }
          }
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, color, isVfd]);

  return (
    <div id="audio-visualizer-container" className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
      {/* Subtle grid line overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_49%,rgba(255,255,255,0.03)_50%)] bg-[length:100%_4px] pointer-events-none" />
    </div>
  );
};
