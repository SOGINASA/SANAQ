import { useCallback, useEffect, useState } from 'react';
import { useAccessibilityStore } from './accessibilityStore';
import { useI18n } from '../../shared/i18n/i18n';

const languageCodes = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' };

export function useSpeechSynthesis() {
  const { locale } = useI18n();
  const rate = useAccessibilityStore((state) => state.speechRate);
  const [status, setStatus] = useState('idle');
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setStatus('idle');
  }, [supported]);

  useEffect(() => stop, [stop]);

  const speak = useCallback((text) => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!supported || !clean) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = languageCodes[locale] || languageCodes.ru;
    utterance.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2).toLowerCase())) || null;
    utterance.onstart = () => setStatus('speaking');
    utterance.onend = () => setStatus('idle');
    utterance.onerror = () => setStatus('idle');
    window.speechSynthesis.speak(utterance);
  }, [locale, rate, supported]);

  const togglePause = useCallback(() => {
    if (!supported || status === 'idle') return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus('speaking');
    } else {
      window.speechSynthesis.pause();
      setStatus('paused');
    }
  }, [status, supported]);

  return { supported, status, speak, stop, togglePause };
}
