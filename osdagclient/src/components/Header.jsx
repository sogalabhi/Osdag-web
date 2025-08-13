import React from 'react';

const Header = ({ 
  leftDockOpen, 
  bottomDockOpen, 
  rightDockOpen, 
  onToggleLeftDock, 
  onToggleBottomDock, 
  onToggleRightDock 
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-white dark:bg-gray-900 text-gray-900 dark:text-white z-50 flex items-center justify-between px-4 shadow-lg border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
      {/* Left Side - Menu Bar */}
      <div className="flex items-center space-x-6">
        <nav className="flex space-x-4">
          <a href="#" className="hover:text-osdag-green dark:hover:text-osdag-green transition-colors duration-200 text-gray-700 dark:text-gray-300">File</a>
          <a href="#" className="hover:text-osdag-green dark:hover:text-osdag-green transition-colors duration-200 text-gray-700 dark:text-gray-300">Edit</a>
          <a href="#" className="hover:text-osdag-green dark:hover:text-osdag-green transition-colors duration-200 text-gray-700 dark:text-gray-300">Graphics</a>
          <a href="#" className="hover:text-osdag-green dark:hover:text-osdag-green transition-colors duration-200 text-gray-700 dark:text-gray-300">Database</a>
          <a href="#" className="hover:text-osdag-green dark:hover:text-osdag-green transition-colors duration-200 text-gray-700 dark:text-gray-300">Help</a>
        </nav>
      </div>

      {/* Right Side - Dock Toggle Buttons */}
      <div className="flex items-center space-x-2">
        {/* Left Dock Toggle */}
        <button
          onClick={onToggleLeftDock}
          className={`p-2 rounded transition-all duration-200 ${
            leftDockOpen 
              ? 'bg-osdag-green text-white shadow-lg' 
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-600'
          }`}
          title="Toggle Left Dock"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
        </button>

        {/* Bottom Dock Toggle */}
        <button
          onClick={onToggleBottomDock}
          className={`p-2 rounded transition-all duration-200 ${
            bottomDockOpen 
              ? 'bg-osdag-green text-white shadow-lg' 
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-600'
          }`}
          title="Toggle Bottom Dock"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zM3 16a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
          </svg>
        </button>

        {/* Right Dock Toggle */}
        <button
          onClick={onToggleRightDock}
          className={`p-2 rounded transition-all duration-200 ${
            rightDockOpen 
              ? 'bg-osdag-green text-white shadow-lg' 
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-600'
          }`}
          title="Toggle Right Dock"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
