import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Dialog, StatusToast } from '../../shared/ui';
import { adminContentApi } from '../../features/admin-content/adminContentApi';
import { catalogApi } from '../../shared/api/catalogApi';
import { useI18n } from '../../shared/i18n/i18n';
import { useAuthStore } from '../../features/auth/authStore';

let draftId = 0;
const key = () => `draft-${++draftId}`;
const newTask = (skillId = '', data = {}) => ({ id: data.id, key: data.id || key(), prompt: data.prompt || '', task_type: data.task_type || 'single_choice', difficulty: data.difficulty || 1, skill_id: data.skill_id || skillId, options: data.options?.length && Array.isArray(data.options) ? data.options : ['', ''], acceptable_answer: data.acceptable_answers?.[0] || '', correct_options: data.task_type === 'multiple_choice' ? data.acceptable_answers || [] : [], tolerance: data.task_type === 'numeric' ? data.acceptable_answers?.[1] || '0' : '0', pairs: data.task_type === 'matching' ? (data.acceptable_answers || []).map((pair) => { const [left, right] = String(pair).split('|||'); return { left, right }; }) : [{ left: '', right: '' }, { left: '', right: '' }], order_items: data.task_type === 'ordering' ? data.acceptable_answers || [] : ['', ''], hint: data.hint || '', explanation: data.explanation || '' });
const newLesson = (skillId = '', data = {}) => ({ id: data.id, key: data.id || key(), title: data.title || '', theory: data.theory || '', example: data.example || '', tasks: data.tasks?.length ? data.tasks.map((task) => newTask(skillId, task)) : [newTask(skillId)] });
const emptyForm = () => ({ title: '', description: '', subject_id: 'mathematics', topic_id: '', grade: 9, lessons: [newLesson()] });
const readDraft = (storageKey) => {
  try { return JSON.parse(window.localStorage.getItem(storageKey)); }
  catch (_error) { return null; }
};
const normalizeDraftForm = (form) => form ? { ...form, lessons: (form.lessons || []).map((lesson) => ({ ...newLesson('', lesson), key: lesson.key || lesson.id || key() })) } : null;
export const isCompatibleContentDraft = (draft, serverVersion) => Boolean(draft?.form && draft.baseVersion === serverVersion);

