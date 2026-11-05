import type { SummaryRow } from "@/lib/types";
import Chart, { NoData } from "./Chart";

/** Q6: sites on a map, sized by total rainfall and coloured by soil organic carbon. */
export default function SpatialDistribution({ summary }: { summary: SummaryRow[] }) {
  if (summary.length === 0) return <NoData message="No sites to map." />;

  const centerLat = summary.reduce((sum, s) => sum + s.lat, 0) / summary.length;
  const centerLon = summary.reduce((sum, s) => sum + s.lon, 0) / summary.length;
  const maxRain = Math.max(...summary.map((s) => s.rain_mm ?? 0)) || 1;

  return (
    <Chart
      title="Q6: Spatial Distribution (size = rain mm, colour = SOC g/kg)"
      data={[
        {
          type: "scattergeo",
          lat: summary.map((s) => s.lat),
          lon: summary.map((s) => s.lon),
          mode: "markers",
          marker: {
            size: summary.map((s) => 10 + ((s.rain_mm ?? 0) / maxRain) * 40),
            color: summary.map((s) => s.soc),
            colorscale: "Viridis",
            showscale: true,
          },
          text: summary.map(
            (s) => `${s.site} (Rain: ${s.rain_mm?.toFixed(1) ?? "n/a"} mm, SOC: ${s.soc?.toFixed(1) ?? "n/a"} g/kg)`,
          ),
          hoverinfo: "text",
        },
      ]}
      layout={{
        geo: {
          scope: "asia",
          resolution: 50,
          showland: true,
          landcolor: "rgb(243, 243, 243)",
          showcountries: true,
          center: { lat: centerLat, lon: centerLon },
          projection: { type: "mercator", scale: 10 },
        },
        margin: { l: 0, r: 0, t: 60, b: 0 },
      }}
    />
  );
}
