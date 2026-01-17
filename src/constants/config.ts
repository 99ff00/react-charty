/*
 *  Copyright (c) 2019-present, Aleksandr Telegin
 *
 * This source code is licensed under the MIT license.
 */

import type { Area, UIConfig } from "../types";

export const CHART_HEIGHT = 400;
export const MAIN_AREA_HEIGHT = 354;
export const PI_RAD = Math.PI / 180;
export const FONT =
  'BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif';

export const WDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const LONG_WDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const DPR =
  typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
export const IS_MOBILE =
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

export const LONG_TAP_DURATION = 700;
export const ANIMATE_DURATION = 220;
export const ON_OFF_DURATION = 150;
export const ZOOM_IN_DURATION = 300;
export const ZOOM_OUT_DURATION = 300;
export const SNAP_DURATION = 200;
export const LEGEND_TIMER = 10000;

export const PIE_VISIBLE = 0.99;

export const AREA: Record<string, Area> = {
  HEADER: 1,
  MAIN: 2,
  XAXIS: 3,
  PREVIEW: 4,
  BRUSH_CENTER: 5,
  BRUSH_LEFT: 6,
  BRUSH_RIGHT: 7,
};

export const SHARED_PROPS = [
  "globalStart",
  "globalEnd",
  "localStart",
  "localEnd",
  "vLineX",
  "vLineY",
  "legendIsVisible",
  "isZoomed",
  "isZooming",
] as const;

export function createDefaultUI(): UIConfig {
  return {
    chart: { topPadding: 50, hPadding: 15, height: CHART_HEIGHT },
    pie: { segmentShift: 5 },
    preview: {
      height: 46,
      vPadding: 1,
      radius: 8,
      lineWidth: 1,
      handleW: 9,
      handleTick: 10,
      minBrushSize: 10,
      hitSlop: 10,
    },
    grid: {
      lineWidth: 1,
      legendShift: -10,
      markerRadius: 3,
      markerLineWidth: 4,
    },
    xAxis: { textWidth: 80, height: 32, fadeTime: 250 },
    yAxis: { textCount: 5, fadeTime: 500 },
    main: { lineWidth: 2, vPadding: 15 },
  };
}

export const CHARTY_TEMPLATE = `<div id=|header>
    <h3 id=|title></h3>
    <h3 id=|zoom>
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path id=|zoomIcon d="M13 10h-8v-2h8v2zm8.172 14l-7.387-7.387c-1.388.874-3.024 1.387-4.785 1.387-4.971 0-9-4.029-9-9s4.029-9 9-9 9 4.029 9 9c0 1.761-.514 3.398-1.387 4.785l7.387 7.387-2.828 2.828zm-12.172-8c3.859 0 7-3.14 7-7s-3.141-7-7-7-7 3.14-7 7 3.141 7 7 7z"/>
      </svg>
      <span id=|zoomText>Zoom Out</span>
    </h3>
    <h4 id=|localRange></h4>
    <h4 id=|zoomedRange></h4>
  </div>
  <canvas id=|canvas></canvas>
  <div id=|ctrls></div>
  <div id=|legend></div>`;

export const CTRLS_TEMPLATE = `[<label id=|checkbox{i} style="background: {color}; border-color: {color}">
    <span id=|name{i} style="color:#fff">{name}</span>
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path id=|chk{i} d="m9 21.035l-9-8.638 2.791-2.87 6.156 5.874 12.21-12.436 2.843 2.817z"/>
    </svg>
  </label>]`;

export const LEGEND_TEMPLATE = `<div id=|date><span id=|xval></span></div>
    [<div id=|label{i}>
      <div id=|labelPercent{i}></div>
      <div id=|labelName{i}></div>
      <div id=|labelValue{i} style="color:{color}"></div>
    </div>]
    <div id=|labelTotal>
      <div id=|labelNameTotal>All</div>
      <div id=|labelValueTotal></div>
    </div>`;
