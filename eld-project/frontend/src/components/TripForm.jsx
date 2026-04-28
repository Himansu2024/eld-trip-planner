/**
 * TripForm.jsx
 * Input form for trip planning. Styled with a dark industrial aesthetic.
 */
import React, { useState } from 'react';

const EXAMPLES = [
  { label: 'Chicago → Dallas', values: { current_location: 'Chicago, IL', pickup_location: 'St. Louis, MO', dropoff_location: 'Dallas, TX', current_cycle_used: '22' }},
  { label: 'LA → Phoenix', values: { current_location: 'Los Angeles, CA', pickup_location: 'Riverside, CA', dropoff_location: 'Phoenix, AZ', current_cycle_used: '14' }},
  { label: 'NYC → Atlanta', values: { current_location: 'Newark, NJ', pickup_location: 'Philadelphia, PA', dropoff_location: 'Atlanta, GA', current_cycle_used: '30' }},
];

export default function TripForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    current_location:  '',
    pickup_location:   '',
    dropoff_location:  '',
    current_cycle_used: '0',
  });

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function loadExample(example) {
    setForm(example.values);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ ...form, current_cycle_used: parseFloat(form.current_cycle_used) || 0 });
  }

  const cycleVal = Math.min(parseFloat(form.current_cycle_used) || 0, 70);
  const cyclePct = (cycleVal / 70) * 100;

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
      {/* Card header */}
      <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-800/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-amber" />
          <h2 className="font-display font-600 text-base text-white tracking-widest uppercase">
            Trip Details
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 font-mono">
          Enter locations to generate HOS schedule
        </p>
      </div>

      {/* Quick-load examples */}
      <div className="px-5 pt-4">
        <p className="text-xs text-slate-500 font-mono mb-2 tracking-wider uppercase">Quick Examples</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map(ex => (
            <button
              key={ex.label}
              type="button"
              onClick={() => loadExample(ex)}
              className="px-3 py-1 text-xs font-mono text-slate-400 border border-slate-600/60
                         rounded-lg hover:border-amber-500/50 hover:text-amber-400 hover:bg-amber-500/5
                         transition-all duration-150"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">

        <FormField
          id="current_location"
          name="current_location"
          label="Current Location"
          placeholder="e.g. Chicago, IL"
          value={form.current_location}
          onChange={handleChange}
          icon={<PinIcon className="text-slate-500" />}
          required
        />

        {/* Arrow connector */}
        <div className="flex items-center gap-3 px-2">
          <div className="flex-1 border-t border-dashed border-slate-700/60" />
          <ArrowDownIcon className="w-4 h-4 text-slate-600 shrink-0" />
          <div className="flex-1 border-t border-dashed border-slate-700/60" />
        </div>

        <FormField
          id="pickup_location"
          name="pickup_location"
          label="Pickup Location"
          placeholder="e.g. St. Louis, MO"
          value={form.pickup_location}
          onChange={handleChange}
          icon={<BoxIcon className="text-amber-500/70" />}
          required
        />

        <div className="flex items-center gap-3 px-2">
          <div className="flex-1 border-t border-dashed border-slate-700/60" />
          <ArrowDownIcon className="w-4 h-4 text-slate-600 shrink-0" />
          <div className="flex-1 border-t border-dashed border-slate-700/60" />
        </div>

        <FormField
          id="dropoff_location"
          name="dropoff_location"
          label="Dropoff Location"
          placeholder="e.g. Dallas, TX"
          value={form.dropoff_location}
          onChange={handleChange}
          icon={<FlagIcon className="text-green-500/70" />}
          required
        />

        {/* Cycle divider */}
        <div className="pt-1 border-t border-slate-700/40" />

        {/* Cycle used */}
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5 tracking-wider uppercase">
            Current Cycle Used (hours)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              name="current_cycle_used"
              min="0"
              max="69.9"
              step="0.5"
              value={form.current_cycle_used}
              onChange={handleChange}
              className="w-24 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2
                         text-white font-mono text-sm focus:outline-none focus:border-amber-500/60
                         focus:ring-1 focus:ring-amber-500/20 transition-colors"
            />
            <div className="flex-1">
              {/* Visual gauge */}
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                <span>0h</span>
                <span className={cycleVal >= 60 ? 'text-red-400' : 'text-amber-400/70'}>
                  {cycleVal.toFixed(1)}h / 70h
                </span>
                <span>70h</span>
              </div>
              <div className="h-2 rounded-full bg-slate-700/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    cyclePct > 85 ? 'bg-red-500' : cyclePct > 60 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${cyclePct}%` }}
                />
              </div>
              <p className="text-[10px] font-mono text-slate-600 mt-1">
                {(70 - cycleVal).toFixed(1)}h remaining in cycle
              </p>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-xl font-display font-600 text-base tracking-widest uppercase
                     transition-all duration-200 flex items-center justify-center gap-2
                     ${loading
                       ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                       : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-glow hover:shadow-lg active:scale-[.98]'
                     }`}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-500 border-t-slate-400 rounded-full animate-spin" />
              Calculating…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5" />
              </svg>
              Plan Trip
            </>
          )}
        </button>
      </form>

      {/* HOS quick-ref footer */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '11h Driving Limit', val: 'Per shift' },
            { label: '14h Duty Window',   val: 'Per shift' },
            { label: '10h Reset',         val: 'Sleeper berth' },
            { label: '70h / 8 Days',      val: 'Cycle limit' },
          ].map(item => (
            <div key={item.label}
              className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{item.label}</p>
              <p className="text-xs text-slate-300 font-semibold">{item.val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FormField({ id, name, label, placeholder, value, onChange, icon, required }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-mono text-slate-400 mb-1.5 tracking-wider uppercase">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none">
          {icon}
        </span>
        <input
          id={id}
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-4 py-2.5
                     text-white text-sm placeholder-slate-600 font-body
                     focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20
                     transition-colors hover:border-slate-500"
        />
      </div>
    </div>
  );
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function PinIcon({ className }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}
function BoxIcon({ className }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
function FlagIcon({ className }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
    </svg>
  );
}
function ArrowDownIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
    </svg>
  );
}
