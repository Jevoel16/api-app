"use client";

import React, { useState, useMemo } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { Play, Download, Table as TableIcon, CloudRain, Map, BarChart3, AlertTriangle } from 'lucide-react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-gray-400">Loading Chart...</div> });

const SITES_LIST = ["Iligan City", "Malaybalay", "Valencia", "Davao (Calinan)", "General Santos"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = {
  sky: "#0F6E7A",
  sky_pale: "#A5D8DD",
  sun: "#D97706",
  clay: "#B45309",
  sand: "#FCD34D",
  silt: "#9CA3AF",
  forecast: "#E11D48"
};

export default function Dashboard() {
  const [selectedSites, setSelectedSites] = useState<string[]>(["Iligan City", "Malaybalay", "Valencia"]);
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [q2Site, setQ2Site] = useState("");

  const handleRun = async () => {
    if (selectedSites.length === 0) return alert("Select at least one site");
    if (startDate > endDate) return alert("Start date must be before end date");
    
    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/integrate", {
        sites: selectedSites,
        start_date: startDate,
        end_date: endDate
      });
      setData(res.data);
      if (res.data.active_sites.length > 0) {
        setQ2Site(res.data.active_sites[0].site);
      }
      setActiveTab("overview");
    } catch (err) {
      console.error(err);
      alert("Failed to fetch data from backend. Is FastAPI running?");
    } finally {
      setLoading(false);
    }
  };

  const handleSiteToggle = (site: string) => {
    setSelectedSites(prev => 
      prev.includes(site) ? prev.filter(s => s !== site) : [...prev, site]
    );
  };

  const downloadCSV = (dataArr: any[], filename: string) => {
    if (!dataArr || dataArr.length === 0) return;
    const keys = Object.keys(dataArr[0]);
    const csvContent = [
      keys.join(","),
      ...dataArr.map(row => keys.map(k => `"${row[k] !== null && row[k] !== undefined ? row[k] : ''}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const missingSites = useMemo(() => {
    if (!data) return [];
    return data.summary.filter((s: any) => s.clay == null).map((s: any) => s.site);
  }, [data]);


  // ==========================================
  // STEP 5: Chart Rendering Logic (Q1-Q6)
  // ==========================================
  const renderQ1 = () => {
    if (!data) return null;
    const lines: any[] = [];
    
    data.active_sites.forEach((siteObj: any) => {
      const site = siteObj.site;
      const siteData = data.daily.filter((d: any) => d.site === site && !d.is_forecast).sort((a:any, b:any) => new Date(a.time).getTime() - new Date(b.time).getTime());
      
      const y = siteData.map((d: any, idx: number, arr: any[]) => {
        const start = Math.max(0, idx - 6);
        const window = arr.slice(start, idx + 1);
        return window.reduce((sum, v) => sum + v.temperature_2m_mean, 0) / window.length;
      });

      lines.push({
        x: siteData.map((d: any) => d.time),
        y: y,
        mode: 'lines',
        name: site,
      });

      const forecastData = data.daily.filter((d: any) => d.site === site && d.is_forecast).sort((a:any, b:any) => new Date(a.time).getTime() - new Date(b.time).getTime());
      if (forecastData.length > 0) {
         const yF = forecastData.map((d: any, idx: number, arr: any[]) => {
            const start = Math.max(0, idx - 6);
            const window = arr.slice(start, idx + 1);
            return window.reduce((sum, v) => sum + v.temperature_2m_mean, 0) / window.length;
         });
         lines.push({
            x: forecastData.map((d: any) => d.time),
            y: yF,
            mode: 'lines',
            line: { dash: 'dash', color: COLORS.forecast },
            name: `${site} (Forecast)`,
         });
      }
    });

    return <Plot data={lines} layout={{ title: { text: "Q1: Temperature Trend (7-day Rolling Mean, with Forecasts)" }, hovermode: "x unified", autosize: true, margin: { t: 60 } }} useResizeHandler className="w-full h-96" />;
  };

  const renderQ2 = () => {
    if (!data || !q2Site) return null;
    
    const siteData = data.daily.filter((d: any) => d.site === q2Site && !d.is_forecast);
    const mRain = Array(12).fill(0);
    const mEt0 = Array(12).fill(0);
    
    siteData.forEach((d: any) => {
      const mIdx = d.month - 1;
      mRain[mIdx] += d.precipitation_sum || 0;
      mEt0[mIdx] += d.et0_fao_evapotranspiration || 0;
    });

    const colors = mRain.map((rain, i) => rain < mEt0[i] ? COLORS.sky_pale : COLORS.sky);

    return (
      <div className="space-y-2">
        <select value={q2Site} onChange={e => setQ2Site(e.target.value)} className="p-2 border rounded font-medium">
          {data.active_sites.map((s: any) => <option key={s.site} value={s.site}>{s.site}</option>)}
        </select>
        <Plot 
          data={[
            { type: 'bar', x: MONTHS, y: mRain, name: "Rainfall", marker: { color: colors } },
            { type: 'scatter', mode: 'lines+markers', x: MONTHS, y: mEt0, name: "Reference ET0", line: { color: COLORS.sun, width: 2.5 } }
          ]} 
          layout={{ title: { text: `Q2: Monthly Rainfall vs Evaporative Demand — ${q2Site}` }, barmode: "overlay", yaxis: { rangemode: "tozero", title: "mm per month" }, autosize: true, margin: { t: 60 } }} 
          useResizeHandler className="w-full h-96" 
        />
      </div>
    );
  };

  const renderQ3 = () => {
    if (!data) return null;
    const boxes: any[] = [];
    data.active_sites.forEach((siteObj: any) => {
      const site = siteObj.site;
      const siteData = data.daily.filter((d: any) => d.site === site && !d.is_forecast);
      boxes.push({
        type: 'box',
        y: siteData.map((d: any) => d.precipitation_sum),
        x: siteData.map((d: any) => MONTHS[d.month - 1]),
        name: site,
      });
    });
    return <Plot data={boxes} layout={{ title: { text: "Q3: Daily Rainfall Distribution by Month" }, boxmode: 'group', yaxis: { title: "Daily Rainfall (mm)" }, autosize: true, margin: { t: 60 } }} useResizeHandler className="w-full h-96" />;
  };

  const renderQ4 = () => {
    if (!data) return null;
    
    const clay: any = { x: [], y: [], error_y: { type: 'data', array: [], arrayminus: [], visible: true }, name: 'Clay', type: 'bar', marker: {color: COLORS.clay} };
    const silt: any = { x: [], y: [], name: 'Silt', type: 'bar', marker: {color: COLORS.silt} };
    const sand: any = { x: [], y: [], name: 'Sand', type: 'bar', marker: {color: COLORS.sand} };

    data.summary.forEach((s: any) => {
      const sum = (s.clay || 0) + (s.silt || 0) + (s.sand || 0);
      if (sum === 0) return;
      
      clay.x.push(s.site); clay.y.push((s.clay / sum) * 100);
      silt.x.push(s.site); silt.y.push((s.silt / sum) * 100);
      sand.x.push(s.site); sand.y.push((s.sand / sum) * 100);
      
      const clayData = data.soil_long.find((r:any) => r.site === s.site && r.property === "clay" && r.depth === "0-5cm");
      if (clayData && clayData['Q0.95'] && clayData['Q0.05']) {
         clay.error_y.array.push( ((clayData['Q0.95'] - clayData['mean']) / sum) * 100 );
         clay.error_y.arrayminus.push( ((clayData['mean'] - clayData['Q0.05']) / sum) * 100 );
      } else {
         clay.error_y.array.push(0); clay.error_y.arrayminus.push(0);
      }
    });

    return <Plot data={[clay, silt, sand]} layout={{ title: { text: "Q4: Topsoil (0-5cm) Texture Composition w/ Uncertainty" }, barmode: 'stack', yaxis: { title: "Percentage (%)" }, autosize: true, margin: { t: 60 } }} useResizeHandler className="w-full h-96" />;
  };

  const renderQ4Depth = () => {
     if (!data) return null;
     const site = q2Site || data.active_sites[0].site;
     const depths = ["0-5cm", "5-15cm", "15-30cm"];
     const properties = ["clay", "silt", "sand"];
     
     const traces = properties.map(p => {
        return {
           x: depths,
           y: depths.map(d => {
              const r = data.soil_long.find((row:any) => row.site === site && row.property === p && row.depth === d);
              return r ? r.mean : 0;
           }),
           name: p.charAt(0).toUpperCase() + p.slice(1),
           type: 'scatter',
           mode: 'lines+markers',
           line: { color: COLORS[p as keyof typeof COLORS] }
        };
     });

     return <Plot data={traces} layout={{ title: { text: `Depth Profile: Texture Changes (${site})` }, yaxis: { title: "Mean Value" }, autosize: true, margin: { t: 60 } }} useResizeHandler className="w-full h-96" />;
  };

  const renderQ5 = () => {
    if (!data) return null;
    const sData = data.summary.filter((s:any) => s.clay != null && s.water_balance_mm != null && s.soc != null);
    if(sData.length === 0) return <div>Insufficient data</div>;

    const maxSoc = Math.max(...sData.map((s:any) => s.soc));
    
    return <Plot 
      data={[{
        x: sData.map((s:any) => s.clay),
        y: sData.map((s:any) => s.water_balance_mm),
        mode: 'markers+text',
        text: sData.map((s:any) => s.site),
        textposition: 'top center',
        marker: { size: sData.map((s:any) => 14 + 26 * (s.soc / maxSoc)), color: COLORS.sky },
        name: "Sites"
      }]} 
      layout={{ title: { text: "Q5: Clay Content vs Net Water Balance" }, xaxis: {title: "Clay"}, yaxis: {title: "Water Balance (mm)"}, autosize: true, margin: { t: 60 } }} 
      useResizeHandler className="w-full h-96" 
    />;
  };

  const renderQ6 = () => {
    if (!data) return null;
    const sData = data.summary.filter((s:any) => s.lat != null && s.lon != null);
    if(sData.length === 0) return <div>No geo data</div>;
    
    const center_lat = sData.reduce((sum:number, s:any) => sum + s.lat, 0) / sData.length;
    const center_lon = sData.reduce((sum:number, s:any) => sum + s.lon, 0) / sData.length;
    
    const maxRain = Math.max(...sData.map((s:any) => s.rain_mm || 1));

    return <Plot
      data={[{
        type: 'scattergeo',
        lat: sData.map((s:any) => s.lat),
        lon: sData.map((s:any) => s.lon),
        mode: 'markers',
        marker: {
          size: sData.map((s:any) => 10 + ((s.rain_mm / maxRain) * 40)),
          color: sData.map((s:any) => s.soc),
          colorscale: 'Viridis',
          showscale: true
        },
        text: sData.map((s:any) => `${s.site} (Rain: ${s.rain_mm?.toFixed(1)}, SOC: ${s.soc?.toFixed(1)})`),
        hoverinfo: 'text'
      }]}
      layout={{
        title: { text: "Q6: Spatial Distribution" },
        geo: {
          scope: 'asia',
          resolution: 50,
          showland: true,
          landcolor: 'rgb(243, 243, 243)',
          showcountries: true,
          center: { lat: center_lat, lon: center_lon },
          projection: { type: 'mercator', scale: 10 }
        },
        autosize: true,
        margin: { l: 0, r: 0, t: 60, b: 0 }
      }}
      useResizeHandler className="w-full h-96"
    />;
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="w-72 bg-white border-r p-6 flex flex-col gap-6 shadow-sm z-10 overflow-y-auto">
        <div>
          <h1 className="text-xl font-bold text-gray-800">ITD112 API Integration</h1>
          <p className="text-xs text-gray-500 mt-1">FastAPI + Next.js</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Sites</label>
            <div className="space-y-2">
              {SITES_LIST.map(site => (
                <label key={site} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={selectedSites.includes(site)} onChange={() => handleSiteToggle(site)} className="rounded text-sky-600 focus:ring-sky-500" />
                  {site}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded text-sm" />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded text-sm" />
          </div>

          <button 
            onClick={handleRun}
            disabled={loading}
            className="w-full py-2.5 bg-[#0F6E7A] hover:bg-sky-800 text-white rounded font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <span className="animate-spin">⌛</span> : <Play size={18} />}
            {loading ? "Running..." : "Run Integration"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!data && !loading && (
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-center max-w-lg">
              <div className="w-16 h-16 bg-[#A5D8DD] rounded-full flex items-center justify-center mx-auto mb-4 text-[#0F6E7A]">
                <TableIcon size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Configure & Run</h2>
              <p className="text-gray-500">Select your parameters in the sidebar to fetch historical and forecast data from Open-Meteo, and multi-depth uncertainty data from SoilGrids.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-[#0F6E7A] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-medium">Integrating Data Pipelines...</p>
            </div>
          </div>
        )}

        {data && !loading && (
          <>
            {missingSites.length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 m-4 flex items-start gap-3">
                <AlertTriangle className="text-yellow-500 mt-0.5" size={20} />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">
                    SoilGrids returned null for: {missingSites.join(', ')}.
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    The map has no value at that exact point (water, a built-up area, or a gap in the map). The request still succeeded; try moving the point slightly.
                  </p>
                </div>
              </div>
            )}
            
            <div className="bg-white border-b px-6 flex gap-6">
              {[
                { id: "overview", label: "Overview & Audit", icon: TableIcon },
                { id: "weather", label: "Weather Forecast", icon: CloudRain },
                { id: "soil", label: "Soil & Depths", icon: Map },
                { id: "export", label: "Export", icon: Download },
              ].map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors ${activeTab === t.id ? 'border-[#0F6E7A] text-[#0F6E7A]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Sites Selected</p>
                      <p className="text-3xl font-bold text-[#0F6E7A] mt-1">{data.active_sites.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Daily Observations</p>
                      <p className="text-3xl font-bold text-[#0F6E7A] mt-1">{data.daily.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                      <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Soil Profile Rows</p>
                      <p className="text-3xl font-bold text-[#0F6E7A] mt-1">{data.soil_long.length}</p>
                    </div>
                  </div>
                  
                  {data.api_logs && (
                    <div className="bg-white p-4 rounded-lg shadow-sm border overflow-x-auto">
                      <h3 className="font-bold mb-4">Response Status & Cache Audit</h3>
                      <div className="max-h-64 overflow-y-auto">
                         <table className="w-full text-sm text-left">
                           <thead className="bg-gray-50 border-b sticky top-0">
                             <tr>
                               <th className="p-2">API Provider</th>
                               <th className="p-2">Target</th>
                               <th className="p-2">Status</th>
                               <th className="p-2">Cache</th>
                               <th className="p-2">Time (s)</th>
                             </tr>
                           </thead>
                           <tbody>
                             {data.api_logs.map((log: any, idx: number) => (
                               <tr key={idx} className="border-b">
                                 <td className="p-2 font-medium">{log.provider}</td>
                                 <td className="p-2">{log.target}</td>
                                 <td className="p-2">
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">{log.status}</span>
                                 </td>
                                 <td className="p-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.cache === 'Cached' ? 'bg-[#0F6E7A] text-white' : 'bg-gray-200 text-gray-700'}`}>
                                      {log.cache}
                                    </span>
                                 </td>
                                 <td className="p-2">{log.time_s.toFixed(3)}s</td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                      </div>
                    </div>
                  )}

                  <div className="bg-white p-4 rounded-lg shadow-sm border overflow-x-auto">
                    <h3 className="font-bold mb-4">Integrated Site Summary Table</h3>
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="p-2">Site</th>
                          <th className="p-2">Rain (mm)</th>
                          <th className="p-2">Water Bal (mm)</th>
                          <th className="p-2">Clay (0-5cm)</th>
                          <th className="p-2">SOC (0-5cm)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.summary.map((s: any) => (
                          <tr key={s.site} className="border-b">
                            <td className="p-2">{s.site}</td>
                            <td className="p-2">{s.rain_mm?.toFixed(1)}</td>
                            <td className="p-2">{s.water_balance_mm?.toFixed(1)}</td>
                            <td className="p-2">{s.clay?.toFixed(1)}</td>
                            <td className="p-2">{s.soc?.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm border overflow-x-auto">
                    <h3 className="font-bold mb-4">Soil Unit Normalization Audit Table</h3>
                    <div className="max-h-64 overflow-y-auto">
                       <table className="w-full text-sm text-left">
                         <thead className="bg-gray-50 border-b sticky top-0">
                           <tr>
                             <th className="p-2">Site</th>
                             <th className="p-2">Property</th>
                             <th className="p-2">Depth</th>
                             <th className="p-2">Mean</th>
                             <th className="p-2">Q0.05</th>
                             <th className="p-2">Q0.95</th>
                           </tr>
                         </thead>
                         <tbody>
                           {data.soil_long.map((s: any, idx: number) => (
                             <tr key={idx} className="border-b">
                               <td className="p-2">{s.site}</td>
                               <td className="p-2">{s.property}</td>
                               <td className="p-2">{s.depth}</td>
                               <td className="p-2">{s.mean?.toFixed(2)}</td>
                               <td className="p-2">{s['Q0.05']?.toFixed(2)}</td>
                               <td className="p-2">{s['Q0.95']?.toFixed(2)}</td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    </div>
                  </div>

                </div>
              )}

              {activeTab === "weather" && (
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm border">{renderQ1()}</div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">{renderQ2()}</div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">{renderQ3()}</div>
                </div>
              )}

              {activeTab === "soil" && (
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm border">{renderQ4()}</div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">{renderQ4Depth()}</div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">{renderQ5()}</div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">{renderQ6()}</div>
                </div>
              )}

              {activeTab === "export" && (
                <div className="flex gap-4">
                   <button onClick={() => downloadCSV(data.summary, "site_summary.csv")} className="px-6 py-3 bg-[#0F6E7A] hover:bg-sky-800 text-white rounded font-medium flex items-center gap-2">
                     <Download size={18} /> Download Site Summary (CSV)
                   </button>
                   <button onClick={() => downloadCSV(data.daily, "integrated_daily.csv")} className="px-6 py-3 bg-[#0F6E7A] hover:bg-sky-800 text-white rounded font-medium flex items-center gap-2">
                     <Download size={18} /> Download Daily Records (CSV)
                   </button>
                </div>
              )}
              
              <div className="mt-8 pt-4 border-t text-center">
                 <p className="text-xs text-gray-500">
                    Sources: SoilGrids 2.0 (ISRIC, CC BY 4.0), 0-5cm, 5-15cm, 15-30cm depths; Open-Meteo Historical Weather API (CC BY 4.0).
                 </p>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
