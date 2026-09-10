import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../i18n/translations';

export const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      id="language-switcher-container"
      className={`inline-flex items-center rounded-lg p-1 bg-neutral-950 border border-neutral-800 shadow-inner ${className}`}
      role="group"
      aria-label="Language selector"
    >
      <div className="flex items-center gap-1 px-1 text-neutral-400">
        <Globe className="w-3.5 h-3.5 text-amber-400" />
      </div>

      <button
        id="lang-btn-en"
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all ${
          language === 'en'
            ? 'bg-amber-500 text-black shadow-sm'
            : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
        }`}
        aria-pressed={language === 'en'}
      >
        English
      </button>

      <span className="text-neutral-700 text-xs select-none">|</span>

      <button
        id="lang-btn-ko"
        type="button"
        onClick={() => setLanguage('ko')}
        className={`px-2 py-1 rounded text-xs font-sans font-bold transition-all ${
          language === 'ko'
            ? 'bg-amber-500 text-black shadow-sm'
            : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
        }`}
        aria-pressed={language === 'ko'}
      >
        한국어
      </button>
    </div>
  );
};
