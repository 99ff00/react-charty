/*
 *  Copyright (c) 2019-present, Aleksandr Telegin
 *
 * This source code is licensed under the MIT license.
 */

import { MONTHS, WDAYS, LONG_WDAYS } from "../constants";
import type { DataTypes } from "../types";

export function roundDate(ts: number): number {
  const d = new Date(ts);
  d.setHours(0);
  d.setMinutes(0);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d.getTime();
}

export function format(n: number | undefined): string {
  if (n === undefined) return "";
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function unixToDate(time: number, _d?: Date): string {
  const d = _d || new Date(time);
  return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
}

export function unixToD(
  time: number,
  full?: boolean,
  longWdays?: boolean,
): string {
  const d = new Date(time);

  if (full) {
    return (
      (longWdays ? LONG_WDAYS[d.getDay()] : WDAYS[d.getDay()]) +
      ", " +
      unixToDate(0, d)
    );
  }

  return MONTHS[d.getMonth()] + " " + d.getDate();
}

export function unixToTime(time: number): string {
  const d = new Date(time);
  let h = "" + d.getHours();
  let m = "" + d.getMinutes();

  if (h.length < 2) h = "0" + h;
  if (m.length < 2) m = "0" + m;

  return h + ":" + m;
}

export function byId(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export const DATA_TYPES: DataTypes = {
  time: function (v: number): string {
    return unixToTime(v);
  },
  date: function (v: number): string {
    return unixToD(v);
  },
  shortDate: function (v: number): string {
    return unixToD(v);
  },
  longDate: function (v: number): string {
    return unixToDate(v);
  },
  longDateWeekDay: function (v: number): string {
    return unixToD(v, true, true);
  },
  float1: function (v: number): string {
    return parseFloat(String(v)).toFixed(1);
  },
  float2: function (v: number): string {
    return parseFloat(String(v)).toFixed(2);
  },
  number: function (v: number): string {
    return format(v);
  },
  undefined: function (v: number): string {
    return String(Math.round(v));
  },
};
