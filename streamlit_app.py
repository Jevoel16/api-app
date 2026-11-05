import time
from datetime import date

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import requests
import streamlit as st

from core import http
from core.config import settings
from core.parsing import parse_soil, parse_weather
from core.pipeline import integrate, soil_params, soil_wide
from core.sources import DAILY_VARS, SITES, SOIL_URL, TIMEZONE
from core.sources import WEATHER_ARCHIVE_URL as WEATHER_URL

# ==============================================================================
# 1. CONFIGURATION & PAGE SETUP
# ==============================================================================

st.set_page_config(
    page_title="ITD112 Laboratory Exercise 1: API Integration",
    layout="wide",
)
st.title("Integrating APIs: Soil and Weather Data")
st.write("Inputs, request, response, parsing, joining, analysis — one step at a time.")

# The baseline keeps it simple: topsoil only, mean values only
SOIL_DEPTH = "0-5cm"

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
COLORS = {
    "sky": "#0F6E7A",
    "sky_pale": "#A5D8DD",
    "sun": "#D97706",
    "clay": "#B45309",
    "sand": "#FCD34D",
    "silt": "#9CA3AF",
}

# ==============================================================================
# 2. DEFINE INPUTS
# ==============================================================================

st.sidebar.header("Configuration")
chosen = st.sidebar.multiselect(
    "Sites",
    SITES["site"].tolist(),
    default=SITES["site"].tolist()[:3],
)
start = st.sidebar.date_input("Start date", date(2025, 1, 1))
end = st.sidebar.date_input("End date", date(2025, 12, 31))

fetch = st.sidebar.button("Run the integration", type="primary")

# ==============================================================================
# 3. REQUEST BUILDERS
# ==============================================================================

def full_url(url, params):
    """The exact URL that will be sent, with the query string encoded."""
    return requests.Request("GET", url, params=params).prepare().url

def build_weather_request(sites_df, start_date, end_date):
    """Open-Meteo accepts comma-separated coordinates, so one request covers every site."""
    params = {
        "latitude": ",".join(str(v) for v in sites_df["lat"]),
        "longitude": ",".join(str(v) for v in sites_df["lon"]),
        "start_date": str(start_date),
        "end_date": str(end_date),
        "daily": ",".join(DAILY_VARS),
        "timezone": TIMEZONE,
    }
    return {
        "api": "Open-Meteo",
        "label": "All sites",
        "url": WEATHER_URL,
        "params": params,
        "full_url": full_url(WEATHER_URL, params),
    }

def build_soil_request(site, lat, lon):
    """SoilGrids takes one point per request. 'property' repeats once per soil property."""
    params = soil_params(lat, lon, depths=[SOIL_DEPTH], values=["mean"])  # repeated keys
    return {
        "api": "SoilGrids",
        "label": site,
        "url": SOIL_URL,
        "params": params,
        "full_url": full_url(SOIL_URL, params),
    }

# ==============================================================================
# 4-6. SEND, PARSE, INTEGRATE
# The retrying HTTP client + disk cache (core/http.py), the JSON parsers
# (core/parsing.py) and the join/aggregate step (core/pipeline.py) are shared
# with the FastAPI backend, so both apps produce the same numbers.
# ==============================================================================

def send(req):
    """GET a built request through the shared cached client."""
    return http.send(req["url"], req["params"])

# ==============================================================================
# 7. CHART FUNCTIONS (Q1 - Q6)
# ==============================================================================

def chart_q1(daily):
    """Q1: Temperature progression over time (7-day rolling mean)."""
    df = daily.copy().sort_values("time")
    df["temp_rolling"] = (
        df.groupby("site")["temperature_2m_mean"]
        .transform(lambda s: s.rolling(7, min_periods=1).mean())
    )
    fig = px.line(
        df,
        x="time",
        y="temp_rolling",
        color="site",
        labels={"temp_rolling": "Temperature (°C)", "time": "Date"},
        title="Q1: Temperature Trend (7-day Rolling Mean)",
    )
    fig.update_layout(hovermode="x unified")
    return fig

