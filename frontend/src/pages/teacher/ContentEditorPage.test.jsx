import { isCompatibleContentDraft } from './ContentEditorPage';

test('restores a local content draft only for the same server version', () => {
  const draft = { baseVersion: 4, form: { title: 'Local revision' } };
  expect(isCompatibleContentDraft(draft, 4)).toBe(true);
  expect(isCompatibleContentDraft(draft, 5)).toBe(false);
  expect(isCompatibleContentDraft({ form: draft.form }, 4)).toBe(false);
});

test('draft compatibility supports realistically long editor content', () => {
  const theory = 'Detailed explanation. '.repeat(5000);
  const draft = { baseVersion: 7, form: { lessons: [{ theory }] } };
  const restored = JSON.parse(JSON.stringify(draft));
  expect(isCompatibleContentDraft(restored, 7)).toBe(true);
  expect(restored.form.lessons[0].theory).toHaveLength(theory.length);
});
