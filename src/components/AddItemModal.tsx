import { useState } from "react";

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

export function AddItemModal({ open, busy, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-item-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-item-title">신규 품목 추가</h2>
        <p className="muted">
          등록된 품목명만 받을 수 있습니다. 추가하면 최근 약 2년 시세를 모아 시트(또는 로컬
          저장소)에 넣습니다.
        </p>
        <label className="field">
          <span>품목명</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 양파"
            disabled={busy}
            autoFocus
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            취소
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={busy || !name.trim()}
            onClick={() => void onSubmit(name.trim())}
          >
            {busy ? "수집 중…" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
