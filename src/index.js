/*
 *  Copyright (c) 2019-present, Aleksandr Telegin
 *
 * This source code is licensed under the MIT license.
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ChartyComponent from './charty.js'

const RESTARTING_PROPS = ['data', 'type', 'colors', 'names']

export default class Charty extends Component {
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
    rangeTextType: PropTypes.string,
    xAxisType: PropTypes.string,
    yAxisType: PropTypes.string,
    xAxisStep: PropTypes.number,
    legendPosition: PropTypes.string,
    data: PropTypes.object,
    names: PropTypes.object,
    colors: PropTypes.object,
    stepX: PropTypes.number,
    startX: PropTypes.number,
    endX: PropTypes.number,
    onZoomIn: PropTypes.func,
    zoomInterval: PropTypes.number,
    zoomStepX: PropTypes.number,
    autoScale: PropTypes.bool,
    minY: PropTypes.number,
    maxY: PropTypes.number
  }

  componentDidMount() {
    this.charty = new ChartyComponent(this.el, this.props)
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (!this.charty)
      return true

    this.charty.setProps(nextProps)

    if (nextProps.theme !== this.props.theme)
      this.charty.setTheme(nextProps.theme)

    if (nextProps.showPreview !== this.props.showPreview)
      this.charty.setShowPreview(nextProps.showPreview)

    if (nextProps.showButtons !== this.props.showButtons)
      this.charty.setShowButtons(nextProps.showButtons)

    if (nextProps.showMainArea !== this.props.showMainArea)
      this.charty.setShowMainArea(nextProps.showMainArea)

      if (nextProps.startX !== this.props.startX)
      this.charty.setStartX(nextProps.startX)

    if (nextProps.endX !== this.props.endX)
      this.charty.setEndX(nextProps.endX)

    if (nextProps.autoScale !== this.props.autoScale)
      this.charty.setAutoScale(nextProps.autoScale)

    var idx = RESTARTING_PROPS.findIndex((prop) => this.props[prop] !== nextProps[prop])
    if (idx >= 0)
      this.charty.restart()

    return false
  }

  componentWillUnmount() {
    if (this.charty) {
      this.charty.destroy()
      this.charty = undefined
    }
  }

  setRef = (el) => {
    this.el = el;
  }

  render() {
    return (
      <div ref={this.setRef} style={this.props.style} />
    )
  }
}
