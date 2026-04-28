/**
 * App.jsx – root component
 * Holds API state and passes it down to child panels.
 */
import React, { useState } from 'react';
import axios from 'axios';
import TripForm from './components/TripForm';
import RouteMap  from './components/RouteMap';
import EldLogCanvas from './components/EldLogCanvas';
import TripSummary  from './components/TripSummary';

const API_URL = "https://eld-trip-planner-production-8aa7.up.railway.app/api/plan-trip/";

export default function App() {
  const [tripData,  setTripData]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(formValues) {
    setLoading(true);
    setError(null);
    setTripData(null);
    setSubmitted(true);

    try {
      const res = await axios.post(API_URL, formValues);
      setTripData(res.data);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        'Unable to connect to the server. Make sure the backend is running.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 font-body">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          {/* Logo mark */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <TruckIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-display text-xl font-700 text-white tracking-wide leading-none">
                ELD TRIP PLANNER
              </h1>
              <p className="font-mono text-[10px] text-slate-500 tracking-widest uppercase">
                FMCSA-Compliant · 70-Hr/8-Day Cycle
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              OSRM LIVE ROUTING
            </span>
          </div>
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Top row: Form + Map */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <TripForm onSubmit={handleSubmit} loading={loading} />
          </div>
          <div className="lg:col-span-3">
            <RouteMap tripData={tripData} loading={loading} />
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="animate-fade-in border border-red-500/30 bg-red-500/10 text-red-300 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-display font-semibold text-red-300 uppercase tracking-wide text-sm">Route Error</p>
              <p className="text-sm text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="animate-fade-in space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="font-display text-amber-400 tracking-wide text-sm">
                CALCULATING ROUTE &amp; HOS SCHEDULE…
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
            <div className="skeleton h-48 rounded-xl" />
          </div>
        )}

        {/* Results */}
        {tripData && !loading && (
          <div className="animate-slide-up space-y-8">
            <TripSummary tripData={tripData} />
            <EldLogs tripData={tripData} />
          </div>
        )}

        {/* Empty state */}
        {!submitted && !loading && (
          <EmptyState />
        )}
      </main>

      <footer className="border-t border-slate-800 mt-16 py-6 text-center">
        <p className="font-mono text-xs text-slate-600">
          FMCSA HOS rules per 49 CFR §395 · Property-carrying CMV · 70-hr/8-day cycle
        </p>
      </footer>
    </div>
  );
}

/** Wrapper that renders paginated ELD canvas logs */
function EldLogs({ tripData }) {
  const { events } = tripData;
  if (!events || events.length === 0) return null;

  // Split events into 24-hour pages
  const pages = [];
  let page = [];
  let pageHours = 0;

  for (const event of events) {
    let remaining = event.duration_hours;
    while (remaining > 0.0001) {
      const fits = 24 - pageHours;
      const take = Math.min(remaining, fits);
      page.push({ ...event, duration_hours: parseFloat(take.toFixed(4)) });
      pageHours += take;
      remaining -= take;
      if (pageHours >= 24 - 0.0001) {
        pages.push(page);
        page = [];
        pageHours = 0;
      }
    }
  }
  if (page.length > 0) pages.push(page);

  return (
    <section>
      <SectionHeader
        icon={<LogIcon />}
        title="DAILY LOG SHEETS"
        subtitle={`${pages.length} day${pages.length !== 1 ? 's' : ''} generated`}
      />
      <div className="space-y-6">
        {pages.map((pageEvents, idx) => (
          <div key={idx} className="border border-slate-700/50 rounded-2xl overflow-hidden bg-slate-900/40 shadow-xl">
            {/* Day label */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50 bg-slate-800/40">
              <div className="flex items-center gap-3">
                <span className="font-display font-700 text-lg text-white tracking-wider">
                  DAY {idx + 1}
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {pageEvents.reduce((a, e) => a + e.duration_hours, 0).toFixed(1)}h logged
                </span>
              </div>
              <EventLegend />
            </div>
            <div className="p-4">
              <EldLogCanvas dayEvents={pageEvents} dayNumber={idx + 1} />
            </div>
            {/* Event list for this day */}
            <div className="px-5 pb-5">
              <EventTimeline events={pageEvents} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Compact timeline of events shown below each log */
function EventTimeline({ events }) {
  let cursor = 0;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-slate-500 border-b border-slate-700/50">
            <th className="text-left py-1.5 pr-4 font-semibold tracking-widest uppercase">Start</th>
            <th className="text-left py-1.5 pr-4 font-semibold tracking-widest uppercase">End</th>
            <th className="text-left py-1.5 pr-4 font-semibold tracking-widest uppercase">Duration</th>
            <th className="text-left py-1.5 pr-4 font-semibold tracking-widest uppercase">Status</th>
            <th className="text-left py-1.5 font-semibold tracking-widest uppercase">Label</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => {
            const start = cursor;
            const end = cursor + e.duration_hours;
            cursor = end;
            return (
              <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-1 pr-4 text-slate-400">{formatTime(start)}</td>
                <td className="py-1 pr-4 text-slate-400">{formatTime(end)}</td>
                <td className="py-1 pr-4 text-slate-300">{formatDuration(e.duration_hours)}</td>
                <td className="py-1 pr-4">
                  <StatusPill status={e.status} />
                </td>
                <td className="py-1 text-slate-300">{e.label}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatTime(hours) {
  const h = Math.floor(hours) % 24;
  const m = Math.round((hours % 1) * 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function formatDuration(h) {
  const hrs = Math.floor(h);
  const min = Math.round((h % 1) * 60);
  if (hrs === 0) return `${min}m`;
  if (min === 0) return `${hrs}h`;
  return `${hrs}h ${min}m`;
}

function StatusPill({ status }) {
  const map = {
    'Driving':      'badge-driving',
    'On Duty':      'badge-on-duty',
    'Off Duty':     'badge-off-duty',
    'Sleeper Berth':'badge-sleeper',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${map[status] || 'badge-off-duty'}`}>
      {status}
    </span>
  );
}

function EventLegend() {
  const items = [
    { label:'Off Duty',      cls:'bg-slate-400' },
    { label:'Sleeper Berth', cls:'bg-blue-400' },
    { label:'Driving',       cls:'bg-green-400' },
    { label:'On Duty',       cls:'bg-amber-400' },
  ];
  return (
    <div className="hidden sm:flex items-center gap-4">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className={`w-3 h-0.5 inline-block ${item.cls}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
        {icon}
      </div>
      <div>
        <h2 className="font-display font-700 text-xl text-white tracking-wider">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 font-mono">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-2">
        <TruckIcon className="w-8 h-8 text-slate-600" />
      </div>
      <h2 className="font-display text-2xl font-700 text-slate-500 tracking-wider uppercase">Ready to Plan</h2>
      <p className="text-slate-600 text-sm max-w-sm">
        Enter your current location, pickup, and dropoff addresses above to generate
        FMCSA-compliant ELD daily log sheets.
      </p>
    </div>
  );
}

// ── Icon components ───────────────────────────────────────────────────────────

function TruckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function LogIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}
