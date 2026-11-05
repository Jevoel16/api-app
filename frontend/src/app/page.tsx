"use client";

import { useEffect, useMemo, useState } from "react";
import { CloudRain, Download, Map as MapIcon, Table as TableIcon } from "lucide-react";
import { ErrorBanner, MissingSoilBanner } from "@/components/Banners";
import ExportTab from "@/components/ExportTab";
import OverviewTab from "@/components/OverviewTab";
import Sidebar from "@/components/Sidebar";
import SoilTab from "@/components/SoilTab";
import WeatherTab from "@/components/WeatherTab";
import { ApiError, fetchSites, integrate } from "@/lib/api";
import type { IntegrationResponse, Site } from "@/lib/types";

const TABS = [
  { id: "overview", label: "Overview & Audit", icon: TableIcon },
  { id: "weather", label: "Weather Forecast", icon: CloudRain },
  { id: "soil", label: "Soil & Depths", icon: MapIcon },
  { id: "export", label: "Export", icon: Download },
] as const;
type TabId = (typeof TABS)[number]["id"];

const message = (err: unknown) => (err instanceof ApiError ? err.message : "Unexpected error. See the browser console.");

export default function Dashboard() {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<IntegrationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [focusSite, setFocusSite] = useState("");

  // The backend owns the site list, so the UI never drifts from it
  useEffect(() => {
    fetchSites()
      .then((list) => {
        setSites(list);
        setSelectedSites(list.slice(0, 3).map((s) => s.site));
      })
      .catch((err) => {
        console.error(err);
        setError(message(err));
      });
  }, []);

  const handleRun = async () => {
    if (selectedSites.length === 0) return setError("Select at least one site.");
    if (startDate > endDate) return setError("Start date must be on or before the end date.");

    setLoading(true);
    setError(null);
    try {
      const res = await integrate({ sites: selectedSites, start_date: startDate, end_date: endDate });
      setData(res);
      setFocusSite(res.active_sites[0]?.site ?? "");
      setActiveTab("overview");
    } catch (err) {
      console.error(err);
      setError(message(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleSite = (site: string) =>
    setSelectedSites((prev) => (prev.includes(site) ? prev.filter((s) => s !== site) : [...prev, site]));

  const missingSites = useMemo(() => data?.summary.filter((s) => s.clay === null).map((s) => s.site) ?? [], [data]);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar
        sites={sites}
        selected={selectedSites}
        onToggleSite={toggleSite}
        startDate={startDate}
        endDate={endDate}
        onStartDate={setStartDate}
        onEndDate={setEndDate}
        loading={loading}
        onRun={handleRun}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {!data && !loading && (
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-center max-w-lg">
              <div className="w-16 h-16 bg-[#A5D8DD] rounded-full flex items-center justify-center mx-auto mb-4 text-[#0F6E7A]">
                <TableIcon size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Configure & Run</h2>
              <p className="text-gray-500">
                Select your parameters in the sidebar to fetch historical and forecast data from Open-Meteo, and
                multi-depth uncertainty data from SoilGrids.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-[#0F6E7A] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-medium">Integrating Data Pipelines...</p>
              <p className="text-xs text-gray-400 mt-1">Live SoilGrids calls are paced 12 s apart.</p>
            </div>
          </div>
        )}

        {data && !loading && (
          <>
            {missingSites.length > 0 && <MissingSoilBanner sites={missingSites} />}

            <nav className="bg-white border-b px-6 flex gap-6">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors ${activeTab === t.id ? "border-[#0F6E7A] text-[#0F6E7A]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
                >
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {activeTab === "overview" && <OverviewTab data={data} />}
              {activeTab === "weather" && <WeatherTab data={data} focusSite={focusSite} onFocusSite={setFocusSite} />}
              {activeTab === "soil" && <SoilTab data={data} focusSite={focusSite} onFocusSite={setFocusSite} />}
              {activeTab === "export" && <ExportTab data={data} />}

              <footer className="mt-8 pt-4 border-t text-center">
                <p className="text-xs text-gray-500">
                  Sources: SoilGrids 2.0 (ISRIC, CC BY 4.0), 0-5cm, 5-15cm, 15-30cm depths; Open-Meteo Historical
                  Weather and Forecast APIs (CC BY 4.0).
                </p>
              </footer>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
