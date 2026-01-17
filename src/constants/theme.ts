/*
 *  Copyright (c) 2019-present, Aleksandr Telegin
 *
 * This source code is licensed under the MIT license.
 */

import type { ChartyTheme } from "../types";

export const DEFAULT_THEME: ChartyTheme = {
  grid: { color: "#182D3B", alpha: 0.1, markerFillColor: "#fff" },
  legend: { background: "#fff", color: "#000" },
  preview: {
    maskColor: "#E2EEF9",
    maskAlpha: 0.6,
    brushColor: "#C0D1E1",
    brushBorderColor: "#fff",
    brushBorderAlpha: 1,
    handleColor: "#fff",
  },
  xAxis: { textColor: "#8E8E93", textAlpha: 1 },
  yAxis: { textColor: "#8E8E93", textAlpha: 1 },
  title: { color: "#000" },
  localRange: { color: "#000" },
  zoomedRange: { color: "#000" },
  zoomText: { color: "#108BE3" },
  zoomIcon: { fill: "#108BE3" },
  buttons: { color: "#fff" },
  pie: { textColor: "#fff" },
};
