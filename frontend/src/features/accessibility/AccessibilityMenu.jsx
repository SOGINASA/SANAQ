import { useState } from 'react';
import { Accessibility, Eye, Gauge, Sparkles } from 'lucide-react';
import { Button, Dialog } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';
import { useAccessibilityStore } from './accessibilityStore';
import { SpeechControls } from './SpeechControls';

function SettingButton({ active, icon: Icon, title, description, onClick }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`flex min-h-20 w-full cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 text-left transition ${active ? 'border-lavender-500 bg-lavender-50' : 'border-stone-200 hover:border-lavender-300'}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-lavender-600 text-white' : 'bg-stone-100 text-stone-600'}`}><Icon className="h-5 w-5" /></span><span className="min-w-0"><strong className="block break-words">{title}</strong><span className="mt-1 block break-words text-sm leading-5 text-stone-500">{description}</span></span></button>;
}

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const store = useAccessibilityStore();
  const pageText = () => document.querySelector('main')?.innerText || document.body.innerText;
  return <><button type="button" onClick={() => setOpen(true)} className="fixed bottom-24 right-4 z-40 grid h-12 w-12 cursor-pointer place-items-center rounded-2xl border border-lavender-200 bg-paper text-lavender-700 shadow-soft transition hover:bg-lavender-50 lg:bottom-6" aria-label={t('accessibility.open')}><Accessibility className="h-6 w-6" /></button><Dialog open={open} onClose={() => setOpen(false)} title={t('accessibility.title')} description={t('accessibility.description')} footer={<Button variant="ghost" onClick={() => setOpen(false)}>{t('accessibility.done')}</Button>}>
    <div className="grid gap-3 sm:grid-cols-2"><SettingButton active={store.largeText} icon={Sparkles} title={t('accessibility.largeText')} description={t('accessibility.largeTextDescription')} onClick={store.toggleLargeText} /><SettingButton active={store.highContrast} icon={Eye} title={t('accessibility.highContrast')} description={t('accessibility.highContrastDescription')} onClick={store.toggleHighContrast} /><SettingButton active={store.reducedMotion} icon={Gauge} title={t('accessibility.reducedMotion')} description={t('accessibility.reducedMotionDescription')} onClick={store.toggleReducedMotion} /></div>
    <div className="mt-5 rounded-3xl bg-stone-100 p-4 sm:p-5"><label className="field-label break-words" htmlFor="speech-rate">{t('accessibility.speechRate', { rate: store.speechRate.toFixed(1) })}</label><input id="speech-rate" type="range" min="0.7" max="1.3" step="0.1" value={store.speechRate} onChange={(event) => store.setSpeechRate(event.target.value)} className="w-full accent-lavender-600" /><SpeechControls className="mt-4" text={pageText()} label={t('accessibility.readPage')} /></div>
  </Dialog></>;
}
