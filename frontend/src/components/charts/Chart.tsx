"use client";

import dynamic from "next/dynamic";
import type { Data, Layout } from "plotly.js";

// Plotly touches window on import, so load it client-side only
const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center text-gray-400">Loading chart…</div>,
});

type ChartProps = {
  title: string;
  data: Data[];
  layout?: Partial<Layout>;
};

/** Plotly chart with the dashboard's shared defaults (title, autosize, margins). */
export default function Chart({ title, data, layout }: ChartProps) {
  return (
    <Plot
      data={data}
      layout={{ title: { text: title }, autosize: true, margin: { t: 60 }, ...layout }}
      useResizeHandler
      className="w-full h-96"
    />
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white p-4 rounded-lg shadow-sm border">{children}</div>;
}

export function NoData({ message }: { message: string }) {
  return <div className="h-32 flex items-center justify-center text-sm text-gray-500">{message}</div>;
}