def chart_q2(daily, site):
    """Q2: Monthly rainfall bars vs reference ET0 line on the same mm axis."""
    m = (
        daily[daily["site"] == site]
        .groupby("month")[["precipitation_sum", "et0_fao_evapotranspiration"]]
        .sum()
        .reindex(range(1, 13), fill_value=0)
    )
    deficit = m["precipitation_sum"] < m["et0_fao_evapotranspiration"]

    fig = go.Figure()
    fig.add_bar(
        x=MONTHS,
        y=m["precipitation_sum"],
        name="Rainfall",
        marker_color=np.where(deficit, COLORS["sky_pale"], COLORS["sky"]),
    )
    fig.add_scatter(
        x=MONTHS,
        y=m["et0_fao_evapotranspiration"],
        name="Reference ET0",
        mode="lines+markers",
        line=dict(color=COLORS["sun"], width=2.5),
    )
    fig.update_yaxes(title="mm per month", rangemode="tozero")
    fig.update_layout(title=f"Q2: Monthly Rainfall vs Evaporative Demand — {site}", barmode="overlay")
    return fig

def chart_q3(daily):
    """Q3: Daily rainfall variability across months."""
    df = daily.copy()
    df["month_name"] = df["month"].apply(lambda m: MONTHS[m - 1])
    return px.box(
        df,
        x="month_name",
        y="precipitation_sum",
        color="site",
        category_orders={"month_name": MONTHS},
        labels={"precipitation_sum": "Daily Rainfall (mm)", "month_name": "Month"},
        title="Q3: Daily Rainfall Distribution by Month",
    )

def chart_q4(summary):
    """Q4: Topsoil texture distribution (Normalized 100% stacked bar)."""
    tex = summary.set_index("site")[["sand", "silt", "clay"]].dropna()
    tex_norm = tex.div(tex.sum(axis=1), axis=0).mul(100).sort_values("clay").reset_index()

    fig = px.bar(
        tex_norm,
        x="site",
        y=["clay", "silt", "sand"],
        title="Q4: Topsoil Texture Composition (Normalized to 100%)",
        labels={"value": "Percentage (%)", "variable": "Fraction"},
        color_discrete_map={"clay": COLORS["clay"], "silt": COLORS["silt"], "sand": COLORS["sand"]},
    )
    fig.update_layout(barmode="stack", yaxis=dict(ticksuffix="%"))
    return fig

def chart_q5(summary):
    """Q5: Soil texture vs water balance moderating stress."""
    s = summary.dropna(subset=["clay", "water_balance_mm", "soc"])
    fig = go.Figure()

    if s.empty:
        fig.update_layout(title="Q5: Insufficient data for Water Stress chart")
        return fig

    max_soc = s["soc"].max() if s["soc"].max() > 0 else 1
    marker_sizes = 14 + 26 * (s["soc"] / max_soc)

    fig.add_scatter(
        x=s["clay"],
        y=s["water_balance_mm"],
        mode="markers+text",
        text=s["site"],
        textposition="top center",
        marker=dict(size=marker_sizes, color=COLORS["sky"]),
        name="Sites (Size = SOC)",
    )

    if len(s) >= 5:
        slope, intercept = np.polyfit(s["clay"], s["water_balance_mm"], 1)
        r = np.corrcoef(s["clay"], s["water_balance_mm"])[0, 1]
        xs = np.linspace(s["clay"].min(), s["clay"].max(), 50)
        fig.add_scatter(
            x=xs,
            y=slope * xs + intercept,
            mode="lines",
            line=dict(dash="dash", color=COLORS["sun"]),
            name=f"Linear fit (r = {r:.2f}, n = {len(s)})",
        )

    fig.add_hline(y=0, line_dash="dot", line_color="gray", annotation_text="Rainfall = ET0")
    fig.update_layout(
        title="Q5: Clay Content vs Net Water Balance",
        xaxis_title="Clay Fraction (%)",
        yaxis_title="Cumulative Water Balance (mm)",
    )
    return fig

def chart_q6(summary):
    """Q6: Geospatial overview sizing sites by rainfall and coloring by SOC."""
    s = summary.dropna(subset=["lat", "lon", "rain_mm", "soc"])
    
    if s.empty:
        return go.Figure().update_layout(title="Q6: No geospatial data available")
        
    center_lat = s["lat"].mean()
    center_lon = s["lon"].mean()
    
    try:
        return px.scatter_map(
            s,
            lat="lat",
            lon="lon",
            size="rain_mm",
            color="soc",
            hover_name="site",
            hover_data={"lat": False, "lon": False, "rain_mm": ":.1f", "soc": ":.1f"},
            color_continuous_scale="Viridis",
            zoom=7,
            center=dict(lat=center_lat, lon=center_lon),
            title="Q6: Spatial Distribution (Size = Rain mm, Color = SOC g/kg)",
        )
    except AttributeError:
        return px.scatter_mapbox(
            s,
            lat="lat",
            lon="lon",
            size="rain_mm",
            color="soc",
            hover_name="site",
            hover_data={"lat": False, "lon": False, "rain_mm": ":.1f", "soc": ":.1f"},
            color_continuous_scale="Viridis",
            zoom=7,
            center=dict(lat=center_lat, lon=center_lon),
            mapbox_style="carto-positron",
            title="Q6: Spatial Distribution (Size = Rain mm, Color = SOC g/kg)",
        )
        