export function ContentEditorPage() {
  const navigate = useNavigate();
  const { moduleId } = useParams();
  const { t } = useI18n();
  const role = useAuthStore((state) => state.user?.role);
  const contentBase = role === 'admin' ? '/admin/content' : '/teacher/content';
  const storageKey = `sanaq:content-draft:${moduleId || 'new'}`;
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState(() => moduleId ? emptyForm() : normalizeDraftForm(readDraft(storageKey)?.form) || emptyForm());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLesson, setPreviewLesson] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [initialLoading, setInitialLoading] = useState(Boolean(moduleId));
  const [serverVersion, setServerVersion] = useState(null);
  const [versionConflict, setVersionConflict] = useState(null);
  const [autosavePaused, setAutosavePaused] = useState(false);
  const [draftStatus, setDraftStatus] = useState(() => !moduleId && readDraft(storageKey) ? t('draft.restored') : '');
  const autosaveReady = useRef(!moduleId);
  const writerId = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const handleExternalDraft = (event) => {
      if (event.key !== storageKey || !event.newValue) return;
      try {
        const externalDraft = JSON.parse(event.newValue);
        if (!externalDraft?.form || externalDraft.writerId === writerId.current) return;
        setAutosavePaused(true);
        setVersionConflict({ kind: 'local', draft: externalDraft });
      } catch (_error) { /* Ignore malformed storage written outside SANAQ. */ }
    };
    window.addEventListener('storage', handleExternalDraft);
    return () => window.removeEventListener('storage', handleExternalDraft);
  }, [storageKey]);

  useEffect(() => {
    if (!moduleId) return;
    adminContentApi.get(moduleId).then((response) => {
      const module = response.data.module;
      const lessons = (module.lessons || []).map((lesson) => newLesson('', lesson));
      const serverForm = { title: module.title, description: module.description || '', subject_id: module.subject_id, topic_id: module.topic_id, grade: module.grade, lessons: lessons.length ? lessons : [newLesson()] };
      const draft = readDraft(storageKey);
      const compatibleDraft = isCompatibleContentDraft(draft, module.version);
      setForm(normalizeDraftForm(compatibleDraft ? draft.form : serverForm));
      if (compatibleDraft) setDraftStatus(t('draft.restored'));
      if (draft?.form && !compatibleDraft) setDraftStatus(t('draft.outdated'));
      setServerVersion(module.version);
    }).catch((requestError) => setError(requestError.message)).finally(() => { autosaveReady.current = true; setInitialLoading(false); });
  }, [moduleId, storageKey, t]);

  useEffect(() => {
    if (initialLoading || autosavePaused || !autosaveReady.current) return undefined;
    setDraftStatus(t('draft.saving'));
    const timeout = window.setTimeout(() => {
      const savedAt = new Date();
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ form, baseVersion: serverVersion, writerId: writerId.current, savedAt: savedAt.toISOString() }));
        setDraftStatus(t('draft.saved', { time: new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(savedAt) }));
      } catch (_error) { setDraftStatus(''); }
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [autosavePaused, form, initialLoading, serverVersion, storageKey, t]);

  useEffect(() => {
    if (initialLoading) return;
    catalogApi.topics(form.subject_id, form.grade).then((response) => {
      const items = response.data.items || [];
      setTopics(items);
      setForm((current) => {
        const topic = items.find((item) => item.id === current.topic_id) || items[0];
        const skillId = topic?.skills?.[0]?.id || '';
        return { ...current, topic_id: topic?.id || '', lessons: current.lessons.map((lesson) => ({ ...lesson, tasks: lesson.tasks.map((task) => ({ ...task, skill_id: topic?.skills?.some((skill) => skill.id === task.skill_id) ? task.skill_id : skillId })) })) };
      });
    }).catch((requestError) => setError(requestError.message));
  }, [form.grade, form.subject_id, initialLoading]);

  const skills = useMemo(() => topics.find((topic) => topic.id === form.topic_id)?.skills || [], [topics, form.topic_id]);
  useEffect(() => {
    const skillId = skills[0]?.id || '';
    setForm((current) => ({ ...current, lessons: current.lessons.map((lesson) => ({ ...lesson, tasks: lesson.tasks.map((task) => ({ ...task, skill_id: skills.some((skill) => skill.id === task.skill_id) ? task.skill_id : skillId })) })) }));
  }, [skills]);
  const updateLesson = (lessonIndex, patchValue) => setForm((current) => ({ ...current, lessons: current.lessons.map((lesson, index) => index === lessonIndex ? { ...lesson, ...patchValue } : lesson) }));
  const updateTask = (lessonIndex, taskIndex, patchValue) => setForm((current) => ({ ...current, lessons: current.lessons.map((lesson, index) => index === lessonIndex ? { ...lesson, tasks: lesson.tasks.map((task, currentTaskIndex) => currentTaskIndex === taskIndex ? { ...task, ...patchValue } : task) } : lesson) }));

  const addLesson = () => setForm((current) => ({ ...current, lessons: [...current.lessons, newLesson(skills[0]?.id)] }));
  const removeLesson = (index) => setForm((current) => ({ ...current, lessons: current.lessons.filter((_, itemIndex) => itemIndex !== index) }));
  const addTask = (lessonIndex) => setForm((current) => ({ ...current, lessons: current.lessons.map((lesson, index) => index === lessonIndex ? { ...lesson, tasks: [...lesson.tasks, newTask(skills[0]?.id)] } : lesson) }));
  const removeTask = (lessonIndex, taskIndex) => updateLesson(lessonIndex, { tasks: form.lessons[lessonIndex].tasks.filter((_, index) => index !== taskIndex) });

  const valid = form.title.trim() && form.topic_id && form.lessons.length && form.lessons.every((lesson) => lesson.title.trim() && lesson.theory.trim() && lesson.tasks.every((task) => task.prompt.trim() && task.skill_id && (task.task_type === 'multiple_choice' ? task.correct_options.length > 0 : task.task_type === 'matching' ? task.pairs.length >= 2 && task.pairs.every((pair) => pair.left.trim() && pair.right.trim()) : task.task_type === 'ordering' ? task.order_items.length >= 2 && task.order_items.every((item) => item.trim()) : task.acceptable_answer.trim()) && (!['single_choice', 'multiple_choice'].includes(task.task_type) || (task.options.filter((option) => option.trim()).length >= 2 && (task.task_type === 'multiple_choice' ? task.correct_options.every((answer) => task.options.includes(answer)) : task.options.includes(task.acceptable_answer))))));

  const taskPayload = (lessonId, task) => ({ lesson_id: lessonId, skill_id: task.skill_id, prompt: task.prompt.trim(), task_type: task.task_type, difficulty: Number(task.difficulty), options: ['single_choice', 'multiple_choice'].includes(task.task_type) ? task.options.map((option) => option.trim()).filter(Boolean) : task.task_type === 'matching' ? { left: task.pairs.map((pair) => pair.left.trim()), right: [...task.pairs.map((pair) => pair.right.trim())].reverse() } : task.task_type === 'ordering' ? [...task.order_items].reverse() : [], acceptable_answers: task.task_type === 'multiple_choice' ? task.correct_options : task.task_type === 'numeric' ? [task.acceptable_answer.trim(), String(Math.max(0, Number(task.tolerance) || 0))] : task.task_type === 'matching' ? task.pairs.map((pair) => `${pair.left.trim()}|||${pair.right.trim()}`) : task.task_type === 'ordering' ? task.order_items.map((item) => item.trim()) : [task.acceptable_answer.trim()], hint: task.hint.trim(), explanation: task.explanation.trim(), is_published: true });
  const createTasks = (lessonId, tasks) => Promise.all(tasks.map((task) => adminContentApi.createTask(taskPayload(lessonId, task))));

  const updateExistingModule = async () => {
    const response = await adminContentApi.saveEditor(moduleId, {
      expected_version: serverVersion,
      title: form.title.trim(), description: form.description.trim(), subject_id: form.subject_id,
      topic_id: form.topic_id, grade: form.grade,
      lessons: form.lessons.map((lesson) => ({
        id: lesson.id, title: lesson.title.trim(), theory: lesson.theory.trim(), example: lesson.example.trim(),
        tasks: lesson.tasks.map((task) => ({ id: task.id, ...taskPayload(lesson.id, task) })),
      })),
    });
    setServerVersion(response.data.module.version);
  };

  const save = async () => {
    if (!valid) { setError(t('editor.invalid')); return; }
    setLoading(true); setError('');
    try {
      if (moduleId) {
        await updateExistingModule();
        window.localStorage.removeItem(storageKey);
        setStatus(t('editor.saved', { title: form.title.trim() }));
        window.setTimeout(() => navigate(contentBase), 900);
        return;
      }
      const [first, ...remaining] = form.lessons;
      const response = await adminContentApi.create({ title: form.title.trim(), description: form.description.trim(), subject_id: form.subject_id, topic_id: form.topic_id, grade: form.grade, lesson_title: first.title.trim(), theory: first.theory.trim(), example: first.example.trim() });
      const firstLessonId = response.data.module.lessons?.[0]?.id;
      if (!firstLessonId) throw new Error('Created module has no lesson');
      await createTasks(firstLessonId, first.tasks);
      for (let index = 0; index < remaining.length; index += 1) {
        const lesson = remaining[index];
        const lessonResponse = await adminContentApi.createLesson({ module_id: response.data.module.id, title: lesson.title.trim(), theory: lesson.theory.trim(), example: lesson.example.trim(), order: index + 2 });
        await createTasks(lessonResponse.data.lesson.id, lesson.tasks);
      }
      setStatus(t('editor.saved', { title: response.data.module.title }));
      window.localStorage.removeItem(storageKey);
      window.setTimeout(() => navigate(contentBase), 900);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.code === 'CONTENT_VERSION_CONFLICT') {
        setVersionConflict({ kind: 'server', currentVersion: requestError.details?.[0]?.current_version });
      }
    }
    finally { setLoading(false); }
  };

  if (initialLoading) return <div className="py-16 text-center font-bold">Loading…</div>;

  return <div className="mx-auto max-w-6xl animate-rise pb-12">
    <button onClick={() => navigate(contentBase)} className="mb-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 font-bold text-stone-600 transition hover:bg-stone-100"><ArrowLeft className="h-5 w-5" /> {t('editor.back')}</button>
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div className="min-w-0"><p className="eyebrow">{t('editor.eyebrow')}</p><h1 className="page-title mt-3 break-words">{t('editor.title')}</h1><p className="mt-3 max-w-2xl text-stone-600">{t('editor.subtitle')}</p><p className="mt-2 min-h-5 text-xs font-semibold text-stone-500" role="status">{draftStatus}</p></div><div className="grid w-full gap-2 sm:flex sm:w-auto"><Button variant="outline" onClick={() => { setPreviewLesson(0); setPreviewOpen(true); }}><Eye className="h-4 w-4" /> {t('editor.preview')}</Button><Button loading={loading} disabled={!valid} onClick={save}><Save className="h-4 w-4" /> {t('editor.save')}</Button></div></div>
    {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900" role="alert">{error}</div>}
    {versionConflict && <Card className="mt-5 border-amber-300 bg-amber-50 p-5"><h2 className="font-extrabold">{t(versionConflict.kind === 'local' ? 'draft.localConflictTitle' : 'draft.conflictTitle')}</h2><p className="mt-2 text-sm text-stone-600">{t(versionConflict.kind === 'local' ? 'draft.localConflictDescription' : 'draft.conflictDescription')}</p><div className="mt-4 flex flex-col gap-2 min-[420px]:flex-row"><Button variant="outline" onClick={() => { if (versionConflict.kind === 'local') { setForm(normalizeDraftForm(versionConflict.draft.form)); setAutosavePaused(false); setVersionConflict(null); } else { window.localStorage.removeItem(storageKey); window.location.reload(); } }}>{t(versionConflict.kind === 'local' ? 'draft.useOtherTab' : 'draft.loadServer')}</Button><Button onClick={() => { if (versionConflict.kind === 'server') setServerVersion(versionConflict.currentVersion); setAutosavePaused(false); setVersionConflict(null); setError(''); }}>{t('draft.keepMine')}</Button></div></Card>}

    <Card className="mt-7 p-5 sm:p-8"><h2 className="text-xl font-extrabold">{t('editor.basics')}</h2><div className="mt-5 grid gap-5 lg:grid-cols-2"><label className="field-label lg:col-span-2">{t('editor.moduleTitle')}<input className="field-control mt-2" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label className="field-label">{t('editor.grade')}<select className="field-control mt-2" value={form.grade} onChange={(event) => setForm({ ...form, grade: Number(event.target.value) })}>{[7, 8, 9, 10, 11, 12].map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label><label className="field-label">{t('editor.topic')}<select className="field-control mt-2" value={form.topic_id} onChange={(event) => setForm({ ...form, topic_id: event.target.value })}>{topics.length ? topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>) : <option value="">{t('editor.emptyTopic')}</option>}</select></label><label className="field-label lg:col-span-2">{t('editor.description')}<textarea rows="3" className="field-control mt-2 py-3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label></div></Card>

    <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-2xl font-extrabold">{t('editor.lessons')}</h2><Button variant="outline" onClick={addLesson}><Plus className="h-4 w-4" /> {t('editor.addLesson')}</Button></div>
    <div className="mt-4 space-y-5">{form.lessons.map((lesson, lessonIndex) => <Card key={lesson.key} className="overflow-hidden"><div className="flex flex-wrap items-center gap-3 border-b border-stone-200 bg-stone-50 px-4 py-4 sm:px-6"><GripVertical className="h-5 w-5 text-stone-400" /><h3 className="min-w-0 flex-1 text-lg font-extrabold">{t('editor.lesson', { number: lessonIndex + 1 })}</h3>{form.lessons.length > 1 && <button className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold text-red-700 transition hover:bg-red-50" onClick={() => removeLesson(lessonIndex)}><Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">{t('editor.removeLesson')}</span></button>}</div><div className="space-y-5 p-4 sm:p-6"><label className="field-label">{t('editor.lessonTitle')}<input className="field-control mt-2" value={lesson.title} onChange={(event) => updateLesson(lessonIndex, { title: event.target.value })} /></label><label className="field-label">{t('editor.theory')}<textarea rows="6" className="field-control mt-2 py-3" value={lesson.theory} onChange={(event) => updateLesson(lessonIndex, { theory: event.target.value })} /></label><label className="field-label">{t('editor.example')}<textarea rows="3" className="field-control mt-2 py-3" value={lesson.example} onChange={(event) => updateLesson(lessonIndex, { example: event.target.value })} /></label>
      <div className="rounded-3xl bg-stone-100 p-3 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h4 className="text-lg font-extrabold">{t('editor.tasks')}</h4><Button size="sm" variant="secondary" onClick={() => addTask(lessonIndex)}><Plus className="h-4 w-4" /> {t('editor.addTask')}</Button></div><div className="mt-4 space-y-4">{lesson.tasks.map((task, taskIndex) => <TaskEditor key={task.key} task={task} taskIndex={taskIndex} skills={skills} t={t} onChange={(patchValue) => updateTask(lessonIndex, taskIndex, patchValue)} onRemove={() => removeTask(lessonIndex, taskIndex)} canRemove={lesson.tasks.length > 1} />)}</div></div>
    </div></Card>)}</div>

    <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} title={form.title || t('editor.title')} description={t('draft.learnerView')} size="xl" footer={<Button onClick={() => setPreviewOpen(false)}>{t('editor.close')}</Button>}><ModulePreview form={form} lessonIndex={previewLesson} setLessonIndex={setPreviewLesson} t={t} /></Dialog>
    <StatusToast message={status} onClose={() => setStatus('')} />
  </div>;
}

