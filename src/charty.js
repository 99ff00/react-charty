/*
 *  Copyright (c) 2019-present, Aleksandr Telegin
 *
 * This source code is licensed under the MIT license.
 */

/* eslint-disable space-before-function-paren */
/* eslint-disable no-multi-str */
/* eslint-disable one-var */

import styles from './styles.css'

var CHARTY = '<div id=|header>\
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
  DEFAULT_THEME = {
    grid: { color: '#182D3B', alpha: 0.1, markerFillColor: '#fff' },
    legend: { background: '#fff', color: '#000' },
    preview: { maskColor: '#E2EEF9', maskAlpha: 0.6, brushColor: '#C0D1E1' },
    xAxis: { textColor: '#8E8E93', textAlpha: 1 },
    yAxis: { textColor: '#8E8E93', textAlpha: 1 },
    title: { color: '#000' },
    localRange: { color: '#000' },
    zoomedRange: { color: '#000' }
  },
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
  SNAP_DURATION = 300,
  LEGEND_TIMER = 10000,
  AREA = { HEADER: 1, MAIN: 2, XAXIS: 3, PREVIEW: 4, BRUSH_CENTER: 5, BRUSH_LEFT: 6, BRUSH_RIGHT: 7 },
  IS_MOBILE = window.orientation !== undefined,
  CHARTS = [],
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
  },
  DATA_TYPES = {
    time: function(v) {
      return unixToTime(v)
    },
    date: function (v) {
      return unixToD(v)
    },
    shortDate: function(v) {
      return unixToD(v)
    },
    longDate: function(v) {
      return unixToDate(v)
    },
    longDateWeekDay: function (v) {
      return unixToD(v, true, true)
    },
    float1: function (v) {
      return parseFloat(v).toFixed(1)
    },
    float2: function (v) {
      return parseFloat(v).toFixed(2)
    },
    number: function (v) {
      return format(v)
    },
    undefined: function(v) {
      return Math.round(v)
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

var Charty = function (ID_, props, parent, UI_, ctx_) {
  var ID = typeof ID_ === 'object' ? ID_.id : ID_

  if (!ID)
    ID = ID_.id = 'charty-' + CHARTS.length

  var V = { progress: 0, needMeasure: true, yPos: [] }, ctx = ctx_,
    IDs = [ID], AY = [], AYL, AX, AXL, X = {}, TYPES = {},
    TOTALS, PERCENTS = [], STREE_MIN = [], STREE_MAX = [], animations = {}, A = { previewA: 1 },
    STATE = {}, myIdx = CHARTS.length, parentSeries, currentTheme,
    UI = UI_ || {
      chart: { topPadding: 50, hPadding: 15, height: 400 },
      pie: { textColor: '#fff', segmentShift: 5 },
      preview: { height: 46, vPadding: 1, radius: 8, lineWidth: 1, handleW: 9, handleTick: 10, minBrushSize: 10, hitSlop: 10 },
      grid: { lineWidth: 1, legendShift: -10, markerRadius: 3, markerLineWidth: 4 },
      xAxis: { textWidth: 80, height: 32, fadeTime: 250 },
      yAxis: { textCount: 5, fadeTime: 500 },
      main: { lineWidth: 2, vPadding: 15 }
    },
    self = this

  CHARTS.push(self)

  if (parent)
    parentSeries = parent.getSeries()

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
        if (theme.buttons)
          UI['name' + i].stylo({ color: theme.buttons[s.name] })
        if (UI['labelValue' + i] && theme.labels)
          UI['labelValue' + i].stylo({ color: theme.labels[s.name] })
      }
      s.barColor = (currentTheme.bars || {})[s.name] || s.color
      s.lineColor = (currentTheme.lines || {})[s.name] || s.color
    }
    V.stepGridX = undefined
    V.stepGridY = undefined
    repaint()
  }

  this.setTheme = setTheme
  this.getDefaultTheme = function() {
    return DEFAULT_THEME
  }

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
    if (parent)
      setTheme(parent.getTheme())
    else if (currentTheme)
      setTheme(currentTheme)
    else {
      setTheme(props.theme || DEFAULT_THEME)
    }
  }

  function renderLegend() {
    UI.legend.innerHTML = parse(LEGEND, [])
    IDs.map(flerken)
  }

  function renderCtrls() {
    if (!V.showButtons)
      UI.ctrls.innerHTML = ''
    else {
      UI.ctrls.innerHTML = parse(CTRLS, [])
      IDs.map(flerken)

      AY.map(function (S, i) {
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
        updateCheckbox(i, S.off)
      })
    }
    updateTheme()
  }

  function togglePreview(on) {
    animate('previewA', on ? 0 : 1, on, 2 * ON_OFF_DURATION)
    var d = on ? 0 : UI.preview.height + 10
    UI.ctrls.stylo({ transform: 'translate3d(0, -' + d + 'px, 0)' })
    V.previewOff = !on
  }

  this.togglePreview = togglePreview

  function restorePreview() {
    if (V.previewOff)
      self.togglePreview(true)
  }

  function error(msg) {
    throw msg
  }

  function start(data_) {
    var data = props.data || data_
    if (!data)
      return error('The data parameter is missing.')

    if (!data.x || !(data.x instanceof Array))
      return error('The x-axis data is missing.')

    var type = props.type || 'line';
    ['line', 'stacked', 'area', 'percentage', 'multi_yaxis', 'bar', 'pie'].forEach(function(t) {
      TYPES[t] = type.indexOf(t) >= 0
    })

    Object.keys(data).forEach(function(n) {
      var d = data[n]

      if (n === 'x')
        AX = d
      else
        AY.push({ data: d, color: (props.colors || {})[n], name: (props.names || {})[n], type: props.type })
    })

    AYL = AY.length
    AXL = AX.length
    X.min = AX[0]
    X.max = AX[AXL - 1]
    X.d = X.max - X.min

    TYPES.linear = TYPES.line || TYPES.multi_yaxis
    V.showLegend = props.showLegend !== false
    V.showButtons = props.showButtons !== false && AYL > 1
    V.showPreview = props.showPreview !== false
    V.showRangeText = props.showRangeText !== false
    V.showLegendTitle = props.showLegendTitle !== false
    V.stepX = props.stepX || 1
    V.zoomStepX = props.zoomStepX || 1
    V.autoScale = props.autoScale !== false

    for (var i = 0, S; i < AYL; i++) {
      var S = AY[i], off = false

      if (!TYPES.percentage) {
        STREE_MAX[i] = initSTree(S.data)
        buildSTree(STREE_MAX[i], S.data, Math.max)
        STREE_MIN[i] = initSTree(S.data)
        buildSTree(STREE_MIN[i], S.data, Math.min)
      }

      if (parentSeries && parentSeries[i] && parentSeries[i].name === S.name)
        off = parentSeries[i].off

      S.off = off
      A['alphaY' + i] = off ? 0 : 1
      A['on' + i] = off ? 0 : 1
    }

    V.localStart = props.startX || 2 / 3 * X.d + X.min
    V.localEnd = props.endX || X.max
    V.globalStart = X.min
    V.globalEnd = X.max
    V.minBrushSize = X.d * UI.preview.minBrushSize / 100
    V.seriesCount = AYL
    V.avgRange = 1

    if (parent) {
      renderLegend()
      renderCtrls()
      parent.togglePreview(V.showPreview)
    } else {
      byId(ID).innerHTML = parse(CHARTY)
      IDs.map(flerken)
      renderLegend()
      renderCtrls()
      togglePreview(V.showPreview)
      UI.title.innerText = props.title
      ctx = UI.canvas.getContext('2d')
      hookEvents()
    }

    measureUI()
    render()
  }

  function xToIdx(x) {
    return applyRange(Math.round((AXL - 1) * (x - X.min) / X.d), 0, AXL - 1)
  }

  function xToIdxUp(x) {
    return applyRange(Math.ceil((AXL - 1) * (x - X.min) / X.d), 0, AXL - 1)
  }

  function xToIdxDown(x) {
    return applyRange(Math.floor((AXL - 1) * (x - X.min) / X.d), 0, AXL - 1)
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

      if (props.animated === false) {
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
      parent && parent.repaint()
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

    if ((TYPES.bar || TYPES.area || TYPES.pie)) {
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
    var h = UI.preview.height, minH = UI.preview.minHeight, w = UI.preview.width,
      a = A['previewA']

    if (!parent)
      ctx.clearRect(0, UI.xAxis.y + 5, UI.main.width, UI.xAxis.height + h)

    if (!V.showPreview)
      return

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
      scaleY = (UI.main.height - 22) / localD,
      start = xToIdxDown(V.localStart - UI.chart.hPadding / scaleX),
      end = xToIdxUp(V.localEnd + UI.chart.hPadding / scaleX),
      y = UI.xAxis.y + UI.xAxis.height / 2,
      stepGridX = props.xAxisStep ? props.xAxisStep : Math.pow(2, Math.ceil(Math.log(3 * UI.xAxis.textWidth * (end - start) / w))) || 1,
      stepGridY = Math.round(localD / UI.yAxis.textCount) || 1,
      d = 5 * Math.pow(10, (stepGridY.toString().length - 2)) || 1

    stepGridY = Math.max(1, Math.round(stepGridY / d) * d)

    if (V.stepGridX !== stepGridX) {
      if (V.stepGridX) {
        if (V.stepGridX < stepGridX)
          animate('stepGridXA' + V.stepGridX, 1, 0, UI.xAxis.fadeTime)
        V.prevStepGridX = V.stepGridX
      }
      if (!V.prevStepGridX || stepGridX < V.prevStepGridX)
        animate('stepGridXA' + stepGridX, 0, 1, UI.xAxis.fadeTime)
      if (stepGridX > V.prevStepGridX)
        A['stepGridXA' + stepGridX] = 1
      V.stepGridX = stepGridX
    }

    if (V.prevStepGridX)
      renderXText(1, V.prevStepGridX, start, end, scaleX, y, 1 - p)

    renderXText(0, stepGridX, start, end, scaleX, y, 1 - p)

    if (V.stepGridY !== stepGridY) {
      if (V.stepGridY) {
        animate('stepGridYA' + V.stepGridY, 1, 0, UI.yAxis.fadeTime / 2, 0, 0, function () {
          V.prevStepGridY = 0
          V.yPos = []
        })
        V.prevStepGridY = V.stepGridY
      }
      animate('stepGridYA' + stepGridY, 0, 1, UI.yAxis.fadeTime)
      V.stepGridY = stepGridY
    }

    if (V.prevStepGridY)
      renderYText(1, V.prevStepGridY, scaleY, localMin, localMax, localD, minLocalD, lowerMin, 1 - p)

    renderYText(0, stepGridY, scaleY, localMin, localMax, localD, minLocalD, lowerMin, 1 - p)

    if (TYPES.percentage) {
      ctx.globalAlpha = UI.xAxis.textAlpha * (1 - p)
      ctx.fillStyle = UI.yAxis.textColor
      ctx.fillText('100', UI.chart.hPadding, 12)
    }
  }

  function renderXText(prevStep, stepGridX, start, end, scaleX, y, p) {
    var a = A['stepGridXA' + stepGridX] * UI.xAxis.textAlpha * p
    if (a === 0) return
    start -= start % stepGridX
    ctx.fillStyle = UI.xAxis.textColor
    ctx.globalAlpha = a
    for (var i = start, x, u; i <= end; i += stepGridX) {
      if (!prevStep && stepGridX < V.prevStepGridX && i % V.prevStepGridX === 0) continue
      if (prevStep && stepGridX > V.prevStepGridX && i % V.prevStepGridX === 0) continue
      if (prevStep && V.stepGridX > V.prevStepGridX && i % V.stepGridX === 0) continue
      x = UI.chart.hPadding + (AX[i] - V.localStart) * scaleX
      u = props.xAxisType instanceof Function ? props.xAxisType(AX[i]) : DATA_TYPES[props.xAxisType](AX[i])
      ctx.fillText(u, x, y)
    }
  }

  function renderYText(prevStep, stepGridY, scaleY, localMin, localMax, localD, minLocalD, lowerMin, p) {
    var u, y = localMin, y_, yPos, val, c = 0, a0 = TYPES.multi_yaxis ? A['alphaY0'] : 1,
      a1 = TYPES.multi_yaxis ? A['alphaY1'] : 1,
      a = A['stepGridYA' + stepGridY], v

    while (y < localMax) {
      y_ = (c === 0) && stepGridY > 10 ? Math.ceil(y / 10) * 10 : y

      yPos = UI.xAxis.y - (y - localMin) * scaleY
      if (prevStep && c > 0) {
        v = V.yPos[c]
        if (v)
          yPos = yPos + (yPos - V.yPos[c]) * a
      }
      val = '' + Math.floor(c === 0 ? localMin : y_)

      ctx.globalAlpha = a * p * a0 * UI.yAxis.textAlpha
      ctx.fillStyle = TYPES.multi_yaxis ? AY[0].lineColor : UI.yAxis.textColor
      u = props.yAxisType instanceof Function ? props.yAxisType(val) : DATA_TYPES[props.yAxisType](val)
      ctx.fillText(u, UI.chart.hPadding, yPos - 5)
      if (TYPES.multi_yaxis) {
        ctx.fillStyle = AY[1].lineColor || UI.yAxis.textColor
        val = Math.max(0, Math.floor(lowerMin + (y - localMin) / localD * minLocalD))
        if (c > 0 && val > 50)
          val = Math.ceil(val / 10) * 10
        ctx.globalAlpha = a * p * a1
        u = props.yAxisType instanceof Function ? props.yAxisType(val) : DATA_TYPES[props.yAxisType](val)
        ctx.fillText(u, UI.main.width - UI.chart.hPadding - ctx.measureText(u).width - 5, yPos - 5)
      }

      UI.canvas.line(UI.chart.hPadding, yPos, UI.main.width - UI.chart.hPadding, yPos, UI.grid.lineWidth, UI.grid.color, a * UI.grid.alpha * p)
      if (!prevStep)
        V.yPos[c] = yPos
      if (c === 0 && stepGridY > 10) {
        y_ = y_ + (stepGridY - y_ % stepGridY)
        y = y_ - y < stepGridY * 0.6 ? y_ + stepGridY : y_
      } else
        y += stepGridY
      c++
    }
  }

  function renderLinear(type, height, vStart, hPadding, offsetY, offsetX, startIdx, endIdx, scaleX, scaleY) {
    height -= UI.grid.markerRadius + UI.grid.markerLineWidth
    for (var s = 0, idx, x, data, color; s < AYL; s++) {
      data = AY[s].data
      color = AY[s].lineColor

      UI.canvas.startLine((1 - V.progress) * A['alphaY' + s], color, 0, ctx.lineWidth)
      idx = TYPES.multi_yaxis ? s : ''
      scaleY = height / A[type + 'DY' + idx]
      for (var i = startIdx; i <= endIdx; i++) {
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
      barWidth = Math.ceil((UI.main.width) / (endIdx - startIdx)) + 1,
      max = 0, alpha, scaleY, STACK = new Array(AXL),
      selectX, selectY, selectH

    for (var s = 0, val; s < AYL; s++) {
      val = A[type + 'DY' + s] * A['on' + s]
      max = TYPES.stacked ? max + val : Math.max(max, val)
    }

    if (V.showLegend && V.vLineX >= 0) {
      x = V.localStart + (V.highlightedX - UI.chart.hPadding) / UI.preview.width * (V.localEnd - V.localStart)
      selectedIdx = xToIdxDown(x)
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
      startIdx = xToIdxDown(vStart - hPadding / scaleX),
      endIdx = xToIdxUp(vEnd + hPadding / scaleX),
      STACK = new Array(AXL),
      progress = isPreview ? 0 : V.progress,
      R = Math.min(UI.main.height, UI.main.width) / 2 - 10,
      p = Math.min(1, progress),
      _p = (1 - progress)

    if (p > 0 && !isPreview) {
      vStart = V._localStart
      vEnd = V._localEnd
      scaleX = width / (vEnd - vStart)
      startIdx = xToIdxDown(vStart - hPadding / scaleX)
      endIdx = xToIdxUp(vEnd + hPadding / scaleX)
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
        renderPie(xToIdxDown(V.localStart), xToIdxUp(V.localEnd), masterA)
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
      angle = 90 * PI_RAD, segment,
      progress = TYPES.pie ? 1 : V.progress

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
        a = (360 * progress * percent * alpha) * PI_RAD,
        d = 0,
        startA = angle - 90 * PI_RAD,
        dx = z * UI.pie.segmentShift * Math.cos(90 * PI_RAD + startA + a / 2),
        dy = z * UI.pie.segmentShift * Math.sin(90 * PI_RAD + startA + a / 2),
        dr = z * UI.pie.segmentShift

      PERCENTS[s] = percent

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
      renderPieLegend(progress, R, masterA)
    }
  }

  function renderSeries(type, masterA, width, height, vStart, vEnd, hPadding, offsetY, offsetX, isPreview) {
    var scaleX = width / (vEnd - vStart),
      startIdx = xToIdxDown(vStart - hPadding / scaleX),
      endIdx = xToIdxUp(vEnd + hPadding / scaleX),
      scaleY

    ctx.globalAlpha = masterA
    if (TYPES.bar)
      renderBars(type, masterA, width, height, vStart, hPadding, offsetY, offsetX, isPreview, startIdx, endIdx, scaleX)
    else if (TYPES.area || (TYPES.pie && isPreview))
      renderArea(type, masterA, width, height, vStart, vEnd, hPadding, offsetY, offsetX, isPreview)
    else if (TYPES.pie)
      renderPie(startIdx, endIdx, masterA)
    else if (TYPES.linear)
      renderLinear(type, height + 7, vStart, hPadding, offsetY, offsetX, startIdx, endIdx, scaleX, scaleY)
  }

  function renderMain() {
    ctx.lineWidth = UI.main.lineWidth
    renderSeries('local', TYPES.percentage ? 1 : 1 - V.progress, UI.preview.width, UI.main.height - 1.5 * UI.main.vPadding, V.localStart, V.localEnd, UI.chart.hPadding, UI.main.height, false)
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

  this.getProps = function () {
    return props
  }

  this.getAxesData = function () {
    return { AX: AX, AY: AY, X: X }
  }

  function updateRangeText(el, _start, _end) {
    if (!V.showRangeText || V.isZooming)
      return

    var start = _start === undefined ? V.localStart : _start,
      end = _end === undefined ? V.localEnd : _end,
      rangeText, rangeTextType = V.zoomedChart ? V.zoomedChart.getProps().rangeTextType : props.rangeTextType

    if (props.xAxisType === 'date')
      end -= V.stepX

    if (rangeTextType instanceof Function) {
      rangeText = rangeTextType(start, end)
    } else if (rangeText === undefined) {
      var startStr = DATA_TYPES[rangeTextType](start),
        endStr = DATA_TYPES[rangeTextType](end)

      rangeText = startStr === endStr ? startStr : startStr + ' - ' + endStr
    }

    el.innerText = rangeText
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

    for (var y = 0, S; y < AYL; y++) {
      S = AY[y]
      if (S.off && !TYPES.multi_yaxis) {
        S.max = 0
        S.min = 0
        S.d = 0
        continue
      }

      if (TYPES.stacked || TYPES.bar || TYPES.percentage) {
        if (V.autoScale) {
          S.max = querySTree(STREE_MAX[y], AXL, x1, x2, Math.max, -Infinity)
          S.min = 0
        } else {
          S.max = props.maxY === undefined ? querySTree(STREE_MAX[y], AXL, 0, AXL, Math.max, -Infinity) : props.maxY
          S.min = props.minY || 0
        }
        S.d = S.max
      } else if (TYPES.multi_yaxis) {
        if (V.autoScale) {
          S.min = querySTree(STREE_MIN[y], AXL, x1, x2, Math.min, Infinity)
          S.max = querySTree(STREE_MAX[y], AXL, x1, x2, Math.max, -Infinity)
        } else {
          S.min = props.minY === undefined ? querySTree(STREE_MIN[y], AXL, 0, AXL, Math.min, Infinity) : props.minY
          S.max = props.maxY === undefined ? querySTree(STREE_MAX[y], AXL, 0, AXL, Math.max, -Infinity) : props.maxY
        }
        S.d = S.max - S.min
      } else {
        compare(querySTree(STREE_MIN[y], AXL, x1, x2, Math.min, Infinity))
        compare(querySTree(STREE_MAX[y], AXL, x1, x2, Math.max, -Infinity))
      }
    }

    min = !V.autoScale && props.minY !== undefined ? props.minY : min
    max = !V.autoScale && props.maxY !== undefined ? props.maxY : max

    if (min === Infinity && V.localMM)
      return V.localMM

    return { min: min, max: max, d: max - min }
  }

  function recalcMinMax(name, start, end) {
    var prevMM, MM

    if (V.autoScale)
      MM = minMax(start, end)
    else {
      MM = V[name + 'MM']
      if (!MM)
        MM = minMax(0, AXL)
    }

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

    if (TYPES.percentage || TYPES.pie) {
      if (!TOTALS || V.forceUpdate || V.isOnOffAnimating || seriesCountChanged)
        recalcTotals()
    } else {
      if (seriesCountChanged || isZoomed || V.forceUpdate)
        recalcMinMax('global', xToIdxUp(V.globalStart), xToIdxUp(V.globalEnd))

      if (localRangeChanged || seriesCountChanged || isZoomed || V.forceUpdate)
        recalcMinMax('local', xToIdxUp(V.localStart), xToIdxUp(V.localEnd))
    }

    if (localRangeChanged || isZoomed || V.forceUpdate)
      updateRangeText(UI.localRange)

    V.prevSeriesCount = V.seriesCount
    V.prevLocalStart = V.localStart
    V.prevLocalEnd = V.localEnd
    V.prevGlobalStart = V.globalStart
    V.prevGlobalEnd = V.globalEnd

    if (!V.hidden) {
      if (!parent) ctx.clearRect(0, UI.main.y - 5, UI.main.width, UI.chart.height)

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

  function whereAmI(x, y_) {
    var y = y_ - UI.chart.topPadding,
      area = AREA.HEADER

    if (y >= UI.main.y && y < UI.xAxis.y)
      area = AREA.MAIN
    else if (y >= UI.xAxis.y && y < UI.preview.y)
      area = AREA.XAXIS
    else if (y >= UI.preview.y) {
      var start = xToPreview(V.localStart),
        end = xToPreview(V.localEnd)
      if (x >= start - UI.preview.hitSlop && x <= start + UI.preview.handleW + UI.preview.hitSlop / 2)
        area = AREA.BRUSH_LEFT
      else if (x > start + UI.preview.handleW && x < end - UI.preview.handleW - UI.preview.hitSlop / 2)
        area = AREA.BRUSH_CENTER
      else if (x >= end - UI.preview.handleW - UI.preview.hitSlop / 2 && x < end + UI.preview.hitSlop)
        area = AREA.BRUSH_RIGHT
      else
        area = AREA.PREVIEW
    }
    return area
  }

  function updateCheckbox(i, off) {
    var to = off ? 0 : 1

    UI['checkbox' + i].attr('class', styles['checkbox']).stylo({backgroundColor: off ? 'transparent' : AY[i].color})
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

    if (TYPES.stacked || TYPES.bar || TYPES.percentage || TYPES.pie) {
      V.isOnOffAnimating = true
      animate('on' + i, from, to, ON_OFF_DURATION, 0, s.off ? EASE.outQuad : EASE.inQuad, function() {
        V.isOnOffAnimating = false
        V.forceUpdate = true
      })
      A['alphaY' + i] = 1
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
        idx = pieMode ? V.selectedIndex : (TYPES.bar ? xToIdxDown(x) : xToIdx(x)),
        scaleX = UI.preview.width / (V.localEnd - V.localStart),
        dy = TYPES.linear ? UI.grid.markerRadius + UI.grid.markerLineWidth : 0,
        scaleY = (UI.main.height - UI.main.vPadding - dy) / A.localDY, side = 1, sum = 0

      if (V.showLegendTitle)
        UI.xval.innerText = DATA_TYPES[props.xAxisType](AX[idx])
      else
        UI.xval.stylo({ display: 'none' })

      V.highlightedX = V.vLineX

      ctx.fillStyle = UI.grid.markerFillColor
      ctx.lineWidth = UI.grid.markerLineWidth
      ctx.globalAlpha = 1

      UI.date.stylo({ display: pieMode ? 'none' : 'flex' })

      for (var s = 0, pp = 0; s < AYL; s++) {
        var S = AY[s], v = S.data[idx]
        UI['label' + s].stylo({ display: S.off || (pieMode && s !== V.segment) ? 'none' : 'flex', paddingTop: pieMode ? 0 : 5 })
        if (S.off) continue
        sum += v
        if (TYPES.multi_yaxis)
          scaleY = (UI.main.height - UI.main.vPadding - dy) / A['localDY' + s]
        UI['labelName' + s].innerText = S.name
        UI['labelValue' + s].innerText = format(v)
        if (TYPES.percentage || TYPES.pie) {
          p = v / TOTALS[idx]
          if (s === AYL - 1)
            p = 1 - pp
          pp += p
          UI['labelPercent' + s].stylo({ display: pieMode ? 'none' : 'flex' }).innerText = Math.round(p * 100) + '%'
        }
        if (!(TYPES.pie || TYPES.bar || TYPES.percentage)) {
          ctx.strokeStyle = S.color
          ctx.beginPath()
          ctx.arc(UI.chart.hPadding + (AX[idx] - V.localStart) * scaleX, UI.xAxis.y - (S.data[idx] - A['localMinY' + (TYPES.multi_yaxis ? s : '')]) * scaleY, UI.grid.markerRadius, 0, Math.PI * 2)
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
        if (props.legendPosition === 'top') y = UI.chart.topPadding
        else if (props.legendPosition === 'bottom') y = UI.xAxis.y - UI.legend.h + 40
        else y = applyRange(V.vLineY - UI.legend.h - (IS_MOBILE ? 50 : 10), UI.chart.topPadding, UI.xAxis.y - UI.legend.h)
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
    if (parent)
      return
    if (hideLegend())
      repaint()
    STATE.draggingArea = 0
    resetCursor()
  }

  this.dismiss = dismiss

  function applyRange(v, from, to) {
    return Math.max(from, Math.min(v, to))
  }

  function updateZoomedChart() {
    if (V.zoomedChart)
      V.zoomedChart.setProgress(V)
  }

  function hideLegend() {
    var repaint = V.vLineX !== undefined
    if (!UI.legend) return
    V.vLineX = undefined
    V.highlightedX = -1
    UI.legend.stylo({transform: 'translate3d(0, -1000px, 0)'})
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
    if (V.inProgress)
      return

    V.inProgress = true

    var selectedX = V.localStart + (x - UI.chart.hPadding) / UI.preview.width * (V.localEnd - V.localStart),
      selectedIndex = xToIdx(selectedX),
      currentGlobalStart = V.globalStart,
      currentGlobalEnd = V.globalEnd,
      currentLocalStart = V.localStart,
      currentLocalEnd = V.localEnd,
      xVal = AX[selectedIndex]

    if (props.xAxisType === 'date')
      roundDate(xVal)

    V._globalStart = V.globalStart
    V._globalEnd = V.globalEnd
    V._localStart = V.localStart
    V._localEnd = V.localEnd

    function doZoom() {
      var newGlobalStart, newGlobalEnd, newLocalStart, newLocalEnd, zoomInterval, stepX

      if (V.zoomedChart) {
        var data = V.zoomedChart.getAxesData(),
          zoomProps = V.zoomedChart.getProps()

        stepX = zoomProps.stepX || V.zoomStepX || V.stepX
        zoomInterval = props.zoomInterval || zoomProps.zoomInterval
        if (zoomInterval) {
          newGlobalStart = selectedX - zoomInterval / 2
          newGlobalEnd = newGlobalStart + zoomInterval
          newLocalStart = selectedX
          newLocalEnd = newLocalStart + stepX
        } else {
          newGlobalStart = data.X.min
          newGlobalEnd = data.X.max
          newLocalStart = zoomProps.startX || newGlobalStart + Math.floor(data.X.d / 2 / stepX) * stepX
          newLocalEnd = newLocalStart + stepX
        }
      } else {
        stepX = V.zoomStepX || V.stepX
        zoomInterval = props.zoomInterval || 7 * stepX
        newLocalStart = props.startX || xVal
        if (newLocalStart + stepX >= X.max)
          newLocalStart -= stepX
        newLocalEnd = newLocalStart + stepX
        newGlobalStart = applyRange(xVal - (zoomInterval - stepX) / 2, X.min, X.max)
        newGlobalEnd = applyRange(newGlobalStart + zoomInterval, X.min, X.max)
        if (newGlobalEnd - newGlobalStart)
          newGlobalStart = applyRange(newGlobalEnd - zoomInterval, X.min, X.max)
      }

      updateRangeText(UI.zoomedRange, newLocalStart, newLocalEnd)
      V.isZooming = true

      animate('zoomIn', 0, 1, TYPES.area ? 2 * ZOOM_IN_DURATION : ZOOM_IN_DURATION, function (v) {
        var p = Math.min(1, v), p_ = (1 - p)

        V.progress = v
        V.globalStart = currentGlobalStart - p * (currentGlobalStart - newGlobalStart)
        V.globalEnd = currentGlobalEnd - p * (currentGlobalEnd - newGlobalEnd)
        V.localStart = currentLocalStart - p * (currentLocalStart - newLocalStart)
        V.localEnd = currentLocalEnd - p * (currentLocalEnd - newLocalEnd)

        UI.title.stylo({ opacity: p_, transform: 'scale(' + p_ + ', ' + p_ + ')' }, true)
        UI.zoom.stylo({ opacity: p, transform: 'scale(' + p + ', ' + p + ')' }, true)
        UI.localRange.stylo({ opacity: p_, transform: 'scale(' + p_ + ', ' + p_ + ')' }, true)
        UI.zoomedRange.stylo({ opacity: p, transform: 'scale(' + p + ', ' + p + ')' }, true)

        updateZoomedChart()
      }, TYPES.area ? EASE.outBack : EASE.outCubic, function () {
        V.isZooming = false
        V.isZoomed = true
        V.inProgress = false
        V.forceUpdate = true
        resize()
        if (V.zoomedChart)
          V.zoomedChart.wakeUp()
      })

      V.selectedIndex = selectedIndex
      hideLegend()
    }

    if (!props.onZoomIn || TYPES.pie) {
      if (TYPES.area)
        return doZoom()

      V.inProgress = false
      return
    }

    props.onZoomIn(AX[selectedIndex]).then(function (data) {
      V.zoomedChart = new Charty(ID, data, self, UI, ctx)
      doZoom()
      repaint()
    }, function (err) {
      V.inProgress = false
      error('Error loading data: ' + JSON.stringify(err) + '\n\nx: ' + AX[selectedIndex])
    })
  }

  this.setProgress = function (V_) {
    SHARED_PROPS.forEach(function (prop) {
      V[prop] = V_[prop]
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
      var v_ = 1 - v
      V.globalStart = currentGlobalStart - v_ * (currentGlobalStart - V._globalStart)
      V.globalEnd = currentGlobalEnd - v_ * (currentGlobalEnd - V._globalEnd)
      V.localStart = currentLocalStart - v_ * (currentLocalStart - V._localStart)
      V.localEnd = currentLocalEnd - v_ * (currentLocalEnd - V._localEnd)
      V.progress = v
      UI.title.stylo({ opacity: v_, transform: 'scale(' + v_ + ', ' + v_ + ')' }, true)
      UI.zoom.stylo({ opacity: v, transform: 'scale(' + v + ', ' + v + ')' }, true)
      UI.localRange.stylo({ opacity: v_, transform: 'scale(' + v_ + ', ' + v_ + ')' }, true)
      UI.zoomedRange.stylo({ opacity: v, transform: 'scale(' + v + ', ' + v + ')' }, true)
      updateRangeText(UI.localRange)
      updateZoomedChart()
    }, EASE.inCubic, function () {
      V.isZooming = false
      V.isZoomed = false
      V.forceUpdate = true
      resize()
      if (V.zoomedChart) {
        V.zoomedChart.destroy()
        V.zoomedChart = undefined
      }
      wakeUp()
    })

    if (V.zoomedChart) {
      var series = V.zoomedChart.getSeries()

      series.map(function(S, i) {
        var off = S.off
        if (AY[i] && (AY[i].name === S.name)) {
          AY[i].off = off
          A['alphaY' + i] = off ? 0 : 1
          A['on' + i] = off ? 0 : 1
        }
      })

      renderCtrls()
      togglePreview(V.showPreview)
    }
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
    if (newLocalStart === V.localStart && newLocalEnd === V.localEnd) return
    if (newLocalStart >= newLocalEnd || newLocalEnd <= newLocalStart) return
    V.movingBrush = true
    var start = V.localStart, end = V.localEnd
    animate('snapX', 0, 1, SNAP_DURATION, function (p) {
      V.localStart = applyRange(start - p * (start - newLocalStart), X.min, X.max)
      V.localEnd = applyRange(end - p * (end - newLocalEnd), X.min, X.max)
      updateZoomedChart()
    }, 0, function () {
      V.movingBrush = false
      V.forceUpdate = true
      updateRangeText(UI.zoomedRange)
    })
    updateZoomedChart()
  }

  function updateCursor(area) {
    if (!IS_MOBILE && !STATE.draggingArea) {
      if (area === AREA.BRUSH_LEFT || area === AREA.BRUSH_RIGHT)
        UI.canvas.stylo({ cursor: 'ew-resize' })
      else if (area === AREA.BRUSH_CENTER)
        UI.canvas.stylo({ cursor: 'move' })
      else resetCursor()
    }
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

      if (!V.isZoomed || !TYPES.area) {
        if (area === AREA.MAIN) {
          V.vLineX = x
          V.vLineY = y
        }
        if (!isNaN(V.vLineX))
          V.legendIsVisible = false
        updateZoomedChart()
      }

      if (TYPES.pie || (V.isZoomed && TYPES.area)) {
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

      updateCursor(area)

      var width = V.localEnd - V.localStart,
        newLocalStart, newLocalEnd, deltaX, xVal, deltaStepX,
        stepX = (V.zoomedChart ? V.zoomedChart.getProps().stepX : V.stepX) || 1,
        minBrushSize = (V.isZoomed || TYPES.pie) ? stepX : Math.max(stepX, V.minBrushSize)

      if (V.isZoomed && props.zoomStepX)
        stepX = props.zoomStepX

      if (STATE.draggingArea === AREA.BRUSH_LEFT) {
        xVal = (x - UI.preview.handleW / 2 - UI.chart.hPadding) / UI.preview.width * (V.globalEnd - V.globalStart) + V.globalStart
        newLocalStart = applyRange(xVal, V.globalStart, V.localEnd - minBrushSize)
        deltaX = V.localStart - newLocalStart
        if (!TYPES.pie && stepX === 1 && Math.abs(deltaX) / stepX >= 1) {
          V.localStart = newLocalStart
        } else {
          if (Math.abs(deltaX) > stepX * 0.5) {
            deltaStepX = stepX * Math.ceil(deltaX / stepX)
            moveBrush(V.localStart - deltaStepX, V.localEnd)
          }
        }
      } else if (STATE.draggingArea === AREA.BRUSH_RIGHT) {
        xVal = (x + UI.preview.handleW / 2 - UI.chart.hPadding) / UI.preview.width * (V.globalEnd - V.globalStart) + V.globalStart
        newLocalEnd = applyRange(xVal, V.localStart + minBrushSize, V.globalEnd)
        deltaX = V.localEnd - newLocalEnd
        if (!TYPES.pie && stepX === 1 && Math.abs(deltaX) / stepX >= 1)
          V.localEnd = newLocalEnd
        else {
          if (Math.abs(deltaX) > stepX * 0.5) {
            deltaStepX = stepX * Math.floor(deltaX / stepX)
            moveBrush(V.localStart, V.localEnd - deltaStepX)
          }
        }
      } else if (STATE.draggingArea === AREA.BRUSH_CENTER) {
        xVal = (x - V.deltaDragX - UI.preview.handleW / 2 - UI.chart.hPadding) / UI.preview.width * (V.globalEnd - V.globalStart) + V.globalStart
        newLocalStart = applyRange(xVal, V.globalStart, V.globalEnd - width)
        newLocalEnd = applyRange(newLocalStart + width, V.globalStart, V.globalEnd)
        deltaX = V.localEnd - newLocalEnd
        if (!TYPES.pie && stepX === 1 && Math.abs(deltaX) / stepX >= 1) {
          V.localStart = newLocalStart
          V.localEnd = newLocalEnd
        } else {
          if (Math.abs(deltaX) > stepX * 0.5) {
            deltaStepX = stepX * Math.round(deltaX / stepX)
            moveBrush(V.localStart - deltaStepX, V.localEnd - deltaStepX)
          }
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
      updateCursor(area)
    })
  }
}

export default Charty
