/**
 * EldLogCanvas.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders one 24-hour FMCSA Driver's Daily Log sheet by overlaying an HTML5
 * <canvas> on top of the blank-paper-log.png background image.
 *
 * COORDINATE SYSTEM (measured from pixel analysis of the 513×518 source image):
 *
 *   Grid left edge  : x = 56  px  (where "Midnight" starts)
 *   Grid right edge : x = 492 px  (where "Mid-night" end label is)
 *   Grid width      : 436 px  = 24 hours  →  1 hour = 18.167 px
 *
 *   Row centre Y positions (within the grid band):
 *     Off Duty      : y ≈  99   (thin horizontal separator line)
 *     Sleeper Berth : y ≈ 120   (thin separator)
 *     Driving       : y ≈ 162   (thick band centre)
 *     On Duty (ND)  : y ≈ 201   (thin separator)
 *
 *   Remarks area    : y ≈ 235   (below last on-duty row)
 *
 * The canvas is sized to exactly match the rendered <img> tag, so all drawing
 * positions are in the ORIGINAL pixel space and scaled via CSS.
 */

import React, { useRef, useEffect, useCallback } from 'react';

// ── Layout constants (original 513×518 image coordinates) ────────────────────
const ORIG_W = 513;
const ORIG_H = 518;

const GRID_LEFT  = 65;   // x-pixel of midnight (left edge of grid)
const GRID_RIGHT = 455;  // x-pixel of end-of-day (right edge)
const GRID_TOTAL_PX = GRID_RIGHT - GRID_LEFT;  // 435 px = 24 h

// Row Y-centres for drawing horizontal duty lines
const ROW_Y = {
  'Off Duty':      195,  
  'Sleeper Berth': 214,  
  'Driving':       226,  
  'On Duty':       243,  
};

const REMARKS_Y = 300;

// Line drawing thickness (in original pixel space)
const LINE_WIDTH    = 2.5;
const CONNECT_WIDTH = 1.5;  // vertical connector between rows

// Colour for the drawn lines
const LINE_COLOR    = '#1d4ed8';  // strong blue – visible on white paper
const CONNECT_COLOR = '#1d4ed8';
const REMARK_COLOR  = '#1e3a8a';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a fractional hour (0–24) to canvas X pixel */
function hourToX(hour) {
  return GRID_LEFT + (hour / 24) * GRID_TOTAL_PX;
}

/**
 * Draw all duty events for one 24-hour page onto the given canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array}  events  Array of {status, duration_hours, label}
 * @param {number} scaleX  canvas.width  / ORIG_W  (CSS vs canvas pixel ratio)
 * @param {number} scaleY  canvas.height / ORIG_H
 */
function drawLog(ctx, events, scaleX, scaleY) {
  // Scale helper so all coordinates are in logical (original) space
  const S = (x, y) => [x * scaleX, y * scaleY];

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  let curHour   = 0;      // current time cursor (hours)
  let curStatus = null;   // current duty status string

  const remarkPositions = [];  // collect remark positions to draw after lines

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const nextHour = Math.min(curHour + event.duration_hours, 24);
    const targetY  = ROW_Y[event.status] ?? ROW_Y['Off Duty'];

    const x1 = hourToX(curHour);
    const x2 = hourToX(nextHour);

    // ── 1. Vertical connector (status change) ──────────────────────────────
    if (curStatus !== null && curStatus !== event.status) {
      const prevY = ROW_Y[curStatus] ?? ROW_Y['Off Duty'];
      ctx.beginPath();
      ctx.strokeStyle = CONNECT_COLOR;
      ctx.lineWidth   = CONNECT_WIDTH * scaleX;
      const [cx, cy1] = S(x1, prevY);
      const [, cy2]   = S(x1, targetY);
      ctx.moveTo(cx, cy1);
      ctx.lineTo(cx, cy2);
      ctx.stroke();

      // Remark: record drop-line + label position
      if (event.label && event.label !== 'Driving' && event.label !== '10-Hr Reset') {
        remarkPositions.push({ x: x1, fromY: targetY, label: event.label });
      }
    }

    // ── 2. Horizontal duty line ─────────────────────────────────────────────
    ctx.beginPath();
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth   = LINE_WIDTH * scaleX;
    const [lx1, ly] = S(x1, targetY);
    const [lx2]     = S(x2, targetY);
    ctx.moveTo(lx1, ly);
    ctx.lineTo(lx2, ly);
    ctx.stroke();

    curHour   = nextHour;
    curStatus = event.status;

    if (curHour >= 24) break;
  }

  // ── 3. Remark drop-lines and rotated labels ─────────────────────────────
  ctx.font         = `${Math.max(7, 7 * scaleX)}px 'Barlow Condensed', 'Arial Narrow', sans-serif`;
  ctx.fillStyle    = REMARK_COLOR;
  ctx.strokeStyle  = REMARK_COLOR;
  ctx.lineWidth    = 0.5 * scaleX;

  for (const rem of remarkPositions) {
    const [rx, ry1] = S(rem.x, rem.fromY + 3);
    const [,   ry2] = S(rem.x, REMARKS_Y - 6);

    // Vertical drop line to remarks area
    ctx.beginPath();
    ctx.globalAlpha = 0.45;
    ctx.moveTo(rx, ry1);
    ctx.lineTo(rx, ry2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Rotated text label
    ctx.save();
    ctx.translate(rx - 2 * scaleX, ry2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle   = REMARK_COLOR;
    ctx.globalAlpha = 0.85;
    ctx.fillText(rem.label, 0, 0);
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EldLogCanvas({ dayEvents, dayNumber }) {
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  const redraw = useCallback(() => {
    const img    = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !dayEvents) return;

    // Match canvas internal resolution to the rendered image size
    const rect = img.getBoundingClientRect();
    canvas.width  = rect.width  * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);

    const scaleX = canvas.width  / ORIG_W;
    const scaleY = canvas.height / ORIG_H;

    const ctx = canvas.getContext('2d');
    drawLog(ctx, dayEvents, scaleX, scaleY);
  }, [dayEvents]);

  // Redraw on mount, when events change, and on resize
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    if (img.complete) {
      redraw();
    } else {
      img.addEventListener('load', redraw);
    }

    const ro = new ResizeObserver(redraw);
    ro.observe(img);

    return () => {
      img.removeEventListener('load', redraw);
      ro.disconnect();
    };
  }, [redraw]);

  return (
    <div className="eld-canvas-wrapper">
      <img
        ref={imgRef}
        src="/blank-paper-log.png"
        alt={`Driver's Daily Log – Day ${dayNumber}`}
        className="log-bg"
        crossOrigin="anonymous"
      />
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
