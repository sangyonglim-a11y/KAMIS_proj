import type { Period } from "@/lib/types";

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
    <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-paper-line bg-paper-card/75 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-[10px] px-1 py-2.5 text-[0.8rem] sm:text-sm ${
            value === opt.id
              ? "bg-forest-soft font-bold text-forest"
              : "text-stone-500"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
