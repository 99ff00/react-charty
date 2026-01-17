/*
 *  Copyright (c) 2019-present, Aleksandr Telegin
 *
 * This source code is licensed under the MIT license.
 */

export type GradientColor = {
  type: "linear_gradient_h" | "linear_gradient_v";
  colors: string[];
};

export type ColorValue = string | GradientColor;

export type SeriesMap<T> = Record<string, T>;

export type AxisFormatter = (value: number | string) => string;
export type RangeFormatter = (start: number, end: number) => string;

export interface ChartyData {
  x: number[];
  [key: string]: number[];
}

export interface ThemeGrid {
  color?: string;
  alpha?: number;
  markerFillColor?: string;
}

export interface ThemeLegend {
  background?: string;
  color?: string;
}

export interface ThemePreview {
  maskColor?: string;
  maskAlpha?: number;
  brushColor?: string;
  brushBorderColor?: string;
  brushBorderAlpha?: number;
  handleColor?: string;
}

export interface ThemeAxis {
  textColor?: string;
  textAlpha?: number;
}

export interface ThemeTitle {
  color?: string;
}

export interface ThemeButtons {
  color?: string;
}

export interface ThemePie {
  textColor?: string;
}

export interface ChartyTheme {
  grid?: ThemeGrid;
  legend?: ThemeLegend;
  preview?: ThemePreview;
  xAxis?: ThemeAxis;
  yAxis?: ThemeAxis;
  title?: ThemeTitle;
  localRange?: ThemeTitle;
  zoomedRange?: ThemeTitle;
  zoomText?: ThemeTitle;
  zoomIcon?: { fill?: string };
  buttons?: ThemeButtons;
  pie?: ThemePie;
  colors?: SeriesMap<string>;
  fillColors?: SeriesMap<ColorValue>;
  hideFromLegend?: SeriesMap<boolean>;
  buttonTextColor?: SeriesMap<string>;
}

export interface ChartyProps {
  type?: string;
  title?: string;
  theme?: ChartyTheme;
  animated?: boolean;
  showLegend?: boolean;
  showLegendTitle?: boolean;
  showButtons?: boolean;
  showMainArea?: boolean;
  showBrush?: boolean;
  showPreview?: boolean;
  showRangeText?: boolean;
  rangeTextType?: string | RangeFormatter;
  xAxisType?: string | AxisFormatter;
  yAxisType?: string | AxisFormatter;
  xAxisStep?: number;
  legendPosition?: "top" | "bottom" | string;
  data?: ChartyData;
  names?: SeriesMap<string>;
  colors?: SeriesMap<string>;
  fillColors?: SeriesMap<ColorValue>;
  buttonTextColor?: SeriesMap<string>;
  hideFromLegend?: SeriesMap<boolean>;
  off?: SeriesMap<boolean>;
  disabled?: SeriesMap<boolean>;
  stepX?: number;
  startX?: number;
  endX?: number;
  onZoomIn?: (x: number) => Promise<ChartyProps>;
  zoomInterval?: number;
  zoomStepX?: number;
  autoScale?: boolean;
  minY?: number;
  maxY?: number;
}

export interface Series {
  data: number[];
  color?: string;
  buttonTextColor?: string;
  hideFromLegend?: boolean;
  disabled?: boolean;
  fillColor?: ColorValue;
  name?: string;
  type?: string;
  _color?: string;
  _fillColor?: ColorValue;
  _buttonTextColor?: string;
  _hideFromLegend?: boolean;
  off?: boolean;
  min?: number;
  max?: number;
  d?: number;
  angle?: number;
  percent?: number;
  alpha?: number;
  val?: number;
  dx?: number;
  dy?: number;
  z?: number;
  localMM?: MinMax;
  globalMM?: MinMax;
}

export interface MinMax {
  min: number;
  max: number;
  d: number;
}

export interface XAxisData {
  min: number;
  max: number;
  d: number;
}

export interface ChartTypes {
  line?: boolean;
  stacked?: boolean;
  area?: boolean;
  percentage?: boolean;
  multi_yaxis?: boolean;
  bar?: boolean;
  pie?: boolean;
  linear?: boolean;
}

export interface Animation {
  ease: EasingFunction;
  from: number;
  to: number;
  duration: number;
  update?: (value: number) => void;
  cb?: () => void;
  off?: boolean;
  started?: number;
}

export type EasingFunction = (
  t: number,
  b: number,
  c: number,
  d: number,
  s?: number,
) => number;

export interface EasingFunctions {
  inQuad: EasingFunction;
  outQuad: EasingFunction;
  inCubic: EasingFunction;
  outCubic: EasingFunction;
  outSine: EasingFunction;
  outBack: EasingFunction;
}

export enum Area {
  HEADER = 1,
  MAIN = 2,
  XAXIS = 3,
  PREVIEW = 4,
  BRUSH_CENTER = 5,
  BRUSH_LEFT = 6,
  BRUSH_RIGHT = 7,
}

export interface UIChart {
  topPadding: number;
  hPadding: number;
  height: number;
}

export interface UIPie {
  segmentShift: number;
  textColor?: string;
}

export interface UIPreview {
  height: number;
  vPadding: number;
  radius: number;
  lineWidth: number;
  handleW: number;
  handleTick: number;
  minBrushSize: number;
  hitSlop: number;
  y?: number;
  width?: number;
  minHeight?: number;
  maskColor?: string;
  maskAlpha?: number;
  brushColor?: string;
  brushBorderColor?: string;
  brushBorderAlpha?: number;
  handleColor?: string;
}

export interface UIGrid {
  lineWidth: number;
  legendShift: number;
  markerRadius: number;
  markerLineWidth: number;
  color?: string;
  alpha?: number;
  markerFillColor?: string;
}

