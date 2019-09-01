/*
 *  Copyright (c) 2019-present, Aleksandr Telegin
 *
 * This source code is licensed under the MIT license.
 */

/* eslint-disable space-before-function-paren */
/* eslint-disable no-multi-str */
/* eslint-disable one-var */

import styles from './styles.css'

var CHART = '<div id=|header>\
      <h3 id=|title></h3>\
      <h3 id=|zoom><span id=|zoomIcon></span><span id=|zoomText>Zoom Out</span></h3>\
      <h4 id=|localRange></h4>\
      <h4 id=|zoomedRange></h4>\
    </div>\
    <canvas id=|canvas></canvas>\
    <div id=|ctrls></div>\
    <div id=|legend></div>',
  CTRLS = '[<label id=|checkbox{i} style="background: {color}; border-color: {color}"><span id=|name{i} style="color:#fff">{name}</span><span id=|chk{i}></span></label>]',
  LEGEND = '<div id=|date><span id=|xval></span></div>\
      [<div id=|label{i}><div id=|labelPercent{i}></div><div id=|labelName{i}></div><div id=|labelValue{i} style="color:{color}"></div></div>]\
      <div id=|labelTotal><div id=|labelNameTotal>All</div><div id=|labelValueTotal></div></div>',
  PI_RAD = Math.PI / 180,
  FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  WDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  LONG_WDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  DPR = window.devicePixelRatio,
  LONG_TAP_DURATION = 700,
  ANIMATE_DURATION = 220,
  ON_OFF_DURATION = 150,
  ZOOM_IN_DURATION = 300,
  ZOOM_OUT_DURATION = 300,
  SNAP_DURATION = 200,
  LEGEND_TIMER = 10000,
  AREA = { HEADER: 1, MAIN: 2, XAXIS: 3, PREVIEW: 4, BRUSH_CENTER: 5, BRUSH_LEFT: 6, BRUSH_RIGHT: 7 },
  IS_MOBILE = window.orientation !== undefined,
  CHARTS = [],
  ONE_DAY = 86400000,
  PIE_VISIBLE = 0.99,
  SHARED_PROPS = ['globalStart', 'globalEnd', 'localStart', 'localEnd', 'vLineX', 'vLineY', 'legendIsVisible', 'isZoomed', 'isZooming'],
  EASE = {
    inQuad: function (t, b, c, d) {
      return c * (t /= d) * t + b
    },
    outQuad: function (t, b, c, d) {
      return -c * (t /= d) * (t - 2) + b
    },
    inCubic: function (t, b, c, d) {
      return c * (t /= d) * t * t + b
    },
    outCubic: function (t, b, c, d) {
      return c * ((t = t / d - 1) * t * t + 1) + b
    },
    outSine: function (t, b, c, d) {
      return c * Math.sin(t / d * (Math.PI / 2)) + b
    },
    outBack: function (t, b, c, d, s) {
      if (!s) s = 1.5
      return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b
    }
  }

function roundDate(ts) {
  var d = new Date(ts)
  d.setHours(0)
  d.setMinutes(0)
  d.setSeconds(0)
  d.setMilliseconds(0)
  return d.getTime()
}

