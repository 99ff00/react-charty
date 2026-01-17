/*
 *  Copyright (c) 2019-present, Aleksandr Telegin
 *
 * This source code is licensed under the MIT license.
 */

import styles from "./styles.css";

import type {
  Area,
  Animation,
  AnimationValues,
  ChartyInstance,
  ChartyProps,
  ChartyTheme,
  ChartState,
  ChartTypes,
  ColorValue,
  EnhancedElement,
  EasingFunction,
  MinMax,
  RenderState,
  Series,
  UIConfig,
  XAxisData,
} from "./types";

import {
  DEFAULT_THEME,
  EASE,
  CHART_HEIGHT,
  MAIN_AREA_HEIGHT,
  PI_RAD,
  FONT,
  DPR,
  IS_MOBILE,
  LONG_TAP_DURATION,
  ANIMATE_DURATION,
  ON_OFF_DURATION,
  ZOOM_IN_DURATION,
  ZOOM_OUT_DURATION,
  SNAP_DURATION,
  LEGEND_TIMER,
  PIE_VISIBLE,
  AREA,
  SHARED_PROPS,
  createDefaultUI,
  CHARTY_TEMPLATE,
  CTRLS_TEMPLATE,
  LEGEND_TEMPLATE,
} from "./constants";

// Utility imports
import { roundDate, format, byId, DATA_TYPES } from "./utils";

import { initSTree, buildSTree, querySTree } from "./utils/segmentTree";

// Global chart registry
const CHARTS: ChartyInstance[] = [];

/**
 * Charty - A high-performance chart rendering engine
 */