# ==============================================================================
# 7. PAGE STYLING
# CSS + the process diagram
# ==============================================================================

def inject_page_styling():
    """Inject CSS to style containers, metrics, and cards according to lab theme."""
    st.markdown(
        """
        <style>
        /* Card & Metric Styling */
        div[data-testid="stMetricValue"] {
            font-size: 1.85rem;
            color: #0F6E7A;
            font-weight: 700;
        }
        
        /* Process Workflow Pipeline */
        .pipeline-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 1.2rem 0 2rem 0;
            justify-content: space-between;
        }
        .pipeline-card {
            flex: 1 1 150px;
            background: #F3F6F6;
            border-left: 4px solid #0F6E7A;
            border-radius: 6px;
            padding: 10px 14px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .pipeline-card .num {
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            color: #0F6E7A;
            letter-spacing: 0.05em;
        }
        .pipeline-card .title {
            font-size: 0.92rem;
            font-weight: 600;
            color: #1F2426;
            margin: 2px 0 3px 0;
        }
        .pipeline-card .desc {
            font-size: 0.75rem;
            color: #555E62;
            line-height: 1.35;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

def render_process_diagram():
    """Render the end-to-end integration workflow process diagram."""
    st.markdown(
        """
        <div class="pipeline-container">
            <div class="pipeline-card">
                <div class="num">Step 1</div>
                <div class="title">Define Inputs</div>
                <div class="desc">Select coordinates & dates</div>
            </div>
            <div class="pipeline-card">
                <div class="num">Step 2</div>
                <div class="title">Build Requests</div>
                <div class="desc">Batch weather & loop soil</div>
            </div>
            <div class="pipeline-card">
                <div class="num">Step 3</div>
                <div class="title">Send Defensively</div>
                <div class="desc">Timeout, retry, cache & 12s pause</div>
            </div>
            <div class="pipeline-card">
                <div class="num">Step 4</div>
                <div class="title">Parse JSON</div>
                <div class="desc">Scale values via <code>d_factor</code></div>
            </div>
            <div class="pipeline-card">
                <div class="num">Step 5</div>
                <div class="title">Integrate Data</div>
                <div class="desc">Left-join & derive water balance</div>
            </div>
            <div class="pipeline-card">
                <div class="num">Step 6</div>
                <div class="title">Analyse & Export</div>
                <div class="desc">Visualise Q1–Q6 & download CSVs</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    
# ==============================================================================
# 8. PIPELINE EXECUTION & UI RENDERING
# ==============================================================================

if "data_fetched" not in st.session_state:
    st.session_state.data_fetched = False

if fetch:
    # 1. Validation
    if not chosen:
        st.error("Please select at least one site.")
        st.stop()
    if start > end:
        st.error("Start date must be on or before the end date.")
        st.stop()

    active_sites = SITES[SITES["site"].isin(chosen)].reset_index(drop=True)

    # 2. Build requests
    weather_req = build_weather_request(active_sites, start, end)
    soil_reqs = [
        build_soil_request(r["site"], r["lat"], r["lon"])
        for _, r in active_sites.iterrows()
    ]

    # 3. Send requests defensively
    call_logs = []
    with st.spinner("Fetching data from Open-Meteo and SoilGrids..."):
        # Weather request
        try:
            w_res = send(weather_req)
        except http.UpstreamError as exc:
            st.error(f"Open-Meteo failed: {exc.message}")
            st.stop()
        call_logs.append({
            "API": "Open-Meteo",
            "Target": "All Sites",
            "Cache Hit": w_res.from_cache,
            "Status": "Cached" if w_res.from_cache else str(w_res.status),
        })

        # Soil requests
        soil_res = []
        for i, req in enumerate(soil_reqs):
            try:
                res = send(req)
            except http.UpstreamError as exc:
                st.error(
                    f"SoilGrids failed for {req['label']}: {exc.message}. The SoilGrids REST API "
                    "is a beta service and is sometimes paused. Try again later."
                )
                st.stop()
            soil_res.append(res)
            call_logs.append({
                "API": "SoilGrids",
                "Target": req["label"],
                "Cache Hit": res.from_cache,
                "Status": "Cached" if res.from_cache else str(res.status),
            })

            # Respect rate limit only on actual network calls
            if not res.from_cache and i < len(soil_reqs) - 1:
                time.sleep(settings.soilgrids_pause_s)

    # 4. Parse JSON
    weather_df = parse_weather(w_res.data, active_sites["site"])
    soil_audit_dfs = [
        parse_soil(res.data, req["label"], values=["mean"]) for res, req in zip(soil_res, soil_reqs)
    ]
    soil_long = pd.concat(soil_audit_dfs, ignore_index=True)

    # Check for unmapped coordinates/water bodies
    topsoil = soil_wide(soil_long, active_sites, depth=SOIL_DEPTH)
    missing = topsoil.loc[topsoil["clay"].isna(), "site"].tolist()

    # 5. Integrate & Derive
    daily, summary = integrate(weather_df, soil_long, active_sites)

    # 6. Save to session state
    st.session_state.daily = daily
    st.session_state.summary = summary
    st.session_state.call_logs = call_logs
    st.session_state.soil_long = soil_long
    st.session_state.active_sites = active_sites
    st.session_state.missing_soil = missing
    st.session_state.data_fetched = True

if not st.session_state.data_fetched:
    st.info("👈 Configure your sites and dates in the sidebar, then click **Run the integration**.")
    inject_page_styling()
    render_process_diagram()

else:
    daily = st.session_state.daily
    summary = st.session_state.summary
    call_logs = st.session_state.call_logs
    soil_long = st.session_state.soil_long
    active_sites = st.session_state.active_sites
    missing = st.session_state.missing_soil

    if missing:
        st.warning(
            f"SoilGrids returned null for: {', '.join(missing)}. The map has no "
            "value at that exact point (water, a built-up area, or a gap in the "
            "map). The request still succeeded; try moving the point slightly."
        )

    tab1, tab2, tab3, tab4 = st.tabs([
        "📊 Overview & Audit", 
        "🌤️ Weather Analysis", 
        "🌱 Soil & Geography", 
        "💾 Export"
    ])

    with tab1:
        st.subheader("Integration Overview")
        m1, m2, m3 = st.columns(3)
        m1.metric("Sites Selected", len(active_sites))
        m2.metric("Total Daily Observations", len(daily))
        m3.metric("Summary Records", len(summary))

        st.subheader("Response Status & Cache Audit")
        st.dataframe(pd.DataFrame(call_logs), width="stretch")

        st.subheader("Intermediate Auditable Tables")
        with st.expander("Soil Unit Normalization Audit Table"):
            st.dataframe(soil_long, width="stretch")
        with st.expander("Integrated Site Summary Table"):
            st.dataframe(summary, width="stretch")

    with tab2:
        st.subheader("Weather Analysis")
        st.plotly_chart(chart_q1(daily), width="stretch")

        site_choice = st.selectbox("Select site for Q2 Water Budget:", active_sites["site"].tolist())
        st.plotly_chart(chart_q2(daily, site_choice), width="stretch")

        st.plotly_chart(chart_q3(daily), width="stretch")

    with tab3:
        st.subheader("Soil & Geospatial Analysis")
        st.plotly_chart(chart_q4(summary), width="stretch")
        st.plotly_chart(chart_q5(summary), width="stretch")
        st.plotly_chart(chart_q6(summary), width="stretch")

    with tab4:
        st.subheader("Export Datasets")
        b1, b2, _ = st.columns([1, 1, 2])
        b1.download_button(
            "Download site summary (CSV)",
            summary.to_csv(index=False),
            "site_summary.csv",
            "text/csv",
            width="stretch",
        )
        b2.download_button(
            "Download daily records (CSV)",
            daily.drop(columns="month").to_csv(index=False),
            "integrated_daily.csv",
            "text/csv",
            width="stretch",
        )

    SOURCE_NOTE = (
        f"Sources: SoilGrids 2.0 (ISRIC, CC BY 4.0), {SOIL_DEPTH} mean; "
        "Open-Meteo Historical Weather API (CC BY 4.0)."
    )
    st.caption(SOURCE_NOTE)
