import type { CatalogItem } from "../types";

type Props = {
  items: CatalogItem[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function ItemChips({ items, activeId, onSelect }: Props) {
  return (
    <div className="chips" role="listbox" aria-label="품목">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="option"
          aria-selected={it.id === activeId}
          className={`chip${it.id === activeId ? " is-active" : ""}`}
          onClick={() => onSelect(it.id)}
        >
          {it.name}
        </button>
      ))}
    </div>
  );
}
