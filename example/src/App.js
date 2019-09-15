/* eslint-disable one-var */
import React, { Component } from 'react'
import Charty from 'react-charty'

const LIGHT_THEME = {
    grid: { color: '#182D3B', alpha: 0.1, markerFillColor: '#fff' },
    legend: { background: '#fff', color: '#000' },
    preview: { maskColor: '#E2EEF9', maskAlpha: 0.6, brushColor: '#C0D1E1', brushBorderColor: '#fff', brushBorderAlpha: 1 },
    xAxis: { textColor: '#8E8E93', textAlpha: 1 },
    yAxis: { textColor: '#8E8E93', textAlpha: 1 },
    title: { color: '#000' },
    localRange: { color: '#000' },
    zoomedRange: { color: '#000' }
  },
  DARK_THEME = {
    grid: { color: '#fff', alpha: 0.1, markerFillColor: '#242f3e' },
    legend: { background: '#1c2533', color: '#fff' },
    preview: { maskColor: '#304259', maskAlpha: 0.6, brushColor: '#56626D', brushBorderAlpha: 0 },
    xAxis: { textColor: '#A3B1C2', textAlpha: 0.6 },
    yAxis: { textColor: '#A3B1C2', textAlpha: 0.6 },
    title: { color: '#fff' },
    localRange: { color: '#fff' },
    zoomedRange: { color: '#fff' }
  },
  IS_MOBILE = window.orientation !== undefined,
  BOX_OFFICE_DATA = {
    type: 'pie',
    data: {
      x: [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018],
      y0: [418894996, 375827476, 405950482, 350025489, 412599414, 356749803, 334756601, 363440937, 480825172, 299653307, 323532944],
      y10: [2829762, 22654, 11748762, 10677132, 13353944, 17940856, 284339, 3501919, 17013981, 6864560, 3667257],
      y1: [228907497, 272137386, 228669559, 267026649, 278874194, 297981308, 318724501, 349637236, 285649087, 368643283, 447980568],
      y2: [151729266, 244595555, 213973344, 187934565, 209883469, 164612977, 201036506, 245573737, 157334842, 147887868, 176581251],
      y3: [292402573, 191387857, 174406757, 188043157, 131991738, 199227435, 155477200, 153408009, 162978825, 87443925, 94998758],
      y4: [106796214, 128751724, 116501895, 117123096, 186711044, 138499493, 118634566, 129240950, 82084039, 77766071, 67312441],
      y5: [42770147, 77957339, 67327194, 50987000, 44842994, 57311383, 31198061, 44403863, 56039563, 115877974, 98962594],
      y6: [46079258, 85649416, 65577463, 72861475, 42739101, 24261722, 32398230, 8790834, 15862326, 9586948, 26458555],
      y7: [36236267, 5244119, 22114278, 10679542, 27725964, 43935184, 30866923, 8178513, 28773877, 99237710, 45842523],
      y8: [12177214, 24992506, 11895704, 10392818, 16624104, 6064807, 10774221, 7720431, 5870460, 5006181, 11765171],
      y9: [8582895, 7289484, 6745113, 4519498, 11623385, 23206939, 22217499, 8870675, 5685888, 6824518, 15134813],
      y11: [10533274, 2660484, 396482, 12035978, 3561192, 7980550, 385326, 136417, 3145782, 332699, 298642],
      y12: [70848, 85951, 148783, 190518, 238718, 263510, 628663, 286179, 330890, 514394, 525514]

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
      y9: 'Black Comedy',
      y10: 'Western',
      y11: 'Concert/Performance',
      y12: 'Multiple Genres'
    },
    colors: {
      y0: '#A7226E',
      y1: '#EC2049',
      y2: '#F26B38',
      y3: '#F7DB4F',
      y4: '#2F9599',
      y5: '#474747',
      y6: '#FC9D9A',
      y7: '#FF4E50',
      y8: '#547980',
      y9: '#5FB641',
      y10: '#FC913A',
      y11: '#C8C8A9',
      y12: '#2373DB'
    }
  }

export default class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      isLoaded: false,
      theme: DARK_THEME,
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
  }

  switchTheme = () => {
    const isDarkTheme = this.state.theme === DARK_THEME;

    this.setState({
      theme: isDarkTheme ? LIGHT_THEME : DARK_THEME
    })
    document.documentElement.className = !isDarkTheme && 'dark';
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
      theme = this.state.theme,
      data = this.state.data,
      style = { width, marginTop: 20 }

    return (
      <React.Fragment>
        <h3 onClick={this.switchTheme}>Switch theme</h3>
        <h4 className="note">(click on the chart to zoom in)</h4>
        <div className="container">
          <Charty title="Followers" theme={theme} style={style} {...data[0]} onZoomIn={(x) => this.onZoomIn(1, x)} />
          <Charty title="Interactions" theme={theme} style={style} {...data[1]} onZoomIn={(x) => this.onZoomIn(2, x)} />
          <Charty title="Messages" theme={theme} style={style} {...data[2]} onZoomIn={(x) => this.onZoomIn(3, x)} />
          <Charty title="Views" theme={theme} style={style} {...data[3]} onZoomIn={(x) => this.onZoomIn(4, x)} />
          <Charty title="Fruits" theme={theme} style={style} {...data[4]} />
          <Charty title="Box Office Ticket Sales" theme={theme} style={style} {...BOX_OFFICE_DATA} stepX={1} startX={2017} endX={2018} />
        </div>
        <h3 onClick={this.switchTheme}>Switch theme</h3>
      </React.Fragment>
    )
  }
}
