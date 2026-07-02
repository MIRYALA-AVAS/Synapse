const TAG_STYLES = {
  dsa: 'bg-violet-100 text-violet-700',
  placements: 'bg-blue-100 text-blue-700',
  academics: 'bg-emerald-100 text-emerald-700',
  internships: 'bg-amber-100 text-amber-700',
  'time-management': 'bg-cyan-100 text-cyan-700',
  'mental-health': 'bg-rose-100 text-rose-700',
  other: 'bg-gray-100 text-gray-700',
};

export const TAGS = Object.keys(TAG_STYLES);

export default function Tag({ tag }) {
  const style = TAG_STYLES[tag] || TAG_STYLES.other;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {tag}
    </span>
  );
}
