/**
 * RouteMap.jsx
 * Renders a Leaflet map with the route polyline and custom waypoint markers.
 * Uses react-leaflet v4 hooks.
 */
import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';

// ── Fix default icon paths broken by webpack ──────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Custom SVG markers ────────────────────────────────────────────────────────
function makeSvgMarker(color, letter) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <defs>
        <filter id="shadow" x="-30%" y="-10%" width="160%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.5)"/>
        </filter>
      </defs>
      <path d="M16 2C9.37 2 4 7.37 4 14c0 8.5 12 26 12 26S28 22.5 28 14C28 7.37 22.63 2 16 2z"
            fill="${color}" filter="url(#shadow)" />
      <circle cx="16" cy="14" r="7" fill="white" opacity="0.95"/>
      <text x="16" y="18.5" text-anchor="middle" font-family="Barlow Condensed,sans-serif"
            font-weight="700" font-size="10" fill="${color}">${letter}</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    iconSize:   [32, 42],
    iconAnchor: [16, 42],
    popupAnchor:[0, -42],
    className:  '',
  });
}

const MARKERS = {
  current: makeSvgMarker('#64748b', 'A'),
  pickup:  makeSvgMarker('#f59e0b', 'B'),
  dropoff: makeSvgMarker('#22c55e', 'C'),
};

// ── Sub-component: auto-fit bounds when route changes ─────────────────────────
function BoundsFitter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [coords, map]);
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RouteMap({ tripData, loading }) {
  const hasRoute = tripData && tripData.route_coords?.length > 0;

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl h-full min-h-[420px] flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-800/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h2 className="font-display font-600 text-base text-white tracking-widest uppercase">
            Route Map
          </h2>
        </div>
        {hasRoute && (
          <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400 inline-block rounded" />
              {tripData.total_distance_miles.toLocaleString()} mi
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2m4-2a8 8 0 11-16 0 8 8 0 0116 0z" />
              </svg>
              {tripData.total_trip_hours.toFixed(1)}h total
            </span>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-xs text-amber-400 tracking-widest uppercase">Routing…</span>
            </div>
          </div>
        )}

        <MapContainer
          center={[39.5, -98.35]}  // center of USA
          zoom={4}
          style={{ height: '100%', minHeight: '380px', width: '100%' }}
          zoomControl={true}
          attributionControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={19}
          />

          {hasRoute && (
            <>
              <BoundsFitter coords={tripData.route_coords} />

              {/* Route polyline – amber glow effect using two overlaid lines */}
              <Polyline
                positions={tripData.route_coords}
                pathOptions={{ color: '#f59e0b', weight: 5, opacity: 0.25, lineJoin: 'round' }}
              />
              <Polyline
                positions={tripData.route_coords}
                pathOptions={{ color: '#f59e0b', weight: 2.5, opacity: 0.9, lineJoin: 'round', dashArray: null }}
              />

              {/* Waypoint markers */}
              <Marker
                position={tripData.waypoints.current}
                icon={MARKERS.current}
              >
                <Popup>
                  <strong style={{color:'#94a3b8'}}>Current Location</strong>
                </Popup>
              </Marker>

              <Marker
                position={tripData.waypoints.pickup}
                icon={MARKERS.pickup}
              >
                <Popup>
                  <strong style={{color:'#f59e0b'}}>Pickup</strong>
                  <br />
                  <span style={{fontSize:'11px',color:'#94a3b8'}}>
                    {tripData.leg0_miles.toLocaleString()} mi from start
                  </span>
                </Popup>
              </Marker>

              <Marker
                position={tripData.waypoints.dropoff}
                icon={MARKERS.dropoff}
              >
                <Popup>
                  <strong style={{color:'#22c55e'}}>Dropoff</strong>
                  <br />
                  <span style={{fontSize:'11px',color:'#94a3b8'}}>
                    {tripData.leg1_miles.toLocaleString()} mi from pickup
                  </span>
                </Popup>
              </Marker>
            </>
          )}
        </MapContainer>

        {/* Map legend overlay */}
        {hasRoute && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/85 backdrop-blur border border-slate-700/60 rounded-xl px-3 py-2 space-y-1.5">
            <LegendItem color="#64748b" letter="A" label="Current" />
            <LegendItem color="#f59e0b" letter="B" label={`Pickup · ${tripData.leg0_miles} mi`} />
            <LegendItem color="#22c55e" letter="C" label={`Dropoff · ${tripData.leg1_miles} mi`} />
          </div>
        )}

        {/* Empty state overlay */}
        {!hasRoute && !loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
            <div className="bg-slate-950/70 backdrop-blur px-5 py-3 rounded-xl border border-slate-700/40 text-center">
              <p className="font-display text-slate-500 text-sm tracking-wider uppercase">
                Route will appear here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, letter, label }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + '22', border: `1px solid ${color}66` }}
      >
        <span style={{ color, fontSize: 9, fontWeight: 700, fontFamily: 'Barlow Condensed' }}>{letter}</span>
      </div>
      <span className="font-mono text-[10px] text-slate-400">{label}</span>
    </div>
  );
}
