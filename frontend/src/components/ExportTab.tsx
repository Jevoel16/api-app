import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import type { IntegrationResponse } from "@/lib/types";

const EXPORTS = [
  { label: "Site Summary", file: "site_summary.csv", rows: (d: IntegrationResponse) => d.summary },
  { label: "Daily Records", file: "integrated_daily.csv", rows: (d: IntegrationResponse) => d.daily },
  { label: "Soil Profile", file: "soil_profile.csv", rows: (d: IntegrationResponse) => d.soil_long },
];

export default function ExportTab({ data }: { data: IntegrationResponse }) {
  return (
    <div className="flex flex-wrap gap-4">
      {EXPORTS.map((e) => (
        <button
          key={e.file}
          onClick={() => downloadCsv(e.rows(data), e.file)}
          className="px-6 py-3 bg-[#0F6E7A] hover:bg-sky-800 text-white rounded font-medium flex items-center gap-2"
        >
          <Download size={18} /> Download {e.label} (CSV)
        </button>
      ))}
    </div>
  );
}
