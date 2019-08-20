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
      IS_MOBILE = window.orientation !== undefined;

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoaded: false,
      theme: LIGHT_THEME,
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

  render () {
    if (!this.state.isLoaded)
      return null;

    const width = IS_MOBILE ? '100%' : '50%',
          theme = this.state.theme,
          data = this.state.data;

    return (
      <React.Fragment>
        <h3 onClick={this.switchTheme}>Switch theme</h3>
        <div style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap'}}>
          <Charty title="Followers" theme={theme} style={{ width }} {...data[0]} />
          <Charty title="Interactions" theme={theme} style={{ width }} {...data[1]} />
          <Charty title="Messages" theme={theme} style={{ width }} {...data[2]} />
          <Charty title="Views" theme={theme} style={{ width }} {...data[3]} />
          <Charty title="Fruits" theme={theme} style={{ width, paddingBottom: 50 }} {...data[4]} />
        </div>
        <h3 onClick={this.switchTheme}>Switch theme</h3>
      </React.Fragment>
    )
  }
}
