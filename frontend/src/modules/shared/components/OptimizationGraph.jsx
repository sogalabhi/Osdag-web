import { useRef } from 'react';
import Plot from 'react-plotly.js';
import Plotly from 'plotly.js-dist-min';

const IBeamSVG = ({ depth = 400, width = 300, tw = 8, tf = 12 }) => {
    const maxH = 280;
    const maxW = 200;
    const currentDepth = depth || 400;
    const currentWidth = width || 300;
    const aspect = currentDepth / currentWidth;
    
    let drawH, drawW;
    if (aspect > 1) {
        drawH = maxH;
        drawW = maxH / aspect;
    } else {
        drawW = maxW;
        drawH = maxW * aspect;
    }
    
    const scale = drawH / currentDepth;
    const s_tw = Math.max(4, tw * scale);
    const s_tf = Math.max(4, tf * scale);
    
    return (
        <svg width="100%" height="350" viewBox="0 0 400 400" className="drop-shadow-md">
            <g transform="translate(200, 200)">
                {/* Axes Z-Z and Y-Y with Labels */}
                <line x1="-180" y1="0" x2="180" y2="0" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x="185" y="5" fill="#991b1b" fontSize="14" fontWeight="bold">Z</text>
                <text x="-198" y="5" fill="#991b1b" fontSize="14" fontWeight="bold">Z</text>
                
                <line x1="0" y1="-180" x2="0" y2="180" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x="-5" y="-185" fill="#991b1b" fontSize="14" fontWeight="bold">Y</text>
                <text x="-5" y="195" fill="#991b1b" fontSize="14" fontWeight="bold">Y</text>

                {/* I-Beam Shape */}
                <rect x={-drawW/2} y={-drawH/2} width={drawW} height={s_tf} fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2" />
                <rect x={-s_tw/2} y={-drawH/2 + s_tf} width={s_tw} height={drawH - 2*s_tf} fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2" />
                <rect x={-drawW/2} y={drawH/2 - s_tf} width={drawW} height={s_tf} fill="#3b82f6" stroke="#1e3a8a" strokeWidth="2" />
                
                {/* Dimension Arrows */}
                <g>
                    <line x1={drawW/2 + 30} y1={-drawH/2} x2={drawW/2 + 30} y2={drawH/2} stroke="#4b5563" strokeWidth="1" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                    <text x={drawW/2 + 40} y="5" fill="#000" fontSize="14" fontWeight="bold">D={currentDepth.toFixed(0)}</text>
                    
                    <line x1={-drawW/2} y1={drawH/2 + 30} x2={drawW/2} y2={drawH/2 + 30} stroke="#4b5563" strokeWidth="1" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                    <text x="-25" y={drawH/2 + 55} fill="#000" fontSize="14" fontWeight="bold">B={currentWidth.toFixed(0)}</text>
                </g>

                <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                        <path d="M0,0 L10,5 L0,10 Z" fill="#4b5563" />
                    </marker>
                </defs>
            </g>
        </svg>
    );
};