export interface UIXAxis {
  textWidth: number;
  height: number;
  fadeTime: number;
  y?: number;
  textColor?: string;
  textAlpha?: number;
}

export interface UIYAxis {
  textCount: number;
  fadeTime: number;
  textColor?: string;
  textAlpha?: number;
}

export interface UIMain {
  lineWidth: number;
  vPadding: number;
  height?: number;
  y?: number;
  width?: number;
}

export interface UILegend {
  background?: string;
  color?: string;
}

export interface UIConfig {
  chart: UIChart;
  pie: UIPie;
  preview: UIPreview;
  grid: UIGrid;
  xAxis: UIXAxis;
  yAxis: UIYAxis;
  main: UIMain;
  legend?: UILegend;
  box?: EnhancedElement;
  canvas?: EnhancedElement;
  ctrls?: EnhancedElement;
  title?: EnhancedElement;
  zoom?: EnhancedElement;
  zoomIcon?: EnhancedElement;
  zoomText?: EnhancedElement;
  localRange?: EnhancedElement;
  zoomedRange?: EnhancedElement;
  [key: string]: unknown;
}

export interface EnhancedElement extends HTMLElement {
  on(
    evt: string,
    cb: (
      e: Event,
      x: number,
      y: number,
      area: Area,
      el: EnhancedElement,
    ) => void,
  ): EnhancedElement;
  attr(name: string, value: string): EnhancedElement;
  append(name: string): EnhancedElement;
  measure(): EnhancedElement;
  stylo(s: Record<string, unknown>, raw?: boolean): EnhancedElement;
  shake(): void;
  line?(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    w: number,
    color: string,
    alpha?: number,
  ): void;
  rect?(
    x: number,
    y: number,
    w: number,
    h: number,
    radius?: number,
    left?: boolean,
    right?: boolean,
    clip?: boolean,
  ): void;
  startLine?(
    alpha: number,
    strokeStyle?: string,
    fillStyle?: string,
    lw?: number,
  ): void;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface ChartState {
  progress: number;
  needMeasure: boolean;
  yPos: number[];
  hidden?: boolean;
  showMainArea?: boolean;
  showBrush?: boolean;
  showPreview?: boolean;
  showButtons?: boolean;
  showLegend?: boolean;
  showRangeText?: boolean;
  showLegendTitle?: boolean;
  stepX?: number;
  zoomStepX?: number;
  autoScale?: boolean;
  globalStart?: number;
  globalEnd?: number;
  localStart?: number;
  localEnd?: number;
  _globalStart?: number;
  _globalEnd?: number;
  _localStart?: number;
  _localEnd?: number;
  vLineX?: number;
  vLineY?: number;
  pieX?: number;
  pieY?: number;
  legendIsVisible?: boolean;
  isZoomed?: boolean;
  isZooming?: boolean;
  isDestroyed?: boolean;
  inProgress?: boolean;
  isOnOffAnimating?: boolean;
  highlightedX?: number;
  selectedIndex?: number;
  segment?: number;
  seriesCount?: number;
  prevSeriesCount?: number;
  prevLocalStart?: number;
  prevLocalEnd?: number;
  prevGlobalStart?: number;
  prevGlobalEnd?: number;
  prevW?: number;
  prevH?: number;
  pageYOffset?: number;
  forceUpdate?: boolean;
  movingBrush?: boolean;
  deltaDragX?: number;
  minBrushSize?: number;
  stepGridX?: number;
  stepGridY?: number;
  prevStepGridX?: number;
  prevStepGridY?: number;
  tapStarted?: number;
  tapTimer?: ReturnType<typeof setTimeout>;
  legendTimer?: ReturnType<typeof setTimeout>;
  zoomedChart?: ChartyInstance;
  localMM?: MinMax;
  globalMM?: MinMax;
}

export interface RenderState {
  repaint: boolean;
  draggingArea: number;
}

export interface AnimationValues {
  previewA?: number;
  [key: string]: number | undefined;
}

export interface ChartyInstance {
  updateTheme: (theme?: ChartyTheme) => void;
  setTheme: (theme?: ChartyTheme) => void;
  getDefaultTheme: () => ChartyTheme;
  togglePreview: (on?: boolean) => void;
  repaint: () => void;
  getSeries: () => Series[];
  getProps: () => ChartyProps;
  getVars: () => ChartState;
  getAxesData: () => { AX: number[]; AY: Series[]; X: XAxisData };
  toggleCheckbox: (i: number, off?: boolean) => void;
  dismiss: () => void;
  hide: () => void;
  setProgress: (V_: ChartState) => void;
  getTheme: () => ChartyTheme;
  setProps: (props_: Partial<ChartyProps>) => void;
  setShowButtons: (on: boolean) => void;
  setShowMainArea: (on: boolean) => void;
  setShowBrush: (on: boolean) => void;
  setStartX: (x: number) => void;
  setEndX: (x: number) => void;
  setAutoScale: (on: boolean) => void;
  setShowPreview: (on: boolean) => void;
  restart: () => void;
  wakeUp: () => void;
  destroy: () => void;
  isHooked?: boolean;
}

export type DataTypeFormatter = (v: number) => string;

export interface DataTypes {
  time: DataTypeFormatter;
  date: DataTypeFormatter;
  shortDate: DataTypeFormatter;
  longDate: DataTypeFormatter;
  longDateWeekDay: DataTypeFormatter;
  float1: DataTypeFormatter;
  float2: DataTypeFormatter;
  number: DataTypeFormatter;
  undefined: DataTypeFormatter;
  [key: string]: DataTypeFormatter | undefined;
}
