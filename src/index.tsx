/*
 *  Copyright (c) 2019-present, Aleksandr Telegin
 *
 * This source code is licensed under the MIT license.
 */

import React, { Component } from "react";
import PropTypes from "prop-types";
import ChartyComponent from "./charty";

type ChartyEngine = {
  setProps: (props: ChartyProps) => void;
  setTheme: (theme?: ChartyTheme) => void;
  setShowPreview: (on?: boolean) => void;
  setShowButtons: (on?: boolean) => void;
  setShowMainArea: (on?: boolean) => void;
  setStartX: (x: number) => void;
  setEndX: (x: number) => void;
  setAutoScale: (on?: boolean) => void;
  restart: () => void;
  destroy: () => void;
};

type ChartyCtor = new (...args: any[]) => ChartyEngine;
const ChartyComponentAny = ChartyComponent as unknown as ChartyCtor;

export type GradientColor = {
  type: "linear_gradient_h" | "linear_gradient_v";
  colors: string[];
};

export type ColorValue = string | GradientColor;

export type ChartySeriesMap<T> = Record<string, T>;

export type AxisFormatter = (value: number | string) => string;
export type RangeFormatter = (start: number, end: number) => string;

export type ChartyData = {
  x: number[];
  [key: string]: number[];
};

export type ChartyTheme = Record<string, unknown>;

export type ChartyProps = {
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
  legendPosition?: string;
  data?: ChartyData;
  names?: ChartySeriesMap<string>;
  colors?: ChartySeriesMap<string>;
  fillColors?: ChartySeriesMap<ColorValue>;
  buttonTextColor?: ChartySeriesMap<string>;
  hideFromLegend?: ChartySeriesMap<boolean>;
  off?: ChartySeriesMap<boolean>;
  disabled?: ChartySeriesMap<boolean>;
  stepX?: number;
  startX?: number;
  endX?: number;
  onZoomIn?: (x: number) => Promise<ChartyProps>;
  zoomInterval?: number;
  zoomStepX?: number;
  autoScale?: boolean;
  minY?: number;
  maxY?: number;
  style?: React.CSSProperties;
};

const RESTARTING_PROPS: Array<keyof ChartyProps> = [
  "data",
  "type",
  "colors",
  "fillColors",
  "names",
  "buttonTextColor",
  "hideFromLegend",
  "disabled",
  "off",
];

export default class Charty extends Component<ChartyProps> {
  static propTypes = {
    type: PropTypes.string,
    title: PropTypes.string,
    theme: PropTypes.object,
    animated: PropTypes.bool,
    showLegend: PropTypes.bool,
    showLegendTitle: PropTypes.bool,
    showButtons: PropTypes.bool,
    showMainArea: PropTypes.bool,
    showBrush: PropTypes.bool,
    showPreview: PropTypes.bool,
    showRangeText: PropTypes.bool,
    rangeTextType: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    xAxisType: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    yAxisType: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    xAxisStep: PropTypes.number,
    legendPosition: PropTypes.string,
    data: PropTypes.object,
    names: PropTypes.object,
    colors: PropTypes.object,
    fillColors: PropTypes.object,
    buttonTextColor: PropTypes.object,
    hideFromLegend: PropTypes.object,
    off: PropTypes.object,
    disabled: PropTypes.object,
    stepX: PropTypes.number,
    startX: PropTypes.number,
    endX: PropTypes.number,
    onZoomIn: PropTypes.func,
    zoomInterval: PropTypes.number,
    zoomStepX: PropTypes.number,
    autoScale: PropTypes.bool,
    minY: PropTypes.number,
    maxY: PropTypes.number,
    style: PropTypes.object,
  };

  private charty?: ChartyEngine;
  private el: HTMLDivElement | null = null;

  componentDidMount() {
    if (!this.el) return;
    this.charty = new ChartyComponentAny(this.el, this.props);
  }

  shouldComponentUpdate(nextProps: ChartyProps) {
    if (!this.charty) return true;

    this.charty.setProps(nextProps);

    if (nextProps.theme !== this.props.theme)
      this.charty.setTheme(nextProps.theme);

    if (nextProps.showPreview !== this.props.showPreview)
      this.charty.setShowPreview(nextProps.showPreview);

    if (nextProps.showButtons !== this.props.showButtons)
      this.charty.setShowButtons(nextProps.showButtons);

    if (nextProps.showMainArea !== this.props.showMainArea)
      this.charty.setShowMainArea(nextProps.showMainArea);

    const startXChanged = nextProps.startX !== this.props.startX;
    if (startXChanged && typeof nextProps.startX === "number")
      this.charty.setStartX(nextProps.startX);

    const endXChanged = nextProps.endX !== this.props.endX;
    if (endXChanged && typeof nextProps.endX === "number")
      this.charty.setEndX(nextProps.endX);

    if (nextProps.autoScale !== this.props.autoScale)
      this.charty.setAutoScale(nextProps.autoScale);

    let shouldRestart = RESTARTING_PROPS.some(
      (prop) => this.props[prop] !== nextProps[prop],
    );
    if (
      (startXChanged && typeof nextProps.startX !== "number") ||
      (endXChanged && typeof nextProps.endX !== "number")
    )
      shouldRestart = true;
    if (shouldRestart) this.charty.restart();

    return nextProps.style !== this.props.style;
  }

  componentWillUnmount() {
    if (this.charty) {
      this.charty.destroy();
      this.charty = undefined;
    }
  }

  setRef = (el: HTMLDivElement | null) => {
    this.el = el;
  };

  render() {
    return <div ref={this.setRef} style={this.props.style} />;
  }
}
