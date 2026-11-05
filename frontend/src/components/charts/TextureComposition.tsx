import type { Data } from "plotly.js";
import { normalizeTexture } from "@/lib/stats";
import { COLORS } from "@/lib/theme";
import type { SoilRow, SummaryRow } from "@/lib/types";
import Chart, { NoData } from "./Chart";

/** Q4: topsoil texture as a 100 % stacked bar, with the clay 5–95 % quantile band as error bars. */
export default function TextureComposition({ summary, soil }: { summary: SummaryRow[]; soil: SoilRow[] }) {
  const sites: string[] = [];
  const clay: number[] = [];
  const silt: number[] = [];
  const sand: number[] = [];
  const errPlus: number[] = [];
  const errMinus: number[] = [];

  for (const s of summary) {
    const tex = normalizeTexture(s.clay, s.silt, s.sand);
    if (!tex) continue;
    sites.push(s.site);
    clay.push(tex.clay);
    silt.push(tex.silt);
    sand.push(tex.sand);

    // Quantiles are in the same units as the mean, so rescale them by the same factor
    const scale = tex.clay / (s.clay ?? 1);
    const q = soil.find((r) => r.site === s.site && r.property === "clay" && r.depth === "0-5cm");
    const hasBand = q && q.mean !== null && q["Q0.05"] !== null && q["Q0.95"] !== null;
    errPlus.push(hasBand ? (q["Q0.95"]! - q.mean!) * scale : 0);
    errMinus.push(hasBand ? (q.mean! - q["Q0.05"]!) * scale : 0);
  }

  if (sites.length === 0) return <NoData message="No soil texture data for the selected sites." />;

  const data: Data[] = [
    {
      type: "bar",
      x: sites,
      y: clay,
      name: "Clay",
      marker: { color: COLORS.clay },
      error_y: { type: "data", array: errPlus, arrayminus: errMinus, visible: true },
    },
    { type: "bar", x: sites, y: silt, name: "Silt", marker: { color: COLORS.silt } },
    { type: "bar", x: sites, y: sand, name: "Sand", marker: { color: COLORS.sand } },
  ];
  return (
    <Chart
      title="Q4: Topsoil (0-5cm) Texture Composition w/ Uncertainty"
      data={data}
      layout={{ barmode: "stack", yaxis: { title: { text: "Percentage (%)" }, ticksuffix: "%" } }}
    />
  );
}
