"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "@/lib/types";

type Props = {
  title: string;
  subtitle: string;
  note?: string | null;
  points: ChartPoint[];
  monthlies?: { date: string; price: number }[];
  showMonthly: boolean;
  tradeDays: number;
  lastTradeLabel: string | null;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function PriceChart({
  title,
  subtitle,
  note,
  points,
  monthlies = [],
  showMonthly,
  tradeDays,
  lastTradeLabel,
  selectedDate,
  onSelectDate,
}: Props) {
  const data = points
    .filter((p) => p.price != null)
    .map((p) => ({
      ...p,
      monthly: showMonthly
        ? monthlies.find((m) => m.date.slice(0, 7) === p.date.slice(0, 7))?.price ?? null
        : null,
    }));

  return (
    <section className="rounded-[18px] border border-paper-line bg-paper-card p-4 shadow-card">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      {note ? (
        <p className="mt-2 rounded-xl bg-orange-50 px-2.5 py-2 text-xs text-orange-800">{note}</p>
      ) : null}

      <div className="mt-2 h-[260px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            onClick={(state) => {
              const d = (state as { activePayload?: { payload?: ChartPoint }[] })
                ?.activePayload?.[0]?.payload?.date;
              if (d) onSelectDate(d);
            }}
          >
            <CartesianGrid stroke="#e7e2d8" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => `${v.slice(5, 7)}.${v.slice(8, 10)}`}
              minTickGap={28}
              tick={{ fontSize: 11, fill: "#78716c" }}
              axisLine={{ stroke: "#d6d3d1" }}
              tickLine={false}
            />
            <YAxis
              width={52}
              tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
              tick={{ fontSize: 11, fill: "#78716c" }}
              axisLine={false}
              tickLine={false}
              domain={["auto", "auto"]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as ChartPoint;
                return (
                  <div className="rounded-xl bg-stone-900 px-2.5 py-2 text-xs text-white shadow">
                    <div>
                      {p.date.slice(0, 4)}.{p.date.slice(5, 7)}.{p.date.slice(8, 10)} ({p.weekday})
                    </div>
                    <div className="mt-0.5 font-bold">
                      {p.filled ? "휴장 · 직전가 " : "도매가 "}
                      {p.price != null ? won(p.price) : "—"}
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#1f4d2e"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props as {
                  cx?: number;
                  cy?: number;
                  payload?: ChartPoint;
                };
                if (cx == null || cy == null || !payload) return <g />;
                const active = payload.date === selectedDate;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={active ? 5 : 3}
                    fill={payload.filled ? "#a8a29e" : "#1f4d2e"}
                    stroke="#fff"
                    strokeWidth={active ? 2 : 0}
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectDate(payload.date)}
                  />
                );
              }}
              activeDot={{ r: 6 }}
              connectNulls
              isAnimationActive={false}
            />
            {showMonthly ? (
              <Line
                type="monotone"
                dataKey="monthly"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-stone-500">
        실제 거래일 {tradeDays}일
        {lastTradeLabel ? ` · 최근 거래일 ${lastTradeLabel}` : ""}. 차트의 날짜를 누르면 아래 가격이
        바뀝니다.
      </p>
    </section>
  );
}
