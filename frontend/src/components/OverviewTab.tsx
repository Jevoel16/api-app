import type { IntegrationResponse } from "@/lib/types";
import { Card } from "./charts/Chart";

const fmt = (v: number | null, digits = 1) => v?.toFixed(digits) ?? "—";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-[#0F6E7A] mt-1">{value}</p>
    </Card>
  );
}

function Table({ title, head, rows, scroll = false }: { title: string; head: string[]; rows: React.ReactNode[][]; scroll?: boolean }) {
  return (
    <Card>
      <h3 className="font-bold mb-4">{title}</h3>
      <div className={`overflow-x-auto ${scroll ? "max-h-64 overflow-y-auto" : ""}`}>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              {head.map((h) => (
                <th key={h} className="p-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, i) => (
              <tr key={i} className="border-b">
                {cells.map((c, j) => (
                  <td key={j} className="p-2">{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const pill = "px-2 py-1 rounded-full text-xs font-semibold";

export default function OverviewTab({ data }: { data: IntegrationResponse }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Sites Selected" value={data.active_sites.length} />
        <Stat label="Daily Observations" value={data.daily.length} />
        <Stat label="Soil Profile Rows" value={data.soil_long.length} />
      </div>

      <Table
        title="Response Status & Cache Audit"
        scroll
        head={["API Provider", "Target", "Status", "Cache", "Time (s)"]}
        rows={data.api_logs.map((log) => [
          <span key="p" className="font-medium">{log.provider}</span>,
          log.target,
          log.status === null ? (
            <span className={`${pill} bg-gray-100 text-gray-600`}>from cache</span>
          ) : (
            <span className={`${pill} bg-green-100 text-green-800`}>{log.status}</span>
          ),
          <span key="c" className={`${pill} ${log.cache === "Cached" ? "bg-[#0F6E7A] text-white" : "bg-gray-200 text-gray-700"}`}>
            {log.cache}
          </span>,
          `${log.time_s.toFixed(3)}s`,
        ])}
      />

      <Table
        title="Integrated Site Summary Table"
        head={["Site", "Rain (mm)", "ET0 (mm)", "Water Bal (mm)", "Temp (°C)", "Clay (%)", "pH", "SOC (g/kg)"]}
        rows={data.summary.map((s) => [
          s.site,
          fmt(s.rain_mm),
          fmt(s.et0_mm),
          fmt(s.water_balance_mm),
          fmt(s.temp_mean_c),
          fmt(s.clay),
          fmt(s.phh2o),
          fmt(s.soc),
        ])}
      />

      <Table
        title="Soil Unit Normalization Audit Table"
        scroll
        head={["Site", "Property", "Depth", "Raw (mapped units)", "÷ d_factor", "Mean", "Q0.05", "Q0.95", "Units"]}
        rows={data.soil_long.map((s) => [
          s.site,
          s.property,
          s.depth,
          s.raw_mean === null ? "—" : `${s.raw_mean} ${s.mapped_units ?? ""}`,
          s.d_factor,
          fmt(s.mean, 2),
          fmt(s["Q0.05"], 2),
          fmt(s["Q0.95"], 2),
          s.target_units ?? "",
        ])}
      />
    </div>
  );
}
