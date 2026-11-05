import { COLORS } from "@/lib/theme";
import type { SummaryRow } from "@/lib/types";
import Chart, { NoData } from "./Chart";

/** Q5: clay content vs cumulative water balance; marker size = soil organic carbon. */
export default function ClayVsWaterBalance({ summary }: { summary: SummaryRow[] }) {
  const rows = summary.filter((s) => s.clay !== null && s.water_balance_mm !== null && s.soc !== null);
  if (rows.length === 0) return <NoData message="Not enough soil and weather data for this chart." />;

  const maxSoc = Math.max(...rows.map((s) => s.soc!)) || 1;
  return (
    <Chart
      title="Q5: Clay Content vs Net Water Balance"
      data={[
        {
          type: "scatter",
          mode: "markers+text",
          x: rows.map((s) => s.clay),
          y: rows.map((s) => s.water_balance_mm),
          text: rows.map((s) => s.site),
          textposition: "top center",
          marker: { size: rows.map((s) => 14 + 26 * (s.soc! / maxSoc)), color: COLORS.sky },
          name: "Sites (size = SOC)",
        },
      ]}
      layout={{
        xaxis: { title: { text: "Clay (%)" } },
        yaxis: { title: { text: "Cumulative Water Balance (mm)" } },
      }}
    />
  );
}
