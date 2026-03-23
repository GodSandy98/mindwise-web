export default function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-sm">N/A</span>;
  // score is z-score, clamp to [-3, 3] then map to [0, 100]%
  const pct = Math.round(((Math.max(-3, Math.min(3, score)) + 3) / 6) * 100);
  const color = score >= 0.5 ? 'bg-green-500' : score <= -0.5 ? 'bg-red-400' : 'bg-yellow-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-600 w-12 text-right">{score.toFixed(2)}</span>
    </div>
  );
}
