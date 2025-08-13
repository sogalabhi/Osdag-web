import React from 'react';

const Logs = ({ logs }) => {
  // Ensure logs is always an array, even if null/undefined is passed
  const safeLogs = logs || [];
  // Reverse the logs so that the most recent log appears at the top
  const reversedLogs = [...safeLogs].reverse();
  return (
    <div className="h-full bg-white p-4 font-mono text-sm overflow-y-auto">
      <div className="mb-4 pb-2 border-b border-gray-700">
        <h3 className="text-lg font-semibold ">System Logs</h3>
      </div>
      
      {reversedLogs.length === 0 ? (
        <div className="italic">
          No logs available. System logs will appear here during operation.
        </div>
      ) : (
        <div className="space-y-2">
          {reversedLogs.map((log, index) => {
            // Handle different log formats
            let logType = 'info';
            let logMessage = '';
            
            if (typeof log === 'object' && log !== null) {
              // Handle log object with msg and type properties
              logType = log.type || 'info';
              logMessage = log.msg || JSON.stringify(log);
            } else if (typeof log === 'string') {
              // Handle string logs
              logMessage = log;
            } else {
              // Handle other types
              logMessage = String(log);
            }
            
            return (
              <div key={index} className="flex items-start space-x-2">
                <span className={`${
                  logType === 'error' ? 'text-red-400' : 
                  logType === 'warning' ? 'text-yellow-400' : 
                  logType === 'success' ? 'text-green-400' : 
                  'text-blue-400'
                }`}>
                  [{logType.toUpperCase()}]
                </span>
                <span className={`break-words align-left${logMessage === '=== End Of Design ===' ? ' text-osdag-green' : ''}`}>
                  {logMessage}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Logs;