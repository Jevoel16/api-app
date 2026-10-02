# ITD112 Laboratory Exercise 1: API Integration

This repository contains two complete versions of a web application that integrates weather data from the **Open-Meteo API** and soil properties from the **SoilGrids REST API**. 

You can choose to run the **Baseline Version** (a lightweight Streamlit monolith) or the **Advanced Version** (a full-stack FastAPI + Next.js architecture).

---

## 🟢 Option 1: The Baseline Version (Streamlit)
The original monolithic application built entirely in Python using Streamlit. 

### Features
- Integrates static topsoil data (0-5cm) with daily weather metrics.
- Provides interactive Plotly visualizations (temperature trends, monthly water budgets, geospatial distribution).
- Handles API rate-limiting and persistent disk caching automatically.

### How to Run
1. Activate your virtual environment (if applicable):
   ```bash
   .venv\Scripts\activate
   ```
2. Install the base requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the application:
   ```bash
   streamlit run streamlit_app.py
   ```

---

## 🚀 Option 2: The Advanced Full-Stack Version
A complete architectural overhaul that splits the data pipeline into a **FastAPI backend** and a modern **Next.js frontend**.

### Advanced Challenge Features
- **A Depth Dimension:** Queries SoilGrids at `0-5cm`, `5-15cm`, and `15-30cm` intervals to visualize how soil texture changes down the profile.
- **Weather Forecasts:** Seamlessly combines historical archive data with the 16-day Open-Meteo forecast.
- **Uncertainty Tracking:** Fetches `Q0.05` and `Q0.95` statistical percentiles from SoilGrids, visualizing the platform's confidence intervals via error bars.
- **Data Export:** Generate and download raw CSV datasets directly from the browser.

### How to Run
Because the application is split, you must run both the backend and frontend simultaneously in separate terminal windows.

**Terminal 1: Start the Backend (FastAPI)**
```bash
.venv\Scripts\activate
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Terminal 2: Start the Frontend (Next.js)**
```bash
cd frontend
npm install
npm run dev
```
*Once both are running, open http://localhost:3000 in your browser.*

---

## 📚 APIs Used
- [Open-Meteo API](https://open-meteo.com/) (Historical & Forecast endpoints)
- [SoilGrids v2.0 REST API (ISRIC)](https://rest.isric.org/)

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
