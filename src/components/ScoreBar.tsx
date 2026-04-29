export default function ScoreBar({ score, showValue = true }: { score: number | null; showValue?: boolean }) {
  if (score === null) return <span className="text-gray-400 text-sm">N/A</span>;

  const clamped = Math.max(-2, Math.min(2, score));
  const pct = (Math.abs(clamped) / 2) * 100;
  const isPositive = clamped >= 0;
  const color = score >= 0.5 ? 'bg-green-500' : score <= -0.5 ? 'bg-red-400' : 'bg-yellow-400';

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center h-2">
        {/* Left half — negative values fill rightward from edge toward center */}
        <div className="flex-1 flex justify-end h-full bg-gray-100 rounded-l-full overflow-hidden">
          {!isPositive && (
            <div className={`${color} h-full`} style={{ width: `${pct}%` }} />
          )}
        </div>
        {/* Center line */}
        <div className="w-px h-3 bg-gray-400 flex-shrink-0" />
        {/* Right half — positive values fill leftward from center toward edge */}
        <div className="flex-1 h-full bg-gray-100 rounded-r-full overflow-hidden">
          {isPositive && (
            <div className={`${color} h-full`} style={{ width: `${pct}%` }} />
          )}
        </div>
      </div>
      {showValue && <span className="text-xs text-gray-600 w-10 text-right tabular-nums">{score.toFixed(2)}</span>}
    </div>
  );
}