function OptimizationGraph({ data, onClose, optimizationDone, isWsConnected }) {
    const graphRef = useRef(null);

    const finiteValues = (...arrays) => arrays
        .flatMap((values) => Array.isArray(values) ? values : [])
        .map(Number)
        .filter(Number.isFinite);

    const xValues = finiteValues(data.fease?.x, data.non_fease?.x, data.swarm_fease?.x, data.swarm_non_fease?.x, data.best?.x);
    const yValues = finiteValues(data.fease?.y, data.non_fease?.y, data.swarm_fease?.y, data.swarm_non_fease?.y, data.best?.y);
    const zValues = finiteValues(data.fease?.z, data.non_fease?.z, data.swarm_fease?.z, data.swarm_non_fease?.z, data.best?.z);

    const maxUR = xValues.length ? Math.max(1.2, Math.max(...xValues) * 1.08) : 4;
    const minDepth = yValues.length ? Math.max(0, Math.min(...yValues) - 100) : 0;
    const maxDepth = yValues.length ? Math.max(...yValues) + 100 : 2000;
    const maxWeight = zValues.length ? Math.max(1, Math.max(...zValues) * 1.15) : 100;
    const depthDtick = Math.max(100, Math.ceil(((maxDepth - minDepth) / 6) / 50) * 50);
    const weightDtick = Math.max(1, Math.ceil((maxWeight / 5) * 10) / 10);
    const urDtick = maxUR <= 2 ? 0.25 : 1;

    return (
        <div className='flex flex-col w-full h-full bg-white font-sans'>
            {/* Header */}
            <div className='flex flex-row h-12 px-6 items-center text-white bg-[#6b7d20] border-b border-[#556619] shadow-sm'>
                <div className='flex-1 font-bold text-sm tracking-wide flex items-center gap-3 uppercase'>
                    PSO Optimization Visualization
                </div>
                <div className='flex gap-12 items-center text-sm'>
                    <div className='font-bold uppercase tracking-tight'>ITERATION: <span className="text-white ml-1">{data.current_iter + 1}</span></div>
                    <div className='font-bold uppercase tracking-tight'>BEST: <span className="text-yellow-400 ml-1">{data.best.found ? `${data.best.val.toFixed(0)} kg` : "---"}</span></div>
                    <div className='font-bold uppercase tracking-tight opacity-90'>
                      PARTICLE: <span className="text-white ml-1">{data.best.found ? `${data.best.particle} @ Iter ${data.best.iter}` : "---"}</span>
                    </div>
                </div>
                <button onClick={onClose} className="ml-8 text-white/80 hover:text-white transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>

            {/* Content Area */}
            <div className='flex-1 flex flex-row overflow-hidden p-2 bg-[#f8f9fa]'>
                <div className="flex-1 flex flex-row bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                    {/* Plot Area */}
                    <div className="w-[65%] border-r border-gray-50 p-6 flex flex-col">
                        <h3 className="text-base font-bold text-gray-800 mb-4">3D Scatter: Utilization Ratio vs Depth vs Weight</h3>
                        
                        <div className="flex-1 min-h-0 relative">
                            <Plot
                                ref={graphRef}
                                data={[
                                    // Vertical plane at UR = 1
                                    {
                                        type: 'mesh3d',
                                        x: [1, 1, 1, 1],
                                        y: [minDepth, maxDepth, maxDepth, minDepth],
                                        z: [0, 0, maxWeight, maxWeight],
                                        i: [0, 0],
                                        j: [1, 2],
                                        k: [2, 3],
                                        opacity: 0.1,
                                        color: '#ef4444',
                                        showlegend: false,
                                        hoverinfo: 'skip'
                                    },
                                    // Infeasible points (History)
                                    {
                                        name: 'Utilization > 1',
                                        x: data.non_fease.x.length > 0 ? data.non_fease.x : [null],
                                        y: data.non_fease.y.length > 0 ? data.non_fease.y : [null],
                                        z: data.non_fease.z.length > 0 ? data.non_fease.z : [null],
                                        type: 'scatter3d',
                                        mode: 'markers',
                                        showlegend: true,
                                        marker: {
                                            size: 5,
                                            symbol: 'circle-open',
                                            color: '#f87171',
                                            line: { color: '#f87171', width: 2 }
                                        },
                                    },
                                    // Feasible points (History)
                                    {
                                        name: 'Utilization ≤ 1',
                                        x: data.fease.x.length > 0 ? data.fease.x : [null],
                                        y: data.fease.y.length > 0 ? data.fease.y : [null],
                                        z: data.fease.z.length > 0 ? data.fease.z : [null],
                                        type: 'scatter3d',
                                        mode: 'markers',
                                        showlegend: true,
                                        marker: {
                                            size: 5,
                                            symbol: 'circle-open',
                                            color: '#84cc16',
                                            line: { color: '#84cc16', width: 2 }
                                        },
                                    },
                                    // Current Live Swarm - Feasible
                                    {
                                        name: 'Live Feasible',
                                        x: data.swarm_fease?.x || [],
                                        y: data.swarm_fease?.y || [],
                                        z: data.swarm_fease?.z || [],
                                        type: 'scatter3d',
                                        mode: 'markers',
                                        marker: {
                                            size: 7,
                                            symbol: 'circle',
                                            color: '#84cc16',
                                            opacity: 0.9,
                                            line: { color: 'white', width: 1 }
                                        },
                                        showlegend: false
                                    },
                                    // Current Live Swarm - Infeasible
                                    {
                                        name: 'Live Infeasible',
                                        x: data.swarm_non_fease?.x || [],
                                        y: data.swarm_non_fease?.y || [],
                                        z: data.swarm_non_fease?.z || [],
                                        type: 'scatter3d',
                                        mode: 'markers',
                                        marker: {
                                            size: 7,
                                            symbol: 'circle',
                                            color: '#f87171',
                                            opacity: 0.9,
                                            line: { color: 'white', width: 1 }
                                        },
                                        showlegend: false
                                    },
                                    // Global Best
                                    {
                                        name: 'Global Best',
                                        x: data.best.x,
                                        y: data.best.y,
                                        z: data.best.z,
                                        type: 'scatter3d',
                                        mode: 'markers',
                                        marker: {
                                            size: 16,
                                            color: '#eab308',
                                            symbol: 'star',
                                            line: { color: '#854d0e', width: 2 }
                                        },
                                    }
                                ]}
                                layout={{
                                    font: { family: 'Segoe UI, Arial, sans-serif', size: 11 },
                                    legend: { 
                                        x: 0.95, y: 0.95, 
                                        xanchor: 'right',
                                        bgcolor: 'rgba(255,255,255,0.8)',
                                        bordercolor: '#eee',
                                        borderwidth: 1
                                    },
                                    margin: { l: 0, r: 0, t: 0, b: 0 },
                                    autosize: true,
                                    scene: {
                                        xaxis: { title: { text: "Utilization Ratio", font: { weight: 'bold' } }, gridcolor: '#f1f5f9', zerolinecolor: '#cbd5e1', range: [0, maxUR], dtick: urDtick },
                                        yaxis: { title: { text: "Depth (mm)", font: { weight: 'bold' } }, gridcolor: '#f1f5f9', zerolinecolor: '#cbd5e1', range: [maxDepth, minDepth], dtick: depthDtick },
                                        zaxis: { title: { text: "Weight (kg)", font: { weight: 'bold' } }, gridcolor: '#f1f5f9', zerolinecolor: '#cbd5e1', range: [0, maxWeight], dtick: weightDtick },
                                        camera: { eye: { x: 1.8, y: 1.8, z: 1.2 } }
                                    },
                                    paper_bgcolor: 'white',
                                    plot_bgcolor: 'white',
                                }}
                                config={{ displayModeBar: false, responsive: true }}
                                className="w-full h-full"
                            />
                        </div>
                    </div>

                    {/* Sidebar Area */}
                    <div className="w-[35%] flex flex-col border-l border-gray-100 bg-[#fafafa]">
                        <div className='p-6 flex flex-col items-center bg-white border-b border-gray-100'>
                            <h4 className="font-bold text-base text-gray-700 mb-6 uppercase tracking-wider">Best Cross-Section (I-Beam)</h4>
                            <div className="w-full flex items-center justify-center">
                                {data.best.found ? (
                                    <IBeamSVG 
                                      depth={data.best.y[0]} 
                                      width={data.best.vars?.bf || 300} 
                                      tw={data.best.vars?.tw || 8} 
                                      tf={data.best.vars?.tf || 8} 
                                    />
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-4">
                                        <div className="w-10 h-10 border-4 border-gray-100 border-t-[#6b7d20] rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold uppercase tracking-widest">Searching...</span>
                                    </div>
                                )}
                            </div>
                            {data.best.found && (
                                <div className="mt-6 w-full px-4">
                                    <div className="grid grid-cols-4 border-y border-gray-200 text-[10px] font-mono bg-gray-50/50 text-center divide-x divide-gray-200">
                                        <div className="py-2">tw={data.best.vars?.tw?.toFixed(1) || "8.0"}</div>
                                        <div className="py-2">tf={data.best.vars?.tf?.toFixed(1) || "8.0"}</div>
                                        <div className="py-2">R1=4.0</div>
                                        <div className="py-2">R2=4.0</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Summary */}
            <div className='bg-white px-6 py-3 border-t border-gray-200 flex flex-col gap-3'>
                {data.best.found && (
                    <div className="flex justify-center">
                        <div className="flex items-center gap-1 border border-gray-300 rounded-md px-6 py-2 text-[12px] font-mono bg-gray-50 shadow-sm transition-all hover:border-[#6b7d20]">
                            <span className="font-black text-[#6b7d20] uppercase mr-2">Global Best</span>
                            <span className="text-gray-300 mx-2">|</span>
                            <span className="text-gray-600">Iter: <span className="text-gray-950 font-bold">{data.best.iter}</span></span>
                            <span className="text-gray-300 mx-2">|</span>
                            <span className="text-gray-600">Particle: <span className="text-gray-950 font-bold">{data.best.particle}</span></span>
                            <span className="text-gray-300 mx-2">|</span>
                            <span className="text-gray-600">Weight: <span className="text-gray-950 font-bold">{data.best.val.toFixed(1)} kg</span></span>
                            <span className="text-gray-300 mx-2">|</span>
                            <span className="text-gray-600">D: <span className="text-gray-950 font-bold">{data.best.y[0].toFixed(0)} mm</span></span>
                            <span className="text-gray-300 mx-2">|</span>
                            <span className="text-gray-600">B: <span className="text-gray-950 font-bold">{(data.best.vars?.bf || 0).toFixed(0)} mm</span></span>
                            <span className="text-gray-300 mx-2">|</span>
                            <span className="text-gray-600">tw: <span className="text-gray-950 font-bold">{(data.best.vars?.tw || 0).toFixed(1)} mm</span></span>
                            <span className="text-gray-300 mx-2">|</span>
                            <span className="text-gray-600">tf: <span className="text-gray-950 font-bold">{(data.best.vars?.tf || 0).toFixed(1)} mm</span></span>
                        </div>
                    </div>
                )}
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        <div className={`w-2 h-2 rounded-full ${optimizationDone ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></div>
                        <span className='text-[10px] text-gray-500 font-black uppercase tracking-widest'>
                            {optimizationDone ? "Optimization Complete" : "Real-time Swarm Tracking..."}
                        </span>
                    </div>
                    <div className='flex gap-8 items-center text-[10px] font-bold text-gray-600'>
                        <div className='flex items-center gap-2'><span className="text-[#eab308] text-sm">★</span> Best</div>
                        <div className='flex items-center gap-2'><div className='w-3 h-3 rounded-full border-2 border-[#84cc16]'></div> Utilization ≤ 1</div>
                        <div className='flex items-center gap-2'><div className='w-3 h-3 rounded-full border-2 border-[#f87171]'></div> Utilization &gt; 1</div>
                        <button 
                          onClick={() => Plotly.downloadImage(graphRef.current.el, { format: 'png', height: 800, width: 1200, filename: 'pso_plot' })}
                          className="bg-[#334155] hover:bg-black text-white px-5 py-2 rounded shadow-sm flex items-center gap-2 transition-all uppercase"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                          Save Plot
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OptimizationGraph;
