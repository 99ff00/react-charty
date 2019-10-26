/* eslint-disable one-var */
import React, { Component } from 'react'
import Charty from 'react-charty'

const LIGHT_THEME = {
    name: 'light',
    grid: { color: '#182D3B', alpha: 0.1, markerFillColor: '#fff' },
    legend: { background: '#fff', color: '#000' },
    preview: { maskColor: '#E2EEF9', maskAlpha: 0.6, brushColor: '#C0D1E1', brushBorderColor: '#fff', brushBorderAlpha: 1, handleColor: '#fff' },
    xAxis: { textColor: '#8E8E93', textAlpha: 1 },
    yAxis: { textColor: '#8E8E93', textAlpha: 1 },
    title: { color: '#000' },
    localRange: { color: '#000' },
    zoomedRange: { color: '#000' },
    zoomText: { color: '#108BE3' },
    zoomIcon: { fill: '#108BE3' },
    buttons: { color: '#fff' },
    pie: { textColor: '#fff' },
    body: { backgroundColor: '#fff', color: '#000' },
    noteColor: '#108BE3',
    octoColor: '#fff'
  },
  DARK_THEME = {
    name: 'dark',
    grid: { color: '#fff', alpha: 0.1, markerFillColor: '#242f3e' },
    legend: { background: '#1c2533', color: '#fff' },
    preview: { maskColor: '#304259', maskAlpha: 0.6, brushColor: '#56626D', brushBorderAlpha: 0, handleColor: '#fff' },
    xAxis: { textColor: '#A3B1C2', textAlpha: 0.6 },
    yAxis: { textColor: '#A3B1C2', textAlpha: 0.6 },
    title: { color: '#fff' },
    localRange: { color: '#fff' },
    zoomedRange: { color: '#fff' },
    zoomText: { color: '#108BE3' },
    zoomIcon: { fill: '#108BE3' },
    buttons: { color: '#fff' },
    pie: { textColor: '#fff' },
    body: { backgroundColor: '#262f3d', color: '#fff' },
    noteColor: '#108BE3',
    octoColor: '#fff'
  },
  MATRIX_THEME = {
    name: 'matrix',
    grid: { color: '#00ff41', alpha: 0.2, markerFillColor: '#0d0208' },
    legend: { background: '#003b00', color: '#00ff41' },
    preview: { maskColor: '#003b00', maskAlpha: 0.6, brushColor: '#009f11', brushBorderAlpha: 0, handleColor: '#00ff41' },
    xAxis: { textColor: '#00ff41', textAlpha: 0.6 },
    yAxis: { textColor: '#00ff41', textAlpha: 0.6 },
    title: { color: '#008f11' },
    localRange: { color: '#008f11' },
    zoomedRange: { color: '#008f11' },
    zoomText: { color: '#008f11' },
    zoomIcon: { fill: '#008f11' },
    buttons: { color: '#0d0208' },
    pie: { textColor: '#0d0208' },
    colors: {
      'Joined': '#00ff41', 'Left': '#008f11', 'Views': '#00ff41', 'Shares': '#008f11', 'Clicks': '#008f11',
      'Kiwi': '#00ff41', 'Apricots': '#008f11', 'Lemons': '#005b00', 'Mango': '#7ec251', 'Oranges': '#145105',
      'Pears': '#66e82f', 'Apples': '#0acb3b',
      'Adventure': '#03c835', 'Western': '#008f11', 'Action': '#00ff41', 'Multiple Genres': '#66e82f', 'Drama': '#0acb3b',
      'Comedy': '#008f11', 'Thriller/Suspense': '#005b00', 'Concert/Performance': '#7ec251', 'Horror': '#145105',
      'Romantic Comedy': '#12842f', 'Musical': '#079d2e'
    },
    fillColors: {
      'Joined': '#00ff4177', 'Left': '#00000000'
    },
    body: { backgroundColor: '#0d0208', color: '#00ff41' },
    noteColor: '#008f11',
    octoColor: '#00ff41'
  },
  THEMES = [DARK_THEME, MATRIX_THEME, LIGHT_THEME],
  IS_MOBILE = window.orientation !== undefined,
  BOX_OFFICE_DATA = {
    type: 'pie',
    data: {
      x: [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018],
      y0: [418894996, 375827476, 405950482, 350025489, 412599414, 356749803, 334756601, 363440937, 480825172, 299653307, 323532944],
      y10: [2829762, 22654, 11748762, 10677132, 13353944, 17940856, 284339, 3501919, 17013981, 6864560, 3667257],
      y1: [228907497, 272137386, 228669559, 267026649, 278874194, 297981308, 318724501, 349637236, 285649087, 368643283, 447980568],
      y12: [70848, 85951, 148783, 190518, 238718, 263510, 628663, 286179, 330890, 514394, 525514],
      y2: [151729266, 244595555, 213973344, 187934565, 209883469, 164612977, 201036506, 245573737, 157334842, 147887868, 176581251],
      y3: [292402573, 191387857, 174406757, 188043157, 131991738, 199227435, 155477200, 153408009, 162978825, 87443925, 94998758],
      y4: [106796214, 128751724, 116501895, 117123096, 186711044, 138499493, 118634566, 129240950, 82084039, 77766071, 67312441],
      y11: [10533274, 2660484, 396482, 12035978, 3561192, 7980550, 385326, 136417, 3145782, 332699, 298642],
      y5: [42770147, 77957339, 67327194, 50987000, 44842994, 57311383, 31198061, 44403863, 56039563, 115877974, 98962594],
      y6: [46079258, 85649416, 65577463, 72861475, 42739101, 24261722, 32398230, 8790834, 15862326, 9586948, 26458555],
      y7: [36236267, 5244119, 22114278, 10679542, 27725964, 43935184, 30866923, 8178513, 28773877, 99237710, 45842523],
      y8: [12177214, 24992506, 11895704, 10392818, 16624104, 6064807, 10774221, 7720431, 5870460, 5006181, 11765171]
    },
    names: {
      y0: 'Adventure',
      y1: 'Action',
      y2: 'Drama',
      y3: 'Comedy',
      y4: 'Thriller/Suspense',
      y5: 'Horror',
      y6: 'Romantic Comedy',
      y7: 'Musical',
      y8: 'Documentary',
      y10: 'Western',
      y11: 'Concert/Performance',
      y12: 'Multiple Genres'
    },
    colors: {
      y0: '#2373DB',
      y1: '#EC2049',
      y2: '#F26B38',
      y3: '#F7DB4F',
      y4: '#A7226E',
      y5: '#474747',
      y6: '#FC9D9A',
      y7: '#FF4E50',
      y8: '#5FB641',
      y10: '#FC913A',
      y11: '#C8C8A9',
      y12: '#2F9599'
    }
  }

