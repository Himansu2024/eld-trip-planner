"""
ELD Trip Planner – Backend View
================================
Handles:
  1. Geocoding address strings → (lat, lon) via Nominatim
  2. Route fetching (distance, polyline, leg distances) via OSRM
  3. FMCSA Hours-of-Service (HOS) timeline generation
  4. Returning a structured JSON response for the React frontend
"""

import logging
import time
from typing import Optional

import requests
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# External API helpers
# ---------------------------------------------------------------------------

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL = "http://router.project-osrm.org/route/v1/driving"

# Nominatim's usage policy requires a descriptive User-Agent
HEADERS = {"User-Agent": "ELD-Trip-Planner/1.0 (educational project)"}


def geocode(address: str) -> Optional[tuple[float, float]]:
    """
    Convert an address string to (latitude, longitude) using Nominatim.
    Returns None if the address cannot be resolved.
    """
    params = {"q": address, "format": "json", "limit": 1}
    try:
        resp = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        results = resp.json()
        if not results:
            return None
        item = results[0]
        return float(item["lat"]), float(item["lon"])
    except Exception as exc:
        logger.error("Geocoding failed for '%s': %s", address, exc)
        return None


def fetch_osrm_route(
    coords: list[tuple[float, float]],
) -> Optional[dict]:
    """
    Fetch a driving route from OSRM for an ordered list of (lat, lon) waypoints.

    Returns a dict with:
      - 'geometry': list of [lon, lat] pairs (GeoJSON-style, for Leaflet)
      - 'total_distance_m': total route distance in metres
      - 'legs': list of per-leg distances in metres
    """
    # OSRM expects coordinates as "lon,lat" separated by ";"
    coord_str = ";".join(f"{lon},{lat}" for lat, lon in coords)
    url = f"{OSRM_URL}/{coord_str}"
    params = {"overview": "full", "geometries": "geojson", "steps": "false"}

    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != "Ok" or not data.get("routes"):
            logger.error("OSRM returned no route: %s", data.get("message", ""))
            return None

        route = data["routes"][0]
        return {
            "geometry": route["geometry"]["coordinates"],  # [[lon, lat], ...]
            "total_distance_m": route["distance"],
            "legs": [leg["distance"] for leg in route["legs"]],
        }
    except Exception as exc:
        logger.error("OSRM request failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# HOS timeline generator
# ---------------------------------------------------------------------------

# HOS constants (§ 395.3, property-carrying CMV, 70-hr/8-day cycle)
SPEED_MPH = 60.0              # assumed average driving speed
FUEL_INTERVAL_MILES = 1000.0  # refuel every 1,000 miles
MAX_DRIVE_BEFORE_BREAK = 8.0  # 30-min break required after 8 cumulative drive hours
REST_BREAK_DURATION = 0.5     # 30-minute off-duty break
MAX_SHIFT_DRIVE = 11.0        # 11-hour driving limit per shift
MAX_SHIFT_WINDOW = 14.0       # 14-hour duty window
RESET_DURATION = 10.0         # 10-hour sleeper-berth reset
CYCLE_MAX = 70.0              # 70-hour/8-day on-duty limit
METERS_PER_MILE = 1609.344


def generate_hos_timeline(
    leg0_miles: float,  # current location → pickup
    leg1_miles: float,  # pickup → dropoff
    cycle_used_hours: float,
) -> list[dict]:
    """
    Simulate the full trip, emitting FMCSA-compliant duty events.

    Each event dict:
        status:          "Off Duty" | "Sleeper Berth" | "Driving" | "On Duty"
        duration_hours:  float
        label:           human-readable label (e.g. "Pickup", "Fueling Stop")

    HOS rules applied
    -----------------
    * 11-hr driving limit per shift
    * 14-hr duty window (shift starts at first on-duty activity; breaks consume window)
    * 30-min rest break required after 8 cumulative driving hours
    * 10-hr sleeper-berth reset when either driving or window limit is hit
    * 70-hr/8-day cycle limit (70 − cycle_used_hours available)
    * Fueling stop (0.5 hr On Duty) every 1,000 miles
    * Pickup: 1 hr On Duty at the pickup location
    * Dropoff: 1 hr On Duty at the dropoff location
    """

    events: list[dict] = []

    # ── Shift state (reset by 10-hr Sleeper Berth) ─────────────────────────
    shift_drive = 0.0    # driving hours this shift  (≤ 11)
    shift_window = 0.0   # elapsed hours since shift start (≤ 14)
    break_drive = 0.0    # driving hours since last 30-min break (≤ 8)

    # ── Cumulative on-duty hours toward 70-hr cycle ─────────────────────────
    cycle_used = float(cycle_used_hours)

    # ── Odometer ────────────────────────────────────────────────────────────
    miles_since_fuel = 0.0

    # ── Helpers ─────────────────────────────────────────────────────────────

    def append_event(status: str, duration: float, label: str) -> None:
        """Record a duty event and update all tracking counters."""
        nonlocal shift_drive, shift_window, break_drive, cycle_used

        # Cap on-duty / driving events to remaining cycle hours
        if status in ("Driving", "On Duty"):
            remaining_cycle = max(0.0, CYCLE_MAX - cycle_used)
            duration = min(duration, remaining_cycle)
            if duration <= 0.0001:
                return  # cycle exhausted; skip this event

        events.append({
            "status": status,
            "duration_hours": round(duration, 4),
            "label": label,
        })

        # All events advance the 14-hour duty window clock
        shift_window += duration

        if status == "Driving":
            shift_drive += duration
            break_drive += duration
            cycle_used += duration          # driving counts toward 70-hr cycle
        elif status == "On Duty":
            cycle_used += duration          # on-duty (not driving) counts too
        elif status in ("Off Duty", "Sleeper Berth"):
            # A ≥30-min non-driving break resets the 8-hour break counter
            if duration >= REST_BREAK_DURATION:
                break_drive = 0.0

    def do_reset() -> None:
        """Insert a 10-hour Sleeper Berth event and zero all shift clocks."""
        nonlocal shift_drive, shift_window, break_drive
        events.append({
            "status": "Sleeper Berth",
            "duration_hours": RESET_DURATION,
            "label": "10-Hr Reset",
        })
        # Sleeper Berth is NOT on-duty time → does not count toward cycle
        shift_drive = 0.0
        shift_window = 0.0
        break_drive = 0.0

    def drive_miles(miles_to_drive: float) -> None:
        """
        Drive a given number of miles, inserting all required HOS events
        (breaks, fuel stops, resets) as needed.
        """
        nonlocal miles_since_fuel
        remaining = float(miles_to_drive)
        guard = 0

        while remaining > 0.01:
            guard += 1
            if guard > 2000:
                logger.warning("HOS loop guard triggered — breaking early")
                break

            # ── 1. Check if a shift reset is required ─────────────────────
            if shift_drive >= MAX_SHIFT_DRIVE or shift_window >= MAX_SHIFT_WINDOW:
                do_reset()
                continue

            # ── 2. Check cycle limit ──────────────────────────────────────
            cycle_remaining = CYCLE_MAX - cycle_used
            if cycle_remaining <= 0.01:
                logger.warning("Driver has reached 70-hr cycle limit; stopping early")
                break

            # ── 3. Check 30-minute break requirement ─────────────────────
            if break_drive >= MAX_DRIVE_BEFORE_BREAK:
                append_event("Off Duty", REST_BREAK_DURATION, "30-Min Break")
                continue

            # ── 4. Compute maximum allowed driving segment ────────────────
            available = min(
                MAX_SHIFT_DRIVE - shift_drive,          # 11-hr rule
                MAX_SHIFT_WINDOW - shift_window,        # 14-hr window
                MAX_DRIVE_BEFORE_BREAK - break_drive,   # 8-hr break rule
                cycle_remaining,                        # 70-hr cycle
            )

            if available <= 0.01:
                do_reset()
                continue

            # Cap by distance to next fuel stop
            miles_to_fuel = FUEL_INTERVAL_MILES - miles_since_fuel
            hours_to_fuel = miles_to_fuel / SPEED_MPH
            drive_hours = min(available, hours_to_fuel)
            drive_miles_now = drive_hours * SPEED_MPH

            # Cap by remaining trip distance
            actual_miles = min(remaining, drive_miles_now)
            actual_hours = actual_miles / SPEED_MPH

            append_event("Driving", actual_hours, "Driving")
            remaining -= actual_miles
            miles_since_fuel += actual_miles

            # ── 5. Insert fuel stop if interval crossed ───────────────────
            if miles_since_fuel >= FUEL_INTERVAL_MILES - 0.01 and remaining > 0.01:
                append_event("On Duty", REST_BREAK_DURATION, "Fueling Stop")
                miles_since_fuel = 0.0

    # ── Main trip sequence ──────────────────────────────────────────────────

    # Leg 0: drive to pickup
    if leg0_miles > 0.01:
        drive_miles(leg0_miles)

    # Pickup: 1 hour on-duty at pickup location
    append_event("On Duty", 1.0, "Pickup")

    # Leg 1: drive to dropoff
    if leg1_miles > 0.01:
        drive_miles(leg1_miles)

    # Dropoff: 1 hour on-duty at dropoff location
    append_event("On Duty", 1.0, "Dropoff")

    return events


# ---------------------------------------------------------------------------
# REST API View
# ---------------------------------------------------------------------------

class PlanTripView(APIView):
    """
    POST /api/plan-trip/
    --------------------
    Request JSON body:
        current_location:  str   e.g. "Chicago, IL"
        pickup_location:   str   e.g. "St. Louis, MO"
        dropoff_location:  str   e.g. "Dallas, TX"
        current_cycle_used: float  hours used in current 70-hr cycle

    Response JSON:
        route_coords:        [[lat, lon], ...]  for Leaflet Polyline
        events:              [{status, duration_hours, label}, ...]
        total_distance_miles: float
        leg0_miles:          float  (current → pickup)
        leg1_miles:          float  (pickup → dropoff)
        waypoints: {
            current:  [lat, lon],
            pickup:   [lat, lon],
            dropoff:  [lat, lon],
        }
        error: str  (only present on failure)
    """

    def post(self, request):
        data = request.data

        # ── Input validation ────────────────────────────────────────────────
        required = ["current_location", "pickup_location", "dropoff_location"]
        missing = [f for f in required if not data.get(f, "").strip()]
        if missing:
            return Response(
                {"error": f"Missing required fields: {', '.join(missing)}"}, status=400
            )

        try:
            cycle_used = float(data.get("current_cycle_used", 0))
            cycle_used = max(0.0, min(cycle_used, CYCLE_MAX - 0.1))
        except (ValueError, TypeError):
            return Response({"error": "current_cycle_used must be a number."}, status=400)

        # ── Geocoding ───────────────────────────────────────────────────────
        locations = {
            "current": data["current_location"].strip(),
            "pickup": data["pickup_location"].strip(),
            "dropoff": data["dropoff_location"].strip(),
        }
        coords = {}
        for key, address in locations.items():
            # Nominatim usage policy: 1 req/sec for non-bulk usage
            time.sleep(1.0)
            result = geocode(address)
            if result is None:
                return Response(
                    {"error": f"Could not geocode '{address}'. Please try a more specific address."},
                    status=400,
                )
            coords[key] = result  # (lat, lon)
            logger.info("Geocoded '%s' → %s", address, result)

        # ── Route fetching ──────────────────────────────────────────────────
        waypoint_list = [coords["current"], coords["pickup"], coords["dropoff"]]
        route = fetch_osrm_route(waypoint_list)
        if route is None:
            return Response(
                {"error": "Could not calculate a driving route between the provided locations."},
                status=400,
            )

        leg0_miles = route["legs"][0] / METERS_PER_MILE
        leg1_miles = route["legs"][1] / METERS_PER_MILE
        total_miles = leg0_miles + leg1_miles

        # OSRM returns [[lon, lat], ...] – flip to [[lat, lon]] for Leaflet
        route_coords = [[lat, lon] for lon, lat in route["geometry"]]

        # ── HOS timeline generation ─────────────────────────────────────────
        events = generate_hos_timeline(leg0_miles, leg1_miles, cycle_used)

        # ── Compute summary stats ───────────────────────────────────────────
        total_hours = sum(e["duration_hours"] for e in events)
        drive_hours = sum(
            e["duration_hours"] for e in events if e["status"] == "Driving"
        )

        return Response({
            "route_coords": route_coords,
            "events": events,
            "total_distance_miles": round(total_miles, 1),
            "leg0_miles": round(leg0_miles, 1),
            "leg1_miles": round(leg1_miles, 1),
            "total_trip_hours": round(total_hours, 2),
            "total_drive_hours": round(drive_hours, 2),
            "waypoints": {
                "current": list(coords["current"]),
                "pickup": list(coords["pickup"]),
                "dropoff": list(coords["dropoff"]),
            },
        })