function format(n) {
  if (n === undefined) return ''
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function unixToDate(time, _d) {
  var d = _d || new Date(time)
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear()
}

function unixToD(time, full, longWdays) {
  var d = new Date(time)

  if (full)
    return (longWdays ? LONG_WDAYS[d.getDay()] : WDAYS[d.getDay()]) + ', ' + unixToDate(0, d)

  return MONTHS[d.getMonth()] + ' ' + d.getDate()
}

function unixToTime(time) {
  var d = new Date(time),
    h = '' + d.getHours(),
    m = '' + d.getMinutes()

  if (h.length < 2) h = '0' + h
  if (m.length < 2) m = '0' + m

  return h + ':' + m
}

function byId(id) {
  return document.getElementById(id)
}

function initSTree(a) {
  var al = a.length, tl
  if ((al & (al - 1)) === 0)
    tl = (2 * al) - 1
  else {
    var p = Math.floor(Math.log(al) / Math.log(2)),
      power = Math.pow(2, p + 1)
    tl = (2 * power) - 1
  }
  return new Array(tl)
}

function getRightChildIdx(idx) {
  return 2 * idx + 2
}

function getLeftChildIdx(idx) {
  return 2 * idx + 1
}

function buildSTree_(T, a, leftIdx, rightIdx, p, cmp) {
  if (leftIdx === rightIdx) {
    var v = a[leftIdx]
    T[p] = isNaN(v) ? 0 : v
    return
  }

  var middleIdx = Math.floor((leftIdx + rightIdx) / 2)
  buildSTree_(T, a, leftIdx, middleIdx, getLeftChildIdx(p), cmp)
  buildSTree_(T, a, middleIdx + 1, rightIdx, getRightChildIdx(p), cmp)

  T[p] = cmp(T[getLeftChildIdx(p)], T[getRightChildIdx(p)])
}

function buildSTree(T, a, cmp) {
  buildSTree_(T, a, 0, a.length - 1, 0, cmp)
}

function querySTree_(T, qLeftIdx, qRightIdx, leftIdx, rightIdx, p, cmp, fail) {
  if (qLeftIdx <= leftIdx && qRightIdx >= rightIdx)
    return T[p]

  if (qLeftIdx > rightIdx || qRightIdx < leftIdx)
    return fail

  var middleIdx = Math.floor((leftIdx + rightIdx) / 2),
    leftResult = querySTree_(T, qLeftIdx, qRightIdx, leftIdx, middleIdx, getLeftChildIdx(p), cmp, fail),
    rightResult = querySTree_(T, qLeftIdx, qRightIdx, middleIdx + 1, rightIdx, getRightChildIdx(p), cmp, fail)

  return cmp(leftResult, rightResult)
}

function querySTree(T, len, leftIdx, rightIdx, cmp, fail) {
  return querySTree_(T, leftIdx, rightIdx, 0, len - 1, 0, cmp, fail)
}

var Charty = function (_ID, chart, _parent, _UI, _ctx) {
  var ID = typeof _ID === 'object' ? _ID.id : _ID

  if (!ID)
    ID = _ID.id = 'charty-' + CHARTS.length

  var V = { progress: 0, needMeasure: true, yPos: [] }, ctx = _ctx,
    IDs = [ID], AY = [], AYL, AX, AXL, X = {}, TYPES = {},
    TOTALS, STREE_MIN = [], STREE_MAX = [], animations = {}, A = { previewA: 1 },
    STATE = {}, myIdx = CHARTS.length,
    currentTheme,
    UI = _UI || {
      chart: { topPadding: 50, hPadding: 15, height: 400 },
      pie: { textColor: '#fff', segmentShift: 5 },
      preview: { height: 46, vPadding: 1, radius: 8, lineWidth: 1, handleW: 9, handleTick: 10, minBrushSize: 10, hitSlop: 10 },
      grid: { lineWidth: 1, legendShift: -10, markerRadius: 3, markerLineWidth: 4 },
      xAxis: { textWidth: 80, height: 32, fadeTime: 250 },
      yAxis: { textCount: 5, fadeTime: 500 },
      main: { lineWidth: 2 }
    },
    self = this

  CHARTS.push(self)

  function setTheme(theme) {
    currentTheme = theme
    for (var id in theme) {
      if (UI[id]) {
        if (UI[id].stylo)
          UI[id].stylo(theme[id])
        else for (var key in theme[id])
          UI[id][key] = theme[id][key]
      }
    }
    for (var i = 0; i < AYL; i++) {
      var s = AY[i]
      if (UI['checkbox' + i]) {
        if (theme.buttons) {
          // UI['checkbox' + i].stylo({ backgroundColor: theme.buttons[s.name], borderColor: theme.buttons[s.name] })
          UI['name' + i].stylo({ color: theme.buttons[s.name] })
        }
        if (UI['labelValue' + i] && theme.labels)
          UI['labelValue' + i].stylo({ color: theme.labels[s.name] })
      }
      s.barColor = (currentTheme.bars || {})[s.name] || s.color
      s.lineColor = (currentTheme.lines || {})[s.name] || s.color
    }
    V.stepX = undefined
    V.stepY = undefined
    repaint()
  }

  this.setTheme = setTheme;

  start()

  function parse(T, _IDs) {
    if (_IDs)
      IDs = _IDs
    return T.replace(/\[([^\]]+)\]/g, function (_, tag) {
      return AY.map(function (y, i) {
        return tag.replace(/\{(\w+)\}/g, function (_, k) {
          return k === 'i' ? i : y[k]
        })
      }).join('')
    }).replace(/\|([^\s>]+)/g, function (_, id) {
      if (IDs.indexOf(id) < 0)
        IDs.push(id)
      return ID + '-' + id
    })
  }

  function updateTheme() {
    if (_parent)
      setTheme(_parent.getTheme())
    else if (currentTheme)
      setTheme(currentTheme)
    else {
      setTheme(chart.theme || {})
    }
  }

  function renderLegend() {
    UI.legend.innerHTML = parse(LEGEND, [])
    IDs.map(flerken)
  }

  function renderCtrls(series) {
    if (AYL < 2 || !V.showButtons) UI.ctrls.innerHTML = ''
    else {
      UI.ctrls.innerHTML = parse(CTRLS, [])
      IDs.map(flerken)

      AY.map(function (y, i) {
        UI['checkbox' + i]
          .on('mousedown touchstart', function (e) {
            stop(e)
            V.tapStarted = Date.now()
            if (V.tapTimer)
              clearTimeout(V.tapTimer)
            V.tapTimer = setTimeout(function () {
              V.tapTimer = 0
              for (var idx = 0; idx < AYL; idx++) {
                var s = AY[idx]
                if (!s.off && idx !== i || s.off && idx === i)
                  toggleCheckbox(idx, idx !== i)
              }

              V.seriesCount = 1
              V.prevSeriesCount = 0
            }, LONG_TAP_DURATION)
          })
          .on('mouseup touchend', function (e, a, b, c, el) {
            stop(e)
            if (!V.tapTimer)
              return

            clearTimeout(V.tapTimer)
            V.tapTimer = 0
            for (var idx = 0; idx < AYL; idx++)
              if (idx !== i && !AY[idx].off)
                return toggleCheckbox(i)
            el.shake()
          })
        var S = series[i]
        if (S && !TYPES.bar) {
          if (AY[i]) {
            AY[i].off = S.off
            A['on' + i] = S.off ? 0 : 1
            A['alphaY' + i] = S.off ? 0 : 1
          }
          updateCheckbox(i, S.off)
        }
      })
    }
    updateTheme()
  }

  this.togglePreview = function (on) {
    animate('previewA', on ? 0 : 1, on, 2 * ON_OFF_DURATION)
    var d = on ? 0 : UI.preview.height + 10
    UI.ctrls.stylo({ transform: 'translate3d(0, -' + d + 'px, 0)' })
    V.previewOff = !on
  }

  function restorePreview() {
    if (V.previewOff)
      self.togglePreview(true)
  }

  function error(msg) {
    throw msg
  }

  function start() {
    if (!chart.data)
      return error('The data parameter is missing.')

    if (!chart.data.x || !(chart.data.x instanceof Array))
      return error('The x-axis data is missing.')

    var type = chart.type || 'line';
    ['line', 'stacked', 'area', 'percentage', 'multi_yaxis', 'bar', 'pie'].forEach(function(t) {
      TYPES[t] = type.indexOf(t) >= 0
    })

    TYPES.linear = TYPES.line || TYPES.multi_yaxis
    V.showLegend = chart.showLegend !== false
    V.showButtons = chart.showButtons !== false
    V.showPreview = chart.showPreview !== false

    Object.keys(chart.data).forEach(function(n) {
      var data = chart.data[n]

      if (n === 'x') {
        AX = data
        AXL = AX.length
        X.min = AX[0]
      } else
        AY.push({ data, color: chart.colors[n], name: chart.names[n], type: chart.type })
    })

    AYL = AY.length

    X.max = AX[AXL - 1]
    X.d = X.max - X.min

    for (var i = 0; i < AYL; i++) {
      var data = AY[i].data

      if (!TYPES.percentage) {
        STREE_MAX[i] = initSTree(data)
        buildSTree(STREE_MAX[i], data, Math.max)
        STREE_MIN[i] = initSTree(data)
        buildSTree(STREE_MIN[i], data, Math.min)
      }

      A['alphaY' + i] = 1
      A['on' + i] = 1
    }

    V.localStart = 2 / 3 * X.d + X.min
    V.localEnd = X.max
    V.globalStart = X.min
    V.globalEnd = X.max
    V.minBrushSize = X.d * UI.preview.minBrushSize / 100
    V.seriesCount = AYL
    V.avgRange = 1

    if (_parent) {
      renderLegend()
      renderCtrls(_parent.getSeries())
      if ((AX[AXL - 1] - AX[1]) / ONE_DAY <= 3) {
        chart.oneDay = true
        _parent.togglePreview(0)
      }
    } else {
      byId(ID).innerHTML = parse(CHART)
      IDs.map(flerken)
      renderLegend()
      renderCtrls(AY)
      UI.title.innerText = chart.title
      ctx = UI.canvas.getContext('2d')
      hookEvents()
    }

    measureUI()
    render()
  }

  function xToIndex(v, low) {
    var i = (AXL - 1) * (v - X.min) / X.d
    return applyRange(low ? Math.floor(i) : Math.ceil(i), 0, AXL - 1)
  }
  function xToPreview(v) {
    return (v - V.globalStart) / (V.globalEnd - V.globalStart) * UI.preview.width + UI.chart.hPadding
  }

  function doAnimations(time) {
    var a, completed = true

    for (var name in animations) {
      a = animations[name]

      if (a.off)
        continue

      if (!a.started)
        a.started = time

      if (chart.animated === false) {
        a.update ? a.update(a.to) : A[name] = a.to
        a.cb && a.cb()
        a.off = true
      } else {
        var d = time - a.started,
          v = a.ease(d, a.from, a.to - a.from, a.duration)

        a.update ? a.update(v) : A[name] = v
        if (d > a.duration) {
          a.update ? a.update(a.to) : A[name] = a.to
          a.cb && a.cb()
          a.off = true
        } else
          completed = false
      }

      repaint()
      _parent && _parent.repaint()
    }

    if (completed)
      animations = {}
  }

  function renderHandle(x) {
    UI.canvas.rect(x, UI.chart.height - (UI.preview.height + UI.preview.handleTick) / 2, 2, UI.preview.handleTick, 2, true, true)
  }

  function renderBrush(a) {
    var hw = UI.preview.handleW,
      start = xToPreview(V.localStart),
      end = xToPreview(V.localEnd)

    ctx.strokeStyle = UI.preview.brushColor
    ctx.globalAlpha = a
    ctx.lineWidth = 1

    if ((TYPES.bar || TYPES.area)) {
      ctx.fillStyle = UI.preview.brushBorderColor
      ctx.globalAlpha = UI.preview.brushBorderAlpha
      UI.canvas.rect(start - 1, UI.preview.y - 1, hw + 3, UI.preview.height + 3, UI.preview.radius + 1, true)
      UI.canvas.rect(end - hw - 2, UI.preview.y - 1, hw + 3, UI.preview.height + 3, UI.preview.radius + 1, false, true)
    }

    ctx.globalAlpha = a
    ctx.fillStyle = UI.preview.brushColor
    UI.canvas.rect(start, UI.preview.y, hw, UI.preview.height, UI.preview.radius, true)
    UI.canvas.rect(end - hw, UI.preview.y, hw, UI.preview.height, UI.preview.radius, false, true)
    ctx.strokeRect(start + hw, UI.preview.y + UI.preview.vPadding / 2, end - start - 2 * hw, UI.preview.height - UI.preview.vPadding)
    ctx.fillStyle = '#fff'
    renderHandle(start + 4)
    renderHandle(end - 6)
  }

  function renderPreview() {
    if (!V.showPreview)
      return
    if (chart.oneDay)
      return
    var h = UI.preview.height, minH = UI.preview.minHeight, w = UI.preview.width,
      a = A['previewA']
    if (!_parent)
      ctx.clearRect(0, UI.xAxis.y + 5, UI.main.width, UI.xAxis.height + h)

    ctx.save()
    UI.canvas.rect(UI.chart.hPadding, UI.preview.y + UI.preview.vPadding, w, minH, UI.preview.radius, true, true, true)
    ctx.lineWidth = UI.preview.lineWidth
    ctx.globalAlpha = a
    renderSeries('global', a, w, h - 2 * UI.preview.vPadding, V.globalStart, V.globalEnd, 0, UI.chart.height - UI.preview.vPadding, UI.chart.hPadding, true)
    ctx.fillStyle = UI.preview.maskColor
    ctx.globalAlpha = a * UI.preview.maskAlpha
    ctx.fillRect(UI.chart.hPadding, UI.preview.y + UI.preview.vPadding, xToPreview(V.localStart) - UI.preview.handleW, minH)
    ctx.fillRect(xToPreview(V.localEnd) - UI.preview.handleW, UI.preview.y + UI.preview.vPadding, UI.main.width + UI.preview.handleW - UI.chart.hPadding - xToPreview(V.localEnd), minH)
    ctx.restore()
    renderBrush(a)
  }

  function renderAxis() {
    if (TYPES.pie) return

    var localD, localMin, localMax = 0, minLocalD, lowerMin,
      p = Math.min(1, V.progress)

    ctx.font = '11px ' + FONT
    if (TYPES.percentage) {
      localMin = 0
      localMax = 100
    }
    else if (TYPES.stacked || TYPES.bar || TYPES.percentage) {
      for (var i = 0, val; i < AYL; i++) {
        val = AY[i].max * A['on' + i]
        localMax = TYPES.stacked ? localMax + val : Math.max(localMax, val)
      }
      localMin = 0
    } else if (TYPES.multi_yaxis) {
      localMin = Math.max(A['localMinY0'], A['localMinY1'])
      localMax = localMin + Math.max(A['localDY0'], A['localDY1'])
      minLocalD = Math.min(A['localDY0'], A['localDY1'])
      lowerMin = Math.min(A['localMinY0'], A['localMinY1'])
    } else {
      localMax = V.localMM.max
      localMin = V.localMM.min
    }
    localD = localMax - localMin
    var
      w = UI.main.width - 2 * UI.chart.hPadding,
      scaleX = w / (V.localEnd - V.localStart),
      scaleY = UI.main.height / localD,
      start = xToIndex(V.localStart - UI.chart.hPadding / scaleX, true),
      end = xToIndex(V.localEnd + UI.chart.hPadding / scaleX),
      y = UI.xAxis.y + UI.xAxis.height / 2, minStep,
      stepX = Math.pow(2, Math.ceil(Math.log(3 * UI.xAxis.textWidth * (end - start) / w))) || 1,
      stepY = Math.round(localD / UI.yAxis.textCount) || 1,
      d = 5 * Math.pow(10, (stepY.toString().length - 2)) || 1

    stepY = Math.max(1, Math.round(stepY / d) * d)

    if (V.stepX !== stepX) {
      if (V.stepX) {
        if (V.stepX < stepX)
          animate('stepXA' + V.stepX, 1, 0, UI.xAxis.fadeTime)
        V.prevStepX = V.stepX
      }
      if (!V.prevStepX || stepX < V.prevStepX)
        animate('stepXA' + stepX, 0, 1, UI.xAxis.fadeTime)
      if (stepX > V.prevStepX)
        A['stepXA' + stepX] = 1
      V.stepX = stepX
    }

    if (V.prevStepX)
      renderXText(1, V.prevStepX, start, end, scaleX, y, 1 - p)

    renderXText(0, stepX, start, end, scaleX, y, 1 - p)

    if (V.stepY !== stepY) {
      if (V.stepY) {
        animate('stepYA' + V.stepY, 1, 0, UI.yAxis.fadeTime / 2, 0, 0, function () {
          V.prevStepY = 0
          V.yPos = []
        })
        V.prevStepY = V.stepY
      }
      animate('stepYA' + stepY, 0, 1, UI.yAxis.fadeTime)
      V.stepY = stepY
    }

    if (V.prevStepY)
      renderYText(1, V.prevStepY, scaleY, localMin, localMax, localD, minLocalD, lowerMin, 1 - p)

    renderYText(0, stepY, scaleY, localMin, localMax, localD, minLocalD, lowerMin, 1 - p)

    if (TYPES.percentage) {
      ctx.globalAlpha = UI.xAxis.textAlpha * (1 - p)
      ctx.fillStyle = UI.yAxis.textColor
      ctx.fillText('100', UI.chart.hPadding, 12)
    }
  }

  function renderXText(prevStep, stepX, start, end, scaleX, y, p) {
    var a = A['stepXA' + stepX] * UI.xAxis.textAlpha * p
    if (a === 0) return
    start -= start % stepX
    ctx.fillStyle = UI.xAxis.textColor
    ctx.globalAlpha = a
    for (var i = start, x; i <= end; i += stepX) {
      if (!prevStep && stepX < V.prevStepX && i % V.prevStepX === 0) continue
      if (prevStep && stepX > V.prevStepX && i % V.prevStepX === 0) continue
      if (prevStep && V.stepX > V.prevStepX && i % V.stepX === 0) continue
      x = UI.chart.hPadding + (AX[i] - V.localStart) * scaleX
      ctx.fillText((_parent) ? unixToTime(AX[i]) : unixToD(AX[i]), x, y)
    }
  }

  function renderYText(prevStep, stepY, scaleY, localMin, localMax, localD, minLocalD, lowerMin, p) {
    var y = localMin, y_, yPos, val, c = 0, a0 = TYPES.multi_yaxis ? A['alphaY0'] : 1,
      a1 = TYPES.multi_yaxis ? A['alphaY1'] : 1,
      a = A['stepYA' + stepY], v

    while (y < localMax) {
      y_ = (c === 0) && stepY > 10 ? Math.ceil(y / 10) * 10 : y

      yPos = UI.xAxis.y - (y - localMin) * scaleY
      if (prevStep && c > 0) {
        v = V.yPos[c]
        if (v)
          yPos = yPos + (yPos - V.yPos[c]) * a
      }
      val = '' + Math.floor(c === 0 ? localMin : y_)

      if (yPos > 15) {
        ctx.globalAlpha = a * p * a0 * UI.yAxis.textAlpha
        ctx.fillStyle = TYPES.multi_yaxis ? AY[0].lineColor : UI.yAxis.textColor
        ctx.fillText(val, UI.chart.hPadding, yPos - 5)
        if (TYPES.multi_yaxis) {
          ctx.fillStyle = AY[1].lineColor || UI.yAxis.textColor
          val = Math.max(0, Math.floor(lowerMin + (y - localMin) / localD * minLocalD))
          if (c > 0 && val > 50)
            val = Math.ceil(val / 10) * 10
          ctx.globalAlpha = a * p * a1
          ctx.fillText(val, UI.main.width - UI.chart.hPadding - ctx.measureText(val).width - 5, yPos - 5)
        }
      }
      UI.canvas.line(UI.chart.hPadding, yPos, UI.main.width - UI.chart.hPadding, yPos, UI.grid.lineWidth, UI.grid.color, a * UI.grid.alpha * p)
      if (!prevStep)
        V.yPos[c] = yPos
      if (c === 0 && stepY > 10) {
        y_ = y_ + (stepY - y_ % stepY)
        y = y_ - y < stepY * 0.6 ? y_ + stepY : y_
      } else
        y += stepY
      c++
    }
  }

  function renderLinear(type, height, vStart, hPadding, offsetY, offsetX, startIdx, endIdx, scaleX, scaleY, step) {
    height -= UI.grid.markerRadius + UI.grid.markerLineWidth
    for (var s = 0, idx, x, data, color; s < AYL; s++) {
      data = AY[s].data
      color = AY[s].lineColor

      UI.canvas.startLine((1 - V.progress) * A['alphaY' + s], color, 0, ctx.lineWidth)
      idx = TYPES.multi_yaxis ? s : ''
      scaleY = height / A[type + 'DY' + idx]
      for (var i = startIdx; i <= endIdx; i += step) {
        x = offsetX + hPadding + (AX[i] - vStart) * scaleX
        if (i === startIdx)
          ctx.moveTo(x, offsetY - (data[i] - A[type + 'MinY' + idx]) * scaleY)
        ctx.lineTo(x, offsetY - (data[i] - A[type + 'MinY' + idx]) * scaleY)
      }
      ctx.stroke()
    }
  }

  function renderBars(type, masterA, width, height, vStart, hPadding, offsetY, offsetX, isPreview, startIdx, endIdx, scaleX) {
    var selectedIdx, x, p = 1 - V.progress,
      barWidth = Math.round((UI.main.width) / (endIdx - startIdx)) + 1,
      max = 0, alpha, scaleY, STACK = new Array(AXL),
      selectX, selectY, selectH

    for (var s = 0, val; s < AYL; s++) {
      val = A[type + 'DY' + s] * A['on' + s]
      max = TYPES.stacked ? max + val : Math.max(max, val)
    }

    if (V.showLegend && V.vLineX >= 0) {
      x = V.localStart + (V.highlightedX - UI.chart.hPadding) / UI.preview.width * (V.localEnd - V.localStart)
      selectedIdx = xToIndex(x, true)
    }

    for (var s = 0; s < AYL; s++) {
      alpha = A['alphaY' + s] * p
      ctx.globalAlpha = masterA * (isPreview ? alpha : (selectedIdx >= 0 ? 0.5 : alpha))
      ctx.fillStyle = AY[s].barColor
      ctx.beginPath()
      scaleY = height / max
      for (var i = startIdx, val, stack; i <= endIdx; i++) {
        val = AY[s].data[i] * A['on' + s]
        stack = STACK[i] || 0
        x = offsetX + hPadding + (AX[i] - vStart) * scaleX
        ctx.rect(x, offsetY - stack * scaleY, barWidth, -val * scaleY)
        if (selectedIdx === i) {
          selectX = x
          selectY = offsetY - stack * scaleY
          selectH = -val * scaleY
        }
        if (TYPES.stacked)
          STACK[i] = stack + val
      }
      ctx.fill()
      if (!isPreview && selectedIdx >= 0) {
        ctx.globalAlpha = alpha * masterA
        ctx.fillRect(selectX, selectY, barWidth, selectH)
      }
    }
  }

  function renderArea(type, masterA, width, height, vStart, vEnd, hPadding, offsetY, offsetX, isPreview) {
    var scaleX = width / (vEnd - vStart),
      startIdx = xToIndex(vStart - hPadding / scaleX, true),
      endIdx = xToIndex(vEnd + hPadding / scaleX),
      STACK = new Array(AXL),
      progress = isPreview ? 0 : V.progress,
      R = Math.min(UI.main.height, UI.main.width) / 2 - 10,
      p = Math.min(1, progress),
      _p = (1 - progress)

    if (p > 0 && !isPreview) {
      vStart = V._localStart
      vEnd = V._localEnd
      scaleX = width / (vEnd - vStart)
      startIdx = xToIndex(vStart - hPadding / scaleX, true)
      endIdx = xToIndex(vEnd + hPadding / scaleX)
    }

    if (!isPreview)
      height -= 12

    var _height = height / (1 + progress),
      scaleY = _height / 100, angle = 0,
      filled = false

    if (!isPreview) {
      offsetX -= UI.main.width / 2
      offsetY -= R

      ctx.save()
      if (p < 1)
        UI.canvas.rect(p * (UI.main.width / 2 - R), 10 * p, 2 * R * p + (1 - p) * (UI.main.width - hPadding), 2 * R + 20 * _p, p * R, true, true, true)

      ctx.translate(UI.main.width / 2, UI.main.height / 2)
      if (!isPreview && p <= PIE_VISIBLE)
        ctx.transform(1 + p, 0, 0, 1 + p, 0, 0)

      if (p > PIE_VISIBLE)
        renderPie(V.selectedIndex, V.selectedIndex, MediaStream)
    }

    if (p <= PIE_VISIBLE || isPreview) {
      angle = 0

      for (var s = AYL - 1; s >= 0; s--) {
        var S = AY[s],
          selectedVal = S.data[V.selectedIndex] || 0,
          percent = selectedVal / (TOTALS[V.selectedIndex] || 1),
          sector = 180 * percent,
          centered = false,
          da = 0, alpha = A['on' + s]

        if (!isPreview) {
          da = 180 * progress * percent * alpha * PI_RAD
          ctx.rotate(angle + da)
        }

        UI.canvas.startLine(alpha, 0, S.barColor, ctx.lineWidth)

        for (var i = startIdx, val, x, y, startX, stack, dy; i <= endIdx; i++) {
          stack = STACK[i] || 0
          val = 100 * S.data[i] / TOTALS[i] * alpha
          x = offsetX + hPadding + (AX[i] - vStart) * scaleX
          y = offsetY - _height + _p * stack * scaleY
          dy = isPreview ? 0 : Math.abs(x) / Math.tan((90 * _p + progress * sector) * PI_RAD)
          if (i === startIdx) {
            startX = x
            ctx.moveTo(x, _p * y + dy)
          } else {
            if (!centered && x >= 0 && progress > 0.5) {
              centered = true
              ctx.lineTo(x * _p, _p * (_p * y + dy))
            } else
              ctx.lineTo(x, _p * y + dy)
          }
          if (i === endIdx) {
            if (!S.off && !filled) {
              filled = true
              ctx.globalAlpha = masterA
              ctx.fillStyle = S.barColor
              ctx.fillRect(startX, -offsetY + 26, x - startX, 2 * offsetY)
              if (V.seriesCount === 1)
                break
            } else {
              ctx.lineTo(x, 2 * offsetY)
              ctx.lineTo(startX, 2 * offsetY)
            }
          }
          STACK[i] = stack + val
        }
        ctx.fill()
        if (!isPreview) {
          ctx.rotate(-angle - da)
          angle += 2 * da
        }
        if (V.seriesCount === 1 && !S.off)
          break
      }
    }
    if (!isPreview) {
      ctx.restore()
      if (p > PIE_VISIBLE)
        renderPieLegend(p, R, masterA)
    }
  }

  function renderPieLegend(p, R, masterA) {
    for (var s = AYL - 1, tp = 0; s >= 0; s--) {
      var S = AY[s], r = R / 1.25,
        text = Math.round((s === 0 ? 1 - tp : S.percent) * 100) + '%'
      ctx.font = 14 + S.percent * 30 + 'px ' + FONT
      var ts = ctx.measureText(text)
      tp += S.percent
      if (S.off)
        continue
      ctx.globalAlpha = p * S.alpha * masterA
      ctx.fillStyle = UI.pie.textColor
      ctx.fillText(text, UI.main.width / 2 + (1 - S.percent) * r * Math.cos(S.angle) - ts.width / 2 + 2 * S.dx, UI.main.height / 2 + (1 - S.percent) * r * Math.sin(S.angle) + 2 + 2 * S.dy)
    }
  }

  function renderPie(startIdx, endIdx, masterA) {
    var R = Math.min(UI.main.height, UI.main.width) / 2 - 10,
      values = new Array(AYL), totals = 0,
      angle = 90 * PI_RAD, segment

    for (var s = 0; s < AYL; s++) {
      var S = AY[s], a = A['on' + s]

      for (var i = startIdx, val; i <= endIdx; i++) {
        val = S.data[i]
        values[s] = (i === startIdx) ? val : values[s] + val
        if (s === 0)
          totals += TOTALS[i]
      }
    }

    if (!TYPES.area) {
      ctx.save()
      ctx.translate(UI.main.width / 2, UI.main.height / 2)
    }

    if (!isNaN(V.pieX)) {
      var sectorR = Math.sqrt(V.pieX * V.pieX + V.pieY * V.pieY),
        sectorA = Math.atan2(V.pieY, V.pieX)

      sectorA -= 90 * PI_RAD
      if (sectorA < 0)
        sectorA += 2 * Math.PI
    }

    for (s = AYL - 1; s >= 0; s--) {
      var S = AY[s],
        alpha = A['on' + s],
        percent = values[s] / totals,
        z = A['pieZoom' + s] || 0,
        a = (360 * V.progress * percent * alpha) * PI_RAD,
        d = 0,
        startA = angle - 90 * PI_RAD,
        dx = z * UI.pie.segmentShift * Math.cos(90 * PI_RAD + startA + a / 2),
        dy = z * UI.pie.segmentShift * Math.sin(90 * PI_RAD + startA + a / 2),
        dr = z * UI.pie.segmentShift

      if (sectorR <= R && sectorA >= startA && sectorA < startA + a)
        segment = s

      S.angle = angle + a / 2
      S.percent = alpha * percent
      S.alpha = alpha
      S.dx = dx
      S.dy = dy
      S.z = z
      ctx.globalAlpha = masterA
      ctx.fillStyle = S.barColor
      ctx.beginPath()
      ctx.moveTo(dx, dy)
      if (V.seriesCount === 1 && !S.off) {
        ctx.arc(0, 0, R + dr, angle, angle + 360 * PI_RAD)
        ctx.fill()
        break
      } else {
        d = dr / (360 - 180 * percent)
        ctx.arc(dx, dy, R + dr, angle + d, angle + a + PI_RAD * alpha - d)
      }
      angle += a
      ctx.fill()
    }

    if (!isNaN(segment)) {
      if (V.segment !== segment) {
        animate('pieZoom' + segment, 0, 1, ON_OFF_DURATION)
        if (!isNaN(V.segment)) {
          animate('pieZoom' + V.segment, 1, 0, ON_OFF_DURATION, 0)
        }
        V.segment = segment
      }
    } else if (!isNaN(V.segment)) {
      animate('pieZoom' + V.segment, 1, 0, ON_OFF_DURATION, 0)
      V.segment = undefined
    }

    if (!TYPES.area) {
      ctx.restore()
      renderPieLegend(V.progress, R, masterA)
    }
  }

  function renderSeries(type, masterA, width, height, vStart, vEnd, hPadding, offsetY, offsetX, isPreview) {
    var scaleX = width / (vEnd - vStart),
      startIdx = xToIndex(vStart - hPadding / scaleX, true),
      endIdx = xToIndex(vEnd + hPadding / scaleX),
      scaleY, step = Math.ceil((endIdx - startIdx) / (1.3 * width))

    startIdx -= startIdx % step

    ctx.globalAlpha = masterA
    if (TYPES.bar)
      renderBars(type, masterA, width, height, vStart, hPadding, offsetY, offsetX, isPreview, startIdx, endIdx, scaleX)
    else if (TYPES.area || (TYPES.pie && isPreview))
      renderArea(type, masterA, width, height, vStart, vEnd, hPadding, offsetY, offsetX, isPreview)
    else if (TYPES.pie)
      renderPie(V.selectedIndex, V.selectedIndex, masterA)
    else if (TYPES.linear)
      renderLinear(type, height, vStart, hPadding, offsetY, offsetX, startIdx, endIdx, scaleX, scaleY, step)
  }

  function renderMain() {
    ctx.lineWidth = UI.main.lineWidth
    renderSeries('local', TYPES.percentage ? 1 : 1 - V.progress, UI.preview.width, UI.main.height, V.localStart, V.localEnd, UI.chart.hPadding, UI.main.height, false)
    renderGrid()
  }

  function measureUI() {
    V.needMeasure = false

    var ww = window.innerWidth,
      wh = window.innerHeight,
      pageYOffset = window.pageYOffset

    if (pageYOffset !== V.pageYOffset) {
      UI.box.measure()
      V.pageYOffset = pageYOffset
    }

    if (V.prevW !== ww || V.prevH !== wh) {
      if (!V.showPreview)
        UI.preview.height = 0
      V.prevW = ww
      V.prevH = wh
      UI.box.measure()
      if (UI.box.h < UI.chart.height)
        V.prevH = 0
      UI.main.height = UI.chart.height - UI.preview.height - UI.xAxis.height
      UI.main.y = 0
      UI.main.width = UI.box.w
      UI.xAxis.y = UI.main.y + UI.main.height
      UI.preview.y = UI.chart.height - UI.preview.height
      UI.preview.width = UI.box.w - 2 * UI.chart.hPadding
      UI.preview.minHeight = UI.preview.height - 2 * UI.preview.vPadding
      UI.canvas.attr('width', UI.main.width * DPR).attr('height', UI.chart.height * DPR).stylo({ width: UI.main.width, height: UI.chart.height })
      ctx.scale(DPR, DPR)
      repaint()
    }
  }

  function renderGrid() {
    var showLegend = V.showLegend && !isNaN(V.vLineX)
    showLegend && (!(TYPES.bar || TYPES.pie) || TYPES.area) && UI.canvas.line(V.vLineX, TYPES.area ? 16 : 4, V.vLineX, UI.main.height, UI.grid.lineWidth, UI.grid.color, UI.grid.alpha)
    if (!V.zoomedChart)
      toggleLegend(showLegend || (TYPES.area && V.isZoomed))
  }

  function repaint() {
    STATE.repaint = true
    if (V.zoomedChart)
      V.zoomedChart.repaint()
  }

  this.repaint = repaint
  this.getSeries = function () {
    return AY
  }

  function updateRangeText(el, _start, _end) {
    var start = _start || V.localStart,
      end = _end || V.localEnd
    el.innerText = Math.abs(start - end) / ONE_DAY < 2 ? unixToD(start, true, true) : unixToDate(start) + ' - ' + unixToDate(end - 0.01 * ONE_DAY)
  }

  function recalcTotals() {
    TOTALS = new Array(AXL)
    for (var s = 0; s < AYL; s++) {
      for (var i = 0, v; i < AXL; i++) {
        v = AY[s].data[i] * A['on' + s]
        TOTALS[i] = (s === 0) ? v : TOTALS[i] + v
      }
    }
  }

  function recalcMinMax(name, start, end) {
    var prevMM, MM = minMax(start, end)

    if (TYPES.multi_yaxis || TYPES.stacked || TYPES.bar || TYPES.area) {
      if (!A[name + 'DY0']) {
        for (var i = 0; i < AYL; i++) {
          var s = AY[i]
          A[name + 'MinY' + i] = s.min
          A[name + 'DY' + i] = s.d
        }
      } else {
        for (var i = 0; i < AYL; i++) {
          var s = AY[i]
          prevMM = s[name + 'MM']
          if (s.min !== prevMM.min || s.d !== prevMM.d) {
            animate(name + 'DY' + i, prevMM.d, s.d, ANIMATE_DURATION)
            animate(name + 'MinY' + i, prevMM.min, s.min, ANIMATE_DURATION)
          }
        }
      }
      for (var i = 0; i < AYL; i++) {
        var s = AY[i]
        s[name + 'MM'] = {
          min: s.min,
          max: s.max,
          d: s.d
        }
      }
    } else {
      prevMM = V[name + 'MM']

      if (!prevMM) {
        A[name + 'MinY'] = MM.min
        A[name + 'DY'] = MM.d
      } else {
        if (MM.min !== prevMM.min || MM.d !== prevMM.d) {
          animate(name + 'DY', prevMM.d, MM.d, ANIMATE_DURATION)
          animate(name + 'MinY', prevMM.min, MM.min, ANIMATE_DURATION)
        }
      }
      V[name + 'MM'] = MM
    }
  }

  function render(time) {
    if (AXL < 2 || V.isDestroyed)
      return

    doAnimations(time)
    requestAnimationFrame(render)

    if (V.needMeasure)
      measureUI()

    var localRangeChanged = V.prevLocalStart !== V.localStart || V.prevLocalEnd !== V.localEnd,
      isZoomed = V.prevGlobalStart !== V.globalStart || V.prevGlobalEnd !== V.globalEnd,
      seriesCountChanged = V.seriesCount !== V.prevSeriesCount

    if (!STATE.repaint) return

    if (TYPES.percentage) {
      if (V.forceUpdate || V.isOnOffAnimating || !TOTALS || seriesCountChanged)
        recalcTotals()
    } else {
      if (seriesCountChanged || isZoomed || V.forceUpdate)
        recalcMinMax('global', xToIndex(V.globalStart), xToIndex(V.globalEnd))

      if (localRangeChanged || seriesCountChanged || isZoomed || V.forceUpdate)
        recalcMinMax('local', xToIndex(V.localStart), xToIndex(V.localEnd))
    }

    if (localRangeChanged || isZoomed || V.forceUpdate)
      updateRangeText(UI.localRange)

    V.prevSeriesCount = V.seriesCount
    V.prevLocalStart = V.localStart
    V.prevLocalEnd = V.localEnd
    V.prevGlobalStart = V.globalStart
    V.prevGlobalEnd = V.globalEnd

    if (!V.hidden) {
      if (!_parent) ctx.clearRect(0, UI.main.y - 5, UI.main.width, UI.chart.height)

      renderMain()
      renderPreview()
      renderAxis()
    }
    STATE.repaint = false
    V.forceUpdate = false
    if (V.zoomedChart) V.zoomedChart.repaint()
  }

  function animate(name, from, to, duration, update, ease, cb) {
    update ? update(from) : A[name] = from
    animations[name] = {
      ease: ease || EASE.outQuad,
      from,
      to,
      duration,
      update,
      cb
    }
  }

  function whereAmI(x,y_) {
    var y =y_ - UI.chart.topPadding
    if (y >= 0 && y < UI.main.y)
      return AREA.HEADER
    else if (y >= UI.main.y && y < UI.xAxis.y)
      return AREA.MAIN
    else if (y >= UI.xAxis.y && y < UI.preview.y)
      return AREA.XAXIS
    else if (y >= UI.preview.y) {
      var start = xToPreview(V.localStart),
        end = xToPreview(V.localEnd)
      if (x >= start - UI.preview.hitSlop && x <= start + UI.preview.handleW + UI.preview.hitSlop / 2)
        return AREA.BRUSH_LEFT
      else if (x > start + UI.preview.handleW && x < end - UI.preview.handleW - UI.preview.hitSlop / 2)
        return AREA.BRUSH_CENTER
      else if (x >= end - UI.preview.handleW - UI.preview.hitSlop / 2 && x < end + UI.preview.hitSlop)
        return AREA.BRUSH_RIGHT
      return AREA.PREVIEW
    }
  }

  function updateCheckbox(i, off) {
    var to = off ? 0 : 1

    UI['checkbox' + i].attr('class', styles['checkbox']).stylo({ backgroundColor: off ? 'transparent' : AY[i].color})
    UI['chk' + i].stylo({ transform: 'scale(' + to + ')', opacity: to }, true)
    UI['name' + i].stylo({ transform: 'translate3d(' + ((to - 1) * 8) + 'px, 0, 0)', color: off ? AY[i].color : '#fff' })
  }

  function toggleCheckbox(i, off) {
    var s = AY[i]
    s.off = off !== undefined ? off : !s.off
    s.off ? --V.seriesCount : ++V.seriesCount
    var from = s.off ? 1 : 0,
      to = s.off ? 0 : 1

    updateCheckbox(i, s.off)

    if (TYPES.stacked || TYPES.bar || TYPES.percentage) {
      V.isOnOffAnimating = true
      animate('on' + i, from, to, ON_OFF_DURATION, 0, s.off ? EASE.outQuad : EASE.inQuad, function() {
        V.isOnOffAnimating = false
        V.forceUpdate = true
      })
    } else {
      animate('alphaY' + i, from, to, ON_OFF_DURATION)
    }
    if (V.zoomedChart)
      V.zoomedChart.toggleCheckbox(i, off)
    toggleLegend(false)
  }

  this.toggleCheckbox = toggleCheckbox

  function toggleLegend(on) {
    var pieMode = TYPES.pie || (TYPES.percentage && V.isZoomed)
    if (!pieMode && !(on ^ V.legendIsVisible))
      return

    if (pieMode && isNaN(V.segment))
      return hideLegend()

    if (on) {
      var y, p, x = V.localStart + (V.vLineX - UI.chart.hPadding) / UI.preview.width * (V.localEnd - V.localStart),
        idx = pieMode ? V.selectedIndex : applyRange(Math.round((AXL - 1) * (x - X.min) / X.d), 0, AXL - 1),
        scaleX = UI.preview.width / (V.localEnd - V.localStart),
        dy = TYPES.linear ? UI.grid.markerRadius + UI.grid.markerLineWidth : 0,
        scaleY = (UI.main.height - dy) / A.localDY, side = 1, sum = 0

      UI.xval.innerText = V.isZoomed ? unixToTime(AX[idx]) : unixToD(AX[idx], true)
      V.highlightedX = V.vLineX

      ctx.fillStyle = UI.grid.markerFillColor
      ctx.lineWidth = UI.grid.markerLineWidth
      ctx.globalAlpha = 1

      UI.date.stylo({ display: pieMode ? 'none' : 'flex' })
      for (var i = 0, pp = 0; i < AYL; i++) {
        var S = AY[i], v = S.data[idx]
        UI['label' + i].stylo({ display: S.off || (pieMode && i !== V.segment) ? 'none' : 'flex', paddingTop: pieMode ? 0 : 5 })
        if (S.off) continue
        sum += v
        if (TYPES.multi_yaxis)
          scaleY = (UI.main.height - dy) / A['localDY' + i]
        UI['labelName' + i].innerText = S.name
        UI['labelValue' + i].innerText = format(v)
        if (TYPES.percentage) {
          p = v / TOTALS[V.selectedIdx]
          if (i === AYL - 1)
            p = 1 - pp
          pp += p
          UI['labelPercent' + i].stylo({ display: pieMode ? 'none' : 'flex' }).innerText = Math.round(p * 100) + '%'
        }
        if (!(TYPES.bar || TYPES.percentage)) {
          if (!(_parent ^ V.isZoomed))
            ctx.strokeStyle = S.color
          ctx.beginPath()
          ctx.arc(UI.chart.hPadding + (AX[idx] - V.localStart) * scaleX, UI.xAxis.y - (S.data[idx] - A['localMinY' + (TYPES.multi_yaxis ? i : '')]) * scaleY, UI.grid.markerRadius, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fill()
        }
      }

      if (TYPES.stacked) {
        UI.labelTotal.stylo({ display: V.seriesCount > 1 ? 'flex' : 'none' })
        UI.labelValueTotal.innerHTML = format(sum)
      }

      UI.legend.measure()
      if (pieMode) {
        x = V.pieX + UI.main.width / 2
        y = V.pieY + UI.main.height / 2
      } else {
        side = V.vLineX < UI.main.width / 2 ? 0 : 1
        x = applyRange(V.vLineX - UI.grid.legendShift - side * (UI.legend.w - 2 * UI.grid.legendShift), 2, UI.main.width - UI.legend.w - 2)
        if (chart.legendPosition === 'top') y = UI.chart.topPadding
        else if (chart.legendPosition === 'bottom') y = UI.xAxis.y - UI.legend.h + 40
        else y = applyRange(V.vLineY - UI.legend.h - (IS_MOBILE ? 50 : 10), UI.chart.topPadding, UI.xAxis.y - UI.legend.h + 20)
      }
      UI.legend.stylo({ opacity: 1, transform: 'translate3d(' + x + 'px, ' + y + 'px, 0)' }, true)

      if (V.legendTimer)
        clearTimeout(V.legendTimer)
      V.legendTimer = setTimeout(hideLegend, LEGEND_TIMER)
    } else
      hideLegend()

    V.legendIsVisible = on
  }

  function resetCursor() {
    UI.canvas.stylo({ cursor: 'auto' })
  }

  function dismiss() {
    if (_parent)
      return
    if (hideLegend())
      repaint()
    STATE.draggingArea = 0
    resetCursor()
  }

  this.dismiss = dismiss

  function minMax(start, end) {
    var min = Infinity, max = -Infinity,
      x1 = Math.max(0, start),
      x2 = Math.min(AXL, end)

    function compare(u) {
      if (u > max)
        max = u
      if (u < min)
        min = u
    }

    for (var y = 0; y < AYL; y++) {
      if (AY[y].off)
        continue

      if (TYPES.stacked || TYPES.bar || TYPES.percentage) {
        AY[y].max = querySTree(STREE_MAX[y], AXL, x1, x2, Math.max, -Infinity)
        AY[y].min = 0
        AY[y].d = AY[y].max
      } else if (TYPES.multi_yaxis) {
        AY[y].min = querySTree(STREE_MIN[y], AXL, x1, x2, Math.min, Infinity)
        AY[y].max = querySTree(STREE_MAX[y], AXL, x1, x2, Math.max, -Infinity)
        AY[y].d = AY[y].max - AY[y].min
      } else {
        compare(querySTree(STREE_MIN[y], AXL, x1, x2, Math.min, Infinity))
        compare(querySTree(STREE_MAX[y], AXL, x1, x2, Math.max, -Infinity))
      }
    }

    if (min === Infinity && V.localMM)
      return V.localMM

    return { min: min, max: max, d: max - min }
  }

  function applyRange(v, from, to) {
    return Math.max(from, Math.min(v, to))
  }

  function updateZoomedChart(chart) {
    if (V.zoomedChart)
      V.zoomedChart.setProgress(V)
  }

  function hideLegend() {
    var repaint = V.vLineX !== undefined
    if (!UI.legend) return
    V.vLineX = undefined
    V.highlightedX = -1
    UI.legend.stylo({ transform: 'translate3d(0, -1000px, 0)'})
    if (V.legendTimer) {
      clearTimeout(V.legendTimer)
      V.legendTimer = undefined
    }
    return repaint
  }

  function stop(e) {
    e.stopPropagation()
    e.preventDefault()
  }

  function flerken(o, className) {
    var el

    if (typeof o === 'object')
      el = o
    else {
      el = byId(o === ID ? ID : ID + '-' + o)
      className = styles[o === ID ? 'chart' : o.replace(/[\d]+/g, '')]
    }

    el.on = function (evt, cb) {
      evt.split(' ').map(function (name) {
        el.addEventListener(name, function (e) {
          var touch = e.touches && e.touches.length ? e.touches[0] : e,
            x = (touch.clientX || touch.pageX) - UI.box.x,
            y = (touch.clientY || touch.pageY) - UI.box.y
          cb(e, x, y, whereAmI(x, y), this)
        })
      })
      return el
    }
    el.attr = function (name, value) {
      el.setAttribute(name, value)
      return el
    }
    el.append = function (name) {
      var n = document.createElement(name)
      return flerken(el.appendChild(n), name)
    }
    el.measure = function () {
      var s = el.getBoundingClientRect()
      el.x = s.left
      el.y = s.top
      el.w = s.width
      el.h = s.height
      return el
    }
    el.stylo = function (s, raw) {
      var v
      for (var k in s) {
        v = raw ? s[k] : s[k] + (isNaN(s[k]) ? '' : 'px')
        el.style[k] = v
        if (k === 'transform') {
          el.style['webkitTransform'] = v
          el.style['mozTransform'] = v
          el.style['oTransform'] = v
          el.style['msTransform'] = v
        }
      }
      return el
    }
    el.shake = function () {
      el.classList.add('shake')
      setTimeout(function () {
        el.classList.remove('shake')
      }, 200)
    }
    el.line = function (x1, y1, x2, y2, w, color, alpha) {
      if (!isNaN(alpha))
        ctx.globalAlpha = alpha
      ctx.strokeStyle = color
      ctx.lineWidth = w
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
    el.rect = function (x, y, w, h, radius, left, right, clip) {
      var r = radius || 0,
        rightR = right ? r : 0,
        leftR = left ? r : 0

      ctx.beginPath()
      ctx.moveTo(x + leftR, y)
      ctx.arcTo(x + w, y, x + w, y + h, rightR)
      ctx.arcTo(x + w, y + h, x, y + h, rightR)
      ctx.arcTo(x, y + h, x, y, leftR)
      ctx.arcTo(x, y, x + w, y, leftR)
      if (clip)
        return ctx.clip()
      ctx.closePath()
      ctx.fill()
    }
    el.startLine = function (alpha, strokeStyle, fillStyle, lw) {
      ctx.globalAlpha = alpha
      if (ctx.strokeStyle)
        ctx.strokeStyle = strokeStyle
      if (ctx.fillStyle)
        ctx.fillStyle = fillStyle
      ctx.lineWidth = lw
      ctx.beginPath()
      ctx.lineCap = 'butt'
      ctx.lineJoin = 'bevel'
    }
    UI[o === ID ? 'box' : o] = el
    return el.attr('class', className).measure()
  }

  function hide() {
    V.hidden = true
  }

  this.hide = hide

  function zoomIn(x) {
    var selectedX = V.localStart + (x - UI.chart.hPadding) / UI.preview.width * (V.localEnd - V.localStart),
      selectedIndex = applyRange(Math.round((AXL - 1) * (selectedX - X.min) / X.d), 0, AXL - 1),
      date = AX[selectedIndex],
      selectedDate = applyRange(roundDate(date), X.min, X.max - ONE_DAY),
      currentGlobalStart = V.globalStart, currentGlobalEnd = V.globalEnd,
      currentLocalStart = V.localStart, currentLocalEnd = V.localEnd

    V.zoomStart = applyRange(selectedDate - 3 * ONE_DAY, X.min, X.max - 7 * ONE_DAY)
    V.zoomEnd = applyRange(V.zoomStart + 7 * ONE_DAY, X.min, X.max)

    V._globalStart = V.globalStart
    V._globalEnd = V.globalEnd
    V._localStart = V.localStart
    V._localEnd = V.localEnd

    function doZoom() {
      var d = ZOOM_IN_DURATION
      if (TYPES.percentage)
        d *= 2
      V.isZooming = true
      animate('zoomMain', 0, 1, d, function (v) {
        V.progress = v
      }, TYPES.percentage ? EASE.outBack : EASE.outSine)

      animate('zoomPreview', 0, 1, d, function (v) {
        var p = Math.min(1, v), p_ = (1 - p)
        V.globalStart = currentGlobalStart - p * (currentGlobalStart - V.zoomStart)
        V.globalEnd = currentGlobalEnd - p * (currentGlobalEnd - V.zoomEnd)
        V.localStart = currentLocalStart - p * (currentLocalStart - selectedDate)
        V.localEnd = currentLocalEnd - p * (currentLocalEnd - (selectedDate + ONE_DAY))
        UI.title.stylo({ opacity: p_, transform: 'scale(' + p_ + ', ' + p_ + ')' }, true)
        UI.zoom.stylo({ opacity: p, transform: 'scale(' + p + ', ' + p + ')' }, true)
        UI.localRange.stylo({ opacity: p_, transform: 'scale(' + p_ + ', ' + p_ + ')' }, true)
        UI.zoomedRange.stylo({ opacity: p, transform: 'scale(' + p + ', ' + p + ')' }, true)
        updateRangeText(UI.zoomedRange)
        updateZoomedChart()
      }, EASE.outCubic, function () {
        V.isZooming = false
        V.isZoomed = true
        resize()
        if (V.zoomedChart)
          V.zoomedChart.wakeUp()
      })
      V.selectedIndex = selectedIndex
      hideLegend()
    }

    if (!chart.x_on_zoom) {
      if (TYPES.percentage)
        doZoom()
      return
    }

    chart.x_on_zoom(AX[selectedIndex]).then(function (data) {
      V.zoomedChart = new Charty(ID, data, self, UI, ctx)
      repaint()
      doZoom()
    }, function (error) {
      alert('Error loading file: ' + JSON.stringify(error) + '\n\nx: ' + date)
    })
  }

  this.setProgress = function (V_) {
    SHARED_PROPS.forEach(function (p) {
      V[p] = V_[p]
    })
    V.progress = (1 - V_.progress)
    repaint()
  }

  this.getTheme = function () {
    return currentTheme
  }

  function zoomOut(x) {
    if (!V.isZoomed)
      return zoomIn()

    var currentGlobalStart = V.globalStart, currentGlobalEnd = V.globalEnd,
      currentLocalStart = V.localStart, currentLocalEnd = V.localEnd

    V.isZooming = true
    animate('zoomOut', 1, 0, ZOOM_OUT_DURATION, function (v) {
      V.globalStart = currentGlobalStart - (1 - v) * (currentGlobalStart - V._globalStart)
      V.globalEnd = currentGlobalEnd - (1 - v) * (currentGlobalEnd - V._globalEnd)
      V.localStart = currentLocalStart - (1 - v) * (currentLocalStart - V._localStart)
      V.localEnd = currentLocalEnd - (1 - v) * (currentLocalEnd - V._localEnd)
      V.progress = v
      UI.title.stylo({ opacity: (1 - v), transform: 'scale(' + (1 - v) + ', ' + (1 - v) + ')' }, true)
      UI.zoom.stylo({ opacity: v, transform: 'scale(' + v + ', ' + v + ')' }, true)
      UI.localRange.stylo({ opacity: (1 - v), transform: 'scale(' + (1 - v) + ', ' + (1 - v) + ')' }, true)
      UI.zoomedRange.stylo({ opacity: v, transform: 'scale(' + v + ', ' + v + ')' }, true)
      updateRangeText(UI.localRange)
      updateZoomedChart()
    }, EASE.inCubic, function () {
      V.isZooming = false
      V.isZoomed = false
      resize()
      if (V.zoomedChart) {
        V.zoomedChart.destroy()
        V.zoomedChart = undefined
      }
      wakeUp()
    })

    if (!TYPES.percentage)
      renderCtrls(V.zoomedChart.getSeries())
    hideLegend()
  }

  this.setData = function (data) {
    start(data)
  }

  function wakeUp() {
    V.hidden = false
    V.forceUpdate = true
    repaint()
  }

  function resize() {
    V.needMeasure = true
  }

  function scroll() {
    V.needMeasure = true
  }

  this.wakeUp = wakeUp

  this.destroy = function () {
    V.isDestroyed = true
    window.removeEventListener('resize', resize)
    window.removeEventListener('scroll', scroll)
    document.removeEventListener('mousemove', dismiss)
  }

  function moveBrush(newLocalStart, newLocalEnd) {
    if (V.movingBrush) return
    V.movingBrush = 1
    var start = V.localStart, end = V.localEnd
    animate('snapDay', 0, 1, SNAP_DURATION, function (p) {
      V.localStart = start - p * (start - newLocalStart)
      V.localEnd = end - p * (end - newLocalEnd)
      updateZoomedChart()
    }, 0, function () {
      V.movingBrush = 0
      updateRangeText(UI.zoomedRange)
    })
    updateZoomedChart()
  }

  function hookEvents() {
    document.addEventListener('mousemove', dismiss)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', scroll)

    UI.legend.on('touchmove mousemove', stop)

    UI.legend.on('touchstart mousedown', function (e, x) {
      if (!isNaN(V.vLineX) && !V.zoomedChart)
        zoomIn(V.vLineX)
    })

    UI.canvas.on('touchmove mousemove', function (e, x, y, area) {
      for (var c = 0, cl = CHARTS.length; c < cl; c++)
        if (c !== myIdx)
          CHARTS[c].dismiss()

      V.vLineX = undefined
      V.vLineY = undefined
      V.pieX = undefined
      V.pieY = undefined

      if (!V.isZoomed || !TYPES.percentage) {
        if (area === AREA.MAIN) {
          V.vLineX = x
          V.vLineY = y
        }
        if (!isNaN(V.vLineX))
          V.legendIsVisible = false
        updateZoomedChart()
      }

      if (TYPES.pie || (V.isZoomed && TYPES.percentage)) {
        if (area === AREA.MAIN) {
          V.pieX = x - UI.main.width / 2
          V.pieY = y - UI.main.height / 2 - UI.chart.topPadding
        }
      }

      if (area >= AREA.XAXIS)
        hideLegend()
      repaint()

      if (!IS_MOBILE || STATE.draggingArea >= AREA.PREVIEW)
        stop(e)

      if (!IS_MOBILE && !STATE.draggingArea) {
        if (area === AREA.BRUSH_LEFT || area === AREA.BRUSH_RIGHT)
          UI.canvas.stylo({ cursor: 'ew-resize' })
        else if (area === AREA.BRUSH_CENTER)
          UI.canvas.stylo({ cursor: 'move' })
        else resetCursor()
      }

      var width = V.localEnd - V.localStart,
        newLocalStart, newLocalEnd

      if (STATE.draggingArea === AREA.BRUSH_LEFT) {
        newLocalStart = applyRange((x - UI.preview.handleW / 2 - UI.chart.hPadding) / UI.preview.width * (V.globalEnd - V.globalStart) + V.globalStart, V.globalStart, V.isZoomed ? V.globalEnd : V.localEnd - V.minBrushSize)
        if (V.isZoomed) {
          if (!TYPES.percentage && Math.abs(V.localStart - newLocalStart) > 0.6 * ONE_DAY && newLocalStart < V.localEnd - 0.5 * ONE_DAY)
            moveBrush(roundDate(newLocalStart), V.localEnd)
        } else
          V.localStart = newLocalStart
      } else if (STATE.draggingArea === AREA.BRUSH_RIGHT) {
        newLocalEnd = applyRange((x + UI.preview.handleW / 2 - UI.chart.hPadding) / UI.preview.width * (V.globalEnd - V.globalStart) + V.globalStart, V.isZoomed ? 0 : V.localStart + V.minBrushSize, V.globalEnd)
        if (V.isZoomed) {
          if (!TYPES.percentage && Math.abs(newLocalEnd - V.localEnd) > 0.5 * ONE_DAY && newLocalEnd > V.localStart + 0.7 * ONE_DAY)
            moveBrush(V.localStart, roundDate(newLocalEnd))
        } else
          V.localEnd = newLocalEnd
      } else if (STATE.draggingArea === AREA.BRUSH_CENTER) {
        newLocalStart = applyRange((x - V.deltaDragX - UI.preview.handleW / 2 - UI.chart.hPadding) / UI.preview.width * (V.globalEnd - V.globalStart) + V.globalStart, V.globalStart, V.globalEnd - width)
        newLocalEnd = applyRange(newLocalStart + width, V.globalStart, V.globalEnd)
        if (V.isZoomed || TYPES.pie) {
          if (Math.abs(V.localStart - newLocalStart) > 0.7 * ONE_DAY)
            moveBrush(roundDate(newLocalStart), roundDate(newLocalStart) + (V.localEnd - V.localStart))
          V.selectedIndex = applyRange(Math.round((AXL - 1) * (newLocalStart - X.min) / X.d), 0, AXL - 1)
        } else {
          V.localStart = newLocalStart
          V.localEnd = newLocalEnd
        }
      }
    })

    UI.zoom.on('touchstart mousedown', function () {
      if (V.isZoomed) {
        restorePreview()
        zoomOut()
      }
    })

    UI.canvas.on('touchstart mousedown', function (e, x, y, area) {
      STATE.draggingArea = area
      if (area > AREA.PREVIEW) {
        V.deltaDragX = x - xToPreview(V.localStart) - UI.preview.handleW / 2
      }
    })

    UI.canvas.on('touchend touchcancel mouseup', function (e, x, y, area) {
      if (!IS_MOBILE && !isNaN(V.vLineX) && !V.zoomedChart)
        zoomIn(V.vLineX)
      STATE.draggingArea = 0
    })
  }
}

export default Charty;