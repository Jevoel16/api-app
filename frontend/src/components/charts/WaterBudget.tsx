import { monthlyTotals } from "@/lib/stats";
import { COLORS, MONTHS } from "@/lib/theme";
import type { DailyRecord } from "@/lib/types";
import Chart from "./Chart";

/** Q2: monthly rainfall bars (pale = deficit month) against reference ET0 for one site. */
export default function WaterBudget({ daily, site }: { daily: DailyRecord[]; site: string }) {
  const rows = daily.filter((d) => d.site === site && !d.is_forecast);
  const rain = monthlyTotals(rows, (d) => d.precipitation_sum);
  const et0 = monthlyTotals(rows, (d) => d.et0_fao_evapotranspiration);

  return (
    <Chart
      title={`Q2: Monthly Rainfall vs Evaporative Demand — ${site}`}
      data={[
        {
          type: "bar",
          x: MONTHS,
          y: rain,
          name: "Rainfall",
          marker: { color: rain.map((r, i) => (r < et0[i] ? COLORS.sky_pale : COLORS.sky)) },
        },
        {
          type: "scatter",
          mode: "lines+markers",
          x: MONTHS,
          y: et0,
          name: "Reference ET0",
          line: { color: COLORS.sun, width: 2.5 },
        },
      ]}
      layout={{ barmode: "overlay", yaxis: { rangemode: "tozero", title: { text: "mm per month" } } }}
    />
  );
}
