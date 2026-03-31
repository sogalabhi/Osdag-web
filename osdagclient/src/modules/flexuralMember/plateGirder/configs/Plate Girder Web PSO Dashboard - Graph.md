# Plate Girder Web PSO Dashboard - Graphs & Visualizations Deep Dive

**Version:** 1.0  
**Last Updated:** January 21, 2025  
**Focus:** Web Implementation - Plotly.js Visualizations

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Parallel Coordinates Plot](#parallel-coordinates-plot)
   - [Data Processing & Normalization](#data-processing--normalization)
   - [Axis Configuration](#axis-configuration)
   - [Scaling & Range](#scaling--range)
   - [Trace Creation](#trace-creation)
   - [Layout & Styling](#layout--styling)
   - [Rendering Performance](#rendering-performance)
   - [Known Issues & Fixes](#known-issues--fixes)
4. [Performance Map](#performance-map)
   - [Data Processing](#data-processing)
   - [X-Axis (Weight) Configuration](#x-axis-weight-configuration)
   - [Y-Axis (UR) Configuration](#y-axis-ur-configuration)
   - [Dynamic Scaling Algorithm](#dynamic-scaling-algorithm)
   - [Trace Layers](#trace-layers)
   - [Feasibility Line](#feasibility-line)
   - [Known Issues & Fixes](#known-issues--fixes-1)
5. [Cross-Section Preview](#cross-section-preview)
   - [SVG Rendering](#svg-rendering)
   - [Dimension Extraction](#dimension-extraction)
   - [Scaling Algorithm](#scaling-algorithm)
   - [Coordinate System](#coordinate-system)
   - [Element Drawing](#element-drawing)
   - [Known Issues & Fixes](#known-issues--fixes-2)
6. [Replay Controls & Frame Management](#replay-controls--frame-management)
   - [Frame Cache Structure](#frame-cache-structure)
   - [Playback Mechanism](#playback-mechanism)
   - [Slider Control](#slider-control)
   - [State Synchronization](#state-synchronization)
7. [Common Web Rendering Issues](#common-web-rendering-issues)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview

The Plate Girder Web PSO Dashboard uses **Plotly.js** for interactive visualizations and **React** for component management. The dashboard consists of three main visualization components:

1. **Parallel Coordinates Plot** - Shows design variable convergence
2. **Performance Map** - Shows objective space (Weight vs UR)
3. **Cross-Section Preview** - Shows best cross-section found

All visualizations update in real-time during optimization and support frame-by-frame replay after completion.

**Key Technologies:**
- Plotly.js (`plotly.js-dist-min`) - Plotting library
- React (`react-plotly.js`) - React wrapper for Plotly
- SVG - Cross-section drawing
- WebSocket - Real-time data streaming

---

## Architecture & Technology Stack

### Component Hierarchy

```
PSODashboard
├─ ParallelCoordinatesPlot (react-plotly.js)
│  └─ Plotly.Plot (parcoords type)
├─ PerformanceMap (react-plotly.js)
│  └─ Plotly.Plot (scatter type)
└─ CrossSectionPreview (SVG)
   └─ SVG elements (rect, line, text)
```

### Data Flow

```
WebSocket Message (pso_update)
  ↓
EngineeringModule State Update
  ↓
PSODashboard Data Processing
  ↓
Individual Plot Components
  ↓
Plotly.js Rendering
  ↓
DOM Update
```

### Plotly.js Configuration

**Base Config:**
```javascript
const baseConfig = {
  displayModeBar: false,      // Hide toolbar
  responsive: true,            // Auto-resize
  staticPlot: false,           // Interactive
  doubleClick: 'reset',        // Double-click to reset zoom
  toImageButtonOptions: {
    format: 'png',
    filename: 'plot',
    height: 400,
    width: 1200,
    scale: 1
  }
};
```

**Responsive Behavior:**
- `responsive: true` enables automatic resizing
- Plots resize when container dimensions change
- Maintains aspect ratio based on container height

---

## Parallel Coordinates Plot

### Component Purpose

Visualize how design variables (D, tw, bf, tf, etc.) converge during optimization. Each line represents a particle's position across all variables.

### Data Processing & Normalization

#### Input Data Structure

```typescript
interface ParallelCoordinatesData {
  history: ParticleData[];        // Last 2000 entries
  currentSwarm: ParticleData[];   // Current iteration particles
  globalBest: ParticleData | null;
  variableNames: string[];       // ['D', 'tw', 'bf', 'tf', ...]
  bounds: {
    lb: number[];                 // Lower bounds [200, 6, 100, 6, ...]
    ub: number[];                 // Upper bounds [2000, 40, 1000, 100, ...]
  };
}
```

#### Normalization Algorithm

**Purpose:** Convert actual dimension values to 0-100% range for visualization.

**Formula:**
```javascript
normalize(val, idx) = {
  const lb = bounds.lb[idx];
  const ub = bounds.ub[idx];
  
  // Handle edge case: zero range
  if (ub === lb) return 50;  // Center at 50%
  
  // Linear normalization
  return ((val - lb) / (ub - lb)) * 100;
}
```

**Example:**
- Variable: Total Depth (D)
- Lower Bound: 200 mm
- Upper Bound: 2000 mm
- Actual Value: 1100 mm
- Normalized: ((1100 - 200) / (2000 - 200)) * 100 = 50%

**Edge Cases:**
1. **Zero Range (ub === lb)**: Returns 50% (center)
2. **Value Below Lower Bound**: Returns < 0% (clamped by Plotly)
3. **Value Above Upper Bound**: Returns > 100% (clamped by Plotly)

**Performance:**
- Normalization runs on every update
- Cached in `particleData.normalized` array to avoid recalculation
- O(n) complexity where n = number of variables

### Axis Configuration

#### Dimension Setup

Each variable becomes a vertical axis in the parallel coordinates plot.

**Configuration:**
```javascript
dimensions: variableNames.map((name, idx) => ({
  label: name,                    // Axis label: 'D', 'tw', 'bf', etc.
  values: allData.map(d => d[idx]), // All normalized values for this variable
  range: [0, 100],                // Fixed range: 0% to 100%
  tickformat: '.0f',              // Integer ticks
  tickvals: [0, 25, 50, 75, 100], // Tick positions
  ticktext: ['0%', '25%', '50%', '75%', '100%'] // Tick labels
}))
```

**Axis Properties:**
- **Range**: Fixed [0, 100] for all axes (normalized percentage)
- **Ticks**: 5 ticks at 0%, 25%, 50%, 75%, 100%
- **Labels**: Variable names (D, tw, bf, tf, etc.)
- **Orientation**: Vertical (parallel coordinates standard)

#### Label Formatting

**Variable Name Mapping:**
```javascript
const variableNameMap = {
  'D': 'Total Depth',
  'tw': 'Web Thickness',
  'bf': 'Flange Width',
  'tf': 'Flange Thickness',
  'bf_top': 'Top Flange Width',
  'bf_bot': 'Bottom Flange Width',
  'tf_top': 'Top Flange Thickness',
  'tf_bot': 'Bottom Flange Thickness',
  'c': 'Stiffener Spacing',
  't_stiff': 'Stiffener Thickness'
};
```

**Display:** Uses raw variable names (D, tw, etc.) for compactness. Full names can be added via `label` property.

### Scaling & Range

#### Fixed Range System

**Why Fixed Range:**
- All variables normalized to 0-100%
- Consistent visual scale across all axes
- Easy to compare convergence across variables

**Range Definition:**
```javascript
range: [0, 100]  // Always 0% to 100%
```

**Benefits:**
- No dynamic scaling needed
- Predictable axis behavior
- Easy to interpret (percentage of bounds)

**Limitations:**
- Values outside bounds appear at edges (0% or 100%)
- Cannot see exact values without hover tooltip

#### Tick Configuration

**Tick Positions:**
```javascript
tickvals: [0, 25, 50, 75, 100]
ticktext: ['0%', '25%', '50%', '75%', '100%']
```

**Tick Format:**
- Format: `.0f` (integer, no decimals)
- Labels: Percentage format with '%' symbol
- Spacing: Evenly distributed (25% intervals)

**Customization:**
- Can add more ticks: `[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]`
- Can change format: `.1f` for one decimal place
- Can add custom labels for specific values

### Trace Creation

#### Data Layers

The plot consists of three data layers rendered in order:

**1. History Layer (Background)**
```javascript
// Last 2000 history entries
const historySlice = data.history.slice(-2000);

historySlice.forEach(item => {
  const normalized = item.normalized || 
    item.position.map((val, idx) => normalize(val, idx));
  
  allData.push(normalized);
  allColors.push(
    item.ur <= 1.0 
      ? 'rgba(34, 255, 0, 0.3)'   // Green (feasible)
      : 'rgba(189, 0, 0, 0.3)'    // Red (infeasible)
  );
  allLineWidths.push(0.5);  // Thin lines
});
```

**Properties:**
- **Opacity**: 0.3 (30% - faint background)
- **Line Width**: 0.5px
- **Color**: Green (feasible) or Red (infeasible)
- **Count**: Maximum 2000 lines

**2. Current Swarm Layer (Foreground)**
```javascript
data.currentSwarm.forEach(item => {
  const normalized = item.normalized || 
    item.position.map((val, idx) => normalize(val, idx));
  
  allData.push(normalized);
  allColors.push(
    item.ur <= 1.0 
      ? 'rgba(34, 255, 0, 0.8)'   // Green (feasible)
      : 'rgba(189, 0, 0, 0.8)'    // Red (infeasible)
  );
  allLineWidths.push(1.5);  // Bold lines
});
```

**Properties:**
- **Opacity**: 0.8 (80% - bold)
- **Line Width**: 1.5px
- **Color**: Green (feasible) or Red (infeasible)
- **Count**: Typically 50 particles per iteration

**3. Global Best Layer (Highlight)**
```javascript
if (data.globalBest && data.globalBest.normalized) {
  allData.push(data.globalBest.normalized);
  allColors.push('rgba(255, 215, 0, 0.9)');  // Gold
  allLineWidths.push(2);  // Thickest line
}
```

**Properties:**
- **Opacity**: 0.9 (90% - very visible)
- **Line Width**: 2px (thickest)
- **Color**: Gold (`rgba(255, 215, 0, 0.9)`)
- **Count**: 1 line (best solution)

#### Trace Object Structure

**Complete Trace:**
```javascript
const trace = {
  type: 'parcoords',
  line: {
    color: allColors,        // Array of colors (one per line)
    width: allLineWidths,    // Array of widths (one per line)
    colorbar: {
      title: 'Utilization Ratio',
      titleside: 'right'
    }
  },
  dimensions: variableNames.map((name, idx) => ({
    label: name,
    values: allData.map(d => d[idx]),  // All values for this dimension
    range: [0, 100],
    tickformat: '.0f',
    tickvals: [0, 25, 50, 75, 100],
    ticktext: ['0%', '25%', '50%', '75%', '100%']
  }))
};
```

**Key Properties:**
- **type**: `'parcoords'` (Plotly parallel coordinates)
- **line.color**: Array of colors (one per data point)
- **line.width**: Array of widths (one per data point)
- **dimensions**: Array of axis configurations

### Layout & Styling

#### Layout Configuration

```javascript
const layout = {
  autosize: true,                    // Auto-resize to container
  margin: { 
    l: 20,                           // Left margin: 20px
    r: 20,                           // Right margin: 20px
    t: 20,                           // Top margin: 20px
    b: 40                            // Bottom margin: 40px (room for labels)
  },
  paper_bgcolor: 'rgba(0,0,0,0)',    // Transparent background
  plot_bgcolor: 'rgba(0,0,0,0)',    // Transparent plot area
  font: { 
    size: 10,                        // Base font size: 10px
    family: 'Arial, sans-serif'      // Font family
  },
  showlegend: false,                 // No legend (colors are self-explanatory)
  hovermode: 'closest'               // Show closest point on hover
};
```

#### Responsive Behavior

**Container Height:** `45vh` with `minHeight: 300px`

**Scaling:**
- **Desktop (≥1024px)**: Full height (45vh ≈ 400-500px)
- **Tablet (768-1023px)**: Reduced height (45vh ≈ 300-400px)
- **Mobile (<768px)**: Minimum height (300px)

**Width:** Full container width (100%)

**Aspect Ratio:** Not fixed - adapts to container

### Rendering Performance

#### Data Limits

**History Limit:**
- Maximum 2000 history entries rendered
- Prevents performance degradation
- Implemented via: `data.history.slice(-2000)`

**Current Swarm Limit:**
- Maximum 50 particles per iteration
- Typical PSO swarm size
- Implemented via: `currentSwarm.slice(-50)`

#### Update Frequency

**Real-Time Updates:**
- Updates on every WebSocket message (`pso_update`)
- Throttled by backend (10 FPS = 100ms interval)
- React state updates batched automatically

**Replay Updates:**
- Updates on frame change (slider/button)
- Immediate update (no throttling needed)
- Smooth playback at 5 FPS (200ms interval)

#### Performance Optimizations

1. **Normalization Caching:**
   ```javascript
   // Cache normalized values
   if (!item.normalized) {
     item.normalized = item.position.map((val, idx) => normalize(val, idx));
   }
   ```

2. **Array Slicing:**
   ```javascript
   // Limit data before processing
   const historySlice = data.history.slice(-2000);
   ```

3. **Plotly Responsive Mode:**
   ```javascript
   responsive: true  // Uses WebGL for large datasets
   ```

### Known Issues & Fixes

#### Issue 1: Axis Labels Overlapping

**Symptom:** Variable names overlap when many variables (>6)

**Cause:** Fixed font size, insufficient spacing

**Fix:**
```javascript
dimensions: variableNames.map((name, idx) => ({
  label: name.length > 4 ? name.substring(0, 4) : name,  // Truncate long names
  // ... rest of config
}))

// OR increase margin
margin: { l: 30, r: 30, t: 20, b: 50 }
```

#### Issue 2: Lines Not Visible on Light Background

**Symptom:** Faint history lines (0.3 opacity) invisible on white background

**Cause:** Low opacity + light colors

**Fix:**
```javascript
// Increase opacity for history
allColors.push(
  item.ur <= 1.0 
    ? 'rgba(34, 255, 0, 0.5)'   // Increased from 0.3 to 0.5
    : 'rgba(189, 0, 0, 0.5)'    // Increased from 0.3 to 0.5
);
```

#### Issue 3: Plot Not Resizing

**Symptom:** Plot doesn't resize when window resizes

**Cause:** Missing `responsive: true` or container not updating

**Fix:**
```javascript
// Ensure responsive is enabled
const config = {
  responsive: true,
  // ...
};

// Ensure container has proper CSS
<div style={{ width: '100%', height: '45vh', minHeight: '300px' }}>
  <Plot ... />
</div>
```

#### Issue 4: Performance Degradation with Many Variables

**Symptom:** Slow rendering with 8+ variables

**Cause:** Plotly rendering all lines for all dimensions

**Fix:**
```javascript
// Reduce history limit
const historySlice = data.history.slice(-1000);  // Reduced from 2000

// Or reduce line width for history
allLineWidths.push(0.3);  // Thinner lines = faster rendering
```

---

## Performance Map

### Component Purpose

Show objective space (Weight vs Utilization Ratio) to visualize feasible vs infeasible regions and convergence toward optimal solution.

### Data Processing

#### Input Data Structure

```typescript
interface PerformanceMapData {
  history: ParticleData[];        // Last 3000 entries
  currentSwarm: ParticleData[];   // Current iteration particles
  globalBest: ParticleData | null;
}

interface ParticleData {
  weight_kg: number;    // Weight in kg
  ur: number;           // Utilization ratio
  feasible: boolean;    // ur <= 1.0
}
```

#### Data Transformation

**History Processing:**
```javascript
const historyData = data.history.slice(-3000).map(d => ({
  x: d.weight_kg,
  y: d.ur,
  feasible: d.ur <= 1.0
}));

// Split into feasible and infeasible
const feasibleHistory = historyData.filter(d => d.feasible);
const infeasibleHistory = historyData.filter(d => !d.feasible);
```

**Current Swarm Processing:**
```javascript
const swarmData = data.currentSwarm.map(d => ({
  x: d.weight_kg,
  y: d.ur,
  feasible: d.ur <= 1.0
}));

const feasibleSwarm = swarmData.filter(d => d.feasible);
const infeasibleSwarm = swarmData.filter(d => !d.feasible);
```

### X-Axis (Weight) Configuration

#### Dynamic Scaling Algorithm

**Purpose:** Auto-scale X-axis to show all data points with 10% margin.

**Algorithm:**
```javascript
// Collect all weight values
const allWeights = [
  ...historyData.map(d => d.x),
  ...swarmData.map(d => d.x),
  ...(data.globalBest ? [data.globalBest.weight_kg] : [])
];

// Calculate range
const weightMin = allWeights.length > 0 
  ? Math.max(0, Math.min(...allWeights) * 0.9)  // 10% margin below
  : 0;

const weightMax = allWeights.length > 0 
  ? Math.max(...allWeights) * 1.1               // 10% margin above
  : 1000;                                        // Default if no data
```

**Configuration:**
```javascript
xaxis: {
  title: 'Weight (kg)',
  titlefont: { size: 11 },
  range: [weightMin, weightMax],
  showgrid: true,
  gridcolor: 'rgba(200, 200, 200, 0.3)',
  zeroline: false,
  showline: true,
  linecolor: 'rgba(0, 0, 0, 0.5)'
}
```

**Edge Cases:**
1. **No Data**: Default range [0, 1000]
2. **Single Point**: 10% margin on both sides
3. **Zero Weight**: Clamped to minimum 0
4. **Very Large Range**: Auto-scaled to fit

#### Tick Configuration

**Automatic Ticks:**
- Plotly automatically calculates optimal tick positions
- Typically 5-7 ticks based on range

**Custom Ticks (Optional):**
```javascript
xaxis: {
  // ... other config
  tickmode: 'linear',
  dtick: (weightMax - weightMin) / 5,  // 5 ticks
  tickformat: '.0f'                    // Integer format
}
```

### Y-Axis (UR) Configuration

#### Dynamic Scaling Algorithm

**Purpose:** Auto-scale Y-axis to show feasible region (UR ≤ 1.0) and infeasible region.

**Algorithm:**
```javascript
// Collect all UR values
const allURs = [
  ...historyData.map(d => d.y),
  ...swarmData.map(d => d.y),
  ...(data.globalBest ? [data.globalBest.ur] : [])
];

// Calculate range
const urMin = 0;  // Always start at 0
const urMax = allURs.length > 0 
  ? Math.max(2.0, Math.max(...allURs) * 1.1)  // At least 2.0, 10% margin
  : 2.0;                                        // Default if no data
```

**Configuration:**
```javascript
yaxis: {
  title: 'Utilization Ratio (UR)',
  titlefont: { size: 11 },
  range: [urMin, urMax],
  showgrid: true,
  gridcolor: 'rgba(200, 200, 200, 0.3)',
  zeroline: true,
  zerolinecolor: 'rgba(0, 0, 0, 0.3)',
  showline: true,
  linecolor: 'rgba(0, 0, 0, 0.5)'
}
```

**Key Features:**
- **Minimum**: Always 0 (no negative UR)
- **Maximum**: At least 2.0 (shows infeasible region)
- **Margin**: 10% above maximum UR value
- **Zero Line**: Visible (helps identify feasible region)

### Dynamic Scaling Algorithm

#### Complete Scaling Logic

```javascript
function calculateAxisRanges(data) {
  // Collect all data points
  const allWeights = [];
  const allURs = [];
  
  // History
  data.history.forEach(d => {
    allWeights.push(d.weight_kg);
    allURs.push(d.ur);
  });
  
  // Current swarm
  data.currentSwarm.forEach(d => {
    allWeights.push(d.weight_kg);
    allURs.push(d.ur);
  });
  
  // Global best
  if (data.globalBest) {
    allWeights.push(data.globalBest.weight_kg);
    allURs.push(data.globalBest.ur);
  }
  
  // X-axis (Weight)
  const weightMin = allWeights.length > 0 
    ? Math.max(0, Math.min(...allWeights) * 0.9)
    : 0;
  const weightMax = allWeights.length > 0 
    ? Math.max(...allWeights) * 1.1
    : 1000;
  
  // Y-axis (UR)
  const urMin = 0;
  const urMax = allURs.length > 0 
    ? Math.max(2.0, Math.max(...allURs) * 1.1)
    : 2.0;
  
  return {
    x: [weightMin, weightMax],
    y: [urMin, urMax]
  };
}
```

**Update Trigger:**
- Called on every data update
- Recalculates ranges based on current data
- Smooth transitions (Plotly handles animation)

### Trace Layers

#### Layer 1: History Points (Background)

**Feasible History:**
```javascript
traces.push({
  type: 'scatter',
  mode: 'markers',
  x: feasibleHistory.map(d => d.x),
  y: feasibleHistory.map(d => d.y),
  marker: {
    color: 'rgba(34, 255, 0, 0.2)',  // Green, 20% opacity
    size: 2,                          // Small dots
    line: { width: 0 }               // No border
  },
  showlegend: false,
  hoverinfo: 'x+y',
  name: 'Feasible History'
});
```

**Infeasible History:**
```javascript
traces.push({
  type: 'scatter',
  mode: 'markers',
  x: infeasibleHistory.map(d => d.x),
  y: infeasibleHistory.map(d => d.y),
  marker: {
    color: 'rgba(189, 0, 0, 0.2)',   // Red, 20% opacity
    size: 2,                          // Small dots
    line: { width: 0 }
  },
  showlegend: false,
  hoverinfo: 'x+y',
  name: 'Infeasible History'
});
```

**Properties:**
- **Opacity**: 0.2 (20% - very faint)
- **Size**: 2px (small)
- **Count**: Maximum 3000 points
- **Purpose**: Show search history as background

#### Layer 2: Current Swarm (Foreground)

**Feasible Swarm:**
```javascript
traces.push({
  type: 'scatter',
  mode: 'markers',
  x: feasibleSwarm.map(d => d.x),
  y: feasibleSwarm.map(d => d.y),
  marker: {
    color: 'rgba(34, 255, 0, 0.8)',  // Green, 80% opacity
    size: 3,                          // Medium dots
    line: { 
      width: 1,
      color: 'rgba(34, 255, 0, 1)'   // Green border
    }
  },
  showlegend: false,
  hoverinfo: 'x+y',
  name: 'Feasible Swarm'
});
```

**Infeasible Swarm:**
```javascript
traces.push({
  type: 'scatter',
  mode: 'markers',
  x: infeasibleSwarm.map(d => d.x),
  y: infeasibleSwarm.map(d => d.y),
  marker: {
    color: 'rgba(189, 0, 0, 0.8)',   // Red, 80% opacity
    size: 3,                          // Medium dots
    line: {
      width: 1,
      color: 'rgba(189, 0, 0, 1)'    // Red border
    }
  },
  showlegend: false,
  hoverinfo: 'x+y',
  name: 'Infeasible Swarm'
});
```

**Properties:**
- **Opacity**: 0.8 (80% - bold)
- **Size**: 3px (medium)
- **Border**: 1px solid (enhances visibility)
- **Count**: Typically 50 particles

#### Layer 3: Global Best (Highlight)

```javascript
if (data.globalBest) {
  traces.push({
    type: 'scatter',
    mode: 'markers',
    x: [data.globalBest.weight_kg],
    y: [data.globalBest.ur],
    marker: {
      color: 'rgba(255, 215, 0, 1)',  // Gold, 100% opacity
      size: 12,                        // Large
      symbol: 'diamond',               // Diamond shape
      line: {
        width: 2,
        color: 'rgba(255, 215, 0, 1)' // Gold border
      }
    },
    showlegend: false,
    hoverinfo: 'x+y+text',
    text: ['Best Solution'],
    name: 'Global Best'
  });
}
```

**Properties:**
- **Opacity**: 1.0 (100% - fully opaque)
- **Size**: 12px (large)
- **Shape**: Diamond (distinctive)
- **Border**: 2px solid gold
- **Count**: 1 point

#### Layer 4: Feasibility Line

```javascript
traces.push({
  type: 'scatter',
  mode: 'lines',
  x: [weightMin, weightMax],
  y: [1.0, 1.0],
  line: {
    color: 'rgba(255, 0, 0, 1)',  // Red, 100% opacity
    width: 2,
    dash: 'dash'                   // Dashed line
  },
  showlegend: false,
  hoverinfo: 'skip',
  name: 'UR = 1.0'
});
```

**Properties:**
- **Type**: Line (not markers)
- **Color**: Red (indicates limit)
- **Width**: 2px
- **Style**: Dashed
- **Position**: Y = 1.0 (feasibility threshold)

### Feasibility Line

#### Purpose

Visual indicator of the feasibility threshold (UR = 1.0). Points below the line are feasible, points above are infeasible.

#### Implementation

**Static Line:**
```javascript
// Horizontal line at UR = 1.0
x: [weightMin, weightMax],  // Spans full width
y: [1.0, 1.0],              // Constant at UR = 1.0
```

**Dynamic Updates:**
- Updates when `weightMin` or `weightMax` changes
- Always spans full X-axis range
- Position fixed at Y = 1.0

**Styling:**
- Red color (warning/danger)
- Dashed style (not solid - indicates threshold, not data)
- 2px width (visible but not overpowering)

### Known Issues & Fixes

#### Issue 1: Axis Range Not Updating

**Symptom:** Axis range doesn't update when new data arrives

**Cause:** Plotly not detecting range change

**Fix:**
```javascript
// Force layout update
<Plot
  data={traces}
  layout={{
    ...layout,
    xaxis: { ...layout.xaxis, range: [weightMin, weightMax] },
    yaxis: { ...layout.yaxis, range: [urMin, urMax] }
  }}
  revision={revision}  // Increment to force update
/>
```

#### Issue 2: Points Clustered at Edges

**Symptom:** All points appear at axis edges, hard to see distribution

**Cause:** Very large range, points clustered in small region

**Fix:**
```javascript
// Use tighter margin for clustered data
const weightRange = weightMax - weightMin;
if (weightRange > weightMax * 0.5) {
  // Data spread out, use normal margin
  weightMin = Math.max(0, Math.min(...allWeights) * 0.9);
} else {
  // Data clustered, use tighter margin
  weightMin = Math.max(0, Math.min(...allWeights) * 0.95);
  weightMax = Math.max(...allWeights) * 1.05;
}
```

#### Issue 3: Feasibility Line Not Visible

**Symptom:** Red dashed line at UR = 1.0 not showing

**Cause:** Line behind other traces or wrong z-order

**Fix:**
```javascript
// Add feasibility line FIRST (renders behind other traces)
const traces = [
  feasibilityLineTrace,  // First
  ...historyTraces,      // Then history
  ...swarmTraces,        // Then swarm
  globalBestTrace        // Finally global best (on top)
];
```

#### Issue 4: Performance with 3000+ Points

**Symptom:** Slow rendering with large history

**Fix:**
```javascript
// Reduce history limit
const historyData = data.history.slice(-2000);  // Reduced from 3000

// Or use WebGL mode
const config = {
  plotGlPixelRatio: 2,  // Higher quality
  // ...
};
```

---

## Cross-Section Preview

### Component Purpose

Visualize the best cross-section found so far as a scaled technical drawing with dimensions labeled.

### SVG Rendering

#### SVG Container Setup

```javascript
<svg
  width="100%"
  height="100%"
  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
  preserveAspectRatio="xMidYMid meet"
  style={{ width: '100%', height: '100%' }}
>
  {/* SVG elements */}
</svg>
```

**Properties:**
- **Width/Height**: 100% of container
- **viewBox**: Defines coordinate system
- **preserveAspectRatio**: Maintains aspect ratio
- **Style**: Ensures responsive sizing

### Dimension Extraction

#### Variable Name Mapping

**Function:**
```javascript
const getValue = (varName) => {
  const idx = variableNames.indexOf(varName);
  if (idx === -1) return null;
  return position[idx];
};
```

**Variable Extraction:**
```javascript
// Try multiple possible names (handles different naming conventions)
const D = getValue('D') || getValue('total_depth');
const tw = getValue('tw') || getValue('web_thickness');
const bf_top = getValue('bf_top') || getValue('top_flange_width') || getValue('bf');
const bf_bot = getValue('bf_bot') || getValue('bottom_flange_width') || getValue('bf');
const tf_top = getValue('tf_top') || getValue('top_flange_thickness') || getValue('tf');
const tf_bot = getValue('tf_bot') || getValue('bottom_flange_thickness') || getValue('tf');
```

**Fallback Logic:**
- Tries primary name first (e.g., 'D')
- Falls back to alternative names (e.g., 'total_depth')
- Returns `null` if not found

### Scaling Algorithm

#### Purpose

Scale the cross-section to fit within the SVG viewport while maintaining aspect ratio.

#### Algorithm

```javascript
// Get maximum dimensions
const maxWidth = Math.max(bf_top, bf_bot);  // Maximum flange width
const totalHeight = D;                       // Total depth

// Calculate scale to fit in viewport
// Viewport: 200px width, 300px height (example)
const scale = Math.min(
  200 / maxWidth,      // Scale to fit width
  300 / totalHeight    // Scale to fit height
);

// Apply scale
const scaledWidth = maxWidth * scale;
const scaledHeight = totalHeight * scale;
```

**Key Points:**
- Uses `Math.min()` to ensure fits both dimensions
- Maintains aspect ratio
- Leaves margin for labels

#### Coordinate System

**Origin:** Top-left corner (SVG standard)

**Y-Axis:** Downward (SVG standard, opposite of typical math)

**Coordinate Calculation:**
```javascript
// Center horizontally
const centerX = svgWidth / 2;

// Position elements from top
const topFlangeY = margin;
const webY = topFlangeY + tf_top * scale;
const bottomFlangeY = webY + (D - tf_top - tf_bot) * scale;
```

### Element Drawing

#### Bottom Flange

```javascript
<rect
  x={centerX - (bf_bot * scale) / 2}
  y={bottomFlangeY}
  width={bf_bot * scale}
  height={tf_bot * scale}
  fill="#4A90E2"
  stroke="#2E5C8A"
  strokeWidth={1}
/>
```

#### Web

```javascript
<rect
  x={centerX - (tw * scale) / 2}
  y={webY}
  width={tw * scale}
  height={(D - tf_top - tf_bot) * scale}
  fill="#E8E8E8"
  stroke="#CCCCCC"
  strokeWidth={1}
/>
```

#### Top Flange

```javascript
<rect
  x={centerX - (bf_top * scale) / 2}
  y={topFlangeY}
  width={bf_top * scale}
  height={tf_top * scale}
  fill="#4A90E2"
  stroke="#2E5C8A"
  strokeWidth={1}
/>
```

#### Dimension Labels

**Center Label (Depth & Web Thickness):**
```javascript
<text
  x={centerX}
  y={webY + (D - tf_top - tf_bot) * scale / 2}
  textAnchor="middle"
  fontSize={12}
  fill="#333"
>
  {`D=${D.toFixed(0)}\ntw=${tw.toFixed(0)}`}
</text>
```

**Bottom Flange Label:**
```javascript
<text
  x={centerX}
  y={bottomFlangeY + tf_bot * scale + 20}
  textAnchor="middle"
  fontSize={10}
  fill="#666"
>
  {`Bot: ${bf_bot.toFixed(0)}×${tf_bot.toFixed(0)}`}
</text>
```

**Top Flange Label:**
```javascript
<text
  x={centerX}
  y={topFlangeY - 10}
  textAnchor="middle"
  fontSize={10}
  fill="#666"
>
  {`Top: ${bf_top.toFixed(0)}×${tf_top.toFixed(0)}`}
</text>
```

### Known Issues & Fixes

#### Issue 1: SVG Not Scaling Properly

**Symptom:** Cross-section doesn't resize with container

**Fix:**
```javascript
// Ensure viewBox matches content
const svgWidth = Math.max(300, maxWidth * scale + 100);
const svgHeight = Math.max(400, totalHeight * scale + 100);

<svg
  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
  preserveAspectRatio="xMidYMid meet"
>
```

#### Issue 2: Text Overlapping

**Symptom:** Dimension labels overlap elements

**Fix:**
```javascript
// Add margin for labels
const margin = 30;  // Increased from 20

// Adjust label positions
<text y={topFlangeY - margin} />  // More space above
<text y={bottomFlangeY + tf_bot * scale + margin} />  // More space below
```

#### Issue 3: Empty State Not Showing

**Symptom:** "No Feasible Solution" message not appearing

**Fix:**
```javascript
// Check both conditions
if (!data.globalBest || data.globalBest.ur > 1.0) {
  return (
    <div className="empty-state">
      <div>No Feasible Solution Yet</div>
      <div>(Searching...)</div>
    </div>
  );
}
```

---

## Replay Controls & Frame Management

### Frame Cache Structure

#### Frame Data Structure

```typescript
interface Frame {
  iteration: number;
  particles: ParticleData[];
  globalBest: ParticleData | null;
}

interface FrameCache {
  frames: Frame[];           // One frame per iteration
  currentFrame: number;      // Index into frames array
  totalFrames: number;       // frames.length
}
```

#### Frame Building Process

**Trigger:** When `optimizationDone === true`

**Process:**
```javascript
useEffect(() => {
  if (optimizationDone && data.history.length > 0 && frameCache.length === 0) {
    // Group history by iteration
    const iterationMap = new Map();
    data.history.forEach(item => {
      const iter = item.iter;
      if (!iterationMap.has(iter)) {
        iterationMap.set(iter, []);
      }
      iterationMap.get(iter).push(item);
    });
    
    // Build frames array
    const frames = [];
    let runningBest = null;
    
    const sortedIterations = Array.from(iterationMap.keys()).sort((a, b) => a - b);
    
    sortedIterations.forEach(iter => {
      const particles = iterationMap.get(iter);
      
      // Update running global best
      particles.forEach(p => {
        if (!runningBest || 
            (p.ur <= 1.0 && p.weight_kg < runningBest.weight_kg)) {
          runningBest = { ...p };
        }
      });
      
      frames.push({
        iteration: iter,
        particles: particles,
        globalBest: runningBest ? { ...runningBest } : null
      });
    });
    
    setFrameCache(frames);
    setCurrentFrame(frames.length - 1);  // Start at last frame
  }
}, [optimizationDone, data.history]);
```

### Playback Mechanism

#### Playback Timer

```javascript
useEffect(() => {
  if (!isPlaying || frameCache.length === 0) return;
  
  const interval = setInterval(() => {
    setCurrentFrame(prev => {
      if (prev >= frameCache.length - 1) {
        if (loopMode === 'loop') {
          return 0;  // Loop back to start
        } else {
          setIsPlaying(false);  // Stop at end
          return prev;
        }
      }
      return prev + 1;  // Advance one frame
    });
  }, 200);  // 5 FPS (200ms per frame)
  
  return () => clearInterval(interval);
}, [isPlaying, loopMode, frameCache.length]);
```

**Properties:**
- **Interval**: 200ms (5 FPS)
- **Frame Advance**: +1 per interval
- **Loop Mode**: Restarts at 0 when reaching end
- **Once Mode**: Stops at last frame

### Slider Control

#### HTML Range Input

```javascript
<input
  type="range"
  min={0}
  max={frameCache.length - 1}
  value={currentFrame}
  onChange={(e) => setCurrentFrame(Number(e.target.value))}
  className="frame-slider"
/>
```

**Properties:**
- **Min**: 0 (first frame)
- **Max**: `frameCache.length - 1` (last frame)
- **Value**: `currentFrame` (current frame index)
- **Step**: 1 (single frame steps)

#### Visual Styling

```css
.frame-slider {
  width: 100%;
  height: 8px;
  background: #d1d5db;
  border-radius: 4px;
  outline: none;
  -webkit-appearance: none;
}

.frame-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}
```

### State Synchronization

#### Frame Change Handler

```javascript
const handleFrameChange = (newFrame) => {
  setCurrentFrame(newFrame);
  
  // Update plot data immediately
  const frame = frameCache[newFrame];
  if (frame) {
    // Build history up to current frame
    const historyUpToFrame = frameCache
      .slice(0, newFrame + 1)
      .flatMap(f => f.particles);
    
    // Update plots with frame data
    updatePlots({
      history: historyUpToFrame,
      currentSwarm: frame.particles,
      globalBest: frame.globalBest
    });
  }
};
```

**Synchronization Points:**
1. Slider drag → `currentFrame` updates
2. Button click → `currentFrame` updates
3. Playback timer → `currentFrame` updates
4. Frame change → Plots update immediately

---

## Common Web Rendering Issues

### Issue 1: Plots Not Rendering

**Symptoms:**
- Blank space where plot should be
- No error messages
- Component mounts but plot doesn't appear

**Causes:**
1. Plotly.js not loaded
2. Container has zero dimensions
3. Data is empty or malformed
4. React re-render issues

**Fixes:**

**Fix 1: Ensure Plotly Loaded**
```javascript
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js-dist-min';

// Verify Plotly is available
console.log('Plotly:', typeof Plotly);
```

**Fix 2: Ensure Container Dimensions**
```javascript
<div 
  style={{ 
    width: '100%', 
    height: '45vh', 
    minHeight: '300px' 
  }}
>
  <Plot ... />
</div>
```

**Fix 3: Check Data Validity**
```javascript
useEffect(() => {
  if (!data || !data.history || data.history.length === 0) {
    console.warn('No data available for plot');
    return;
  }
  // Render plot
}, [data]);
```

### Issue 2: Plots Rendering Incorrectly

**Symptoms:**
- Wrong axis ranges
- Missing data points
- Incorrect colors
- Overlapping elements

**Causes:**
1. Data not normalized correctly
2. Axis ranges not updating
3. Trace order incorrect
4. Color arrays mismatched

**Fixes:**

**Fix 1: Verify Normalization**
```javascript
// Debug normalization
const normalized = position.map((val, idx) => {
  const norm = normalize(val, idx);
  console.log(`Variable ${idx}: ${val} → ${norm}%`);
  return norm;
});
```

**Fix 2: Force Layout Update**
```javascript
const [revision, setRevision] = useState(0);

useEffect(() => {
  setRevision(prev => prev + 1);  // Force update
}, [data]);
```

### Issue 3: Performance Issues

**Symptoms:**
- Slow rendering
- Laggy interactions
- Browser freezing
- High memory usage

**Causes:**
1. Too many data points
2. Frequent re-renders
3. Large history arrays
4. No data limiting

**Fixes:**

**Fix 1: Limit Data Points**
```javascript
// Reduce history limit
const historySlice = data.history.slice(-1000);  // Reduced from 2000/3000
```

**Fix 2: Throttle Updates**
```javascript
const [updateTimer, setUpdateTimer] = useState(null);

useEffect(() => {
  if (updateTimer) clearTimeout(updateTimer);
  
  const timer = setTimeout(() => {
    updatePlot();
  }, 100);  // Throttle to 10 FPS
  
  setUpdateTimer(timer);
}, [data]);
```

**Fix 3: Use React.memo**
```javascript
export default React.memo(ParallelCoordinatesPlot, (prevProps, nextProps) => {
  // Only re-render if data actually changed
  return prevProps.data === nextProps.data;
});
```

---

## Performance Optimization

### Data Limiting Strategies

**History Limits:**
- Parallel Coordinates: 2000 entries
- Performance Map: 3000 entries
- Cross-Section: No limit (single best)

**Swarm Limits:**
- Current Swarm: 50 particles
- Global Best: 1 particle

### Rendering Optimizations

**Plotly Config:**
```javascript
const config = {
  displayModeBar: false,     // Hide toolbar (reduces DOM)
  responsive: true,          // Use WebGL for large datasets
  staticPlot: false,         // Keep interactive
  doubleClick: 'reset'       // Reset zoom on double-click
};
```

**React Optimizations:**
- Use `React.memo` for plot components
- Memoize expensive calculations
- Batch state updates
- Use `useCallback` for event handlers

### Memory Management

**Frame Cache:**
- Built once on completion
- Stored in component state
- Cleared on unmount

**History Management:**
- Sliced to limit size
- Old entries automatically removed
- No manual cleanup needed

---

## Troubleshooting Guide

### Problem: Plot Not Showing

**Checklist:**
1. ✅ Plotly.js installed and imported
2. ✅ Container has dimensions (width > 0, height > 0)
3. ✅ Data is not empty
4. ✅ Component is mounted
5. ✅ No JavaScript errors in console

**Debug Steps:**
```javascript
// 1. Check Plotly
console.log('Plotly available:', typeof Plotly !== 'undefined');

// 2. Check container
const container = document.querySelector('.plot-container');
console.log('Container dimensions:', {
  width: container?.offsetWidth,
  height: container?.offsetHeight
});

// 3. Check data
console.log('Data:', {
  historyLength: data.history?.length,
  swarmLength: data.currentSwarm?.length,
  hasGlobalBest: !!data.globalBest
});
```

### Problem: Wrong Axis Ranges

**Checklist:**
1. ✅ Data values are valid numbers
2. ✅ Bounds are correct
3. ✅ Normalization function working
4. ✅ Layout ranges updating

**Debug Steps:**
```javascript
// Check bounds
console.log('Bounds:', bounds);

// Check normalization
const testVal = 1100;
const normalized = normalize(testVal, 0);
console.log(`Normalized ${testVal}:`, normalized);

// Check axis ranges
console.log('Axis ranges:', {
  x: layout.xaxis?.range,
  y: layout.yaxis?.range
});
```

### Problem: Performance Degradation

**Checklist:**
1. ✅ Data limits enforced
2. ✅ Updates throttled
3. ✅ No memory leaks
4. ✅ Browser DevTools shows no issues

**Debug Steps:**
```javascript
// Check data sizes
console.log('Data sizes:', {
  history: data.history.length,
  swarm: data.currentSwarm.length,
  frames: frameCache.length
});

// Check render frequency
let renderCount = 0;
useEffect(() => {
  renderCount++;
  console.log('Render count:', renderCount);
}, [data]);
```

---

## Conclusion

This documentation provides a comprehensive guide to the graphs and visualizations in the Plate Girder Web PSO Dashboard. Key points:

1. **Parallel Coordinates Plot**: Uses normalized 0-100% range, three data layers, fixed axis configuration
2. **Performance Map**: Dynamic scaling, four trace layers, feasibility line at UR = 1.0
3. **Cross-Section Preview**: SVG-based, scaled to fit, dimension labels
4. **Replay Controls**: Frame cache, playback timer, slider synchronization

**Common Issues:**
- Plot not rendering → Check Plotly loading, container dimensions
- Wrong ranges → Verify normalization, bounds, layout updates
- Performance → Limit data, throttle updates, use React.memo

**Best Practices:**
- Always limit history data (2000-3000 entries)
- Cache normalized values
- Use React.memo for plot components
- Throttle updates to 10 FPS
- Verify container dimensions before rendering

---

*Document Version: 1.0*  
*Last Updated: January 21, 2025*  
*Maintained by: OSdag Development Team*

