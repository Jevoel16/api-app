import type { Data } from "plotly.js";
import { byTime, rollingMean } from "@/lib/stats";
import { COLORS } from "@/lib/theme";
import type { DailyRecord, Site } from "@/lib/types";
import Chart from "./Chart";

/** Q1: 7-day rolling mean temperature per site, forecast dashed. */
export default function TemperatureTrend({ daily, sites }: { daily: DailyRecord[]; sites: Site[] }) {
  const traces: Data[] = [];
  for (const { site } of sites) {
    for (const forecast of [false, true]) {
      const rows = daily.filter((d) => d.site === site && d.is_forecast === forecast).sort(byTime);
      if (rows.length === 0) continue;
      traces.push({
        x: rows.map((d) => d.time),
        y: rollingMean(rows.map((d) => d.temperature_2m_mean)),
        mode: "lines",
        name: forecast ? `${site} (Forecast)` : site,
        ...(forecast && { line: { dash: "dash", color: COLORS.forecast } }),
      });
    }
  }
  return (
    <Chart
      title="Q1: Temperature Trend (7-day Rolling Mean, with Forecasts)"
      data={traces}
      layout={{ hovermode: "x unified", yaxis: { title: { text: "Temperature (°C)" } } }}
    />
  );
}
