import { Eye, Keyboard, Languages, Volume2 } from 'lucide-react';
import { Card } from '../../shared/ui';
import { useI18n } from '../../shared/i18n/i18n';

export function AccessibilityPage() {
  const { t } = useI18n();
  const items = [
    { icon: Keyboard, title: t('accessibilityPage.keyboardTitle'), text: t('accessibilityPage.keyboardText') },
    { icon: Eye, title: t('accessibilityPage.contrastTitle'), text: t('accessibilityPage.contrastText') },
    { icon: Volume2, title: t('accessibilityPage.speechTitle'), text: t('accessibilityPage.speechText') },
    { icon: Languages, title: t('accessibilityPage.languagesTitle'), text: t('accessibilityPage.languagesText') },
  ];
  return <section className="py-16 sm:py-24"><div className="page-container"><div className="max-w-3xl"><p className="eyebrow">{t('accessibilityPage.eyebrow')}</p><h1 className="page-title mt-4">{t('accessibilityPage.title')}</h1><p className="mt-6 text-lg text-stone-600">{t('accessibilityPage.description')}</p></div><div className="mt-12 grid gap-5 sm:grid-cols-2">{items.map(({ icon: Icon, title, text }) => <Card key={title} className="p-7"><Icon className="h-7 w-7 text-lavender-600" /><h2 className="mt-5 text-xl font-extrabold">{title}</h2><p className="mt-2 text-stone-600">{text}</p></Card>)}</div></div></section>;
}