function ModulePreview({ form, lessonIndex, setLessonIndex, t }) {
  const lesson = form.lessons[lessonIndex] || form.lessons[0];
  const [answers, setAnswers] = useState({});
  if (!lesson) return null;
  return <div className="min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="eyebrow">{t('draft.previewLesson', { current: lessonIndex + 1, total: form.lessons.length })}</p><div className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label={t('editor.lessons')}>{form.lessons.map((item, index) => <button key={item.key} type="button" onClick={() => setLessonIndex(index)} className={`h-10 min-w-10 cursor-pointer rounded-xl px-3 text-sm font-extrabold ${index === lessonIndex ? 'bg-lavender-600 text-white' : 'bg-stone-100 text-stone-600'}`} aria-current={index === lessonIndex ? 'step' : undefined}>{index + 1}</button>)}</div></div>
    <article className="mt-5 overflow-hidden rounded-3xl border border-stone-200 bg-paper"><div className="bg-lavender-50 p-5 sm:p-8"><h3 className="break-words text-2xl font-extrabold sm:text-3xl">{lesson.title || t('editor.lessonTitle')}</h3>{form.description && <p className="mt-2 text-sm text-stone-600">{form.description}</p>}</div><div className="p-5 sm:p-8"><p className="whitespace-pre-wrap text-stone-700">{lesson.theory || t('editor.theory')}</p>{lesson.example && <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-mint-100 p-5">{lesson.example}</div>}
      <div className="mt-7 space-y-5">{lesson.tasks.map((task, taskIndex) => <section key={task.key} className="rounded-2xl bg-stone-100 p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-paper text-sm font-extrabold">{taskIndex + 1}</span><div className="min-w-0 flex-1"><p className="break-words font-extrabold">{task.prompt || t('editor.prompt')}</p>{task.task_type === 'single_choice' ? <fieldset className="mt-4"><legend className="sr-only">{t('draft.chooseAnswer')}</legend><div className="grid gap-2 sm:grid-cols-2">{task.options.filter(Boolean).map((option) => <label key={option} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 bg-paper p-3 ${answers[task.key] === option ? 'border-lavender-500' : 'border-transparent'}`}><input className="sr-only" type="radio" name={`preview-${task.key}`} checked={answers[task.key] === option} onChange={() => setAnswers((current) => ({ ...current, [task.key]: option }))} />{answers[task.key] === option && <CheckCircle2 className="h-5 w-5 shrink-0 text-lavender-600" />}<span className="break-words">{option}</span></label>)}</div></fieldset> : <input className="field-control mt-4" value={answers[task.key] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [task.key]: event.target.value }))} placeholder={t('draft.textAnswer')} />}</div></div></section>)}</div>
    </div></article>
    <p className="mt-3 text-xs text-stone-500">{t('draft.previewNote')}</p><div className="mt-5 flex flex-col-reverse gap-3 min-[420px]:flex-row min-[420px]:justify-between"><Button variant="outline" disabled={lessonIndex === 0} onClick={() => setLessonIndex((index) => index - 1)}><ArrowLeft className="h-4 w-4" /> {t('draft.previous')}</Button><Button disabled={lessonIndex >= form.lessons.length - 1} onClick={() => setLessonIndex((index) => index + 1)}>{t('draft.next')} <ArrowRight className="h-4 w-4" /></Button></div>
  </div>;
}

function TaskEditor({ task, taskIndex, skills, t, onChange, onRemove, canRemove }) {
  const updateOption = (index, value) => {
    const previous = task.options[index];
    onChange({ options: task.options.map((option, optionIndex) => optionIndex === index ? value : option), acceptable_answer: task.acceptable_answer === previous ? value : task.acceptable_answer, correct_options: task.correct_options.map((option) => option === previous ? value : option) });
  };
  return <section className="rounded-2xl border border-stone-200 bg-paper p-4 sm:p-5"><div className="flex items-center gap-3"><h5 className="min-w-0 flex-1 font-extrabold">{t('editor.task', { number: taskIndex + 1 })}</h5>{canRemove && <button className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl text-red-700 transition hover:bg-red-50" onClick={onRemove} aria-label={t('editor.removeTask')}><Trash2 className="h-4 w-4" /></button>}</div><div className="mt-4 grid gap-4 lg:grid-cols-2"><label className="field-label lg:col-span-2">{t('editor.prompt')}<textarea rows="2" className="field-control mt-2 py-3" value={task.prompt} onChange={(event) => onChange({ prompt: event.target.value })} /></label><label className="field-label">{t('editor.skill')}<select className="field-control mt-2" value={task.skill_id} onChange={(event) => onChange({ skill_id: event.target.value })}>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label><label className="field-label">{t('editor.type')}<select className="field-control mt-2" value={task.task_type} onChange={(event) => onChange({ task_type: event.target.value, acceptable_answer: '', correct_options: [], tolerance: '0', pairs: [{ left: '', right: '' }, { left: '', right: '' }], order_items: ['', ''], options: ['single_choice', 'multiple_choice'].includes(event.target.value) ? ['', ''] : [] })}><option value="single_choice">{t('editor.singleChoice')}</option><option value="multiple_choice">{t('taskTypes.multipleChoice')}</option><option value="short_answer">{t('editor.textAnswer')}</option><option value="numeric">{t('taskTypes.numeric')}</option><option value="matching">{t('taskTypes.matching')}</option><option value="ordering">{t('taskTypes.ordering')}</option><option value="fill_blank">{t('taskTypes.fillBlank')}</option></select></label><label className="field-label lg:col-span-2">{t('editor.difficulty')}<input type="range" min="1" max="5" value={task.difficulty} onChange={(event) => onChange({ difficulty: Number(event.target.value) })} className="mt-3 w-full accent-lavender-600" /><span className="mt-1 block text-center font-extrabold text-lavender-700">{task.difficulty}/5</span></label>
      {['single_choice', 'multiple_choice'].includes(task.task_type) && <div className="space-y-3 lg:col-span-2"><p className="text-sm font-bold">{task.task_type === 'multiple_choice' ? t('taskTypes.selectCorrect') : t('editor.correctAnswer')}</p>{task.options.map((option, index) => <div key={index} className="flex items-center gap-2"><input type={task.task_type === 'multiple_choice' ? 'checkbox' : 'radio'} name={`correct-${task.key}`} checked={task.task_type === 'multiple_choice' ? task.correct_options.includes(option) : task.acceptable_answer !== '' && task.acceptable_answer === option} onChange={() => task.task_type === 'multiple_choice' ? onChange({ correct_options: task.correct_options.includes(option) ? task.correct_options.filter((item) => item !== option) : [...task.correct_options, option] }) : onChange({ acceptable_answer: option })} aria-label={t('editor.correctAnswer')} className="h-5 w-5 shrink-0 accent-lavender-600" /><input className="field-control" placeholder={t('editor.option', { number: index + 1 })} value={option} onChange={(event) => updateOption(index, event.target.value)} />{task.options.length > 2 && <button className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl text-red-700 hover:bg-red-50" onClick={() => onChange({ options: task.options.filter((_, optionIndex) => optionIndex !== index), acceptable_answer: task.acceptable_answer === option ? '' : task.acceptable_answer, correct_options: task.correct_options.filter((item) => item !== option) })} aria-label={t('editor.removeTask')}><Trash2 className="h-4 w-4" /></button>}</div>)}<button className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold text-lavender-700 transition hover:bg-lavender-50" onClick={() => onChange({ options: [...task.options, ''] })}><Plus className="h-4 w-4" /> {t('editor.addOption')}</button></div>}
      {!['single_choice', 'multiple_choice', 'matching', 'ordering'].includes(task.task_type) && <label className="field-label lg:col-span-2">{t('editor.correctAnswer')}<input type={task.task_type === 'numeric' ? 'number' : 'text'} step="any" className="field-control mt-2" value={task.acceptable_answer} onChange={(event) => onChange({ acceptable_answer: event.target.value })} /></label>}
      {task.task_type === 'numeric' && <label className="field-label lg:col-span-2">{t('taskTypes.tolerance')}<input type="number" min="0" step="any" className="field-control mt-2" value={task.tolerance} onChange={(event) => onChange({ tolerance: event.target.value })} /></label>}
      {task.task_type === 'fill_blank' && <p className="rounded-xl bg-lavender-50 p-3 text-sm text-lavender-800 lg:col-span-2">{t('taskTypes.blankHint')}</p>}
      {task.task_type === 'matching' && <div className="space-y-3 lg:col-span-2"><p className="text-sm font-bold">{t('taskTypes.matchHint')}</p>{task.pairs.map((pair, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input className="field-control" value={pair.left} placeholder={t('taskTypes.pairLeft')} onChange={(event) => onChange({ pairs: task.pairs.map((item, itemIndex) => itemIndex === index ? { ...item, left: event.target.value } : item) })} /><input className="field-control" value={pair.right} placeholder={t('taskTypes.pairRight')} onChange={(event) => onChange({ pairs: task.pairs.map((item, itemIndex) => itemIndex === index ? { ...item, right: event.target.value } : item) })} />{task.pairs.length > 2 && <button type="button" className="grid h-11 w-11 place-items-center rounded-xl text-red-700" onClick={() => onChange({ pairs: task.pairs.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="h-4 w-4" /></button>}</div>)}<button type="button" className="min-h-11 rounded-xl px-3 font-bold text-lavender-700" onClick={() => onChange({ pairs: [...task.pairs, { left: '', right: '' }] })}><Plus className="mr-2 inline h-4 w-4" />{t('taskTypes.addPair')}</button></div>}
      {task.task_type === 'ordering' && <div className="space-y-3 lg:col-span-2"><p className="text-sm font-bold">{t('taskTypes.orderHint')}</p>{task.order_items.map((item, index) => <div key={index} className="flex items-center gap-2"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 font-bold">{index + 1}</span><input className="field-control" value={item} onChange={(event) => onChange({ order_items: task.order_items.map((value, itemIndex) => itemIndex === index ? event.target.value : value) })} />{task.order_items.length > 2 && <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-red-700" onClick={() => onChange({ order_items: task.order_items.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="h-4 w-4" /></button>}</div>)}<button type="button" className="min-h-11 rounded-xl px-3 font-bold text-lavender-700" onClick={() => onChange({ order_items: [...task.order_items, ''] })}><Plus className="mr-2 inline h-4 w-4" />{t('taskTypes.addItem')}</button></div>}
      <label className="field-label">{t('editor.hint')}<textarea rows="2" className="field-control mt-2 py-3" value={task.hint} onChange={(event) => onChange({ hint: event.target.value })} /></label><label className="field-label">{t('editor.explanation')}<textarea rows="2" className="field-control mt-2 py-3" value={task.explanation} onChange={(event) => onChange({ explanation: event.target.value })} /></label>
    </div></section>;
}
