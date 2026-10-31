"use client";

import { useState } from "react";
import type { CategoryTab } from "@/lib/types";
import type { MeatGroup } from "@/lib/catalog";

type Props = {
  open: boolean;
  category: CategoryTab;
  busy: boolean;
  meatGroups: Record<MeatGroup, string>;
  onClose: () => void;
  onSubmit: (form: {
    itemName: string;
    meatGroup?: MeatGroup;
    origin?: string;
    brand?: string;
    part?: string;
    searchKeyword?: string;
    productUrl?: string;
  }) => Promise<void>;
};

export function AddItemModal({
  open,
  category,
  busy,
  meatGroups,
  onClose,
  onSubmit,
}: Props) {
  const [itemName, setItemName] = useState("");
  const [meatGroup, setMeatGroup] = useState<MeatGroup>("imported_beef");
  const [origin, setOrigin] = useState("");
  const [brand, setBrand] = useState("");
  const [part, setPart] = useState("");
  const [productUrl, setProductUrl] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-stone-900/45 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-paper-card p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">
          {category === "meat" ? "육류 품목 추가" : "채소 품목 추가"}
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          {category === "meat"
            ? "분류·원산지/브랜드·부위명을 입력하면 Apps Script가 B2B 검색가를 수집합니다."
            : "등록된 채소 품목명을 입력하면 시트 수집 요청을 보냅니다."}
        </p>

        {category === "meat" ? (
          <div className="mt-3 space-y-3">
            <label className="block text-sm">
              <span className="text-stone-600">분류</span>
              <select
                className="mt-1 w-full rounded-xl border border-paper-line bg-white px-3 py-2.5"
                value={meatGroup}
                disabled={busy}
                onChange={(e) => setMeatGroup(e.target.value as MeatGroup)}
              >
                {(Object.keys(meatGroups) as MeatGroup[]).map((k) => (
                  <option key={k} value={k}>
                    {meatGroups[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">원산지</span>
              <input
                className="mt-1 w-full rounded-xl border border-paper-line bg-white px-3 py-2.5"
                value={origin}
                disabled={busy}
                placeholder="예: 미국산 / 칠레산 / 국산"
                onChange={(e) => setOrigin(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">브랜드</span>
              <input
                className="mt-1 w-full rounded-xl border border-paper-line bg-white px-3 py-2.5"
                value={brand}
                disabled={busy}
                placeholder="예: 이베리코"
                onChange={(e) => setBrand(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">부위명</span>
              <input
                className="mt-1 w-full rounded-xl border border-paper-line bg-white px-3 py-2.5"
                value={part}
                disabled={busy}
                placeholder="예: 살치살"
                onChange={(e) => {
                  setPart(e.target.value);
                  setItemName(e.target.value);
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">상품 URL (선택)</span>
              <input
                className="mt-1 w-full rounded-xl border border-paper-line bg-white px-3 py-2.5"
                value={productUrl}
                disabled={busy}
                placeholder="검색 실패 시 직접 상품 페이지 URL"
                onChange={(e) => setProductUrl(e.target.value)}
              />
            </label>
          </div>
        ) : (
          <label className="mt-3 block text-sm">
            <span className="text-stone-600">품목명</span>
            <input
              className="mt-1 w-full rounded-xl border border-paper-line bg-white px-3 py-2.5"
              value={itemName}
              disabled={busy}
              placeholder="예: 양파"
              onChange={(e) => setItemName(e.target.value)}
              autoFocus
            />
          </label>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-bold text-stone-500"
            onClick={onClose}
            disabled={busy}
          >
            취소
          </button>
          <button
            type="button"
            className="rounded-full bg-forest px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            disabled={
              busy ||
              (category === "veg" ? !itemName.trim() : !part.trim() && !itemName.trim())
            }
            onClick={() =>
              void onSubmit(
                category === "meat"
                  ? {
                      itemName: itemName.trim() || part.trim(),
                      meatGroup,
                      origin: origin.trim(),
                      brand: brand.trim(),
                      part: part.trim() || itemName.trim(),
                      searchKeyword: itemName.trim() || part.trim(),
                      productUrl: productUrl.trim(),
                    }
                  : { itemName: itemName.trim() },
              )
            }
          >
            {busy ? "수집 중…" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}