const Charty = (function () {
  function Charty(
    ID_: string | { id?: string },
    props: ChartyProps,
    parent?: ChartyInstance,
    UI_?: UIConfig,
    ctx_?: CanvasRenderingContext2D,
  ): void {
    let ID = typeof ID_ === "object" ? ID_.id : ID_;

    if (!ID) {
      ID = (ID_ as { id?: string }).id = "charty-" + CHARTS.length;
    }

    // State initialization
    const V: ChartState = { progress: 0, needMeasure: true, yPos: [] };
    let ctx: CanvasRenderingContext2D | null = ctx_ || null;
    let IDs: string[] = [];
    let AY: Series[] = [];
    let AYL = 0;
    let AX: number[] = [];
    let AXL = 0;
    let X: XAxisData = { min: 0, max: 0, d: 0 };
    let TYPES: ChartTypes = {};
    let TOTALS: number[] = [];
    const PERCENTS: number[] = [];
    const STREE_MIN: number[][] = [];
    const STREE_MAX: number[][] = [];
    let animations: Record<string, Animation> = {};
    let A: AnimationValues = {};
    const STATE: RenderState = { repaint: false, draggingArea: 0 };
    const myIdx = CHARTS.length;
    let parentSeries: Series[] | undefined;
    let currentTheme: ChartyTheme | undefined;
    const UI: UIConfig = UI_ || createDefaultUI();
    const self = this as unknown as ChartyInstance & { isHooked?: boolean };

    CHARTS.push(self);

    if (parent) parentSeries = parent.getSeries();

    // =========================================================================
    // Theme Management
    // =========================================================================

    function updateTheme(theme_?: ChartyTheme): void {
      const theme = currentTheme || theme_;
      if (!theme) return;

      for (const id in theme) {
        const uiElement = UI[id as keyof UIConfig];
        if (uiElement) {
          const themeValue = theme[id as keyof ChartyTheme];
          if (typeof uiElement === "object" && "stylo" in uiElement) {
            (uiElement as EnhancedElement).stylo(
              themeValue as Record<string, unknown>,
            );
          } else if (typeof uiElement === "object" && themeValue) {
            for (const key in themeValue as Record<string, unknown>) {
              (uiElement as Record<string, unknown>)[key] = (
                themeValue as Record<string, unknown>
              )[key];
            }
          }
        }
      }

      function updateColors(S: Series): void {
        S.color =
          theme?.colors && theme.colors[S.name || ""]
            ? theme.colors[S.name || ""]
            : S._color;
        S.fillColor =
          theme?.fillColors && theme.fillColors[S.name || ""]
            ? theme.fillColors[S.name || ""]
            : S._fillColor;
        S.hideFromLegend =
          theme?.hideFromLegend && theme.hideFromLegend[S.name || ""]
            ? theme.hideFromLegend[S.name || ""]
            : S._hideFromLegend;
        S.buttonTextColor =
          theme?.buttonTextColor && theme.buttonTextColor[S.name || ""]
            ? theme.buttonTextColor[S.name || ""]
            : S._buttonTextColor;
      }

      AY.map(function (S: Series, i: number, series: Series[]) {
        updateColors(S);
        updateCheckbox(i, S.off, series);
      });

      if (V.zoomedChart) {
        V.zoomedChart.getSeries().map(function (S: Series) {
          updateColors(S);
        });
      }

      V.stepGridX = undefined;
      V.stepGridY = undefined;

      repaint();
    }

    (this as ChartyInstance).updateTheme = updateTheme;
    (this as ChartyInstance).setTheme = setTheme;
    (this as ChartyInstance).getDefaultTheme = function () {
      return DEFAULT_THEME;
    };

    start();

    // =========================================================================
    // Template Parsing
    // =========================================================================

    function parse(T: string, _IDs?: string[]): string {
      if (_IDs) IDs = _IDs;
      return T.replace(/\[([^\]]+)\]/g, function (_: string, tag: string) {
        return AY.map(function (y: Series, i: number) {
          return tag.replace(/\{(\w+)\}/g, function (_: string, k: string) {
            return k === "i"
              ? String(i)
              : String((y as unknown as Record<string, unknown>)[k]);
          });
        }).join("");
      }).replace(/\|([^\s>]+)/g, function (_: string, id: string) {
        if (IDs.indexOf(id) < 0) IDs.push(id);
        return ID + "-" + id;
      });
    }

    function setTheme(theme_?: ChartyTheme): void {
      if (theme_) {
        currentTheme = theme_;
        if (V.zoomedChart) {
          V.zoomedChart.setTheme(theme_);
          V.zoomedChart.updateTheme();
        }
        return updateTheme();
      }
      if (parent) currentTheme = parent.getTheme();
      else if (!currentTheme) currentTheme = props.theme || DEFAULT_THEME;
    }

    function renderLegend(): void {
      const legendEl = UI.legend as EnhancedElement | undefined;
      if (legendEl) {
        legendEl.innerHTML = parse(LEGEND_TEMPLATE, []);
        IDs.forEach((id) => enhanceElement(id));
      }
    }

    function renderCtrls(): void {
      const ctrlsEl = UI.ctrls as EnhancedElement | undefined;
      if (!ctrlsEl) return;

      if (!V.showButtons) {
        ctrlsEl.innerHTML = "";
      } else {
        ctrlsEl.innerHTML = parse(CTRLS_TEMPLATE, []);
        IDs.forEach((id) => enhanceElement(id));

        AY.map(function (S: Series, i: number) {
          const checkboxEl = (UI as Record<string, unknown>)[
            "checkbox" + i
          ] as EnhancedElement;
          if (!checkboxEl) return;

          checkboxEl
            .on("mousedown touchstart", function (e: Event) {
              stop(e);
              V.tapStarted = Date.now();
              if (V.tapTimer) clearTimeout(V.tapTimer);
              V.tapTimer = setTimeout(function () {
                V.tapTimer = undefined;
                for (let idx = 0; idx < AYL; idx++) {
                  const s = AY[idx];
                  if ((!s.off && idx !== i) || (s.off && idx === i)) {
                    toggleCheckbox(idx, idx !== i);
                  }
                }
                V.seriesCount = 1;
                V.prevSeriesCount = 0;
              }, LONG_TAP_DURATION);
            })
            .on(
              "mouseup touchend",
              function (
                e: Event,
                _a: number,
                _b: number,
                _c: Area,
                el: EnhancedElement,
              ) {
                stop(e);
                if (!V.tapTimer) return;

                clearTimeout(V.tapTimer);
                V.tapTimer = undefined;
                for (let idx = 0; idx < AYL; idx++) {
                  if (idx !== i && !AY[idx].off) return toggleCheckbox(i);
                }
                el.shake();
              },
            );
          updateCheckbox(i, S.off);
        });
      }
    }

    function togglePreview(on_?: boolean): void {
      const show = on_ !== undefined ? on_ : !V.showPreview;
      const off = !show;
      animate("previewA", off ? 1 : 0, off ? 0 : 1, 2 * ON_OFF_DURATION);
      const d = show ? 0 : UI.preview.height + 10;
      const ctrlsEl = UI.ctrls as EnhancedElement | undefined;
      if (ctrlsEl) {
        ctrlsEl.stylo({ transform: "translate3d(0, -" + d + "px, 0)" });
      }
      V.showPreview = show;
    }

    (this as ChartyInstance).togglePreview = togglePreview;

    function restorePreview(on: boolean): void {
      self.togglePreview(on);
    }

    function error(msg: string): void {
      throw msg;
    }

    // =========================================================================
    // State Management
    // =========================================================================

    function updateVars(): void {
      V.showLegend = props.showLegend !== false;
      V.showButtons = props.showButtons !== false && AYL > 1;
      V.showPreview = props.showPreview !== false;
      V.showMainArea = props.showMainArea !== false;
      V.showBrush = props.showBrush !== false;
      V.showRangeText = props.showRangeText !== false;
      V.showLegendTitle = props.showLegendTitle !== false;
      V.stepX = props.stepX || 1;
      V.zoomStepX = props.zoomStepX || 1;
      V.autoScale = props.autoScale !== false;
    }

    function start(restart?: boolean): void {
      const data = props.data;
      AY = [];
      X = { min: 0, max: 0, d: 0 };
      TYPES = {};
      IDs = [ID as string];
      A = { previewA: V.showPreview ? 1 : 0 };

      if (!data) return error("The data parameter is missing.");

      if (!data.x || !(data.x instanceof Array))
        return error("The x-axis data is missing.");

      const type = props.type || "line";
      [
        "line",
        "stacked",
        "area",
        "percentage",
        "multi_yaxis",
        "bar",
        "pie",
      ].forEach(function (t) {
        (TYPES as Record<string, boolean>)[t] = type.indexOf(t) >= 0;
      });

      Object.keys(data).forEach(function (n) {
        const d = data[n];

        if (n === "x") AX = d;
        else
          AY.push({
            data: d,
            color: (props.colors || {})[n],
            buttonTextColor: (props.buttonTextColor || {})[n],
            hideFromLegend: (props.hideFromLegend || {})[n],
            disabled: (props.disabled || props.off || {})[n],
            fillColor: (props.fillColors || {})[n],
            name: (props.names || {})[n],
            type: props.type,
          });
      });

      AYL = AY.length;
      AXL = AX.length;
      X.min = AX[0];
      X.max = AX[AXL - 1];
      X.d = X.max - X.min;

      if (V.globalStart !== X.min || V.globalEnd !== X.max) {
        V.localStart = props.startX || (2 / 3) * X.d + X.min;
        V.localEnd = props.endX || X.max;
        V.globalStart = X.min;
        V.globalEnd = X.max;
        V.prevStepGridX = undefined;
      }

      V.localMM = undefined;
      V.globalMM = undefined;

      TYPES.linear = TYPES.line || TYPES.multi_yaxis;
      updateVars();
      A = { previewA: V.showPreview ? 1 : 0 };

      for (let i = 0; i < AYL; i++) {
        const S = AY[i];
        let off = false;

        S._color = S.color;
        S._fillColor = S.fillColor;
        S._buttonTextColor = S.buttonTextColor;
        S._hideFromLegend = S.hideFromLegend;

        if (!TYPES.percentage) {
          STREE_MAX[i] = initSTree(S.data);
          buildSTree(STREE_MAX[i], S.data, Math.max);
          STREE_MIN[i] = initSTree(S.data);
          buildSTree(STREE_MIN[i], S.data, Math.min);
        }

        if (
          parentSeries &&
          parentSeries[i] &&
          parentSeries[i].name === S.name
        ) {
          off = parentSeries[i].off || false;
        }

        S.off = S.disabled !== undefined ? S.disabled : off;
        A["alphaY" + i] = S.off ? 0 : 1;
        A["on" + i] = S.off ? 0 : 1;
      }

      V.minBrushSize = (X.d * UI.preview.minBrushSize) / 100;
      V.seriesCount = AYL;

      setTheme();

      if (!restart) {
        if (parent) {
          parent.togglePreview(V.showPreview);
        } else {
          const el = byId(ID as string);
          if (el) {
            el.innerHTML = parse(CHARTY_TEMPLATE);
            IDs.forEach((id) => enhanceElement(id));
            togglePreview(V.showPreview);
            const titleEl = UI.title as EnhancedElement | undefined;
            if (titleEl) titleEl.innerText = props.title || "";
            const canvasEl = UI.canvas as unknown as
              | HTMLCanvasElement
              | undefined;
            if (canvasEl) ctx = canvasEl.getContext("2d");
            hookEvents();
          }
        }
      }

      renderLegend();
      renderCtrls();
      updateTheme();

      V.forceUpdate = true;
      repaint();
      measureUI();
      if (!restart) {
        render();
      }
    }

    // =========================================================================
    // Coordinate Conversion
    // =========================================================================

    function xToIdx(x: number): number {
      return applyRange(
        Math.round(((AXL - 1) * (x - X.min)) / X.d),
        0,
        AXL - 1,
      );
    }

    function xToIdxUp(x: number): number {
      return applyRange(Math.ceil(((AXL - 1) * (x - X.min)) / X.d), 0, AXL - 1);
    }

    function xToIdxDown(x: number): number {
      return applyRange(
        Math.floor(((AXL - 1) * (x - X.min)) / X.d),
        0,
        AXL - 1,
      );
    }

    function valToX(v: number): number {
      return (
        ((v - (V.globalStart || 0)) /
          ((V.globalEnd || 1) - (V.globalStart || 0))) *
          (UI.preview.width || 0) +
        UI.chart.hPadding
      );
    }

    function xToVal(x: number): number {
      return (
        ((x - UI.preview.handleW / 2 - UI.chart.hPadding) /
          (UI.preview.width || 1)) *
          ((V.globalEnd || 1) - (V.globalStart || 0)) +
        (V.globalStart || 0)
      );
    }

    // =========================================================================
    // Animation
    // =========================================================================

    function doAnimations(time: number): void {
      let completed = true;

      for (const name in animations) {
        const a = animations[name];

        if (a.off) continue;

        if (!a.started) a.started = time;

        if (props.animated === false) {
          a.update ? a.update(a.to) : (A[name] = a.to);
          a.cb && a.cb();
          a.off = true;
        } else {
          const d = time - a.started;
          const v = a.ease(d, a.from, a.to - a.from, a.duration);

          a.update ? a.update(v) : (A[name] = v);
          if (d > a.duration) {
            a.update ? a.update(a.to) : (A[name] = a.to);
            a.cb && a.cb();
            a.off = true;
          } else completed = false;
        }

        repaint();
        parent && parent.repaint();
      }

      if (completed) animations = {};
    }

    // =========================================================================
    // Rendering - Preview
    // =========================================================================

    function renderHandle(x: number): void {
      const canvasEl = UI.canvas as EnhancedElement | undefined;
      if (!canvasEl?.rect) return;

      canvasEl.rect(
        x,
        UI.chart.height - (UI.preview.height + UI.preview.handleTick) / 2,
        2,
        UI.preview.handleTick,
        2,
        true,
        true,
      );
    }

    function renderBrush(a: number): void {
      if (!ctx) return;

      const hw = UI.preview.handleW;
      const start = valToX(V.localStart || 0);
      const end = valToX(V.localEnd || 0);
      const canvasEl = UI.canvas as EnhancedElement | undefined;

      ctx.strokeStyle = UI.preview.brushColor || "";
      ctx.globalAlpha = a;
      ctx.lineWidth = 1;

      if (TYPES.bar || TYPES.area || TYPES.pie) {
        ctx.fillStyle = UI.preview.brushBorderColor || "";
        ctx.globalAlpha = UI.preview.brushBorderAlpha ?? 1;
        canvasEl?.rect?.(
          start - hw - 1,
          (UI.preview.y || 0) - 1,
          hw + 3,
          UI.preview.height + 3,
          UI.preview.radius + 1,
          true,
        );
        canvasEl?.rect?.(
          end - 1,
          (UI.preview.y || 0) - 1,
          hw + 3,
          UI.preview.height + 3,
          UI.preview.radius + 1,
          false,
          true,
        );
      }

      ctx.globalAlpha = a;
      ctx.fillStyle = UI.preview.brushColor || "";
      canvasEl?.rect?.(
        start - hw,
        UI.preview.y || 0,
        hw,
        UI.preview.height,
        UI.preview.radius,
        true,
      );
      canvasEl?.rect?.(
        end,
        UI.preview.y || 0,
        hw,
        UI.preview.height,
        UI.preview.radius,
        false,
        true,
      );
      ctx.strokeRect(
        start,
        (UI.preview.y || 0) + UI.preview.vPadding / 2,
        end - start,
        UI.preview.height - UI.preview.vPadding,
      );
      ctx.fillStyle = UI.preview.handleColor || "#fff";
      renderHandle(start - 6);
      renderHandle(end + 4);
    }

    function renderPreview(): void {
      if (!ctx) return;

      const h = UI.preview.height;
      const minH = UI.preview.minHeight || 0;
      const w = UI.preview.width || 0;
      const a = A["previewA"] || 0;
      const canvasEl = UI.canvas as EnhancedElement | undefined;

      if (!parent) {
        ctx.clearRect(
          0,
          (UI.xAxis.y || 0) + 5,
          UI.main.width || 0,
          UI.xAxis.height + h,
        );
      }

      if (!V.showPreview) return;

      ctx.save();
      canvasEl?.rect?.(
        UI.chart.hPadding,
        (UI.preview.y || 0) + UI.preview.vPadding,
        w,
        minH,
        UI.preview.radius,
        !V.showBrush ||
          valToX(V.localStart || 0) >
            UI.chart.hPadding + UI.preview.handleW / 2,
        !V.showBrush ||
          valToX(V.localEnd || 0) <
            (UI.main.width || 0) - UI.chart.hPadding - UI.preview.handleW / 2,
        true,
      );
      ctx.lineWidth = UI.preview.lineWidth;
      ctx.globalAlpha = a;
      renderSeries(
        "global",
        a,
        w,
        h - 2 * UI.preview.vPadding,
        V.globalStart || 0,
        V.globalEnd || 0,
        0,
        UI.chart.height - UI.preview.vPadding,
        UI.chart.hPadding,
        true,
      );
      if (V.showBrush) {
        ctx.fillStyle = UI.preview.maskColor || "";
        ctx.globalAlpha = a * (UI.preview.maskAlpha ?? 0.6);
        ctx.fillRect(
          UI.chart.hPadding,
          (UI.preview.y || 0) + UI.preview.vPadding,
          valToX(V.localStart || 0) - UI.chart.hPadding,
          minH,
        );
        ctx.fillRect(
          valToX(V.localEnd || 0),
          (UI.preview.y || 0) + UI.preview.vPadding,
          (UI.main.width || 0) +
            UI.preview.handleW -
            UI.chart.hPadding -
            valToX(V.localEnd || 0),
          minH,
        );
      }
      ctx.restore();
      if (V.showBrush) renderBrush(a);
    }

    // =========================================================================
    // Rendering - Axis
    // =========================================================================

    function renderAxis(): void {
      if (!ctx) return;
      if (TYPES.pie || !V.showMainArea) return;

      let localD: number;
      let localMin: number;
      let localMax = 0;
      let minLocalD: number | undefined;
      let lowerMin: number | undefined;
      const p = Math.min(1, V.progress);

      ctx.font = "11px " + FONT;
      if (TYPES.percentage) {
        localMin = 0;
        localMax = 100;
      } else if (TYPES.stacked || TYPES.bar || TYPES.percentage) {
        for (let i = 0; i < AYL; i++) {
          const val = (AY[i].max || 0) * (A["on" + i] || 0);
          localMax = TYPES.stacked ? localMax + val : Math.max(localMax, val);
        }
        localMin = 0;
      } else if (TYPES.multi_yaxis) {
        localMin = Math.max(A["localMinY0"] || 0, A["localMinY1"] || 0);
        localMax = localMin + Math.max(A["localDY0"] || 0, A["localDY1"] || 0);
        minLocalD = Math.min(A["localDY0"] || 0, A["localDY1"] || 0);
        lowerMin = Math.min(A["localMinY0"] || 0, A["localMinY1"] || 0);
      } else {
        localMax = V.localMM?.max || 0;
        localMin = V.localMM?.min || 0;
      }
      localD = localMax - localMin;
      if (!localD) {
        localMin -= 1;
        localMax += 1;
        localD = localMax - localMin;
      }
      const w = (UI.main.width || 0) - 2 * UI.chart.hPadding;
      const scaleX = w / ((V.localEnd || 0) - (V.localStart || 0));
      const scaleY = ((UI.main.height || 0) - 22) / localD;
      const start = xToIdxDown(
        (V.localStart || 0) - UI.chart.hPadding / scaleX,
      );
      const end = xToIdxUp((V.localEnd || 0) + UI.chart.hPadding / scaleX);
      const y = (UI.xAxis.y || 0) + UI.xAxis.height / 2;
      let stepGridX = props.xAxisStep
        ? props.xAxisStep
        : Math.pow(
            2,
            Math.ceil(Math.log((3 * UI.xAxis.textWidth * (end - start)) / w)),
          ) || 1;
      let stepGridY = Math.round(localD / UI.yAxis.textCount) || 1;
      const d = 5 * Math.pow(10, stepGridY.toString().length - 2) || 1;

      stepGridY = Math.max(1, Math.round(stepGridY / d) * d);

      if (V.stepGridX !== stepGridX) {
        if (V.stepGridX) {
          if (V.stepGridX < stepGridX)
            animate("stepGridXA" + V.stepGridX, 1, 0, UI.xAxis.fadeTime);
          V.prevStepGridX = V.stepGridX;
        }
        if (!V.prevStepGridX || stepGridX < V.prevStepGridX)
          animate("stepGridXA" + stepGridX, 0, 1, UI.xAxis.fadeTime);
        if (stepGridX > V.prevStepGridX) A["stepGridXA" + stepGridX] = 1;
        V.stepGridX = stepGridX;
      }

      if (V.prevStepGridX)
        renderXText(1, V.prevStepGridX, start, end, scaleX, y, 1 - p);

      renderXText(0, stepGridX, start, end, scaleX, y, 1 - p);

      if (V.stepGridY !== stepGridY) {
        if (V.stepGridY) {
          animate(
            "stepGridYA" + V.stepGridY,
            1,
            0,
            UI.yAxis.fadeTime / 2,
            undefined,
            undefined,
            function () {
              V.prevStepGridY = 0;
              V.yPos = [];
            },
          );
          V.prevStepGridY = V.stepGridY;
        }
        animate("stepGridYA" + stepGridY, 0, 1, UI.yAxis.fadeTime);
        V.stepGridY = stepGridY;
      }

      if (V.prevStepGridY)
        renderYText(
          1,
          V.prevStepGridY,
          scaleY,
          localMin,
          localMax,
          localD,
          minLocalD,
          lowerMin,
          1 - p,
        );

      renderYText(
        0,
        stepGridY,
        scaleY,
        localMin,
        localMax,
        localD,
        minLocalD,
        lowerMin,
        1 - p,
      );

      if (TYPES.percentage) {
        ctx.globalAlpha = (UI.xAxis.textAlpha ?? 1) * (1 - p);
        ctx.fillStyle = UI.yAxis.textColor || "";
        ctx.fillText("100", UI.chart.hPadding, 12);
      }
    }

    function renderXText(
      prevStep: number,
      stepGridX: number,
      start: number,
      end: number,
      scaleX: number,
      y: number,
      p: number,
    ): void {
      if (!ctx) return;

      let a = A["stepGridXA" + stepGridX];
      if (a === undefined) a = 1;

      a = a * (UI.xAxis.textAlpha ?? 1) * p;

      if (a === 0) return;

      const adjustedStart = start - (start % stepGridX);
      ctx.fillStyle = UI.xAxis.textColor || "";
      ctx.globalAlpha = a;
      for (let i = adjustedStart; i <= end; i += stepGridX) {
        if (
          !prevStep &&
          stepGridX < V.prevStepGridX! &&
          i % V.prevStepGridX! === 0
        )
          continue;
        if (
          prevStep &&
          stepGridX > V.prevStepGridX! &&
          i % V.prevStepGridX! === 0
        )
          continue;
        if (
          prevStep &&
          V.stepGridX! > V.prevStepGridX! &&
          i % V.stepGridX! === 0
        )
          continue;
        const x = UI.chart.hPadding + (AX[i] - (V.localStart || 0)) * scaleX;
        const u =
          props.xAxisType instanceof Function
            ? props.xAxisType(AX[i])
            : DATA_TYPES[props.xAxisType as string]?.(AX[i]) || String(AX[i]);
        ctx.fillText(u, x, y);
      }
    }

    function renderYText(
      prevStep: number,
      stepGridY: number,
      scaleY: number,
      localMin: number,
      localMax: number,
      localD: number,
      minLocalD?: number,
      lowerMin?: number,
      p?: number,
    ): void {
      if (!ctx) return;

      let y_ = localMin;
      let yPos: number;
      let val: string;
      let c = 0;
      const a0 = TYPES.multi_yaxis ? A["alphaY0"] ?? 1 : 1;
      const a1 = TYPES.multi_yaxis ? A["alphaY1"] ?? 1 : 1;
      const a = A["stepGridYA" + stepGridY] || 0;

      while (y_ < localMax) {
        let y__ = c === 0 && stepGridY > 10 ? Math.ceil(y_ / 10) * 10 : y_;

        yPos = (UI.xAxis.y || 0) - (y_ - localMin) * scaleY;
        if (prevStep && c > 0) {
          const v = V.yPos[c];
          if (v) yPos = yPos + (yPos - V.yPos[c]) * a;
        }
        val = "" + Math.floor(c === 0 ? localMin : y__);

        ctx.globalAlpha = a * (p ?? 1) * a0 * (UI.yAxis.textAlpha ?? 1);
        ctx.fillStyle = TYPES.multi_yaxis
          ? AY[0].color || ""
          : UI.yAxis.textColor || "";
        const u =
          props.yAxisType instanceof Function
            ? props.yAxisType(val)
            : DATA_TYPES[props.yAxisType as string]?.(Number(val)) || val;
        ctx.fillText(u, UI.chart.hPadding, yPos - 5);
        if (TYPES.multi_yaxis) {
          ctx.fillStyle = AY[1]?.color || UI.yAxis.textColor || "";
          let numVal = Math.max(
            0,
            Math.floor(
              (lowerMin || 0) + ((y_ - localMin) / localD) * (minLocalD || 0),
            ),
          );
          if (c > 0 && numVal > 50) numVal = Math.ceil(numVal / 10) * 10;
          ctx.globalAlpha = a * (p ?? 1) * a1;
          const u2 =
            props.yAxisType instanceof Function
              ? props.yAxisType(numVal)
              : DATA_TYPES[props.yAxisType as string]?.(numVal) ||
                String(numVal);
          ctx.fillText(
            u2,
            (UI.main.width || 0) -
              UI.chart.hPadding -
              ctx.measureText(u2).width -
              5,
            yPos - 5,
          );
        }

        const canvasEl = UI.canvas as EnhancedElement | undefined;
        canvasEl?.line?.(
          UI.chart.hPadding,
          yPos,
          (UI.main.width || 0) - UI.chart.hPadding,
          yPos,
          UI.grid.lineWidth,
          UI.grid.color || "",
          a * (UI.grid.alpha ?? 0.1) * (p ?? 1),
        );
        if (!prevStep) V.yPos[c] = yPos;
        if (c === 0 && stepGridY > 10) {
          y__ = y__ + (stepGridY - (y__ % stepGridY));
          y_ = y__ - y_ < stepGridY * 0.6 ? y__ + stepGridY : y__;
        } else y_ += stepGridY;
        c++;
      }
    }

    // =========================================================================
    // Rendering - Charts
    // =========================================================================

    function buildColorStyle(color: ColorValue): string | CanvasGradient {
      if (!ctx) return "";

      if (color instanceof Object) {
        let gradient: CanvasGradient;
        if (color.type === "linear_gradient_h")
          gradient = ctx.createLinearGradient(0, 0, UI.main.width || 0, 0);
        else gradient = ctx.createLinearGradient(0, 0, 0, UI.main.height || 0);

        color.colors.forEach(function (c: string, i: number, arr: string[]) {
          gradient.addColorStop(i / (arr.length - 1), c);
        });
        return gradient;
      }
      return color;
    }

    function renderLinear(
      type: string,
      height: number,
      vStart: number,
      hPadding: number,
      offsetY: number,
      offsetX: number,
      startIdx: number,
      endIdx: number,
      scaleX: number,
      _scaleY: number,
    ): void {
      if (!ctx) return;

      height -= UI.grid.markerRadius + UI.grid.markerLineWidth;
      const canvasEl = UI.canvas as EnhancedElement | undefined;

      for (let s = 0; s < AYL; s++) {
        const data = AY[s].data;
        const color = buildColorStyle(AY[s].color || "");
        const fillColor = AY[s].fillColor
          ? buildColorStyle(AY[s].fillColor as ColorValue)
          : "";

        canvasEl?.startLine?.(
          (1 - V.progress) * (A["alphaY" + s] || 0),
          color as string,
          fillColor as string,
          ctx.lineWidth,
        );
        const idx = TYPES.multi_yaxis ? String(s) : "";
        const scaleY = height / (A[type + "DY" + idx] || 1);
        let startX = 0;
        for (let i = startIdx; i <= endIdx; i++) {
          const x = offsetX + hPadding + (AX[i] - vStart) * scaleX;
          if (i === startIdx) {
            startX = x;
            ctx.moveTo(
              x,
              offsetY - (data[i] - (A[type + "MinY" + idx] || 0)) * scaleY,
            );
          }
          ctx.lineTo(
            x,
            offsetY - (data[i] - (A[type + "MinY" + idx] || 0)) * scaleY,
          );
        }
        if (fillColor) {
          ctx.stroke();
          ctx.lineTo(
            offsetX + hPadding + (AX[endIdx] - vStart) * scaleX,
            offsetY,
          );
          ctx.lineTo(startX, offsetY);
          ctx.fill();
        } else ctx.stroke();
      }
    }

    function renderBars(
      type: string,
      masterA: number,
      _width: number,
      height: number,
      vStart: number,
      hPadding: number,
      offsetY: number,
      offsetX: number,
      isPreview: boolean,
      startIdx_: number,
      endIdx: number,
      scaleX: number,
    ): void {
      if (!ctx) return;

      let selectedIdx = -1;
      const p = 1 - V.progress;
      const startIdx = xToIdxDown(vStart - hPadding / scaleX);
      const barWidth = (UI.main.width || 0) / (endIdx - startIdx_ - 0.5);
      let max = 0;
      const STACK = new Array(AXL);
      let selectX = 0;
      let selectY = 0;
      let selectH = 0;

      for (let s = 0; s < AYL; s++) {
        const val = (A[type + "DY" + s] || 0) * (A["on" + s] || 0);
        max = TYPES.stacked ? max + val : Math.max(max, val);
      }

      if (V.showLegend && V.vLineX !== undefined && V.vLineX >= 0) {
        const x =
          (V.localStart || 0) +
          (((V.highlightedX || 0) - UI.chart.hPadding) /
            (UI.preview.width || 1)) *
            ((V.localEnd || 0) - (V.localStart || 0));
        selectedIdx = xToIdxDown(x);
      }

      for (let s = 0; s < AYL; s++) {
        const alpha = (A["alphaY" + s] || 0) * p;
        ctx.globalAlpha =
          masterA * (isPreview ? alpha : selectedIdx >= 0 ? 0.5 : alpha);
        ctx.fillStyle = AY[s].color || "";
        ctx.beginPath();
        const scaleY = (height + (UI.main.vPadding || 0) / 2) / max;
        for (let i = startIdx; i <= endIdx; i++) {
          const val = AY[s].data[i] * (A["on" + s] || 0);
          const stack = STACK[i] || 0;
          const x = offsetX + hPadding + (AX[i] - vStart) * scaleX;
          ctx.rect(x, offsetY - stack * scaleY, barWidth, -val * scaleY);
          if (selectedIdx === i) {
            selectX = x;
            selectY = offsetY - stack * scaleY;
            selectH = -val * scaleY;
          }
          if (TYPES.stacked) STACK[i] = stack + val;
        }
        ctx.fill();
        if (!isPreview && selectedIdx >= 0) {
          ctx.globalAlpha = alpha * masterA;
          ctx.fillRect(selectX, selectY, barWidth, selectH);
        }
      }
    }

    function renderArea(
      type: string,
      masterA: number,
      width: number,
      height: number,
      vStart: number,
      vEnd: number,
      hPadding: number,
      offsetY: number,
      offsetX: number,
      isPreview: boolean,
    ): void {
      if (!ctx) return;

      let scaleX = width / (vEnd - vStart);
      let startIdx = xToIdxDown(vStart - hPadding / scaleX);
      let endIdx = xToIdxUp(vEnd + hPadding / scaleX);
      const STACK = new Array(AXL);
      const progress = isPreview ? 0 : V.progress;
      const R = Math.min(UI.main.height || 0, UI.main.width || 0) / 2 - 25;
      const p = Math.min(1, progress);
      const _p = 1 - progress;
      const canvasEl = UI.canvas as EnhancedElement | undefined;

      if (p > 0 && !isPreview) {
        vStart = V._localStart || 0;
        vEnd = V._localEnd || 0;
        scaleX = width / (vEnd - vStart);
        startIdx = xToIdxDown(vStart - hPadding / scaleX);
        endIdx = xToIdxUp(vEnd + hPadding / scaleX);
      }

      if (!isPreview) height += UI.main.vPadding || 0;

      const _height = height / (1 + progress);
      const scaleY = _height / 100;
      let angle = 0;
      let filled = false;

      if (!isPreview) {
        offsetX -= (UI.main.width || 0) / 2;
        offsetY -= R + 15;

        ctx.save();
        if (p < 1)
          canvasEl?.rect?.(
            p * ((UI.main.width || 0) / 2 - R),
            25 * p,
            2 * R * p + (1 - p) * ((UI.main.width || 0) - hPadding),
            2 * R + 50 * _p,
            p * R,
            true,
            true,
            true,
          );

        ctx.translate((UI.main.width || 0) / 2, (UI.main.height || 0) / 2);
        if (!isPreview && p <= PIE_VISIBLE)
          ctx.transform(1 + p, 0, 0, 1 + p, 0, 0);

        if (p > PIE_VISIBLE)
          renderPie(
            xToIdx(V.localStart || 0),
            xToIdx((V.localEnd || 0) - (V.zoomStepX || 1)),
            masterA,
            R,
          );
      }

      if (p <= PIE_VISIBLE || isPreview) {
        angle = 0;

        for (let s = AYL - 1; s >= 0; s--) {
          const S = AY[s];
          const selectedVal = S.data[V.selectedIndex || 0] || 0;
          const percent = selectedVal / (TOTALS[V.selectedIndex || 0] || 1);
          const sector = 180 * percent;
          let centered = false;
          let da = 0;
          const alpha = A["on" + s] || 0;

          if (!isPreview) {
            da = 180 * progress * percent * alpha * PI_RAD;
            ctx.rotate(angle + da);
          }

          canvasEl?.startLine?.(alpha, undefined, S.color, ctx.lineWidth);

          let startX = 0;
          for (let i = startIdx; i <= endIdx; i++) {
            const stack = STACK[i] || 0;
            const val = ((100 * S.data[i]) / TOTALS[i]) * alpha;
            const x = offsetX + hPadding + (AX[i] - vStart) * scaleX;
            const y = offsetY - _height + _p * stack * scaleY;
            const dy = isPreview
              ? 0
              : Math.abs(x) / Math.tan((90 * _p + progress * sector) * PI_RAD);
            if (i === startIdx) {
              startX = x;
              ctx.moveTo(x, _p * y + dy);
            } else {
              if (!centered && x >= 0 && progress > 0.5) {
                centered = true;
                ctx.lineTo(x * _p, _p * (_p * y + dy));
              } else ctx.lineTo(x, _p * y + dy);
            }
            if (i === endIdx) {
              if (!S.off && !filled) {
                filled = true;
                ctx.globalAlpha = masterA;
                ctx.fillStyle = S.color || "";
                ctx.fillRect(startX, -offsetY + 26, x - startX, 2 * offsetY);
                if (V.seriesCount === 1) break;
              } else {
                ctx.lineTo(x, 2 * offsetY);
                ctx.lineTo(
                  offsetX + hPadding + (AX[startIdx] - vStart) * scaleX,
                  2 * offsetY,
                );
              }
            }
            STACK[i] = stack + val;
          }
          ctx.fill();
          if (!isPreview) {
            ctx.rotate(-angle - da);
            angle += 2 * da;
          }
          if (V.seriesCount === 1 && !S.off) break;
        }
      }
      if (!isPreview) {
        ctx.restore();
        renderPieLegend(p, R, masterA);
      }
    }

    function renderPieLegend(p: number, R: number, masterA: number): void {
      if (!ctx) return;

      for (let s = AYL - 1; s >= 0; s--) {
        const S = AY[s];
        const val = Math.round((S.percent || 0) * 100);

        if (S.off) continue;

        const fontSize = 13 + (S.percent || 0) * 30;
        const r = val < 4 ? R + fontSize + 2 : R / 1.25;
        const text = val < 1 ? "<1%" : val + "%";

        ctx.font = fontSize + "px " + FONT;
        const ts = ctx.measureText(text);
        const x =
          (UI.main.width || 0) / 2 +
          (1 - (S.percent || 0)) * r * Math.cos(S.angle || 0) -
          ts.width / 2 +
          2 * (S.dx || 0);
        const y =
          (UI.main.height || 0) / 2 +
          (1 - (S.percent || 0)) * r * Math.sin(S.angle || 0) +
          fontSize / 4 +
          2 * (S.dy || 0);

        ctx.globalAlpha = p * (S.alpha || 0) * masterA;
        ctx.fillStyle = val < 4 ? S.color || "" : UI.pie?.textColor || "";
        ctx.fillText(text, x, y);
      }
    }

    function renderPie(
      startIdx: number,
      endIdx: number,
      masterA: number,
      R_?: number,
    ): void {
      if (!ctx) return;

      const R =
        R_ || Math.min(UI.main.height || 0, UI.main.width || 0) / 2 - 25;
      const values = new Array(AYL);
      let totals = 0;
      let angle = 90 * PI_RAD;
      let segment: number | undefined;
      const progress = TYPES.pie ? 1 : V.progress;

      for (let s = 0; s < AYL; s++) {
        const S = AY[s];
        const a = A["on" + s] || 0;

        for (let i = startIdx; i <= endIdx; i++) {
          const val = S.data[i];
          values[s] = i === startIdx ? val : values[s] + val;
          if (s === 0) totals += TOTALS[i];
        }
      }

      if (!TYPES.area) {
        ctx.save();
        ctx.translate((UI.main.width || 0) / 2, (UI.main.height || 0) / 2);
      }

      let sectorA: number | undefined;
      let sectorR: number | undefined;
      if (!isNaN(V.pieX as number)) {
        sectorR = Math.sqrt((V.pieX || 0) ** 2 + (V.pieY || 0) ** 2);
        sectorA = Math.atan2(V.pieY || 0, V.pieX || 0);

        sectorA -= 90 * PI_RAD;
        if (sectorA < 0) sectorA += 2 * Math.PI;
      }

      for (let s = AYL - 1; s >= 0; s--) {
        const S = AY[s];
        const alpha = A["on" + s] || 0;
        const percent = values[s] / totals;
        const z = A["pieZoom" + s] || 0;
        const a = 360 * progress * percent * alpha * PI_RAD;
        const startA = angle - 90 * PI_RAD;
        const dx =
          z *
          (UI.pie?.segmentShift || 5) *
          Math.cos(90 * PI_RAD + startA + a / 2);
        const dy =
          z *
          (UI.pie?.segmentShift || 5) *
          Math.sin(90 * PI_RAD + startA + a / 2);
        const dr = z * (UI.pie?.segmentShift || 5);
        const val = Math.round(percent * 100);

        PERCENTS[s] = percent;

        if (
          val >= 1 &&
          sectorR !== undefined &&
          sectorR <= R &&
          sectorA !== undefined &&
          sectorA >= startA &&
          sectorA < startA + a
        )
          segment = s;

        S.angle = angle + a / 2;
        S.percent = alpha * percent;
        S.alpha = alpha;
        S.val = values[s];
        S.dx = dx;
        S.dy = dy;
        S.z = z;

        ctx.globalAlpha = masterA;
        ctx.fillStyle = S.color || "";
        ctx.beginPath();
        ctx.moveTo(dx, dy);

        if (V.seriesCount === 1 && !S.off) {
          ctx.arc(0, 0, R + dr, angle, angle + 360 * PI_RAD);
          ctx.fill();
          break;
        } else {
          const d = dr / (360 - 180 * percent);
          ctx.arc(dx, dy, R + dr, angle + d, angle + a + PI_RAD * alpha - d);
        }
        ctx.fill();
        angle += a;
      }

      if (segment !== undefined) {
        if (V.segment !== segment) {
          animate("pieZoom" + segment, 0, 1, ON_OFF_DURATION);
          if (V.segment !== undefined)
            animate("pieZoom" + V.segment, 1, 0, ON_OFF_DURATION);
          V.segment = segment;
        }
      } else if (V.segment !== undefined) {
        animate("pieZoom" + V.segment, 1, 0, ON_OFF_DURATION);
        V.segment = undefined;
      }

      if (!TYPES.area) {
        ctx.restore();
        renderPieLegend(progress, R, masterA);
      }
    }

    function renderSeries(
      type: string,
      masterA: number,
      width: number,
      height: number,
      vStart: number,
      vEnd: number,
      hPadding: number,
      offsetY: number,
      offsetX: number | boolean,
      isPreview: boolean,
    ): void {
      if (!ctx) return;

      const scaleX = width / (vEnd - vStart);
      const startIdx = xToIdx(vStart - hPadding / scaleX);
      const endIdx = xToIdx(vEnd + hPadding / scaleX);

      ctx.globalAlpha = masterA;
      if (TYPES.bar)
        renderBars(
          type,
          masterA,
          width,
          height,
          vStart,
          hPadding,
          offsetY,
          offsetX as number,
          isPreview,
          startIdx,
          endIdx,
          scaleX,
        );
      else if (TYPES.area || (TYPES.pie && isPreview))
        renderArea(
          type,
          masterA,
          width,
          height,
          vStart,
          vEnd,
          hPadding,
          offsetY,
          offsetX as number,
          isPreview,
        );
      else if (TYPES.pie) renderPie(startIdx, endIdx, masterA);
      else if (TYPES.linear)
        renderLinear(
          type,
          height + 7,
          vStart,
          hPadding,
          offsetY,
          offsetX as number,
          startIdx,
          endIdx,
          scaleX,
          0,
        );
    }

    function renderMain(): void {
      if (!ctx || !V.showMainArea) return;
      ctx.lineWidth = UI.main.lineWidth;
      renderSeries(
        "local",
        TYPES.percentage ? 1 : 1 - V.progress,
        UI.preview.width || 0,
        (UI.main.height || 0) - 1.5 * (UI.main.vPadding || 0),
        V.localStart || 0,
        V.localEnd || 0,
        UI.chart.hPadding,
        UI.main.height || 0,
        false,
        false,
      );
      renderGrid();
    }

    // =========================================================================
    // Layout & Measurement
    // =========================================================================

    function measureUI(): void {
      const ww = window.innerWidth;
      const wh = window.innerHeight;
      const pageYOffset = window.pageYOffset;

      if (pageYOffset !== V.pageYOffset) {
        (UI.box as EnhancedElement | undefined)?.measure();
        V.pageYOffset = pageYOffset;
      }

      UI.chart.height = V.showMainArea
        ? CHART_HEIGHT
        : CHART_HEIGHT - MAIN_AREA_HEIGHT;

      if (V.needMeasure || V.prevW !== ww || V.prevH !== wh) {
        V.prevW = ww;
        V.prevH = wh;
        (UI.box as EnhancedElement | undefined)?.measure();
        if (UI.box && (UI.box as EnhancedElement).h! < UI.chart.height)
          V.prevH = 0;
        UI.main.height = UI.chart.height - UI.preview.height - UI.xAxis.height;
        UI.main.y = 0;
        UI.main.width = (UI.box as EnhancedElement | undefined)?.w || 0;
        UI.xAxis.y = (UI.main.y || 0) + (UI.main.height || 0);
        UI.preview.y = UI.chart.height - UI.preview.height;
        UI.preview.width = (UI.main.width || 0) - 2 * UI.chart.hPadding;
        UI.preview.minHeight = UI.preview.height - 2 * UI.preview.vPadding;
        const canvasEl = UI.canvas as EnhancedElement | undefined;
        if (canvasEl) {
          canvasEl
            .attr("width", String((UI.main.width || 0) * DPR))
            .attr("height", String(UI.chart.height * DPR))
            .stylo({ width: UI.main.width, height: UI.chart.height });
        }
        if (ctx) ctx.scale(DPR, DPR);
        repaint();
      }
      V.needMeasure = false;
    }

    function renderGrid(): void {
      if (!ctx) return;

      const showLegend = V.showLegend && !isNaN(V.vLineX as number);
      const canvasEl = UI.canvas as EnhancedElement | undefined;

      if (showLegend && (!(TYPES.bar || TYPES.pie) || TYPES.area)) {
        canvasEl?.line?.(
          V.vLineX || 0,
          TYPES.area ? 16 : 4,
          V.vLineX || 0,
          UI.main.height || 0,
          UI.grid.lineWidth,
          UI.grid.color || "",
          UI.grid.alpha,
        );
      }
      if (!V.zoomedChart)
        toggleLegend(showLegend || (TYPES.area && V.isZoomed));
    }

    function repaint(): void {
      STATE.repaint = true;
      if (V.zoomedChart) V.zoomedChart.repaint();
    }

    (this as ChartyInstance).repaint = repaint;

    (this as ChartyInstance).getSeries = function () {
      return AY;
    };

    (this as ChartyInstance).getProps = function () {
      return props;
    };

    (this as ChartyInstance).getVars = function () {
      return V;
    };

    (this as ChartyInstance).getAxesData = function () {
      return { AX: AX, AY: AY, X: X };
    };

    function updateRangeText(
      el: EnhancedElement,
      _start?: number,
      _end?: number,
    ): void {
      if (V.isZooming) return;

      if (!V.showRangeText) {
        el.innerText = "";
        return;
      }

      const start = _start === undefined ? V.localStart || 0 : _start;
      let end = _end === undefined ? V.localEnd || 0 : _end;
      let rangeText: string;
      const zoomedProps = V.zoomedChart ? V.zoomedChart.getProps() : undefined;
      const rangeTextType = zoomedProps
        ? zoomedProps.rangeTextType
        : props.rangeTextType;

      if (props.xAxisType === "date")
        end -= zoomedProps
          ? zoomedProps.zoomStepX || zoomedProps.stepX || 1
          : props.zoomStepX || V.stepX || 1;

      if (rangeTextType instanceof Function) {
        rangeText = rangeTextType(start, end);
      } else {
        const formatter = DATA_TYPES[rangeTextType as string];
        const startStr = formatter ? formatter(start) : String(start);
        const endStr = formatter ? formatter(end) : String(end);
        rangeText = startStr === endStr ? startStr : startStr + " - " + endStr;
      }

      el.innerText = rangeText;
    }

    // =========================================================================
    // Data Calculations
    // =========================================================================

    function recalcTotals(): void {
      TOTALS = new Array(AXL);
      for (let s = 0; s < AYL; s++) {
        for (let i = 0; i < AXL; i++) {
          const v = AY[s].data[i] * (A["on" + s] || 0);
          TOTALS[i] = s === 0 ? v : TOTALS[i] + v;
        }
      }
    }

    function minMax(start: number, end: number): MinMax {
      let min = Infinity;
      let max = -Infinity;
      const x1 = Math.max(0, start);
      const x2 = Math.min(AXL, end);

      function compare(u: number): void {
        if (u > max) max = u;
        if (u < min) min = u;
      }

      for (let y = 0; y < AYL; y++) {
        const S = AY[y];
        if (S.off && !TYPES.multi_yaxis) {
          S.max = 0;
          S.min = 0;
          S.d = 0;
          continue;
        }

        if (TYPES.stacked || TYPES.bar || TYPES.percentage) {
          if (V.autoScale) {
            S.max = querySTree(STREE_MAX[y], AXL, x1, x2, Math.max, -Infinity);
            S.min = 0;
          } else {
            S.max =
              props.maxY === undefined
                ? querySTree(STREE_MAX[y], AXL, 0, AXL, Math.max, -Infinity)
                : props.maxY;
            S.min = props.minY || 0;
          }
          S.d = S.max;
        } else if (TYPES.multi_yaxis) {
          if (V.autoScale) {
            S.min = querySTree(STREE_MIN[y], AXL, x1, x2, Math.min, Infinity);
            S.max = querySTree(STREE_MAX[y], AXL, x1, x2, Math.max, -Infinity);
          } else {
            S.min =
              props.minY === undefined
                ? querySTree(STREE_MIN[y], AXL, 0, AXL, Math.min, Infinity)
                : props.minY;
            S.max =
              props.maxY === undefined
                ? querySTree(STREE_MAX[y], AXL, 0, AXL, Math.max, -Infinity)
                : props.maxY;
          }
          S.d = (S.max || 0) - (S.min || 0);
        } else {
          compare(querySTree(STREE_MIN[y], AXL, x1, x2, Math.min, Infinity));
          compare(querySTree(STREE_MAX[y], AXL, x1, x2, Math.max, -Infinity));
        }
      }

      min = !V.autoScale && props.minY !== undefined ? props.minY : min;
      max = !V.autoScale && props.maxY !== undefined ? props.maxY : max;

      if (min === Infinity && V.localMM) return V.localMM;

      return { min: min, max: max, d: max - min };
    }

    function recalcMinMax(name: string, start: number, end: number): void {
      let MM: MinMax;

      if (V.autoScale) MM = minMax(start, end);
      else {
        MM = (V as unknown as Record<string, MinMax | undefined>)[
          name + "MM"
        ] as MinMax;
        if (!MM) MM = minMax(0, AXL);
      }

      if (TYPES.multi_yaxis || TYPES.stacked || TYPES.bar || TYPES.area) {
        if (!A[name + "DY0"]) {
          for (let i = 0; i < AYL; i++) {
            const s = AY[i];
            A[name + "MinY" + i] = s.min;
            A[name + "DY" + i] = s.d;
          }
        } else {
          for (let i = 0; i < AYL; i++) {
            const s = AY[i];
            const prevMM = s[(name + "MM") as keyof Series] as
              | MinMax
              | undefined;
            if (prevMM && (s.min !== prevMM.min || s.d !== prevMM.d)) {
              animate(name + "DY" + i, prevMM.d, s.d || 0, ANIMATE_DURATION);
              animate(
                name + "MinY" + i,
                prevMM.min,
                s.min || 0,
                ANIMATE_DURATION,
              );
            }
          }
        }
        for (let i = 0; i < AYL; i++) {
          const s = AY[i];
          (s as unknown as Record<string, MinMax>)[name + "MM"] = {
            min: s.min || 0,
            max: s.max || 0,
            d: s.d || 0,
          };
        }
      } else {
        const prevMM = (V as unknown as Record<string, MinMax | undefined>)[
          name + "MM"
        ];

        if (!prevMM || V.movingBrush) {
          A[name + "MinY"] = MM.min;
          A[name + "DY"] = MM.d;
        } else {
          if (MM.min !== prevMM.min || MM.d !== prevMM.d) {
            animate(name + "DY", prevMM.d, MM.d, ANIMATE_DURATION);
            animate(name + "MinY", prevMM.min, MM.min, ANIMATE_DURATION);
          }
        }
        (V as unknown as Record<string, MinMax>)[name + "MM"] = MM;
      }
    }

    // =========================================================================
    // Render Loop
    // =========================================================================

    function render(time?: number): void {
      if (AXL < 2 || V.isDestroyed) return;

      doAnimations(time || 0);
      requestAnimationFrame(render);

      if (V.needMeasure) measureUI();

      const localRangeChanged =
        V.prevLocalStart !== V.localStart || V.prevLocalEnd !== V.localEnd;
      const isZoomed =
        V.prevGlobalStart !== V.globalStart || V.prevGlobalEnd !== V.globalEnd;
      const seriesCountChanged = V.seriesCount !== V.prevSeriesCount;

      if (!STATE.repaint) return;

      if (TYPES.percentage || TYPES.pie) {
        if (
          !TOTALS ||
          V.forceUpdate ||
          V.isOnOffAnimating ||
          seriesCountChanged
        )
          recalcTotals();
      } else {
        if (seriesCountChanged || isZoomed || V.forceUpdate)
          recalcMinMax(
            "global",
            xToIdxUp(V.globalStart || 0),
            xToIdxUp(V.globalEnd || 0),
          );

        if (
          localRangeChanged ||
          seriesCountChanged ||
          isZoomed ||
          V.forceUpdate
        )
          recalcMinMax(
            "local",
            xToIdxUp(V.localStart || 0),
            xToIdxUp(V.localEnd || 0),
          );
      }

      if (localRangeChanged || isZoomed || V.forceUpdate)
        updateRangeText(UI.localRange as EnhancedElement);

      V.prevSeriesCount = V.seriesCount;
      V.prevLocalStart = V.localStart;
      V.prevLocalEnd = V.localEnd;
      V.prevGlobalStart = V.globalStart;
      V.prevGlobalEnd = V.globalEnd;

      if (!V.hidden && ctx) {
        if (!parent)
          ctx.clearRect(
            0,
            (UI.main.y || 0) - 5,
            UI.main.width || 0,
            UI.chart.height,
          );

        renderMain();
        renderPreview();
        renderAxis();
      }
      STATE.repaint = false;
      V.forceUpdate = false;
      if (V.zoomedChart) V.zoomedChart.repaint();
    }

    function animate(
      name: string,
      from: number,
      to: number,
      duration: number,
      update?: (value: number) => void,
      ease?: EasingFunction,
      cb?: () => void,
    ): void {
      update ? update(from) : (A[name] = from);
      animations[name] = {
        ease: ease || EASE.outQuad,
        from: from,
        to: to,
        duration: duration,
        update: update,
        cb: cb,
      };
    }

    // =========================================================================
    // Interaction Helpers
    // =========================================================================

    function whereAmI(x: number, y_: number): Area {
      const y = y_ - UI.chart.topPadding;
      let area: Area = AREA.HEADER as Area;

      if (y >= (UI.main.y || 0) && y < (UI.xAxis.y || 0))
        area = AREA.MAIN as Area;
      else if (y >= (UI.xAxis.y || 0) && y < (UI.preview.y || 0))
        area = AREA.XAXIS as Area;
      else if (y >= (UI.preview.y || 0)) {
        const start = valToX(V.localStart || 0);
        const end = valToX(V.localEnd || 0);
        if (
          x >= start - UI.preview.hitSlop &&
          x <= start + UI.preview.handleW + UI.preview.hitSlop / 2
        )
          area = AREA.BRUSH_LEFT as Area;
        else if (
          x > start + UI.preview.handleW &&
          x < end - UI.preview.handleW - UI.preview.hitSlop / 2
        )
          area = AREA.BRUSH_CENTER as Area;
        else if (
          x >= end - UI.preview.handleW - UI.preview.hitSlop / 2 &&
          x < end + UI.preview.hitSlop
        )
          area = AREA.BRUSH_RIGHT as Area;
        else area = AREA.PREVIEW as Area;
      }
      return area;
    }

    function updateCheckbox(
      i: number,
      off?: boolean,
      series_?: Series[],
    ): void {
      if (!V.showButtons) return;

      const to = off ? 0 : 1;
      const series = series_ || AY;
      const buttonColor = off
        ? series[i].buttonTextColor || series[i].color
        : series[i].buttonTextColor ||
          (currentTheme?.buttons || {}).color ||
          "#fff";

      const checkboxEl = (UI as Record<string, unknown>)[
        "checkbox" + i
      ] as EnhancedElement;
      const chkEl = (UI as Record<string, unknown>)[
        "chk" + i
      ] as EnhancedElement;
      const nameEl = (UI as Record<string, unknown>)[
        "name" + i
      ] as EnhancedElement;

      if (checkboxEl) {
        checkboxEl
          .attr(
            "class",
            typeof styles !== "undefined"
              ? (styles as Record<string, string>)["checkbox"]
              : "checkbox " + (off ? "off" : "on"),
          )
          .stylo({
            backgroundColor: off ? "transparent" : series[i].color,
            borderColor: series[i].color,
          });
      }
      if (chkEl) {
        chkEl.stylo(
          {
            transform: "scale(" + to + ")",
            opacity: to,
            fill: buttonColor,
          },
          true,
        );
      }
      if (nameEl) {
        nameEl.stylo({
          transform: "translate3d(" + (to - 1) * 8 + "px, 0, 0)",
          color: buttonColor,
        });
      }
    }

    function toggleCheckbox(i: number, off?: boolean): void {
      const s = AY[i];
      s.off = off !== undefined ? off : !s.off;
      V.seriesCount = (V.seriesCount || 0) + (s.off ? -1 : 1);
      const from = s.off ? 1 : 0;
      const to = s.off ? 0 : 1;

      updateCheckbox(i, s.off);

      if (TYPES.stacked || TYPES.bar || TYPES.percentage || TYPES.pie) {
        V.isOnOffAnimating = true;
        animate(
          "on" + i,
          from,
          to,
          ON_OFF_DURATION,
          undefined,
          s.off ? EASE.outQuad : EASE.inQuad,
          function () {
            V.isOnOffAnimating = false;
            V.forceUpdate = true;
          },
        );
        A["alphaY" + i] = 1;
      } else {
        animate("alphaY" + i, from, to, ON_OFF_DURATION);
      }
      if (V.zoomedChart) V.zoomedChart.toggleCheckbox(i, off);
      toggleLegend(false);
    }

    (this as ChartyInstance).toggleCheckbox = toggleCheckbox;

    function toggleLegend(on?: boolean): void {
      if (!ctx) return;

      const pieMode = TYPES.pie || (TYPES.percentage && V.isZoomed);
      if (!pieMode && !(on !== V.legendIsVisible)) return;

      if (pieMode && isNaN(V.segment as number)) {
        hideLegend();
        return;
      }

      const legendEl = UI.legend as EnhancedElement | undefined;
      if (!legendEl) return;

      if (on) {
        let y: number;
        const p = Math.min(1, V.progress);
        let x =
          (V.localStart || 0) +
          (((V.vLineX || 0) - UI.chart.hPadding) / (UI.preview.width || 1)) *
            ((V.localEnd || 0) - (V.localStart || 0));
        const idx = TYPES.bar ? xToIdxDown(x) : xToIdx(x);
        const scaleX =
          (UI.preview.width || 1) / ((V.localEnd || 0) - (V.localStart || 0));
        const dy = TYPES.linear
          ? UI.grid.markerRadius + UI.grid.markerLineWidth
          : 0;
        const scaleY =
          ((UI.main.height || 0) - (UI.main.vPadding || 0) - dy) /
          (A.localDY || 1);
        let side = 1;
        let sum = 0;

        const xvalEl = (UI as Record<string, unknown>)[
          "xval"
        ] as EnhancedElement;
        if (V.showLegendTitle && xvalEl) {
          const formatter = DATA_TYPES[props.xAxisType as string];
          xvalEl.innerText = formatter ? formatter(AX[idx]) : String(AX[idx]);
          xvalEl.stylo({ display: "block" });
        } else if (xvalEl) {
          xvalEl.stylo({ display: "none" });
        }

        V.highlightedX = V.vLineX;

        ctx.fillStyle = UI.grid.markerFillColor || "";
        ctx.lineWidth = UI.grid.markerLineWidth;
        ctx.globalAlpha = 1;

        const dateEl = (UI as Record<string, unknown>)[
          "date"
        ] as EnhancedElement;
        if (dateEl) {
          dateEl.stylo({ display: pieMode ? "none" : "flex" });
        }

        for (let s = 0, pp = 0; s < AYL; s++) {
          const S = AY[s];
          const v = pieMode ? S.val || 0 : S.data[idx];
          const labelEl = (UI as Record<string, unknown>)[
            "label" + s
          ] as EnhancedElement;
          if (labelEl) {
            labelEl.stylo({
              display:
                S.hideFromLegend || S.off || (pieMode && s !== V.segment)
                  ? "none"
                  : "flex",
              paddingTop: pieMode ? 0 : 5,
            });
          }
          if (S.off) continue;
          sum += v;
          let currentScaleY = scaleY;
          if (TYPES.multi_yaxis) {
            currentScaleY =
              ((UI.main.height || 0) - (UI.main.vPadding || 0) - dy) /
              (A["localDY" + s] || 1);
          }
          const labelNameEl = (UI as Record<string, unknown>)[
            "labelName" + s
          ] as EnhancedElement;
          const labelValueEl = (UI as Record<string, unknown>)[
            "labelValue" + s
          ] as EnhancedElement;
          if (labelNameEl) labelNameEl.innerText = S.name || "";
          if (labelValueEl)
            labelValueEl.stylo({ color: S.color }).innerText = format(v);
          if (TYPES.percentage || TYPES.pie) {
            let percent = v / (TOTALS[idx] || 1);
            if (s === AYL - 1) percent = 1 - pp;
            pp += percent;
            const labelPercentEl = (UI as Record<string, unknown>)[
              "labelPercent" + s
            ] as EnhancedElement;
            if (labelPercentEl) {
              labelPercentEl.stylo({
                display: pieMode ? "none" : "flex",
              }).innerText = Math.round(percent * 100) + "%";
            }
          }
          if (!(TYPES.pie || TYPES.bar || TYPES.percentage)) {
            ctx.strokeStyle = S.color || "";
            ctx.beginPath();
            ctx.arc(
              UI.chart.hPadding + (AX[idx] - (V.localStart || 0)) * scaleX,
              (UI.xAxis.y || 0) -
                (S.data[idx] -
                  (A["localMinY" + (TYPES.multi_yaxis ? s : "")] || 0)) *
                  currentScaleY,
              UI.grid.markerRadius,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
            ctx.fill();
          }
        }

        if (TYPES.stacked) {
          const labelTotalEl = (UI as Record<string, unknown>)[
            "labelTotal"
          ] as EnhancedElement;
          const labelValueTotalEl = (UI as Record<string, unknown>)[
            "labelValueTotal"
          ] as EnhancedElement;
          if (labelTotalEl)
            labelTotalEl.stylo({
              display: (V.seriesCount || 0) > 1 ? "flex" : "none",
            });
          if (labelValueTotalEl) labelValueTotalEl.innerHTML = format(sum);
        }

        legendEl.measure();
        if (pieMode) {
          x = (V.pieX || 0) + (UI.main.width || 0) / 2;
          y = (V.pieY || 0) + (UI.main.height || 0) / 2;
        } else {
          side = (V.vLineX || 0) < (UI.main.width || 0) / 2 ? 0 : 1;
          x = applyRange(
            (V.vLineX || 0) -
              UI.grid.legendShift -
              side * ((legendEl.w || 0) - 2 * UI.grid.legendShift),
            2,
            (UI.main.width || 0) - (legendEl.w || 0) - 2,
          );
          if (props.legendPosition === "top") y = UI.chart.topPadding;
          else if (props.legendPosition === "bottom")
            y = (UI.xAxis.y || 0) - (legendEl.h || 0) + 40;
          else
            y = applyRange(
              (V.vLineY || 0) - (legendEl.h || 0) - (IS_MOBILE ? 50 : 10),
              UI.chart.topPadding,
              (UI.xAxis.y || 0) - (legendEl.h || 0),
            );
        }
        legendEl.stylo(
          {
            opacity: 1,
            transform: "translate3d(" + x + "px, " + y + "px, 0)",
          },
          true,
        );

        if (V.legendTimer) clearTimeout(V.legendTimer);
        V.legendTimer = setTimeout(hideLegend, LEGEND_TIMER);
      } else hideLegend();

      V.legendIsVisible = on;
    }

    function resetCursor(): void {
      const canvasEl = UI.canvas as EnhancedElement | undefined;
      canvasEl?.stylo({ cursor: "auto" });
    }

    function dismiss(): void {
      if (parent) return;
      if (hideLegend()) repaint();
      STATE.draggingArea = 0;
      resetCursor();
    }

    (this as ChartyInstance).dismiss = dismiss;

    function applyRange(v: number, from: number, to: number): number {
      return Math.max(from, Math.min(v, to));
    }

    function updateZoomedChart(): void {
      if (V.zoomedChart) V.zoomedChart.setProgress(V);
    }

    function hideLegend(): boolean {
      const shouldRepaint = V.vLineX !== undefined;
      const legendEl = UI.legend as EnhancedElement | undefined;
      if (!legendEl) return false;
      V.vLineX = undefined;
      V.highlightedX = -1;
      legendEl.stylo({ transform: "translate3d(0, -1000px, 0)" });
      if (V.legendTimer) {
        clearTimeout(V.legendTimer);
        V.legendTimer = undefined;
      }
      return shouldRepaint;
    }

    function stop(e: Event): void {
      e.stopPropagation();
      e.preventDefault();
    }

    // =========================================================================
    // DOM Element Enhancement
    // =========================================================================

    function enhanceElement(
      o: string | HTMLElement,
      className?: string,
    ): EnhancedElement {
      let el: HTMLElement;

      if (typeof o === "object") el = o;
      else {
        el = byId(o === ID ? (ID as string) : ID + "-" + o) as HTMLElement;
        className = o === ID ? "chart" : o.replace(/[\d]+/g, "");
        if (typeof styles !== "undefined")
          className = (styles as Record<string, string>)[className];
      }

      const enhanced = el as EnhancedElement;

      enhanced.on = function (
        evt: string,
        cb: (
          e: Event,
          x: number,
          y: number,
          area: Area,
          el: EnhancedElement,
        ) => void,
      ): EnhancedElement {
        evt.split(" ").map(function (name) {
          el.addEventListener(name, function (e: Event) {
            const touchEvent = e as TouchEvent;
            const mouseEvent = e as MouseEvent;
            const touch =
              touchEvent.touches && touchEvent.touches.length
                ? touchEvent.touches[0]
                : mouseEvent;
            const box = UI.box as EnhancedElement | undefined;
            const xPos = (touch.clientX || touch.pageX) - (box?.x || 0);
            const yPos = (touch.clientY || touch.pageY) - (box?.y || 0);
            cb(e, xPos, yPos, whereAmI(xPos, yPos), enhanced);
          });
        });
        return enhanced;
      };
      enhanced.attr = function (name: string, value: string): EnhancedElement {
        el.setAttribute(name, value);
        return enhanced;
      };
      enhanced.append = function (name: string): EnhancedElement {
        const n = document.createElement(name);
        return enhanceElement(el.appendChild(n), name);
      };
      enhanced.measure = function (): EnhancedElement {
        const s = el.getBoundingClientRect();
        enhanced.x = s.left;
        enhanced.y = s.top;
        enhanced.w = s.width;
        enhanced.h = s.height;
        return enhanced;
      };
      enhanced.stylo = function (
        s: Record<string, unknown>,
        raw?: boolean,
      ): EnhancedElement {
        let v: string;
        for (const k in s) {
          v = raw
            ? String(s[k])
            : String(s[k]) + (isNaN(s[k] as number) ? "" : "px");
          (el.style as unknown as Record<string, string>)[k] = v;
          if (k === "transform") {
            (el.style as unknown as Record<string, string>)["webkitTransform"] =
              v;
            (el.style as unknown as Record<string, string>)["mozTransform"] = v;
            (el.style as unknown as Record<string, string>)["oTransform"] = v;
            (el.style as unknown as Record<string, string>)["msTransform"] = v;
          }
        }
        return enhanced;
      };
      enhanced.shake = function (): void {
        el.classList.add("shake");
        setTimeout(function () {
          el.classList.remove("shake");
        }, 200);
      };
      enhanced.line = function (
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        w: number,
        color: string,
        alpha?: number,
      ): void {
        if (!ctx) return;
        if (!isNaN(alpha as number)) ctx.globalAlpha = alpha as number;
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      };
      enhanced.rect = function (
        x: number,
        y: number,
        w: number,
        h: number,
        radius?: number,
        left?: boolean,
        right?: boolean,
        clip?: boolean,
      ): void {
        if (!ctx) return;
        const r = radius || 0;
        const rightR = right ? r : 0;
        const leftR = left ? r : 0;

        ctx.beginPath();
        ctx.moveTo(x + leftR, y);
        ctx.arcTo(x + w, y, x + w, y + h, rightR);
        ctx.arcTo(x + w, y + h, x, y + h, rightR);
        ctx.arcTo(x, y + h, x, y, leftR);
        ctx.arcTo(x, y, x + w, y, leftR);
        if (clip) {
          ctx.clip();
          return;
        }
        ctx.closePath();
        ctx.fill();
      };
      enhanced.startLine = function (
        alpha: number,
        strokeStyle?: string,
        fillStyle?: string,
        lw?: number,
      ): void {
        if (!ctx) return;
        ctx.globalAlpha = alpha;
        if (strokeStyle) ctx.strokeStyle = strokeStyle;
        if (fillStyle) ctx.fillStyle = fillStyle;
        if (lw !== undefined) ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.lineCap = "butt";
        ctx.lineJoin = "bevel";
      };

      (UI as Record<string, unknown>)[o === ID ? "box" : (o as string)] =
        enhanced;
      return enhanced.attr("class", className || "").measure();
    }

    // =========================================================================
    // Visibility & Lifecycle
    // =========================================================================

    function hide(): void {
      V.hidden = true;
    }

    (this as ChartyInstance).hide = hide;

    // =========================================================================
    // Zoom
    // =========================================================================

    function zoomIn(x: number): void {
      if (V.inProgress) return;

      V.inProgress = true;

      const selectedX =
        (V.localStart || 0) +
        ((x - UI.chart.hPadding) / (UI.preview.width || 1)) *
          ((V.localEnd || 0) - (V.localStart || 0));
      const selectedIndex = xToIdx(selectedX);
      const currentGlobalStart = V.globalStart || 0;
      const currentGlobalEnd = V.globalEnd || 0;
      const currentLocalStart = V.localStart || 0;
      const currentLocalEnd = V.localEnd || 0;
      let xVal = AX[selectedIndex];

      if (props.xAxisType === "date") xVal = roundDate(xVal);

      V._globalStart = V.globalStart;
      V._globalEnd = V.globalEnd;
      V._localStart = V.localStart;
      V._localEnd = V.localEnd;

      function doZoom(): void {
        let newGlobalStart: number;
        let newGlobalEnd: number;
        let newLocalStart: number;
        let newLocalEnd: number;
        let zoomInterval: number;
        let stepX: number;

        if (V.zoomedChart) {
          const data = V.zoomedChart.getAxesData();
          const zoomProps = V.zoomedChart.getProps();

          stepX = zoomProps.stepX || V.zoomStepX || V.stepX || 1;
          zoomInterval =
            props.zoomInterval || zoomProps.zoomInterval || 7 * stepX;
          if (props.zoomInterval || zoomProps.zoomInterval) {
            newGlobalStart = selectedX - zoomInterval / 2;
            newGlobalEnd = newGlobalStart + zoomInterval;
            newLocalStart = selectedX;
            newLocalEnd = newLocalStart + stepX;
          } else {
            newGlobalStart = data.X.min;
            newGlobalEnd = data.X.max;
            newLocalStart =
              zoomProps.startX ||
              newGlobalStart + Math.floor(data.X.d / 2 / stepX) * stepX;
            newLocalEnd = newLocalStart + stepX;
          }
        } else {
          stepX = V.zoomStepX || V.stepX || 1;
          zoomInterval = props.zoomInterval || 7 * stepX;
          newLocalStart = props.startX || xVal;
          if (newLocalStart + stepX >= X.max) newLocalStart -= stepX;
          newLocalEnd = newLocalStart + stepX;
          newGlobalStart = applyRange(
            xVal - (zoomInterval - stepX) / 2,
            X.min,
            X.max,
          );
          newGlobalEnd = applyRange(
            newGlobalStart + zoomInterval,
            X.min,
            X.max,
          );
          if (newGlobalEnd - newGlobalStart)
            newGlobalStart = applyRange(
              newGlobalEnd - zoomInterval,
              X.min,
              X.max,
            );
        }

        updateRangeText(
          UI.zoomedRange as EnhancedElement,
          newLocalStart,
          newLocalEnd,
        );
        V.isZooming = true;

        animate(
          "zoomIn",
          0,
          1,
          TYPES.area ? 2 * ZOOM_IN_DURATION : ZOOM_IN_DURATION,
          function (v: number) {
            const p = Math.min(1, v);
            const p_ = 1 - p;

            V.progress = v;
            V.globalStart =
              currentGlobalStart - p * (currentGlobalStart - newGlobalStart);
            V.globalEnd =
              currentGlobalEnd - p * (currentGlobalEnd - newGlobalEnd);
            V.localStart =
              currentLocalStart - p * (currentLocalStart - newLocalStart);
            V.localEnd = currentLocalEnd - p * (currentLocalEnd - newLocalEnd);

            const titleEl = UI.title as EnhancedElement | undefined;
            const zoomEl = UI.zoom as EnhancedElement | undefined;
            const localRangeEl = UI.localRange as EnhancedElement | undefined;
            const zoomedRangeEl = UI.zoomedRange as EnhancedElement | undefined;

            titleEl?.stylo(
              { opacity: p_, transform: "scale(" + p_ + ", " + p_ + ")" },
              true,
            );
            zoomEl?.stylo(
              { opacity: p, transform: "scale(" + p + ", " + p + ")" },
              true,
            );
            localRangeEl?.stylo(
              { opacity: p_, transform: "scale(" + p_ + ", " + p_ + ")" },
              true,
            );
            zoomedRangeEl?.stylo(
              { opacity: p, transform: "scale(" + p + ", " + p + ")" },
              true,
            );

            updateZoomedChart();
          },
          TYPES.area ? EASE.outBack : EASE.outCubic,
          function () {
            V.isZooming = false;
            V.isZoomed = true;
            V.inProgress = false;
            V.forceUpdate = true;
            resize();
            if (V.zoomedChart) V.zoomedChart.wakeUp();
          },
        );

        V.selectedIndex = selectedIndex;
        hideLegend();
      }

      if (!props.onZoomIn || TYPES.pie) {
        if (TYPES.area) return doZoom();

        V.inProgress = false;
        return;
      }

      props.onZoomIn(AX[selectedIndex]).then(
        function (data: ChartyProps) {
          V.zoomedChart = new (Charty as unknown as new (
            id: string,
            props: ChartyProps,
            parent?: ChartyInstance,
            ui?: UIConfig,
            ctx?: CanvasRenderingContext2D,
          ) => ChartyInstance)(
            ID as string,
            data,
            self,
            UI,
            ctx as CanvasRenderingContext2D,
          );
          doZoom();
          repaint();
        },
        function (err: unknown) {
          V.inProgress = false;
          error(
            "Error loading data: " +
              JSON.stringify(err) +
              "\n\nx: " +
              AX[selectedIndex],
          );
        },
      );
    }

    (this as ChartyInstance).setProgress = function (V_: ChartState): void {
      SHARED_PROPS.forEach(function (prop) {
        (V as unknown as Record<string, unknown>)[prop] = (
          V_ as unknown as Record<string, unknown>
        )[prop];
      });
      V.progress = 1 - V_.progress;
      repaint();
    };

    (this as ChartyInstance).getTheme = function (): ChartyTheme {
      return currentTheme || DEFAULT_THEME;
    };

    function zoomOut(_x?: number): void {
      if (!V.isZoomed) return zoomIn(0);

      const currentGlobalStart = V.globalStart || 0;
      const currentGlobalEnd = V.globalEnd || 0;
      const currentLocalStart = V.localStart || 0;
      const currentLocalEnd = V.localEnd || 0;

      V.isZooming = true;
      animate(
        "zoomOut",
        1,
        0,
        ZOOM_OUT_DURATION,
        function (v: number) {
          const v_ = 1 - v;
          V.globalStart =
            currentGlobalStart -
            v_ * (currentGlobalStart - (V._globalStart || 0));
          V.globalEnd =
            currentGlobalEnd - v_ * (currentGlobalEnd - (V._globalEnd || 0));
          V.localStart =
            currentLocalStart - v_ * (currentLocalStart - (V._localStart || 0));
          V.localEnd =
            currentLocalEnd - v_ * (currentLocalEnd - (V._localEnd || 0));
          V.progress = v;

          const titleEl = UI.title as EnhancedElement | undefined;
          const zoomEl = UI.zoom as EnhancedElement | undefined;
          const localRangeEl = UI.localRange as EnhancedElement | undefined;
          const zoomedRangeEl = UI.zoomedRange as EnhancedElement | undefined;

          titleEl?.stylo(
            { opacity: v_, transform: "scale(" + v_ + ", " + v_ + ")" },
            true,
          );
          zoomEl?.stylo(
            { opacity: v, transform: "scale(" + v + ", " + v + ")" },
            true,
          );
          localRangeEl?.stylo(
            { opacity: v_, transform: "scale(" + v_ + ", " + v_ + ")" },
            true,
          );
          zoomedRangeEl?.stylo(
            { opacity: v, transform: "scale(" + v + ", " + v + ")" },
            true,
          );
          updateRangeText(UI.localRange as EnhancedElement);
          updateZoomedChart();
        },
        EASE.inCubic,
        function () {
          V.isZooming = false;
          V.isZoomed = false;
          V.forceUpdate = true;
          resize();
          if (V.zoomedChart) {
            V.zoomedChart.destroy();
            V.zoomedChart = undefined;
          }
          dismiss();
          wakeUp();
        },
      );

      if (V.zoomedChart) {
        const series = V.zoomedChart.getSeries();

        series.map(function (S: Series, i: number) {
          const off = S.off;
          if (AY[i] && AY[i].name === S.name) {
            AY[i].off = off;
            A["alphaY" + i] = off ? 0 : 1;
            A["on" + i] = off ? 0 : 1;
          }
        });

        renderCtrls();
        updateTheme();
        togglePreview(V.showPreview);
      }
      hideLegend();
    }

    // =========================================================================
    // Public API
    // =========================================================================

    (this as ChartyInstance).setProps = function (
      props_: Partial<ChartyProps>,
    ): void {
      props = Object.assign({}, props, props_);
      updateVars();
      dismiss();
      V.forceUpdate = true;
      V.needMeasure = true;
      const titleEl = UI.title as EnhancedElement | undefined;
      if (titleEl) titleEl.innerText = props.title || "";
      repaint();
    };

    (this as ChartyInstance).setShowButtons = function (on: boolean): void {
      V.showButtons = on;
      renderCtrls();
      updateTheme();
    };

    (this as ChartyInstance).setShowMainArea = function (on: boolean): void {
      V.showMainArea = on;
      resize();
      measureUI();
      repaint();
    };

    (this as ChartyInstance).setShowBrush = function (on: boolean): void {
      V.showBrush = on;
      repaint();
      !on && resetCursor();
    };

    (this as ChartyInstance).setStartX = function (x: number): void {
      V.localStart = applyRange(x, V.globalStart || 0, V.globalEnd || 0);
    };

    (this as ChartyInstance).setEndX = function (x: number): void {
      V.localEnd = applyRange(x, V.globalStart || 0, V.globalEnd || 0);
    };

    (this as ChartyInstance).setAutoScale = function (on: boolean): void {
      V.localMM = undefined;
      V.globalMM = undefined;
      V.autoScale = on;
    };

    (this as ChartyInstance).setShowPreview = function (on: boolean): void {
      V.showPreview = on;
      if (V.zoomedChart) V.zoomedChart.togglePreview(on);
      togglePreview(on);
    };

    (this as ChartyInstance).restart = function (): void {
      start(true);
      if (!V.zoomedChart) {
        renderLegend();
        renderCtrls();
        updateTheme();
      }
    };

    function wakeUp(): void {
      V.hidden = false;
      V.forceUpdate = true;
      repaint();
    }

    function resize(): void {
      V.needMeasure = true;
    }

    function scroll(): void {
      V.needMeasure = true;
    }

    (this as ChartyInstance).wakeUp = wakeUp;

    (this as ChartyInstance).destroy = function (): void {
      V.isDestroyed = true;
      unhookEvents();
    };

    // =========================================================================
    // Brush Movement
    // =========================================================================

    function moveBrush(newLocalStart: number, newLocalEnd: number): void {
      if (V.movingBrush) return;
      if (newLocalStart === V.localStart && newLocalEnd === V.localEnd) return;
      if (newLocalStart >= newLocalEnd || newLocalEnd <= newLocalStart) return;
      V.movingBrush = true;
      const start = V.localStart || 0;
      const end = V.localEnd || 0;
      animate(
        "snapX",
        0,
        1,
        SNAP_DURATION,
        function (p: number) {
          V.localStart = applyRange(
            start - p * (start - newLocalStart),
            X.min,
            X.max,
          );
          V.localEnd = applyRange(end - p * (end - newLocalEnd), X.min, X.max);
          updateZoomedChart();
        },
        undefined,
        function () {
          V.movingBrush = false;
          V.forceUpdate = true;
          updateRangeText(UI.zoomedRange as EnhancedElement);
        },
      );
      updateZoomedChart();
    }

    function updateCursor(area: Area): void {
      if (!IS_MOBILE && !STATE.draggingArea) {
        const canvasEl = UI.canvas as EnhancedElement | undefined;
        if (area === AREA.BRUSH_LEFT || area === AREA.BRUSH_RIGHT)
          canvasEl?.stylo({ cursor: "ew-resize" });
        else if (area === AREA.BRUSH_CENTER)
          canvasEl?.stylo({ cursor: "move" });
        else resetCursor();
      }
    }

    // =========================================================================
    // Event Handling
    // =========================================================================

    function unhookEvents(): void {
      if (!self.isHooked) return;

      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("mousemove", dismiss);
      self.isHooked = false;
    }

    function hookEvents(): void {
      if (self.isHooked) unhookEvents();

      self.isHooked = true;

      document.addEventListener("mousemove", dismiss);
      window.addEventListener("resize", resize);
      window.addEventListener("scroll", scroll);

      const legendEl = UI.legend as EnhancedElement | undefined;
      const canvasEl = UI.canvas as EnhancedElement | undefined;
      const zoomEl = UI.zoom as EnhancedElement | undefined;

      legendEl?.on("touchmove mousemove", stop);

      legendEl?.on("touchstart mousedown", function (_e: Event, _x: number) {
        if (!isNaN(V.vLineX as number) && !V.zoomedChart) zoomIn(V.vLineX || 0);
      });

      canvasEl?.on(
        "touchmove mousemove",
        function (_e: Event, x: number, y: number, area: Area) {
          for (let c = 0, cl = CHARTS.length; c < cl; c++)
            if (c !== myIdx) CHARTS[c].dismiss();

          V.vLineX = undefined;
          V.vLineY = undefined;
          V.pieX = undefined;
          V.pieY = undefined;

          if (!V.isZoomed || !TYPES.area) {
            if (area === AREA.MAIN) {
              V.vLineX = x;
              V.vLineY = y;
            }
            if (!isNaN(V.vLineX as number)) V.legendIsVisible = false;
            updateZoomedChart();
          }

          if (TYPES.pie || (V.isZoomed && TYPES.area)) {
            if (area === AREA.MAIN) {
              V.pieX = x - (UI.main.width || 0) / 2;
              V.pieY = y - (UI.main.height || 0) / 2 - UI.chart.topPadding;
            }
          }

          if ((area as number) >= (AREA.XAXIS as number)) hideLegend();

          repaint();

          if (
            !IS_MOBILE ||
            (STATE.draggingArea as number) >= (AREA.PREVIEW as number)
          )
            stop(_e);

          if (!V.showBrush) return;

          updateCursor(area);

          const width = (V.localEnd || 0) - (V.localStart || 0);
          let newLocalStart: number;
          let newLocalEnd: number;
          let deltaX: number;
          let xVal: number;
          let deltaStepX: number;
          const stepX =
            (V.zoomedChart ? V.zoomedChart.getProps().stepX : V.stepX) || 1;
          const minBrushSize =
            V.isZoomed || TYPES.pie
              ? stepX
              : Math.max(stepX, V.minBrushSize || 0);

          let effectiveStepX = stepX;
          if (V.isZoomed && props.zoomStepX) effectiveStepX = props.zoomStepX;

          if (STATE.draggingArea === AREA.BRUSH_LEFT) {
            xVal = xToVal(x);
            newLocalStart = applyRange(
              xVal,
              V.globalStart || 0,
              (V.localEnd || 0) - minBrushSize,
            );
            deltaX = (V.localStart || 0) - newLocalStart;
            if (
              !TYPES.pie &&
              effectiveStepX === 1 &&
              Math.abs(deltaX) / effectiveStepX >= 1
            ) {
              V.localStart = newLocalStart;
            } else {
              if (Math.abs(deltaX) > effectiveStepX * 0.5) {
                deltaStepX =
                  effectiveStepX * Math.ceil(deltaX / effectiveStepX);
                moveBrush(
                  (V.localStart || 0) - deltaStepX,
                  Math.min(V.localEnd || 0, V.globalEnd || 0),
                );
              }
            }
          } else if (STATE.draggingArea === AREA.BRUSH_RIGHT) {
            xVal =
              ((x + UI.preview.handleW / 2 - UI.chart.hPadding) /
                (UI.preview.width || 1)) *
                ((V.globalEnd || 0) - (V.globalStart || 0)) +
              (V.globalStart || 0);
            newLocalEnd = applyRange(
              xVal,
              (V.localStart || 0) + minBrushSize,
              V.globalEnd || 0,
            );
            deltaX = (V.localEnd || 0) - newLocalEnd;
            if (
              !TYPES.pie &&
              effectiveStepX === 1 &&
              Math.abs(deltaX) / effectiveStepX >= 1
            )
              V.localEnd = newLocalEnd;
            else {
              if (Math.abs(deltaX) > effectiveStepX * 0.5) {
                deltaStepX =
                  effectiveStepX * Math.floor(deltaX / effectiveStepX);
                moveBrush(
                  Math.max(V.globalStart || 0, V.localStart || 0),
                  (V.localEnd || 0) - deltaStepX,
                );
              }
            }
          } else if (STATE.draggingArea === AREA.BRUSH_CENTER) {
            xVal =
              ((x -
                (V.deltaDragX || 0) -
                UI.preview.handleW / 2 -
                UI.chart.hPadding) /
                (UI.preview.width || 1)) *
                ((V.globalEnd || 0) - (V.globalStart || 0)) +
              (V.globalStart || 0);
            newLocalStart = applyRange(
              xVal,
              V.globalStart || 0,
              (V.globalEnd || 0) - width,
            );
            newLocalEnd = applyRange(
              newLocalStart + width,
              V.globalStart || 0,
              V.globalEnd || 0,
            );
            deltaX = (V.localEnd || 0) - newLocalEnd;
            if (
              !TYPES.pie &&
              effectiveStepX === 1 &&
              Math.abs(deltaX) / effectiveStepX >= 1
            ) {
              V.localStart = newLocalStart;
              V.localEnd = newLocalEnd;
            } else {
              if (Math.abs(deltaX) > effectiveStepX * 0.5) {
                deltaStepX =
                  effectiveStepX * Math.round(deltaX / effectiveStepX);
                moveBrush(
                  (V.localStart || 0) - deltaStepX,
                  (V.localEnd || 0) - deltaStepX,
                );
              }
            }
          }
        },
      );

      zoomEl?.on("touchstart mousedown", function () {
        if (V.isZoomed) {
          restorePreview(props.showPreview !== false);
          zoomOut();
        }
      });

      canvasEl?.on(
        "touchstart mousedown",
        function (_e: Event, x: number, _y: number, area: Area) {
          if (!V.showBrush) return;
          STATE.draggingArea = area as number;
          if ((area as number) > (AREA.PREVIEW as number)) {
            V.deltaDragX =
              x - valToX(V.localStart || 0) - UI.preview.handleW / 2;
          } else if (area === AREA.PREVIEW) {
            const width = (V.localEnd || 0) - (V.localStart || 0);
            const xVal = xToVal(x);
            let newLocalStart = xVal - width / 2;
            let newLocalEnd = xVal + width / 2;
            const dxStart = (V.globalStart || 0) - newLocalStart;
            const dxEnd = newLocalEnd - (V.globalEnd || 0);

            if (dxStart > 0) {
              newLocalStart = V.globalStart || 0;
              newLocalEnd = (V.globalStart || 0) + width;
            } else if (dxEnd > 0) {
              newLocalStart = (V.globalEnd || 0) - width;
              newLocalEnd = V.globalEnd || 0;
            }

            moveBrush(newLocalStart, newLocalEnd);
          }
        },
      );

      canvasEl?.on(
        "touchend touchcancel mouseup",
        function (_e: Event, _x: number, _y: number, area: Area) {
          if (!V.showBrush) return;
          if (!IS_MOBILE && !isNaN(V.vLineX as number) && !V.zoomedChart)
            zoomIn(V.vLineX || 0);

          STATE.draggingArea = 0;
          updateCursor(area);
        },
      );
    }
  }

  return Charty;
})();

export default Charty;
