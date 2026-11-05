import { Play } from "lucide-react";
import type { Site } from "@/lib/types";

type SidebarProps = {
  sites: Site[];
  selected: string[];
  onToggleSite: (site: string) => void;
  startDate: string;
  endDate: string;
  onStartDate: (v: string) => void;
  onEndDate: (v: string) => void;
  loading: boolean;
  onRun: () => void;
};

export default function Sidebar(props: SidebarProps) {
  const { sites, selected, onToggleSite, startDate, endDate, onStartDate, onEndDate, loading, onRun } = props;
  return (
    <aside className="w-72 bg-white border-r p-6 flex flex-col gap-6 shadow-sm z-10 overflow-y-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-800">ITD112 API Integration</h1>
        <p className="text-xs text-gray-500 mt-1">FastAPI + Next.js</p>
      </div>

      <div className="space-y-4">
        <fieldset>
          <legend className="block text-sm font-semibold mb-2">Sites</legend>
          {sites.length === 0 && <p className="text-sm text-gray-400">Loading sites…</p>}
          <div className="space-y-2">
            {sites.map(({ site }) => (
              <label key={site} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(site)}
                  onChange={() => onToggleSite(site)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                {site}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="block text-sm font-semibold mb-2">Start Date</span>
          <input type="date" value={startDate} onChange={(e) => onStartDate(e.target.value)} className="w-full p-2 border rounded text-sm" />
        </label>

        <label className="block">
          <span className="block text-sm font-semibold mb-2">End Date</span>
          <input type="date" value={endDate} onChange={(e) => onEndDate(e.target.value)} className="w-full p-2 border rounded text-sm" />
        </label>

        <button
          onClick={onRun}
          disabled={loading || sites.length === 0}
          className="w-full py-2.5 bg-[#0F6E7A] hover:bg-sky-800 text-white rounded font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? <span className="animate-spin">⌛</span> : <Play size={18} />}
          {loading ? "Running..." : "Run Integration"}
        </button>
      </div>
    </aside>
  );
}
