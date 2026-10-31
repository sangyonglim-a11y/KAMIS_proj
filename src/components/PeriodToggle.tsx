import type { Period } from "../types";

const OPTIONS: { id: Period; label: string }[] = [
  { id: "1m", label: "최근 1개월" },
  { id: "6m", label: "최근 6개월" },
  { id: "2y", label: "최근 2년" },
];

type Props = {
  value: Period;
  onChange: (p: Period) => void;
};

export function PeriodToggle({ value, onChange }: Props) {
  return (
    <div className="period" role="tablist" aria-label="기간">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          className={`period-btn${value === opt.id ? " is-active" : ""}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