export default class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      isLoaded: false,
      themeIdx: 0,
      data: []
    }
  }

  async componentDidMount() {
    const dataFiles = [1,2,3,4,5].map((id) => fetch(`data/${id}/overview.json`)),
      results = await Promise.all(dataFiles),
      data = await Promise.all(results.map((r) => r.json()));

    this.setState({
      isLoaded: true,
      data
    })

    var themeName = window.location.hash.substr(1),
      idx = THEMES.findIndex((theme) => theme.name === themeName),
      themeIdx = Math.max(0, idx)

    this.setState({ themeIdx })
    this.setTheme(themeIdx)
  }

  setTheme = (themeIdx) => {
    var theme = THEMES[themeIdx]
    document.body.style.backgroundColor = theme.body.backgroundColor
    document.body.style.color = theme.body.color
    document.querySelectorAll('.note').forEach((el) => {
      el.style.color = theme.noteColor
    })
    document.getElementById('octo').style.fill = theme.octoColor
  }

  switchTheme = () => {
    var themeIdx = this.state.themeIdx
    themeIdx++

    if (themeIdx === THEMES.length)
      themeIdx = 0

    this.setState({ themeIdx })
    this.setTheme(themeIdx)
  }

  onZoomIn = async (id, x) => {
    var d = new Date(x),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear()

    if (month.length < 2) month = '0' + month
    if (day.length < 2) day = '0' + day

    var file = 'data/' + id + '/' + year + '-' + month + '/' + day + '.json',
      response = await fetch(file)

    return response.json()
  }

  render () {
    if (!this.state.isLoaded)
      return null;

    const width = IS_MOBILE ? '100%' : '50%',
      theme = THEMES[this.state.themeIdx],
      data = this.state.data,
      style = { width, marginTop: 20 }

    return (
      <React.Fragment>
        <h3 className="note" onClick={this.switchTheme}>Switch theme</h3>
        <h4 className="note">(click on the {IS_MOBILE ? 'legend' : 'chart'} to zoom in)</h4>
        <div className="container">
          <Charty title="Followers" theme={theme} style={style} {...data[0]} onZoomIn={(x) => this.onZoomIn(1, x)} />
          <Charty title="Fruits" theme={theme} style={style} {...data[4]} />
          <Charty title="Interactions" theme={theme} style={style} {...data[1]} onZoomIn={(x) => this.onZoomIn(2, x)} />
          <Charty title="Messages" theme={theme} style={style} {...data[2]} onZoomIn={(x) => this.onZoomIn(3, x)} />
          <Charty title="Views" theme={theme} style={style} {...data[3]} onZoomIn={(x) => this.onZoomIn(4, x)} />
          <Charty title="Box Office Ticket Sales" theme={theme} style={style} {...BOX_OFFICE_DATA} stepX={1} startX={2017} endX={2018} />
        </div>
        <h3 className="bottom note" onClick={this.switchTheme}>Switch theme</h3>
      </React.Fragment>
    )
  }
}
