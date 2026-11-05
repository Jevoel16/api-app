import type { Data } from "plotly.js";
import { MONTHS } from "@/lib/theme";
import type { DailyRecord, Site } from "@/lib/types";
import Chart from "./Chart";

/** Q3: box plot of daily rainfall per month, grouped by site. */
export default function RainfallDistribution({ daily, sites }: { daily: DailyRecord[]; sites: Site[] }) {
  const traces: Data[] = sites.map(({ site }) => {
    const rows = daily.filter((d) => d.site === site && !d.is_forecast);
    return {
      type: "box",
      y: rows.map((d) => d.precipitation_sum),
      x: rows.map((d) => MONTHS[d.month - 1]),
      name: site,
    };
  });
  return (
    <Chart
      title="Q3: Daily Rainfall Distribution by Month"
      data={traces}
      layout={{ boxmode: "group", yaxis: { title: { text: "Daily Rainfall (mm)" } } }}
    />
  );
}
