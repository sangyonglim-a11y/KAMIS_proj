import type { CategoryTab } from "@/lib/types";

type Props = {
  value: CategoryTab;
  onChange: (v: CategoryTab) => void;
};

export function CategoryTabs({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-paper-line bg-paper-card/80 p-1">
      <button
        type="button"
        onClick={() => onChange("veg")}
        className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
          value === "veg" ? "bg-forest-soft text-forest" : "text-stone-500"
        }`}
      >
        🥦 채소 시세
      </button>
      <button
        type="button"
        onClick={() => onChange("meat")}
        className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
          value === "meat" ? "bg-forest-soft text-forest" : "text-stone-500"
        }`}
      >
        🥩 육류 시세
      </button>
    </div>
  );
}
