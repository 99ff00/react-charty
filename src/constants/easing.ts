/*
 *  Copyright (c) 2019-present, Aleksandr Telegin
 *
 * This source code is licensed under the MIT license.
 */

import type { EasingFunctions } from "../types";

export const EASE: EasingFunctions = {
  inQuad: function (t: number, b: number, c: number, d: number): number {
    return c * (t /= d) * t + b;
  },
  outQuad: function (t: number, b: number, c: number, d: number): number {
    return -c * (t /= d) * (t - 2) + b;
  },
  inCubic: function (t: number, b: number, c: number, d: number): number {
    return c * (t /= d) * t * t + b;
  },
  outCubic: function (t: number, b: number, c: number, d: number): number {
    return c * ((t = t / d - 1) * t * t + 1) + b;
  },
  outSine: function (t: number, b: number, c: number, d: number): number {
    return c * Math.sin((t / d) * (Math.PI / 2)) + b;
  },
  outBack: function (
    t: number,
    b: number,
    c: number,
    d: number,
    s?: number,
  ): number {
    if (!s) s = 1.5;
    return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
  },
};
