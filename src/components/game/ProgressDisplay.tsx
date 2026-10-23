export function formatTime(seconds: number) {
  const n = Math.floor(seconds);
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
export default function ProgressDisplay({
  placed,
  named,
  total,
}: {
  placed: number;
  named: number;
  total: number;
}) {
  return (
    <div className="progress-block">
      <div className="progress-title">
        <span>ASSEMBLY</span>
        <strong>
          {placed}
          <small> / {total}</small>
        </strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="조립 진행률"
        aria-valuenow={placed}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <span style={{ width: `${(placed / total) * 100}%` }} />
      </div>
      <div className="naming-progress">
        <span>이름 학습</span>
        <span>
          {named} / {total}
        </span>
      </div>
    </div>
  );
}
