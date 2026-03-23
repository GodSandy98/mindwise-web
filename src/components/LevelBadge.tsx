const config = {
  H: { label: '优', className: 'bg-green-100 text-green-800' },
  M: { label: '中', className: 'bg-yellow-100 text-yellow-800' },
  L: { label: '弱', className: 'bg-red-100 text-red-800' },
};

export default function LevelBadge({ level }: { level: 'H' | 'M' | 'L' }) {
  const { label, className } = config[level] ?? config['M'];
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
