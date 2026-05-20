import { useRef, useState, useEffect } from 'react';
import yaml from 'js-yaml';
import { useNavigate } from 'react-router-dom';
import { MODULE_ROUTES, MODULE_NAME_TO_KEY, CONNECTIONS_TAB_CONTENT, GENERIC_SUBMODULE_CONTENT } from '../../constants/modules';
import { apiClient } from '../../utils/apiClient';
import { isGuestUser } from '../../utils/auth';
import { useAuth } from '../../context/AuthContext';
import dayButton from '../../assets/homepage/day_button.svg';
import infoDefault from '../../assets/homepage/info_default.svg';
import infoHover from '../../assets/homepage/info_hover.svg';
import loadDefault from '../../assets/homepage/load_default.svg'
import loadHover from '../../assets/homepage/load_hover.svg';
import nightButton from '../../assets/homepage/night_button.svg';
import pluginDefault from '../../assets/homepage/plugin_default.svg';
import pluginHover from '../../assets/homepage/plugin_hover.svg';
import resourcesDefault from '../../assets/homepage/resources_default.svg';
import resourcesHover from '../../assets/homepage/resources_hover.svg';
import AboutOsdag from "./AboutOsdag";
import AskQuestion from "./AskQuestion";
import { useShortcutLayer } from '../../utils/shortcuts/ShortcutProvider';
import { SHORTCUT_ACTION_BY_ID } from '../../constants/shortcuts';
import XlsxImportTrigger from '../../modules/shared/components/XlsxImportTrigger';

