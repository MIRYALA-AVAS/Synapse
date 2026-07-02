const COLORS = ['#F87171', '#FB923C', '#FBBF24', '#34D399', '#22D3EE', '#60A5FA', '#A78BFA', '#F472B6'];

function hashColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function Avatar({ name = '', src, size = 36 }) {
  const dimension = { width: size, height: size, fontSize: Math.round(size * 0.4) };

  if (src) {
    return <img src={src} alt={name} className="rounded-full object-cover shrink-0" style={dimension} />;
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-medium shrink-0"
      style={{ ...dimension, backgroundColor: hashColor(name || '?') }}
    >
      {getInitials(name) || '?'}
    </div>
  );
}
