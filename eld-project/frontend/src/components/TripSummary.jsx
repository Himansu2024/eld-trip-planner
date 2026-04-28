/**
 * TripSummary.jsx
 * Shows key trip statistics in a dashboard-style card grid.
 */
import React, { useMemo } from 'react';

export default function TripSummary({ tripData }) {
  const { events, total_distance_miles, leg0_miles, leg1_miles,
          total_trip_hours, total_drive_hours } = tripData;

  const stats = useMemo(() => {
    const onDutyH   = events.filter(e => e.status === 'On Duty').reduce((a,e) => a + e.duration_hours, 0);
    const offDutyH  = events.filter(e => e.status === 'Off Duty').reduce((a,e) => a + e.duration_hours, 0);
    const sleeperH  = events.filter(e => e.status === 'Sleeper Berth').reduce((a,e) => a + e.duration_hours, 0);
    const fuelStops = events.filter(e => e.label === 'Fueling Stop').length;
    const breaks    = events.filter(e => e.label === '30-Min Break').length;
    const resets    = events.filter(e => e.label === '10-Hr Reset').length;
    const numDays   = Math.ceil(total_trip_hours / 24);
    return { onDutyH, offDutyH, sleeperH, fuelStops, breaks, resets, numDays };
  }, [events, total_trip_hours]);

  function fmtH(h) {
    const hrs = Math.floor(h);
    const min = Math.round((h % 1) * 60);
    return min > 0 ? `${hrs}h ${min}m` : `${hrs}h`;
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <ChartIcon />
        </div>
        <div>
          <h2 className="font-display font-700 text-xl text-white tracking-wider">TRIP SUMMARY</h2>
          <p className="text-xs text-slate-500 font-mono">Computed HOS breakdown</p>
        </div>
      </div>

      {/* Main stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <StatCard
          label="Total Distance"
          value={total_distance_miles.toLocaleString()}
          unit="miles"
          accent="amber"
          icon={<RoadIcon />}
        />
        <StatCard
          label="Total Trip Time"
          value={fmtH(total_trip_hours)}
          unit=""
          accent="blue"
          icon={<ClockIcon />}
        />
        <StatCard
          label="Driving Time"
          value={fmtH(total_drive_hours)}
          unit=""
          accent="green"
          icon={<SteeringIcon />}
        />
        <StatCard
          label="Log Days"
          value={stats.numDays}
          unit={`day${stats.numDays !== 1 ? 's' : ''}`}
          accent="purple"
          icon={<CalendarIcon />}
        />
      </div>

      {/* Detailed breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniStat label="On-Duty Time"     value={fmtH(stats.onDutyH)}  color="text-amber-400" />
        <MiniStat label="Off-Duty Time"    value={fmtH(stats.offDutyH)} color="text-slate-400" />
        <MiniStat label="Sleeper Berth"    value={fmtH(stats.sleeperH)} color="text-blue-400"  />
        <MiniStat label="Fuel Stops"       value={stats.fuelStops}       color="text-orange-400" />
        <MiniStat label="Rest Breaks"      value={stats.breaks}           color="text-cyan-400"  />
        <MiniStat label="Shift Resets"     value={stats.resets}           color="text-violet-400" />
      </div>

      {/* Leg breakdown bar */}
      <div className="mt-3 bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">Route Segments</p>
        <div className="flex items-center gap-3">
          <LegBar
            label="Current → Pickup"
            miles={leg0_miles}
            total={total_distance_miles}
            color="bg-amber-500"
          />
          <LegBar
            label="Pickup → Dropoff"
            miles={leg1_miles}
            total={total_distance_miles}
            color="bg-green-500"
          />
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, unit, accent, icon }) {
  const accentMap = {
    amber:  { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', iconBg: 'bg-amber-500/10' },
    blue:   { bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  text: 'text-blue-400',  iconBg: 'bg-blue-500/10' },
    green:  { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', iconBg: 'bg-green-500/10' },
    purple: { bg: 'bg-violet-500/10',border: 'border-violet-500/20',text: 'text-violet-400',iconBg: 'bg-violet-500/10' },
  };
  const c = accentMap[accent];
  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4 flex items-start gap-3`}>
      <div className={`w-8 h-8 rounded-lg ${c.iconBg} flex items-center justify-center shrink-0 ${c.text}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">{label}</p>
        <p className={`font-display font-700 text-2xl leading-none mt-1 ${c.text}`}>{value}</p>
        {unit && <p className="text-xs text-slate-600 font-mono mt-0.5">{unit}</p>}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3">
      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`font-display font-700 text-lg leading-tight mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function LegBar({ label, miles, total, color }) {
  const pct = total > 0 ? (miles / total) * 100 : 0;
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs font-mono mb-1.5">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">{miles.toLocaleString()} mi ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-2 rounded-full bg-slate-700/60 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Small icons ───────────────────────────────────────────────────────────────
const i = (path) => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);
const ChartIcon    = () => i("M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z");
const RoadIcon     = () => i("M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z");
const ClockIcon    = () => i("M12 6v6l4 2m4-2a8 8 0 11-16 0 8 8 0 0116 0z");
const SteeringIcon = () => i("M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 2a7 7 0 017 7 7 7 0 01-7 7 7 7 0 01-7-7 7 7 0 017-7zm0 6a1 1 0 100 2 1 1 0 000-2zm-4.5.5h3.68a1.5 1.5 0 011.32-1.32V7.5m0 9v-3.18a1.5 1.5 0 001.32-1.32H16.5");
const CalendarIcon = () => i("M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5");
