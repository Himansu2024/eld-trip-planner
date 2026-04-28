# ELD Trip Planner

FMCSA-compliant ELD Daily Log generator. Enter trip locations and current cycle
hours – the app calculates a complete HOS schedule and draws official Driver's
Daily Log sheets.

## Stack
| Layer    | Technology                                  |
|----------|---------------------------------------------|
| Backend  | Python 3.11 · Django 4.2 · DRF · OSRM API  |
| Frontend | React 18 · Leaflet · Tailwind CSS v3        |
| Routing  | OSRM public demo server (no API key needed) |
| Geocoding| Nominatim / OpenStreetMap                   |

---

## Quick Start

### 1 — Backend

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate     # creates db.sqlite3 (no models, just django internals)
python manage.py runserver   # runs on http://localhost:8000
```

### 2 — Frontend (separate terminal)

```bash
cd frontend
npm install
npm start                    # runs on http://localhost:3000
```

The React dev server automatically proxies `/api/` requests to `localhost:8000`
via the `"proxy"` field in `package.json`.

---

## Environment Variables

### Backend (`backend/.env` or shell exports)

| Variable            | Default                     | Description                        |
|---------------------|-----------------------------|------------------------------------|
| `DJANGO_SECRET_KEY` | dev-secret-key-…            | Change in production               |
| `DEBUG`             | `True`                      | Set `False` in production          |

### Frontend

| Variable           | Default                | Description                    |
|--------------------|------------------------|--------------------------------|
| `REACT_APP_API_URL`| `/api/plan-trip/`      | Backend API endpoint           |

---

## API Reference

### `POST /api/plan-trip/`

**Request body (JSON):**
```json
{
  "current_location":  "Chicago, IL",
  "pickup_location":   "St. Louis, MO",
  "dropoff_location":  "Dallas, TX",
  "current_cycle_used": 22
}
```

**Response:**
```json
{
  "route_coords": [[lat, lon], ...],
  "events": [
    { "status": "Driving",       "duration_hours": 8.0,  "label": "Driving"       },
    { "status": "Off Duty",      "duration_hours": 0.5,  "label": "30-Min Break"  },
    { "status": "On Duty",       "duration_hours": 1.0,  "label": "Pickup"        },
    { "status": "Sleeper Berth", "duration_hours": 10.0, "label": "10-Hr Reset"   },
    ...
  ],
  "total_distance_miles": 847.3,
  "leg0_miles": 289.2,
  "leg1_miles": 558.1,
  "total_trip_hours": 32.5,
  "total_drive_hours": 21.0,
  "waypoints": {
    "current":  [41.85, -87.65],
    "pickup":   [38.63, -90.20],
    "dropoff":  [32.78, -96.80]
  }
}
```

---

## HOS Rules Implemented (49 CFR §395)

| Rule                   | Value         | Implementation detail                             |
|------------------------|---------------|---------------------------------------------------|
| 11-Hour Driving Limit  | 11 h/shift    | Resets after 10-hr Sleeper Berth                  |
| 14-Hour Duty Window    | 14 h/shift    | Includes all on-duty and off-duty breaks          |
| 30-Minute Rest Break   | Every 8 h     | Counted cumulatively; resets on ≥30 min break     |
| 10-Hour Reset          | 10 h SB       | Clears 11-hr and 14-hr clocks                     |
| 70-Hr/8-Day Cycle      | 70 h total    | `current_cycle_used` subtracted from available    |
| Fueling Stop           | Every 1,000 mi| 30 min On Duty                                    |
| Pickup / Dropoff       | 1 h each      | On Duty (not driving)                             |
| Speed Assumption       | 60 mph        | Used to convert miles ↔ hours                     |

---

## Canvas Drawing

The `EldLogCanvas` component overlays an HTML5 `<canvas>` precisely on top
of `blank-paper-log.png` (513 × 518 px) using a `ResizeObserver` to stay
pixel-perfect at any viewport size.

**Grid calibration** (from pixel analysis of the source image):

| Metric           | Value |
|------------------|-------|
| Grid left X      | 57 px |
| Grid right X     | 492 px|
| Grid width       | 435 px = 24 hours |
| Off Duty row Y   | 99 px |
| Sleeper Berth Y  | 120 px|
| Driving row Y    | 162 px|
| On Duty row Y    | 201 px|
| Remarks area Y   | 245 px|

All coordinates are in the original 513 × 518 space and are scaled to the
actual rendered canvas size via `scaleX = canvas.width / 513`.

---

## Project Structure

```
eld-project/
├── backend/
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── trip_planner/
│   │   ├── views.py          ← OSRM + HOS algorithm
│   │   └── urls.py
│   ├── manage.py
│   └── requirements.txt
└── frontend/
    ├── public/
    │   ├── index.html
    │   └── blank-paper-log.png   ← FMCSA log sheet background
    ├── src/
    │   ├── App.jsx               ← root + ELD page pagination
    │   ├── index.js
    │   ├── index.css             ← Tailwind + custom styles
    │   └── components/
    │       ├── TripForm.jsx      ← input form with cycle gauge
    │       ├── RouteMap.jsx      ← Leaflet map with custom markers
    │       ├── TripSummary.jsx   ← statistics dashboard
    │       └── EldLogCanvas.jsx  ← canvas drawing engine
    ├── package.json
    ├── tailwind.config.js
    └── postcss.config.js
```
