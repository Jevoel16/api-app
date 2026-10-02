# ITD112 Laboratory Exercise 1: API Integration

A modern Streamlit web application that integrates weather data from the **Open-Meteo Historical Weather API** and soil properties from the **SoilGrids REST API**.

## Features
- **Geospatial & Time-Series Integration:** Combines static soil data with daily weather metrics.
- **Interactive Visualizations:** Includes temperature trends, monthly water budgets, daily rainfall distributions, and a geospatial map highlighting soil organic carbon (SOC) and rainfall.
- **Caching & Defensiveness:** Built-in rate-limit handling, persistent disk caching, and retry logic.
- **Data Export:** Easily download integrated daily and summary datasets as CSV files.

## Installation & Setup

1. **Clone or Download the Repository**
2. **Activate your virtual environment** (if you have one set up):
   ```bash
   .venv\Scripts\activate
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the application**:
   ```bash
   streamlit run streamlit_app.py
   ```

## APIs Used
- [Open-Meteo Historical Weather API](https://open-meteo.com/)
- [SoilGrids v2.0 REST API (ISRIC)](https://rest.isric.org/)

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
