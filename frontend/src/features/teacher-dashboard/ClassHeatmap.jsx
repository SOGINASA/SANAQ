const data = [
  { name: 'Линейные уравнения', values: [0.92, 0.84, 0.78, 0.62, 0.88] },
  { name: 'Формулы', values: [0.82, 0.67, 0.71, 0.49, 0.8] },
  { name: 'Множители', values: [0.68, 0.42, 0.59, 0.35, 0.72] },
  { name: 'Дискриминант', values: [0.44, 0.38, 0.51, 0.26, 0.58] },
];

const tone = (value) => value >= 0.75 ? 'bg-mint-300' : value >= 0.5 ? 'bg-lavender-300' : value >= 0.35 ? 'bg-[#FFD1C7]' : 'bg-coral';

export function ClassHeatmap() {
  return <div><div className="grid grid-cols-[minmax(130px,1.5fr)_repeat(5,minmax(44px,1fr))] gap-2 text-center text-xs font-bold text-stone-400"><span className="text-left">Навык</span>{['АС', 'ДМ', 'АК', 'АТ', 'МН'].map((name) => <span key={name}>{name}</span>)}{data.map((row) => <div key={row.name} className="contents"><span className="flex items-center text-left text-xs font-semibold text-stone-600">{row.name}</span>{row.values.map((value, index) => <div key={index} className={`heat-cell grid place-items-center text-xs font-extrabold text-ink ${tone(value)}`} title={`${row.name}: ${Math.round(value * 100)}%`}>{Math.round(value * 100)}</div>)}</div>)}</div><div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-stone-500"><span><i className="mr-2 inline-block h-3 w-3 rounded bg-mint-300" />75%+</span><span><i className="mr-2 inline-block h-3 w-3 rounded bg-lavender-300" />50–74%</span><span><i className="mr-2 inline-block h-3 w-3 rounded bg-coral" />до 50%</span></div></div>;
}
