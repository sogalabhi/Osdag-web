import { useMemo } from 'react';
import ParallelCoordinatesPlot from './ParallelCoordinatesPlot';
import PerformanceMap from './PerformanceMap';
import CrossSectionPreview from './CrossSectionPreview';

/**
 * PSO Dashboard Component
 * 
 * Main dashboard with 3-panel layout:
 * - Top: Parallel Coordinates Plot
 * - Bottom Left: Performance Map
 * - Bottom Right: Cross-Section Preview
 * 
 * Matches documentation layout from plate-girder.md
 */
function PSODashboard({ data, onClose, optimizationDone }) {
  // Process data for visualization components
  const processedData = useMemo(() => {
    if (!data) {
      console.warn('[PSODashboard] No data provided');
      return null;
    }
    
    // Ensure data has required fields
    if (!data.history && !data.currentSwarm && !data.globalBest) {
      console.warn('[PSODashboard] Data exists but has no history/swarm/globalBest:', data);
    }

    // Normalize positions for parallel coordinates
    const normalizePosition = (position, variableNames, bounds) => {
      if (!position || !variableNames || !bounds || !bounds.lb || !bounds.ub) return null;
      if (position.length !== variableNames.length) return null;
      if (bounds.lb.length !== bounds.ub.length || bounds.lb.length !== position.length) return null;
      
      return position.map((val, idx) => {
        const lb = bounds.lb[idx];
        const ub = bounds.ub[idx];
        if (ub === lb || isNaN(lb) || isNaN(ub)) return 50;
        const normalized = ((val - lb) / (ub - lb)) * 100;
        return isNaN(normalized) ? 50 : Math.max(0, Math.min(100, normalized)); // Clamp to 0-100
      });
    };

    // Process history
    const history = (data.history || []).map(item => ({
      ...item,
      normalized: normalizePosition(item.position, data.variableNames, data.bounds)
    }));

    // Process current swarm
    const currentSwarm = (data.currentSwarm || []).map(item => ({
      ...item,
      normalized: normalizePosition(item.position, data.variableNames, data.bounds)
    }));

    // Process global best
    let globalBest = null;
    if (data.globalBest && data.globalBest.position) {
      globalBest = {
        ...data.globalBest,
        normalized: normalizePosition(
          data.globalBest.position,
          data.variableNames,
          data.bounds
        )
      };
    }

    return {
      history,
      currentSwarm,
      globalBest
    };
  }, [data]);

  // Format best weight for display
  const bestWeightDisplay = useMemo(() => {
    if (!data?.globalBest?.weight_kg) return '---';
    return `${data.globalBest.weight_kg.toFixed(2)} kg`;
  }, [data]);

  // Format best particle info
  const bestParticleDisplay = useMemo(() => {
    if (!data?.globalBest) return '---';
    const iter = data.globalBest.iter ?? data.current_iter ?? '?';
    const particle = data.globalBest.particle ?? '?';
    return `${particle} @ Iter ${iter}`;
  }, [data]);

  return (
    <div className="flex flex-col w-full flex-1">
      {/* Header */}
      <div
        className="flex flex-row h-fit p-2 font text-white flex-shrink-0"
        style={{ backgroundColor: '#6b7d20' }}
      >
        <div className="flex-1 content-center font-black text-sm sm:text-base">
          PSO OPTIMIZATION SPACE
        </div>
        <div className="flex w-auto gap-2 sm:gap-3 flex-wrap items-center">
          <div className="w-auto m-auto font-extrabold text-xs sm:text-sm">
            ITER: {data?.current_iter ?? 0}
          </div>
          <div className="w-auto m-auto font-black text-[#ffd708] text-xs sm:text-sm">
            BEST: {bestWeightDisplay}
          </div>
          <div className="w-auto m-auto text-xs sm:text-sm">
            P: {bestParticleDisplay}
          </div>
          <div className="w-auto flex items-center justify-center">
            <button
              className="flex h-fit box-content justify-center px-3 py-1.5 sm:px-4 sm:py-2 items-center bg-osdag-green text-white font-semibold rounded-lg shadow-md hover:bg-opacity-90 transition-opacity text-xs sm:text-sm"
              onClick={() => {
                onClose();
                console.log('PSO Dashboard closed');
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 z-0 flex-col overflow-hidden" style={{ minHeight: 0 }}>
        {/* Top Panel: Parallel Coordinates Plot - Takes 50% of available space */}
        <div className="flex-shrink-0 min-h-0 p-1 border-b border-gray-300" style={{ height: '50%', maxHeight: '50%' }}>
          <div className="w-full h-full">
            <ParallelCoordinatesPlot
              data={processedData}
              variableNames={data?.variableNames || []}
              bounds={data?.bounds || { lb: [], ub: [] }}
            />
          </div>
        </div>

        {/* Bottom Panels: Performance Map and Cross-Section - Takes remaining 50% */}
        <div className="flex flex-row flex-shrink-0 min-h-0 overflow-hidden" style={{ height: '50%', maxHeight: '50%' }}>
          {/* Bottom Left: Performance Map */}
          <div className="flex-1 min-w-0 p-1 border-r border-gray-300 overflow-hidden">
            <div className="w-full h-full">
              <PerformanceMap data={processedData} />
            </div>
          </div>

          {/* Bottom Right: Cross-Section Preview */}
          <div className="flex-1 min-w-0 p-1 overflow-hidden">
            <div className="w-full h-full">
              <CrossSectionPreview
                data={processedData}
                variableNames={data?.variableNames || []}
                bounds={data?.bounds || { lb: [], ub: [] }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between box-border flex-row h-[40px] z-10 px-4 font w-full border-t-[1px] border-t-gray-700 flex-shrink-0">
        <div className="content-center items-center flex">
          {optimizationDone ? (
            <span className="text-green-600 font-semibold">✓ Optimization Complete</span>
          ) : (
            <span>Optimizing...</span>
          )}
        </div>
        <div className="w-auto flex items-center justify-center gap-2">
          {optimizationDone && (
            <button
              className="flex h-fit box-content justify-center px-4 py-1.5 items-center bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
              onClick={() => {
                console.log('[PSODashboard] Close button clicked in footer');
                if (onClose) {
                  onClose();
                } else {
                  console.warn('[PSODashboard] onClose handler is not provided');
                }
              }}
            >
              Close
            </button>
          )}
          <button
            className="flex h-fit box-content justify-center px-4 py-1.5 items-center bg-gray-200 text-black font-semibold rounded-lg shadow-md hover:bg-opacity-90 transition-opacity"
            onClick={() => {
              // Save plot functionality (to be implemented in future phases)
              console.log('Save plot clicked');
            }}
          >
            Save Plot
          </button>
        </div>
      </div>
    </div>
  );
}

export default PSODashboard;

