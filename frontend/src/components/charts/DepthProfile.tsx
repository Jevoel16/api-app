import type { Data } from "plotly.js";
import { COLORS, DEPTHS } from "@/lib/theme";
import type { SoilRow } from "@/lib/types";
import Chart from "./Chart";

const FRACTIONS = ["clay", "silt", "sand"] as const;

/** How clay/silt/sand change with depth for one site. */
export default function DepthProfile({ soil, site }: { soil: SoilRow[]; site: string }) {
  const data: Data[] = FRACTIONS.map((p) => ({
    type: "scatter",
    mode: "lines+markers",
    x: DEPTHS,
    y: DEPTHS.map((d) => soil.find((r) => r.site === site && r.property === p && r.depth === d)?.mean ?? null),
    name: p.charAt(0).toUpperCase() + p.slice(1),
    line: { color: COLORS[p] },
  }));
  return (
    <Chart
      title={`Depth Profile: Texture Changes (${site})`}
      data={data}
      layout={{ xaxis: { title: { text: "Depth" } }, yaxis: { title: { text: "Mean (%)" }, rangemode: "tozero" } }}
    />
  );
}
