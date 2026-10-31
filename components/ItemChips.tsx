type Props = {
  items: { id: string; name: string }[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function ItemChips({ items, activeId, onSelect }: Props) {
  return (
    <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="품목">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="option"
          aria-selected={it.id === activeId}
          onClick={() => onSelect(it.id)}
          className={`shrink-0 rounded-full border px-3.5 py-2 text-sm whitespace-nowrap ${
            it.id === activeId
              ? "border-forest bg-forest font-bold text-white"
              : "border-paper-line bg-paper-card/90 text-stone-800"
          }`}
        >
          {it.name}
        </button>
      ))}
    </div>
  );
}
