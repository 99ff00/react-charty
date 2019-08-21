/*
 *  Copyright (c) 2019-present, Aleksandr Telegin
 *
 * This source code is licensed under the MIT license.
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ChartyComponent from './charty.js'

export default class Charty extends Component {
  static propTypes = {
    title: PropTypes.string,
    theme: PropTypes.object,
    animated: PropTypes.bool,
    showLegend: PropTypes.bool,
    showButtons: PropTypes.bool,
    showPreview: PropTypes.bool,
    legendPosition: PropTypes.string,
    data: PropTypes.object
  }

  componentDidMount() {
    this.charty = new ChartyComponent(this.el, this.props)
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.theme !== this.props.theme) {
      if (this.charty)
        this.charty.setTheme(nextProps.theme)
    }
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