const Header = ({ setshowSideBar, active }) => {
  const [isDark, setIsDark] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResourcesDropdown, setShowResourcesDropdown] = useState(false);
  const [showAboutDropdown, setShowAboutDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const fileInputRef = useRef(null);
  const xlsxInputRef = useRef(null);
  const navigate = useNavigate();
  const { logout, user: firebaseUser } = useAuth();
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showAskQuestion, setShowAskQuestion] = useState(false);

  // Check if user is a guest
  const isGuest = isGuestUser();

  // Get user display name and email
  const userDisplayName = firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || '';
  const userEmail = firebaseUser?.email || '';
  // Get initial: from displayName, or email first letter, or 'G' for guest
  const userInitial = userDisplayName
    ? userDisplayName[0].toUpperCase()
    : (isGuest ? 'G' : (userEmail ? userEmail[0].toUpperCase() : 'U'));

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
  };

  // Handle login navigation
  const handleLogin = () => {
    navigate('/');
  };

  const [projects, setProjects] = useState([]);
  const [modulesList, setModulesList] = useState([]);

  useEffect(() => {
    const dynamicModules = [];
    const extractModules = (contentObj, categoryName) => {
      Object.entries(contentObj).forEach(([key, sections]) => {
        sections.forEach(section => {
          section.options.forEach(opt => {
            dynamicModules.push({
              name: section.label || categoryName,
              type: opt.label,
              routeKey: opt.key,
              date: ''
            });
          });
        });
      });
    };
    extractModules(CONNECTIONS_TAB_CONTENT, 'Connection');
    extractModules(GENERIC_SUBMODULE_CONTENT, 'Generic Member');
    setModulesList(dynamicModules);
  }, []);

  useEffect(() => {
    if (isGuest || !searchQuery.trim()) {
      setProjects([]);
      return;
    }

    const fetchProjects = async () => {
      try {
        const res = await apiClient(`api/projects/?q=${encodeURIComponent(searchQuery)}`, { method: 'GET' });
        const data = await res.json();
        if (data.success) {
          const formatted = data.projects.map(p => {
            const moduleName = p.submodule || p.module;
            let routeKey = moduleName;
            if (!MODULE_ROUTES[routeKey]) {
              routeKey = MODULE_NAME_TO_KEY[moduleName] || moduleName;
            }
            return {
              id: p.id,
              name: p.name,
              type: p.module || p.submodule || 'Project',
              routeKey: routeKey,
              date: new Date(p.updated_at).toLocaleDateString()
            };
          });
          setProjects(formatted);
        }
      } catch (error) {
        console.error("Failed to search projects:", error);
      }
    };

    const timeoutId = setTimeout(fetchProjects, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, isGuest]);

  // Filter search results
  const getSearchResults = () => {
    if (!searchQuery.trim()) return { modules: [], projects: [] };

    const query = searchQuery.toLowerCase();
    const filteredModules = modulesList.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query)
    );


    return { modules: filteredModules, projects: projects };
  };

  useShortcutLayer({
    id: 'header-global-shortcuts',
    priority: 10,
    enabled: true,
    bindings: [
      {
        combos: SHORTCUT_ACTION_BY_ID['global.search.focus']?.shortcuts,
        when: () => !active,
        handler: () => {
          const searchInput = document.getElementById('search-input');
          if (!searchInput) return;
          searchInput.focus();
          setIsSearchFocused(true);
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID['global.dismiss']?.shortcuts,
        when: () => isSearchFocused,
        handler: () => {
          setIsSearchFocused(false);
          setSearchQuery('');
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID['global.theme.toggle']?.shortcuts,
        handler: () => {
          toggleTheme();
        },
      },
    ],
  });

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.search-container')) {
        setIsSearchFocused(false);
      }
      if (!e.target.closest('.resources-dropdown')) {
        setShowResourcesDropdown(false);
      }
      if (!e.target.closest('.about-dropdown')) {
        setShowAboutDropdown(false);
      }
      if (!e.target.closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const searchResults = getSearchResults();

  const fileMap = {
    Column: "Columns",
    Beam: "Beams",
    Channel: "Channels",
    Angle: "Angles",
    SHS: "SHS",
    RHS: "RHS",
    CHS: "CHS",
    "Download xlsx": "Beams" // Default template
  };

  const handleDownload = async (item) => {
    const tableName = fileMap[item];
    if (!tableName) {
      console.error('Unknown table:', item);
      return;
    }

    try {
      // Call the backend API to get the catalog export
      const response = await apiClient(
        `api/sections/catalog-export/?table=${tableName}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tableName}_Catalog.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const handleXlsxImport = async (file, tableName) => {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('table', tableName);

      const response = await apiClient('api/sections/import/', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Import successful!\nInserted: ${result.inserted}\nIgnored: ${result.ignored?.length || 0}\nRejected: ${result.rejected?.length || 0}`);
      } else {
        alert(`Import failed: ${result.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import file. Please try again.');
    }
  };

  return (
    <div className="border-osdag-border dark:border-gray-700">
      {/* Hidden file input for OSI import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".osi,.yaml,.yml,text/yaml,text/x-yaml,application/x-yaml"
        className="hidden"
        onChange={async (e) => {
          try {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const text = await file.text();
            const uiObj = yaml.load(text) || {};
            const moduleField = uiObj.Module || uiObj["Module"] || uiObj.module || uiObj["module"] || uiObj.inputs?.module || uiObj.inputs?.Module || uiObj.module_id;
            console.log("Parsed YAML:", uiObj);
            console.log("Detected Module Field:", moduleField);
            console.log("MODULE_NAME_TO_KEY matches:", MODULE_NAME_TO_KEY[moduleField.trim()]);

            if (!moduleField || typeof moduleField !== 'string') {
              alert('Unsupported or invalid OSI file: Module not found.');
              e.target.value = '';
              return;
            }
            const normalizedModule = moduleField.trim();
            // Resolve moduleKey and route
            let moduleKey = null;
            let route = MODULE_ROUTES[normalizedModule] || null;
            if (route) {
              moduleKey = normalizedModule;
            } else {
              moduleKey = MODULE_NAME_TO_KEY[normalizedModule] || null;
              route = moduleKey ? MODULE_ROUTES[moduleKey] : null;
            }
            if (!route) {
              alert(`Unsupported module in OSI: ${normalizedModule}`);
              e.target.value = '';
              return;
            }
            // Store raw uiObj for Phase 2 prefill
            try {
              if (moduleKey) {
                sessionStorage.setItem(`prefill:${moduleKey}`, JSON.stringify(uiObj));
              }
            } catch (_) { }
            navigate(route);
          } catch (err) {
            console.error('Failed to import OSI:', err);
            alert('Failed to import OSI. Please ensure the file is valid.');
          } finally {
            if (e?.target) e.target.value = '';
          }
        }}
      />
      {/* Hidden file input for XLSX import */}
      <input
        ref={xlsxInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            // For now, default to Beams table. In future, could show a dialog to select table
            await handleXlsxImport(file, 'Beams');
          }
          if (e?.target) e.target.value = '';
        }}
      />
      {/* Main Header */}
      <div className="px-4 sm:px-8 md:px-12 pb-8">
        <div className="flex items-center justify-between py-4 md:py-0">
          {/* Hamburger Menu Icon (Mobile/Tablet Only) */}
          <button
            className="block lg:hidden p-2 rounded-lg text-osdag-text-muted hover:text-osdag-text-primary focus:outline-none focus:ring-2 focus:ring-osdag-green"
            aria-label="Open menu"
            onClick={() => {
              setshowSideBar(true);
            }}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo and Branding */}
          <div className="flex-1 flex flex-col items-center lg:items-start md:flex-row md:items-end md:space-x-8">
            <div className="flex flex-col items-center lg:items-start">
              {/* Osdag Label - Light mode */}
              <img src="/images/Osdag_label.svg" alt="Osdag Logo" className="h-20 mt-2 dark:hidden" />
              {/* Osdag Label - Dark mode */}
              <img src="/images/Osdag_label_dark.svg" alt="Osdag Logo" className="h-20 mt-2 hidden dark:block" />
              {/* Osdag Tagline - Light mode */}
              <img src="/images/Osdag_tagline.svg" alt="Osdag Tagline" className="h-8 dark:hidden" />
              {/* Osdag Tagline - Dark mode */}
              <img src="/images/Osdag_tagline_dark.svg" alt="Osdag Tagline" className="h-8 hidden dark:block" />

            </div>
            {/* Icons (Mobile/Tablet: below logo, Desktop: right side) */}
            <div className="flex md:hidden mt-4 space-x-2">
              {/* Info Button */}
              <div className="relative group">
                <button className="p-3 text-osdag-text-muted hover:text-white dark:text-gray-400 dark:hover:text-white transition-all duration-300 hover:bg-osdag-green rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              {/* Settings Button */}
              <div className="relative group">
                <button className="p-3 text-osdag-text-muted hover:text-white dark:text-gray-400 dark:hover:text-white transition-all duration-300 hover:bg-osdag-green rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
              {/* Resources Button */}
              <div className="relative resources-dropdown group">
                <button
                  onClick={() => setShowResourcesDropdown(!showResourcesDropdown)}
                  className={`p-3 transition-all duration-300 rounded-xl ${showResourcesDropdown ? 'bg-osdag-green text-white' : 'text-osdag-text-muted hover:text-white hover:bg-osdag-green'
                    }`}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </button>
                {(showResourcesDropdown || false) && (
                  <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800/20 border border-osdag-border dark:border-gray-700 rounded-xl shadow-lg z-20 min-w-48 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="py-2">
                      <button className="w-full px-4 py-2 text-left text-osdag-text-primary  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Videos
                      </button>
                      <button className="w-full px-4 py-2 text-left text-osdag-text-primary  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Osi File
                      </button>
                      <button className="w-full px-4 py-2 text-left text-osdag-text-primary  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Documentation
                      </button>
                      <button className="w-full px-4 py-2 text-left text-osdag-text-primary  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Databases
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Documents Button */}
              <div className="relative group">
                <button className="p-3 text-osdag-text-muted hover:text-white dark:text-gray-400 dark:hover:text-white transition-all duration-300 hover:bg-osdag-green rounded-xl" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              </div>
              {/* Theme Toggle Button - Mobile */}
              <div className="relative group">
                <button
                  onClick={toggleTheme}
                  className="p-3 text-osdag-text-muted hover:text-white dark:text-gray-400 dark:hover:text-white transition-all duration-300 hover:bg-osdag-green rounded-xl"
                >
                  {isDark ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24px"
                      viewBox="0 -960 960 960"
                      width="24px"
                      fill="currentColor"
                      className="w-6 h-6"
                    >
                      <path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21.64 13.64a1 1 0 00-1.05-.24 8 8 0 01-10-10 1 1 0 00-.24-1.05A1 1 0 008.73 2 10 10 0 1022 15.27a1 1 0 00-.36-1.63z" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Profile Icon - Mobile */}
              <div className="relative profile-dropdown group">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-osdag-green text-white"
                >
                  <span className="font-semibold text-lg">
                    {userInitial}
                  </span>
                </button>
                {/* Dropdown */}
                {(showProfileDropdown || false) && (
                  <div className="absolute right-0 top-full mt-2 bg-white dark:bg-black/70 border border-osdag-border dark:border-osdag-green rounded-xl shadow-lg z-20 min-w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                    {isGuest ? (
                      <>
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-osdag-green/30">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Guest User
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Continue as guest or log in
                          </p>
                        </div>
                        <div className="py-2">
                          <button onClick={handleLogin} className="w-full px-4 py-2 text-left text-osdag-green hover:bg-osdag-green/10 dark:hover:bg-osdag-green/20 transition-colors">
                            Login
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-osdag-green/30">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {userDisplayName || userEmail.split('@')[0]}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {userEmail}
                          </p>
                        </div>
                        <div className="py-2">
                          <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-osdag-green hover:bg-osdag-green/10 dark:hover:bg-osdag-green/20 transition-colors">
                            Logout
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Icons */}
          <div className="hidden md:flex items-center space-x-1 mb-6 border-black p-2 dark:bg-osdag-dark-color justify-center" >
            <div className="relative about-dropdown group ">
              <button
                onClick={() => setShowAboutDropdown(!showAboutDropdown)}
                className={`p-3 transition-all duration-300 group-hover:px-6 border border-black ${showAboutDropdown
                  ? 'bg-osdag-green text-white'
                  : 'text-black dark:text-white  hover:text-white hover:bg-osdag-green'
                  }`}
              >
                <div className="group flex items-center space-x-2">
                  <div className="relative w-6 h-6">
                    {/* Default icon */}
                    <img
                      src={infoDefault}
                      alt="Info"
                      className="absolute inset-0 w-6 h-6 opacity-100 group-hover:opacity-0 transition-opacity duration-200"
                    />
                    {/* Hover icon */}
                    <img
                      src={infoHover}
                      alt="Info Hover"
                      className="absolute inset-0 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    />
                  </div>
                  <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transition-all duration-300 w-0 group-hover:w-auto overflow-hidden">
                    Info
                  </span>
                </div>
              </button>
              {(showAboutDropdown || false) && (
                <div className="absolute top-full bg-white dark:bg-black/70 border border-osdag-border dark:border-osdag-green shadow-lg z-20 min-w-48 animate-in fade-in duration-200">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowAbout(true);
                        setShowAboutDropdown(false); // close dropdown
                      }}
                      className="w-full px-4 py-2 hover:bg-osdag-green hover:text-white whitespace-nowrap text-left"
                    >
                      About Osdag
                    </button>
                    <button
                      onClick={() => {
                        setShowAskQuestion(true);
                        setShowAboutDropdown(false); // close dropdown
                      }}
                      className="w-full px-4 py-2 hover:bg-osdag-green hover:text-white whitespace-nowrap text-left">
                      Ask us a question
                    </button>
                  </div>
                </div>
              )}
              {showAbout && (
                <AboutOsdag onClose={() => setShowAbout(false)} />
              )}
              {showAskQuestion && (
                <AskQuestion onClose={() => setShowAskQuestion(false)} />
              )}
            </div>

            {/* Resources Button with Dropdown */}
            <div className="relative resources-dropdown group ">
              <button
                onClick={() => setShowResourcesDropdown(!showResourcesDropdown)}
                className={`p-3 transition-all duration-300 group-hover:px-6 border border-black ${showResourcesDropdown
                  ? 'bg-osdag-green text-white'
                  : 'text-black dark:text-white hover:text-white hover:bg-osdag-green'
                  }`}
              >
                <div className="group flex items-center space-x-2">
                  <div className="relative w-6 h-6">
                    {/* Default icon */}
                    <img
                      src={resourcesDefault}
                      alt="Resources"
                      className="w-6 h-6 block group-hover:hidden"
                    />

                    {/* Hover icon */}
                    <img
                      src={resourcesHover}
                      alt="Resources Hover"
                      className="w-6 h-6 hidden group-hover:block"
                    />
                  </div>
                  <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 w-0 group-hover:w-auto overflow-hidden whitespace-nowrap">
                    Resources
                  </span>
                </div>
              </button>
              {(showResourcesDropdown || false) && (
                <div className="absolute top-full bg-white dark:bg-black/70 border border-osdag-border dark:border-osdag-green shadow-lg z-20 min-w-64 animate-in fade-in slide-in-from-top-2 duration-200 whitespace-nowrap">
                  <div className="py-2">
                    <ul className="py-1 text-sm text-gray-800">

                      <li className="px-4 py-2 hover:bg-osdag-green hover:text-white cursor-pointer whitespace-nowrap text-left"
                        onMouseEnter={() => setActiveSubmenu(null)}
                      >
                        Design Examples
                      </li>
                      <li className="relative"
                        onMouseEnter={() => setActiveSubmenu("database")}
                        onMouseLeave={() => setActiveSubmenu(null)}
                      >
                        <div className="px-4 py-2 hover:bg-osdag-green hover:text-white cursor-pointer whitespace-nowrap text-left">
                          Databases (IS 808:2021)
                          <span className="ml-2 text-right">›</span>
                        </div>

                        {/* Submenu */}
                        {activeSubmenu === "database" && (
                          <div className="absolute left-full top-0 ml-1 w-24 bg-white border border-osdag-border shadow-md">
                            {["Column", "Beam", "Channel", "Angle"].map(item => (
                              <div
                                key={item}
                                onClick={() => handleDownload(item)}
                                className="px-4 py-2 hover:bg-osdag-green hover:text-white cursor-pointer whitespace-nowrap text-left"
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                      <li className="relative"
                        onMouseEnter={() => setActiveSubmenu("is4923")}
                        onMouseLeave={() => setActiveSubmenu(null)}
                      >
                        <div className="px-4 py-2 hover:bg-osdag-green hover:text-white cursor-pointer whitespace-nowrap text-left">
                          Databases (IS 4923:2017)
                          <span className="ml-2">›</span>
                        </div>

                        {/* Submenu */}
                        {activeSubmenu === "is4923" && (
                          <div className="absolute left-full top-0 ml-1 w-20 bg-white border border-osdag-border shadow-md">
                            {["SHS", "RHS"].map(item => (
                              <div
                                key={item}
                                onClick={() => handleDownload(item)}
                                className="px-4 py-2 hover:bg-osdag-green hover:text-white cursor-pointer whitespace-nowrap text-center flex items-center justify-center"
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                      <li className="relative"
                        onMouseEnter={() => setActiveSubmenu("is1161")}
                        onMouseLeave={() => setActiveSubmenu(null)}
                      >
                        <div className="px-4 py-2 hover:bg-osdag-green hover:text-white cursor-pointer whitespace-nowrap text-left">
                          Databases (IS 1161:2014)
                          <span className="ml-2">›</span>
                        </div>

                        {/* Submenu */}
                        {activeSubmenu === "is1161" && (
                          <div className="absolute left-full top-0 ml-1 w-20 bg-white border border-osdag-border shadow-md">
                            {["CHS"].map(item => (
                              <div
                                key={item}
                                onClick={() => handleDownload(item)}
                                className="px-4 py-2 hover:bg-osdag-green hover:text-white cursor-pointer whitespace-nowrap text-center flex items-center justify-center"
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                      <li className="relative"
                        onMouseEnter={() => setActiveSubmenu("customdb")}
                        onMouseLeave={() => setActiveSubmenu(null)}
                      >
                        <div className="px-4 py-2 hover:bg-osdag-green hover:text-white cursor-pointer whitespace-nowrap text-left">
                          Custom Database
                          <span className="ml-2">›</span>
                        </div>

                        {/* Submenu */}
                        {activeSubmenu === "customdb" && (
                          <div className="absolute left-full top-0 ml-1 w-32 bg-white border border-osdag-border shadow-md">
                            <div onClick={() => handleDownload("Download xlsx")} className="px-4 py-2 hover:bg-osdag-green hover:text-white cursor-pointer whitespace-nowrap text-center flex items-center justify-center">
                              Download xlsx
                            </div>
                            <XlsxImportTrigger>
                              {({ trigger }) => (
                                <div
                                  className="px-4 py-2 hover:bg-osdag-green hover:text-white cursor-pointer whitespace-nowrap text-center flex items-center justify-center"
                                  onClick={trigger}
                                >
                                  Import xlsx
                                </div>
                              )}
                            </XlsxImportTrigger>
                          </div>
                        )}
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
            {/* Settings Button */}
            <div className="relative group">
              <button className="p-3 text-black dark:text-white hover:text-white dark:hover:text-white bg-white border border-black transition-all duration-300 hover:bg-osdag-green group-hover:px-6">
                <div className="flex items-center space-x-2">
                  <div className="relative w-6 h-6">
                    {/* Default icon */}
                    <img
                      src={pluginDefault}
                      alt="Plugin"
                      className="w-6 h-6 block group-hover:hidden"
                    />

                    {/* Hover icon */}
                    <img
                      src={pluginHover}
                      alt="Plugin Hover"
                      className="w-6 h-6 hidden group-hover:block"
                    />
                  </div>
                  <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 w-0 group-hover:w-auto overflow-hidden whitespace-nowrap">
                    Plugins
                  </span>
                </div>
              </button>
              <div
                className="absolute left-1/2 -translate-x-1/2 top-full mt-2
               opacity-0 group-hover:opacity-100
               transition-opacity duration-300
               bg-white text-black text-xs px-2 py-1
               border border-gray-300 shadow-sm
               whitespace-nowrap pointer-events-none"
              >
                Under Development
              </div>
            </div>
            {/* Documents Button */}
            <div className="relative group">
              <button className="p-3 text-black dark:text-white hover:text-white bg-white border border-black transition-all duration-300 hover:bg-osdag-green group-hover:px-6" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                <div className="flex items-center space-x-2">
                  <div className="relative w-6 h-6">
                    {/* Default icon */}
                    <img
                      src={loadDefault}
                      alt="Load"
                      className="w-6 h-6 block group-hover:hidden"
                    />

                    {/* Hover icon */}
                    <img
                      src={loadHover}
                      alt="Load Hover"
                      className="w-6 h-6 hidden group-hover:block"
                    />
                  </div>
                  <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 w-0 group-hover:w-auto overflow-hidden whitespace-nowrap">
                    Import
                  </span>
                </div>
              </button>
            </div>
            {/* Theme Toggle Button */}
            <div className="relative group">
              <button
                onClick={toggleTheme}
                disabled
                className="p-2 text-black transition-colors dark:text-white opacity-50 cursor-not-allowed"
              >
                <div className="relative w-6 h-6">
                  {/* Default icon */}
                  <img
                    src={dayButton}
                    alt="Day"
                    className="w-6 h-6 block group-hover:block"
                  />

                  {/* Hover icon */}
                  <img
                    src={nightButton}
                    alt="Night Hover"
                    className="w-6 h-6 hidden group-hover:block"
                  />
                </div>
              </button>
              <div
                className="absolute left-1/2 -translate-x-1/2 top-full mt-2
               opacity-0 group-hover:opacity-100
               transition-opacity duration-300
               bg-white text-black text-xs px-2 py-1
               border border-gray-300 shadow-sm
               whitespace-nowrap pointer-events-none"
              >
                Under Development
              </div>
            </div>
          </div>
          {/* user details, logout */}
          <div className="relative profile-dropdown group hidden md:flex items-center space-x-1 mb-6 border-black p-2 rounded-lg justify-center">
            {/* Avatar Button */}
            <div className="flex items-center justify-center">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-osdag-green text-white"
              >
                <span className="font-semibold text-lg">
                  {userInitial}
                </span>
              </button>
            </div>


            {/* Dropdown */}
            {(showProfileDropdown || false) && (
              <div className="absolute right-0 top-full mt-2 bg-white dark:bg-black/70 border border-osdag-border dark:border-osdag-green rounded-xl shadow-lg z-20 min-w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                {isGuest ? (
                  <>
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-osdag-green/30">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Guest User
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Continue as guest or log in
                      </p>
                    </div>
                    <div className="py-2">
                      <button onClick={handleLogin} className="w-full px-4 py-2 text-left text-osdag-green hover:bg-osdag-green/10 dark:hover:bg-osdag-green/20 transition-colors">
                        Login
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-osdag-green/30">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {userDisplayName || userEmail.split('@')[0]}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {userEmail}
                      </p>
                    </div>
                    <div className="py-2">
                      <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-osdag-green hover:bg-osdag-green/10 dark:hover:bg-osdag-green/20 transition-colors">
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>


        </div>
      </div>
      {/* Search Section */}
      {!active && <div className="px-12 pb-8 dark:bg-osdag-dark-color">
        <div className="flex items-center justify-center">
          <div className="relative w-search search-container">
            <div className="absolute inset-y-0 left-5 flex items-center space-x-3">
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-md px-2 py-1">
                <span className="text-osdag-text-muted text-xs font-medium">Ctrl</span>
                <span className="text-osdag-text-muted text-xs">+</span>
                <span className="text-osdag-text-muted text-xs font-medium">K</span>
              </div>
            </div>
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules or projects..."
              className={`w-full pl-24 pr-20 py-4 bg-gray-50 dark:bg-gray-800/20 border border-osdag-border dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-osdag-green focus:border-transparent text-osdag-text-primary  placeholder-osdag-text-muted text-base shadow-search transition-all ${isSearchFocused ? 'ring-2 ring-osdag-green' : ''
                }`}
              onFocus={() => {
                setIsSearchFocused(true);
              }}
              onBlur={(e) => {
                // Don't blur if clicking within the search results
                if (!e.currentTarget.closest('.search-container').contains(e.relatedTarget)) {
                  setTimeout(() => setIsSearchFocused(false), 100);
                }
              }}
            />
            <div className="absolute inset-y-0 right-5 flex items-center space-x-3">
              <button className="p-2 text-osdag-text-muted hover:text-osdag-text-secondary dark:hover:text-gray-300 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

            </div>

            {/* Search Results Modal */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-osdag-dark-color border border-osdag-border dark:border-gray-700 rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto scrollbar-thin">
                {searchQuery.trim() ? (
                  <>
                    {/* Modules Section */}
                    {searchResults.modules.length > 0 && (
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-osdag-text-secondary dark:text-gray-400 mb-3">Modules</h3>
                        <div className="space-y-2">
                          {searchResults.modules.map((item, index) => (
                            <div key={index}
                              onClick={() => {
                                const route = MODULE_ROUTES[item.routeKey];
                                if (route) {
                                  navigate(route);
                                  setIsSearchFocused(false);
                                  setSearchQuery('');
                                }
                              }}
                              className="p-3 hover:bg-osdag-green/5 rounded-xl cursor-pointer transition-colors group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-osdag-green/10 rounded-lg flex items-center justify-center">
                                    <span className="text-osdag-green font-semibold text-sm">L</span>
                                  </div>
                                  <div>
                                    <div className="text-osdag-text-primary  font-medium text-sm">
                                      {item.name}
                                    </div>
                                    <div className="text-osdag-text-secondary dark:text-gray-400 text-xs">
                                      {item.type}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-osdag-text-muted text-xs">{item.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects Section */}
                    {searchResults.projects.length > 0 && (
                      <div className="p-4 border-t border-osdag-border dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-osdag-text-secondary dark:text-gray-400 mb-3">Projects</h3>
                        <div className="space-y-2">
                          {searchResults.projects.map((item, index) => (
                            <div key={index}
                              onClick={() => {
                                const route = MODULE_ROUTES[item.routeKey];
                                if (route) {
                                  navigate(`${route}/${item.id}`);
                                } else {
                                  navigate(`/home`);
                                }
                                setIsSearchFocused(false);
                                setSearchQuery('');
                              }}
                              className="p-3 hover:bg-osdag-green/5 rounded-xl cursor-pointer transition-colors group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-osdag-green/10 rounded-lg flex items-center justify-center">
                                    <span className="text-osdag-green font-semibold text-sm">L</span>
                                  </div>
                                  <div>
                                    <div className="text-osdag-text-primary  font-medium text-sm">
                                      {item.name}
                                    </div>
                                    <div className="text-osdag-text-secondary dark:text-gray-400 text-xs">
                                      {item.type}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-osdag-text-muted text-xs">{item.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Results */}
                    {searchResults.modules.length === 0 && searchResults.projects.length === 0 && (
                      <div className="p-8 text-center">
                        <div className="text-osdag-text-muted dark:text-gray-500">
                          No results found for "{searchQuery}"
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-osdag-text-muted dark:text-gray-500 ">
                      Start typing to search modules and projects...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>}
    </div>
  );
};

export default Header; 
