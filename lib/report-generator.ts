export function generateHTMLReport(analysisData: any): string {
  const { metadata, overallStatistics, timeSeries, patterns, instrumentStatistics, correlations } = analysisData

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Report - ${metadata.fileName}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a1a;
      margin-bottom: 10px;
      font-size: 2em;
    }
    h2 {
      color: #2c3e50;
      margin-top: 40px;
      margin-bottom: 20px;
      font-size: 1.5em;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }
    h3 {
      color: #34495e;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 1.2em;
    }
    .metadata {
      background: #ecf0f1;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    .metadata p {
      margin: 5px 0;
    }
    .statistics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      border-left: 4px solid #3498db;
    }
    .stat-card h4 {
      font-size: 0.9em;
      color: #7f8c8d;
      margin-bottom: 5px;
    }
    .stat-card .value {
      font-size: 1.8em;
      font-weight: bold;
      color: #2c3e50;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #3498db;
      color: white;
      font-weight: 600;
    }
    tr:hover {
      background: #f5f5f5;
    }
    .chart-container {
      position: relative;
      height: 400px;
      margin: 30px 0;
    }
    .pattern-list {
      list-style: none;
      padding: 0;
    }
    .pattern-item {
      background: #fff;
      padding: 15px;
      margin: 10px 0;
      border-left: 4px solid #3498db;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .pattern-item strong {
      color: #2c3e50;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #7f8c8d;
      font-size: 0.9em;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Analytics Report</h1>
    
    <div class="metadata">
      <p><strong>File:</strong> ${metadata.fileName}</p>
      <p><strong>Duration:</strong> ${metadata.duration.toFixed(2)} seconds</p>
      <p><strong>Analyzed At:</strong> ${new Date(metadata.analyzedAt).toLocaleString()}</p>
      <p><strong>Sample Count:</strong> ${metadata.sampleCount}</p>
      <p><strong>Sample Interval:</strong> ${metadata.sampleInterval} seconds</p>
    </div>

    <h2>Overall Statistics</h2>
    <div class="statistics-grid">
      <div class="stat-card">
        <h4>Sync Index</h4>
        <div class="value">${overallStatistics.syncIndex?.toFixed(3) || 'N/A'}</div>
        <p style="font-size: 0.8em; color: #7f8c8d; margin-top: 5px;">
          ${overallStatistics.syncIndex && overallStatistics.syncIndex > 0.5 ? 'High coherence' : 'Complex'}
        </p>
      </div>
      <div class="stat-card">
        <h4>Timbral Spread</h4>
        <div class="value">${overallStatistics.timbralSpread?.toFixed(3) || 'N/A'}</div>
        <p style="font-size: 0.8em; color: #7f8c8d; margin-top: 5px;">
          ${overallStatistics.timbralSpread && overallStatistics.timbralSpread > 0.3 ? 'Diverse' : 'Focused'}
        </p>
      </div>
      <div class="stat-card">
        <h4>Harmonic Rhythm</h4>
        <div class="value">${overallStatistics.harmonicRhythm?.toFixed(1) || 'N/A'}</div>
        <p style="font-size: 0.8em; color: #7f8c8d; margin-top: 5px;">changes/min</p>
      </div>
      <div class="stat-card">
        <h4>Predictability</h4>
        <div class="value">${overallStatistics.predictability?.toFixed(3) || 'N/A'}</div>
      </div>
      <div class="stat-card">
        <h4>Sync Moments</h4>
        <div class="value">${overallStatistics.syncMomentsCount || 0}</div>
      </div>
      <div class="stat-card">
        <h4>Harmonic Surprises</h4>
        <div class="value">${overallStatistics.harmonicSurprisesCount || 0}</div>
      </div>
      <div class="stat-card">
        <h4>Timbral Events</h4>
        <div class="value">${overallStatistics.timbralEventsCount || 0}</div>
      </div>
      <div class="stat-card">
        <h4>Structural Boundaries</h4>
        <div class="value">${overallStatistics.structuralBoundariesCount || 0}</div>
      </div>
    </div>

    <h2>Time-Series Visualizations</h2>
    
    <h3>Timbral-Harmonic Synchronization</h3>
    <div class="chart-container">
      <canvas id="syncChart"></canvas>
    </div>

    <h3>Instrument Energy Timeline</h3>
    <div class="chart-container">
      <canvas id="instrumentChart"></canvas>
    </div>

    <h3>Chord Progression Over Time</h3>
    <div class="chart-container">
      <canvas id="chordProgressionChart"></canvas>
    </div>

    <h3>Pattern Density by Time Segment</h3>
    <div class="chart-container">
      <canvas id="patternDensityChart"></canvas>
    </div>

    <h3>Musical Characteristics Profile (Radar Chart)</h3>
    <div class="chart-container">
      <canvas id="radarChart"></canvas>
    </div>

    <h2>Pattern Detection Results</h2>
    
    <h3>Sync Moments (${patterns.syncMoments.length})</h3>
    <ul class="pattern-list">
      ${patterns.syncMoments.slice(0, 20).map((m: any) => `
        <li class="pattern-item">
          <strong>Time:</strong> ${m.time.toFixed(2)}s | <strong>Strength:</strong> ${m.strength.toFixed(3)}
        </li>
      `).join('')}
      ${patterns.syncMoments.length > 20 ? `<li class="pattern-item">... and ${patterns.syncMoments.length - 20} more</li>` : ''}
    </ul>

    <h3>Harmonic Surprises (${patterns.harmonicSurprises.length})</h3>
    <ul class="pattern-list">
      ${patterns.harmonicSurprises.slice(0, 20).map((s: any) => `
        <li class="pattern-item">
          <strong>Time:</strong> ${s.time.toFixed(2)}s | <strong>Chord:</strong> ${s.chord} | <strong>Surprise:</strong> ${s.surprise.toFixed(3)}
        </li>
      `).join('')}
      ${patterns.harmonicSurprises.length > 20 ? `<li class="pattern-item">... and ${patterns.harmonicSurprises.length - 20} more</li>` : ''}
    </ul>

    <h3>Timbral Events (${patterns.timbralEvents.length})</h3>
    <ul class="pattern-list">
      ${patterns.timbralEvents.slice(0, 20).map((e: any) => `
        <li class="pattern-item">
          <strong>Time:</strong> ${e.time.toFixed(2)}s | <strong>Type:</strong> ${e.type} | <strong>Strength:</strong> ${e.strength.toFixed(3)}
        </li>
      `).join('')}
      ${patterns.timbralEvents.length > 20 ? `<li class="pattern-item">... and ${patterns.timbralEvents.length - 20} more</li>` : ''}
    </ul>

    <h2>Instrument Statistics</h2>
    <table>
      <thead>
        <tr>
          <th>Instrument</th>
          <th>Avg Energy</th>
          <th>Peak Energy</th>
          <th>Variance</th>
          <th>Active Time (s)</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(instrumentStatistics).map(([name, stats]: [string, any]) => `
          <tr>
            <td>${name}</td>
            <td>${stats.avgEnergy.toFixed(3)}</td>
            <td>${stats.peakEnergy.toFixed(3)}</td>
            <td>${stats.variance.toFixed(3)}</td>
            <td>${stats.activeTime.toFixed(1)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>Correlations</h2>
    <div class="statistics-grid">
      <div class="stat-card">
        <h4>Sync Index ↔ Predictability</h4>
        <div class="value">${correlations.syncIndexPredictability?.toFixed(3) || 'N/A'}</div>
      </div>
      <div class="stat-card">
        <h4>Timbral Spread ↔ Harmonic Complexity</h4>
        <div class="value">${correlations.timbralSpreadHarmonicComplexity?.toFixed(3) || 'N/A'}</div>
      </div>
    </div>

    <h2>Time-Series Data</h2>
    <p style="color: #7f8c8d; margin-bottom: 10px;">Showing first 100 data points (full data available in JSON export)</p>
    <table>
      <thead>
        <tr>
          <th>Time (s)</th>
          <th>Spectral Centroid</th>
          <th>Harmonic Energy</th>
          <th>Timbral Variance</th>
          <th>Sync Index</th>
          <th>Predictability</th>
          <th>Chord</th>
        </tr>
      </thead>
      <tbody>
        ${timeSeries.slice(0, 100).map((d: any) => `
          <tr>
            <td>${d.time.toFixed(2)}</td>
            <td>${d.spectralCentroid.toFixed(3)}</td>
            <td>${d.harmonicEnergy.toFixed(3)}</td>
            <td>${d.timbralVariance.toFixed(3)}</td>
            <td>${d.syncIndex.toFixed(3)}</td>
            <td>${d.predictability.toFixed(3)}</td>
            <td>${d.chord}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="footer">
      <p>Generated by Timbre Space EQ Visualizer</p>
      <p>${new Date().toLocaleString()}</p>
    </div>
  </div>

  <script>
    const timeSeries = ${JSON.stringify(timeSeries)};
    const patterns = ${JSON.stringify(patterns)};

    // Chart 1: Timbral-Harmonic Synchronization
    const syncCtx = document.getElementById('syncChart').getContext('2d');
    new Chart(syncCtx, {
      type: 'line',
      data: {
        labels: timeSeries.map(d => d.time.toFixed(1)),
        datasets: [
          {
            label: 'Spectral Centroid',
            data: timeSeries.map(d => d.spectralCentroid),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4
          },
          {
            label: 'Harmonic Energy',
            data: timeSeries.map(d => d.harmonicEnergy),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4
          },
          {
            label: 'Timbral Variance',
            data: timeSeries.map(d => d.timbralVariance),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4
          },
          {
            label: 'Sync Index',
            data: timeSeries.map(d => d.syncIndex),
            borderColor: '#a855f7',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            tension: 0.4,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 1 }
        },
        plugins: {
          legend: { display: true }
        }
      }
    });

    // Chart 2: Instrument Energy
    const instrumentCtx = document.getElementById('instrumentChart').getContext('2d');
    const instruments = ['Kick', 'Snare', 'Bass', 'Vocal', 'Guitar', 'Piano', 'Synth', 'Hi-Hat'];
    const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#6366f1', '#f97316', '#84cc16'];
    
    new Chart(instrumentCtx, {
      type: 'line',
      data: {
        labels: timeSeries.map(d => d.time.toFixed(1)),
        datasets: instruments.map((inst, idx) => ({
          label: inst,
          data: timeSeries.map(d => d.instrumentEnergies[inst] || 0),
          borderColor: colors[idx],
          backgroundColor: colors[idx] + '20',
          tension: 0.4
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 1 }
        },
        plugins: {
          legend: { display: true }
        }
      }
    });

    // Chart 3: Chord Progression (Stacked Area)
    const chordProgressionData = {};
    timeSeries.forEach(d => {
      const window = Math.floor(d.time / 5) * 5;
      if (!chordProgressionData[window]) chordProgressionData[window] = {};
      const chord = d.chord !== '---' ? d.chord : 'Silence';
      chordProgressionData[window][chord] = (chordProgressionData[window][chord] || 0) + 1;
    });
    
    const chordWindows = Object.entries(chordProgressionData).map(([time, chords]) => ({
      time: Number(time),
      ...chords
    }));
    
    const allChords = [...new Set(timeSeries.map(d => d.chord !== '---' ? d.chord : 'Silence'))].slice(0, 8);
    const chordColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#f97316', '#84cc16'];
    
    const chordProgressionCtx = document.getElementById('chordProgressionChart').getContext('2d');
    new Chart(chordProgressionCtx, {
      type: 'line',
      data: {
        labels: chordWindows.map(d => d.time),
        datasets: allChords.map((chord, idx) => ({
          label: chord,
          data: chordWindows.map(d => d[chord] || 0),
          borderColor: chordColors[idx % chordColors.length],
          backgroundColor: chordColors[idx % chordColors.length] + '80',
          fill: true,
          tension: 0.4,
          stack: 'chords'
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true }
        },
        plugins: {
          legend: { display: true }
        }
      }
    });

    // Chart 4: Pattern Density (Stacked Bar)
    const patternBins = {};
    const binSize = 10;
    
    patterns.syncMoments.forEach(m => {
      const bin = Math.floor(m.time / binSize) * binSize;
      if (!patternBins[bin]) patternBins[bin] = { sync: 0, surprises: 0, events: 0 };
      patternBins[bin].sync++;
    });
    
    patterns.harmonicSurprises.forEach(s => {
      const bin = Math.floor(s.time / binSize) * binSize;
      if (!patternBins[bin]) patternBins[bin] = { sync: 0, surprises: 0, events: 0 };
      patternBins[bin].surprises++;
    });
    
    patterns.timbralEvents.forEach(e => {
      const bin = Math.floor(e.time / binSize) * binSize;
      if (!patternBins[bin]) patternBins[bin] = { sync: 0, surprises: 0, events: 0 };
      patternBins[bin].events++;
    });
    
    const patternDensityData = Object.entries(patternBins)
      .map(([time, counts]) => ({
        time: time + '-' + (Number(time) + binSize) + 's',
        sync: counts.sync,
        surprises: counts.surprises,
        events: counts.events
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
    
    const patternDensityCtx = document.getElementById('patternDensityChart').getContext('2d');
    new Chart(patternDensityCtx, {
      type: 'bar',
      data: {
        labels: patternDensityData.map(d => d.time),
        datasets: [
          {
            label: 'Sync Moments',
            data: patternDensityData.map(d => d.sync),
            backgroundColor: '#f59e0b',
            stack: 'patterns'
          },
          {
            label: 'Harmonic Surprises',
            data: patternDensityData.map(d => d.surprises),
            backgroundColor: '#ef4444',
            stack: 'patterns'
          },
          {
            label: 'Timbral Events',
            data: patternDensityData.map(d => d.events),
            backgroundColor: '#06b6d4',
            stack: 'patterns'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true }
        },
        plugins: {
          legend: { display: true }
        }
      }
    });

    // Chart 5: Radar Chart (Musical Characteristics)
    const overallStats = ${JSON.stringify(overallStatistics)};
    const radarData = [
      {
        subject: 'Brightness',
        value: Math.min(1, (overallStats.syncIndex || 0) * 1.2)
      },
      {
        subject: 'Complexity',
        value: Math.min(1, 1 - (overallStats.predictability || 0))
      },
      {
        subject: 'Harmony',
        value: Math.min(1, (overallStats.harmonicRhythm || 0) / 20)
      },
      {
        subject: 'Diversity',
        value: Math.min(1, (overallStats.timbralSpread || 0) * 2)
      },
      {
        subject: 'Coherence',
        value: Math.min(1, (overallStats.syncIndex || 0))
      },
      {
        subject: 'Activity',
        value: Math.min(1, (overallStats.syncMomentsCount + overallStats.timbralEventsCount) / 50)
      }
    ];
    
    const radarCtx = document.getElementById('radarChart').getContext('2d');
    new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: radarData.map(d => d.subject),
        datasets: [{
          label: 'Song Profile',
          data: radarData.map(d => d.value),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderWidth: 2,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 1,
            ticks: {
              stepSize: 0.2
            }
          }
        },
        plugins: {
          legend: { display: true }
        }
      }
    });
  </script>
</body>
</html>`

  return html
}

