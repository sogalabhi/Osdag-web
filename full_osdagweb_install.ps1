# ===============================================================
# ========== OSDAG-WEB INSTALLATION HELPER ============
# ===============================================================
# This script helps you set up PostgreSQL and other dependencies
# for the Osdag-web application on Windows.
# How to use: Run this script in PowerShell by right-clicking and 
# selecting "Run with PowerShell" or copy and paste into PowerShell.

# === GLOBAL VARS ===
$pgVersion = "16"
$pgPassword = ConvertTo-SecureString "password" -AsPlainText -Force  # Using "password" as requested
$installDir = "C:\Program Files\PostgreSQL\$pgVersion"  # Standard installation path
$installerPath = "$env:TEMP\postgresql-$pgVersion.exe"
$gitInstallerPath = "$env:TEMP\git-installer.exe"
$vcBuildToolsInstallerPath = "$env:TEMP\vs_buildtools.exe"
$pythonInstallerPath = "$env:TEMP\python-installer.exe"

# === STEP 1: System Compatibility Check ===
function Step-SystemCompatibilityCheck {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 1: SYSTEM COMPATIBILITY CHECK         ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    
    Write-Host "`n?? Checking system compatibility for Osdag-web..."
    
    # Check OS version
    $osInfo = Get-WmiObject -Class Win32_OperatingSystem
    $osCaption = $osInfo.Caption
    $osArch = $osInfo.OSArchitecture
    $osVersion = [Environment]::OSVersion.Version
    
    Write-Host "?? Operating System: $osCaption ($osArch)" -ForegroundColor Yellow
    Write-Host "   Version: $($osVersion.Major).$($osVersion.Minor).$($osVersion.Build)" -ForegroundColor Yellow
    
    $osCompatible = $false
    if ($osVersion.Major -ge 10) {
        Write-Host "? OS Compatible: Windows 10 or later detected" -ForegroundColor Green
        $osCompatible = $true
    } elseif ($osVersion.Major -eq 6 -and $osVersion.Minor -ge 1) {
        Write-Host "?? OS Partially Compatible: Windows 7/8/8.1 detected" -ForegroundColor Yellow
        Write-Host "   Some features may not work correctly. Windows 10 or later recommended." -ForegroundColor Yellow
        $osCompatible = $true
    } else {
        Write-Host "? OS Not Compatible: Osdag-web requires Windows 7 or later" -ForegroundColor Red
        $osCompatible = $false
    }
    
    # Check CPU
    $processor = Get-WmiObject -Class Win32_Processor
    $cpuName = $processor.Name
    $cpuCores = $processor.NumberOfCores
    $cpuLogicalProcs = $processor.NumberOfLogicalProcessors
    
    Write-Host "`n?? CPU: $cpuName" -ForegroundColor Yellow
    Write-Host "   Cores: $cpuCores, Logical Processors: $cpuLogicalProcs" -ForegroundColor Yellow
    
    $cpuCompatible = $false
    if ($cpuCores -ge 2) {
        Write-Host "? CPU Compatible: $cpuCores cores (2+ recommended)" -ForegroundColor Green
        $cpuCompatible = $true
    } else {
        Write-Host "?? CPU Below Recommended: $cpuCores core(s) detected (2+ recommended)" -ForegroundColor Yellow
        Write-Host "   Performance may be slow with complex calculations" -ForegroundColor Yellow
        $cpuCompatible = $true
    }
    
    # Check RAM
    $computersystem = Get-WmiObject -Class Win32_ComputerSystem
    $ramGB = [math]::Round($computersystem.TotalPhysicalMemory / 1GB, 2)
    
    Write-Host "`n?? Memory: $ramGB GB RAM" -ForegroundColor Yellow
    
    $ramCompatible = $false
    if ($ramGB -ge 8) {
        Write-Host "? Memory Compatible: $ramGB GB (8+ GB recommended)" -ForegroundColor Green
        $ramCompatible = $true
    } elseif ($ramGB -ge 4) {
        Write-Host "?? Memory Below Recommended: $ramGB GB detected (8+ GB recommended)" -ForegroundColor Yellow
        Write-Host "   Performance may be slow with complex models" -ForegroundColor Yellow
        $ramCompatible = $true
    } else {
        Write-Host "? Memory Not Compatible: $ramGB GB detected (4+ GB required)" -ForegroundColor Red
        $ramCompatible = $false
    }
    
    # Check disk space
    $systemDrive = $env:SystemDrive
    $driveInfo = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='$systemDrive'"
    $freeSpaceGB = [math]::Round($driveInfo.FreeSpace / 1GB, 2)
    
    Write-Host "`n?? Disk Space: $freeSpaceGB GB free on $systemDrive" -ForegroundColor Yellow
    
    $diskCompatible = $false
    if ($freeSpaceGB -ge 10) {
        Write-Host "? Disk Space Compatible: $freeSpaceGB GB free (10+ GB recommended)" -ForegroundColor Green
        $diskCompatible = $true
    } elseif ($freeSpaceGB -ge 5) {
        Write-Host "?? Disk Space Below Recommended: $freeSpaceGB GB free (10+ GB recommended)" -ForegroundColor Yellow
        Write-Host "   You may run out of space during installation" -ForegroundColor Yellow
        $diskCompatible = $true
    } else {
        Write-Host "? Disk Space Not Compatible: $freeSpaceGB GB free (5+ GB required)" -ForegroundColor Red
        $diskCompatible = $false
    }
    
    # Check if PowerShell is running as Administrator
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    Write-Host "`n?? Administrator Privileges: $(if ($isAdmin) { "Yes" } else { "No" })" -ForegroundColor Yellow
    
    if ($isAdmin) {
        Write-Host "? PowerShell is running as Administrator" -ForegroundColor Green
    } else {
        Write-Host "?? PowerShell is NOT running as Administrator" -ForegroundColor Yellow
        Write-Host "   Some steps may fail without admin privileges" -ForegroundColor Yellow
        Write-Host "   Consider restarting script by right-clicking PowerShell and selecting 'Run as Administrator'" -ForegroundColor Yellow
    }

    # Check for internet connectivity
    $hasInternet = $false
    try {
        $testConnection = Test-Connection -ComputerName "www.google.com" -Count 1 -ErrorAction Stop
        $hasInternet = $true
        Write-Host "`n?? Internet Connection: Available" -ForegroundColor Yellow
        Write-Host "? Internet connectivity verified" -ForegroundColor Green
    } catch {
        Write-Host "`n?? Internet Connection: Not Available" -ForegroundColor Yellow
        Write-Host "? Internet connection not detected" -ForegroundColor Red
        Write-Host "   Internet is required for downloading installation files" -ForegroundColor Red
        $hasInternet = $false
    }
    
    # Summary
    Write-Host "`n?? COMPATIBILITY SUMMARY:" -ForegroundColor Yellow
    Write-Host "-------------------------------------" -ForegroundColor DarkGray
    Write-Host "OS Compatibility:      $(if ($osCompatible) { "? Compatible" } else { "? Not Compatible" })" -ForegroundColor $(if ($osCompatible) { "Green" } else { "Red" })
    Write-Host "CPU Compatibility:     $(if ($cpuCompatible) { "? Compatible" } else { "? Not Compatible" })" -ForegroundColor $(if ($cpuCompatible) { "Green" } else { "Red" })
    Write-Host "Memory Compatibility:  $(if ($ramCompatible) { "? Compatible" } else { "? Not Compatible" })" -ForegroundColor $(if ($ramCompatible) { "Green" } else { "Red" })
    Write-Host "Disk Compatibility:    $(if ($diskCompatible) { "? Compatible" } else { "? Not Compatible" })" -ForegroundColor $(if ($diskCompatible) { "Green" } else { "Red" })
    Write-Host "Admin Privileges:      $(if ($isAdmin) { "? Yes" } else { "?? No (Some steps may fail)" })" -ForegroundColor $(if ($isAdmin) { "Green" } else { "Yellow" })
    Write-Host "Internet Connection:   $(if ($hasInternet) { "? Available" } else { "? Not Available" })" -ForegroundColor $(if ($hasInternet) { "Green" } else { "Red" })
    Write-Host "-------------------------------------" -ForegroundColor DarkGray
    
    $allCompatible = $osCompatible -and $cpuCompatible -and $ramCompatible -and $diskCompatible -and $hasInternet
    
    if ($allCompatible) {
        Write-Host "`n? Your system meets all requirements for Osdag-web!" -ForegroundColor Green
        Write-Host "You can proceed with the installation." -ForegroundColor Green
    } elseif ($osCompatible -and $cpuCompatible -and $hasInternet) {
        Write-Host "`n?? Your system meets the minimum requirements, but some issues were detected." -ForegroundColor Yellow
        Write-Host "You can proceed, but performance or reliability may be affected." -ForegroundColor Yellow
    } else {
        Write-Host "`n? Your system does not meet the requirements for Osdag-web." -ForegroundColor Red
        Write-Host "Please address the issues marked above before proceeding." -ForegroundColor Red
    }
    
    return $allCompatible
}

# === STEP 2: Download Python and add to PATH ===
function Step-DownloadAndInstallPython {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 2: DOWNLOAD AND INSTALL PYTHON        ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    
    # Check if Python is already installed
    $pythonInstalled = $false
    $pythonVersion = $null
    $pythonPath = $null
    
    try {
        $pythonInfo = & python --version 2>&1
        if ($pythonInfo -match "Python (\d+\.\d+\.\d+)") {
            $pythonVersion = $matches[1]
            $pythonInstalled = $true
            
            # Find Python path
            $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
            if ($pythonCommand) {
                $pythonPath = Split-Path -Parent $pythonCommand.Source
            }
            
            Write-Host "? Python is already installed!" -ForegroundColor Green
            Write-Host "   Version: $pythonVersion" -ForegroundColor Green
            if ($pythonPath) {
                Write-Host "   Path: $pythonPath" -ForegroundColor Green
            }
            
            # Check if it's Python 3.13 (latest recommended version)
            if ($pythonVersion -match "^3\.13\.") {
                Write-Host "? Installed Python version is 3.13.x (latest recommended version)" -ForegroundColor Green
            } else {
                Write-Host "?? Installed Python version is $pythonVersion (3.13.x is the latest recommended version)" -ForegroundColor Yellow
                $reinstall = Read-Host "Would you like to install Python 3.13 anyway? (y/n)"
                if ($reinstall -ne "y") {
                    Write-Host "Continuing with existing Python installation." -ForegroundColor Yellow
                    return $true
                } else {
                    $pythonInstalled = $false
                }
            }
        }
    } catch {
        Write-Host "? Python is not installed or not in PATH." -ForegroundColor Red
        $pythonInstalled = $false
    }
    
    if ($pythonInstalled) {
        # Check if Python is in system PATH
        $systemPath = [Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::Machine)
        $userPath = [Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::User)
        
        $pythonInSystemPath = $systemPath -like "*$pythonPath*"
        $pythonInUserPath = $userPath -like "*$pythonPath*"
        
        if (-not ($pythonInSystemPath -or $pythonInUserPath)) {
            Write-Host "`n?? Python is installed but not in system PATH." -ForegroundColor Yellow
            $addToPath = Read-Host "Do you want to add Python to system PATH? This will make Python available from any terminal. (y/n)"
            
            if ($addToPath -eq "y") {
                try {
                    # Add to user PATH
                    $newUserPath = "$userPath;$pythonPath;$pythonPath\Scripts"
                    [Environment]::SetEnvironmentVariable("Path", $newUserPath, [System.EnvironmentVariableTarget]::User)
                    
                    Write-Host "? Python added to user PATH successfully!" -ForegroundColor Green
                    Write-Host "?? You'll need to restart your terminal for changes to take effect." -ForegroundColor Yellow
                    
                    # Update current session PATH
                    $env:Path = "$env:Path;$pythonPath;$pythonPath\Scripts"
                }
                catch {
                    Write-Host "? Failed to add Python to PATH: $($_.Exception.Message)" -ForegroundColor Red
                    Write-Host "Try running this script as Administrator or manually add Python to PATH." -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "? Python is correctly included in system PATH." -ForegroundColor Green
        }
        
        return $true
    }
    
    # Python not installed, proceed with download and installation
    Write-Host "`n?? Downloading latest Python installer..." -ForegroundColor Cyan
    
    # URL for latest Python installer (Windows 64-bit)
    $pythonUrl = "https://www.python.org/ftp/python/3.13.3/python-3.13.3-amd64.exe"
    
    try {
        # Download Python installer
        Write-Host "?? Downloading from: $pythonUrl"
        Write-Host "?? Saving to: $pythonInstallerPath"
        
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($pythonUrl, $pythonInstallerPath)
        
        if (Test-Path $pythonInstallerPath) {
            Write-Host "? Python installer downloaded successfully!" -ForegroundColor Green
            
            Write-Host "`n?? INSTALLATION INSTRUCTIONS:" -ForegroundColor Yellow
            Write-Host "------------------------------------------------" -ForegroundColor DarkGray
            Write-Host "1?? Make sure to check these options:" -ForegroundColor White
            Write-Host "   ? Install launcher for all users (recommended)" -ForegroundColor Cyan
            Write-Host "   ? Add Python 3.13 to PATH" -ForegroundColor Cyan
            Write-Host "   ?? The 'Add Python to PATH' option is ESSENTIAL" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "2?? Choose 'Customize installation'" -ForegroundColor White
            Write-Host "   ? Select all optional features" -ForegroundColor Cyan
            Write-Host "   ? Install for all users (requires admin)" -ForegroundColor Cyan
            Write-Host "   ? Add Python to environment variables" -ForegroundColor Cyan
            Write-Host "   ? Create shortcuts for installed applications" -ForegroundColor Cyan
            Write-Host "------------------------------------------------" -ForegroundColor DarkGray
            
            $launchInstaller = Read-Host "`nLaunch the Python installer now? (y/n)"
            if ($launchInstaller -eq "y") {
                Write-Host "?? Launching Python installer..." -ForegroundColor Cyan
                Write-Host "?? Please follow the installation instructions above carefully." -ForegroundColor Yellow
                
                Start-Process -FilePath $pythonInstallerPath -ArgumentList "/passive", "InstallAllUsers=1", "PrependPath=1", "Include_test=0" -Wait
                
                Write-Host "`n? Python installation process completed!" -ForegroundColor Green
                
                # Verify Python installation
                try {
                    # Refresh PATH to include newly installed Python
                    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
                    
                    $pythonVersion = & python --version 2>&1
                    if ($pythonVersion -match "Python (\d+\.\d+\.\d+)") {
                        Write-Host "? Python installed successfully: $pythonVersion" -ForegroundColor Green
                        
                        # Check if pip is installed
                        $pipVersion = & pip --version 2>&1
                        if ($pipVersion -match "pip (\d+\.\d+)") {
                            Write-Host "? pip installed: $pipVersion" -ForegroundColor Green
                        }
                    } else {
                        Write-Host "?? Python installation may have completed, but Python is not in PATH." -ForegroundColor Yellow
                        Write-Host "Please restart your terminal or computer before proceeding." -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "?? Python installation was completed, but verification failed." -ForegroundColor Yellow
                    Write-Host "Please restart your terminal or computer before proceeding." -ForegroundColor Yellow
                }
            } else {
                Write-Host "`n?? You can run the installer later from:" -ForegroundColor Yellow
                Write-Host $pythonInstallerPath -ForegroundColor White
            }
        } else {
            throw "Download completed but installer not found"
        }
    } catch {
        Write-Host "? Error downloading or installing Python: $($_.Exception.Message)" -ForegroundColor Red
        
        # Provide manual installation instructions
        Write-Host "`n?? MANUAL INSTALLATION INSTRUCTIONS:" -ForegroundColor Yellow
        Write-Host "1. Visit https://www.python.org/downloads/" -ForegroundColor White
        Write-Host "2. Download 'Windows installer (64-bit)'" -ForegroundColor White
        Write-Host "3. Run the installer and make sure to check 'Add Python to PATH'" -ForegroundColor White
        Write-Host "4. After installation, restart your terminal or computer" -ForegroundColor White
        
        return $false
    }
    
    Write-Host "`n? Step 2 completed! Python is now set up for your Osdag-web project." -ForegroundColor Green
    return $true
}

# === STEP 3: Navigate to Project Directory ===
function Step-NavigateToDirectory {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 3: NAVIGATE TO PROJECT DIRECTORY       ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    
    # Show current directory first
    $initialDirectory = Get-Location
    Write-Host "`n?? CURRENT LOCATION: $initialDirectory" -ForegroundColor Yellow
    Write-Host "This is your starting point. If you need to resume later, navigate here first.`n"
    
    Write-Host "?? Let's set up your Osdag-web project location."
    
    # Project selection options
    Write-Host "`n?? Would you like to create a new project or navigate to an existing one?" -ForegroundColor Yellow
    Write-Host "1. Create a new project (recommended for first-time setup)"
    Write-Host "2. Navigate to an existing project"
    
    $projectChoice = Read-Host "Enter your choice (1-2)"
    
    # Handle existing project navigation
    if ($projectChoice -eq "2") {
        Write-Host "`n?? Please provide the path to your existing Osdag-web project."
        Write-Host "Example paths:" -ForegroundColor Yellow
        Write-Host "  ? C:\Users\YourName\Desktop\osdag_project" -ForegroundColor DarkGray
        Write-Host "  ? D:\Projects\osdag_web_installation" -ForegroundColor DarkGray
        
        $existingPath = Read-Host "Enter the full path to your existing project"
        
        if ([string]::IsNullOrWhiteSpace($existingPath)) {
            Write-Host "? No path provided. Defaulting to creating a new project." -ForegroundColor Red
            $projectChoice = "1"
        }
        elseif (-not (Test-Path $existingPath)) {
            Write-Host "? The specified path does not exist: $existingPath" -ForegroundColor Red
            $createPath = Read-Host "Would you like to create this directory? (y/n)"
            if ($createPath -eq "y") {
                try {
                    New-Item -Path $existingPath -ItemType Directory | Out-Null
                    Write-Host "? Created directory: $existingPath" -ForegroundColor Green
                    $projectPath = $existingPath
                }
                catch {
                    Write-Host "? Failed to create directory: $($_.Exception.Message)" -ForegroundColor Red
                    Write-Host "Defaulting to creating a new project in a standard location." -ForegroundColor Yellow
                    $projectChoice = "1"
                }
            }
            else {
                Write-Host "Defaulting to creating a new project in a standard location." -ForegroundColor Yellow
                $projectChoice = "1"
            }
        }
        else {
            # Path exists, check if it's an Osdag project by looking for the marker file
            $markerFilePath = Join-Path $existingPath "osdag-web-installation.txt"
            if (Test-Path $markerFilePath) {
                Write-Host "? Verified Osdag-web project at: $existingPath" -ForegroundColor Green
                $projectPath = $existingPath
            }
            else {
                Write-Host "?? This directory exists but doesn't appear to be an Osdag-web project." -ForegroundColor Yellow
                Write-Host "   (Marker file 'osdag-web-installation.txt' not found)" -ForegroundColor Yellow
                $useAnyway = Read-Host "Use this directory anyway? (y/n)"
                if ($useAnyway -eq "y") {
                    $projectPath = $existingPath
                    # Create the marker file in the existing directory
                    $markerContent = @"
OSDAG-WEB INSTALLATION PROJECT
------------------------------
This directory was set up for Osdag-web installation on: $(Get-Date)

This file serves as a marker to identify this directory as an Osdag-web project.
If you're seeing this file, it means this directory was previously used with the
Osdag-web installation helper script.

Project path: $existingPath
"@
                    $markerContent | Out-File -FilePath $markerFilePath -Encoding utf8
                    Write-Host "? Created project marker file in the existing directory." -ForegroundColor Green
                }
                else {
                    Write-Host "Defaulting to creating a new project in a standard location." -ForegroundColor Yellow
                    $projectChoice = "1"
                }
            }
        }
    }
    
    # Handle new project creation
    if ($projectChoice -eq "1") {
        Write-Host "`n?? Where would you like to set up your new project?" -ForegroundColor Yellow
        Write-Host "1. Desktop (recommended)"
        Write-Host "2. Documents"
        Write-Host "3. Custom location"
        
        $dirChoice = Read-Host "Enter your choice (1-3)"
        
        switch ($dirChoice) {
            "1" { $baseDir = [Environment]::GetFolderPath("Desktop") }
            "2" { $baseDir = [Environment]::GetFolderPath("MyDocuments") }
            "3" { 
                $customDir = Read-Host "Enter the full path where you'd like to set up the project"
                if ([string]::IsNullOrWhiteSpace($customDir)) {
                    Write-Host "? No path provided. Using Desktop as default." -ForegroundColor Red
                    $baseDir = [Environment]::GetFolderPath("Desktop")
                }
                else {
                    $baseDir = $customDir
                    # Create the base directory if it doesn't exist
                    if (-not (Test-Path $baseDir)) {
                        try {
                            New-Item -Path $baseDir -ItemType Directory -Force | Out-Null
                            Write-Host "? Created directory: $baseDir" -ForegroundColor Green
                        }
                        catch {
                            Write-Host "? Failed to create directory: $($_.Exception.Message)" -ForegroundColor Red
                            Write-Host "Using Desktop as default." -ForegroundColor Yellow
                            $baseDir = [Environment]::GetFolderPath("Desktop")
                        }
                    }
                }
            }
            default { $baseDir = [Environment]::GetFolderPath("Desktop") }
        }
        
        # Create folder
        $folderName = Read-Host "Enter a name for your project folder (default: osdag_project)"
        if ([string]::IsNullOrWhiteSpace($folderName)) {
            $folderName = "osdag_project"
        }
        
        # Create full path
        $projectPath = Join-Path $baseDir $folderName
        
        # Create directory if it doesn't exist
        if (-not (Test-Path $projectPath)) {
            Write-Host "`n?? Creating project directory: $projectPath" -ForegroundColor Cyan
            New-Item -Path $projectPath -ItemType Directory | Out-Null
            
            # Create marker file
            $markerFilePath = Join-Path $projectPath "osdag-web-installation.txt"
            $markerContent = @"
OSDAG-WEB INSTALLATION PROJECT
------------------------------
This directory was set up for Osdag-web installation on: $(Get-Date)

This file serves as a marker to identify this directory as an Osdag-web project.
If you're seeing this file, it means this directory was previously used with the
Osdag-web installation helper script.

Project path: $projectPath

INSTALLATION INSTRUCTIONS:
1. Make sure to run the installation script from this directory
2. If you need to resume the installation, navigate to this directory first
3. Keep this file for future reference

For more information, visit: https://github.com/osdag-admin/Osdag-web
"@
            $markerContent | Out-File -FilePath $markerFilePath -Encoding utf8
            Write-Host "? Created project marker file with installation instructions." -ForegroundColor Green
            
        }
        else {
            Write-Host "`n?? Project directory already exists: $projectPath" -ForegroundColor Yellow
            # Check if it's already an Osdag project
            $markerFilePath = Join-Path $projectPath "osdag-web-installation.txt"
            if (Test-Path $markerFilePath) {
                Write-Host "? This appears to be an existing Osdag-web project." -ForegroundColor Green
            }
            else {
                Write-Host "This directory exists but doesn't appear to be an Osdag-web project." -ForegroundColor Yellow
                $createMarker = Read-Host "Create Osdag-web project marker in this directory? (y/n)"
                if ($createMarker -eq "y") {
                    # Create marker file
                    $markerContent = @"
OSDAG-WEB INSTALLATION PROJECT
------------------------------
This directory was set up for Osdag-web installation on: $(Get-Date)

This file serves as a marker to identify this directory as an Osdag-web project.
If you're seeing this file, it means this directory was previously used with the
Osdag-web installation helper script.

Project path: $projectPath

INSTALLATION INSTRUCTIONS:
1. Make sure to run the installation script from this directory
2. If you need to resume the installation, navigate to this directory first
3. Keep this file for future reference

For more information, visit: https://github.com/osdag-admin/Osdag-web
"@
                    $markerContent | Out-File -FilePath $markerFilePath -Encoding utf8
                    Write-Host "? Created project marker file with installation instructions." -ForegroundColor Green
                }
            }
        }
    }
    
    # Navigate to directory
    Write-Host "?? Changing to project directory..."
    Set-Location $projectPath
    Write-Host "? Current directory is now: $projectPath" -ForegroundColor Green
    
    # Save project path to global variable for other functions to use
    $global:projectPath = $projectPath
    
    # Display project status
    $markerFilePath = Join-Path $projectPath "osdag-web-installation.txt"
    $osdagWebPath = Join-Path $projectPath "Osdag-web"
    
    Write-Host "`n?? PROJECT STATUS:" -ForegroundColor Yellow
    Write-Host "------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "?? Project location: $projectPath" -ForegroundColor Cyan
    Write-Host "?? Project marker: $(if (Test-Path $markerFilePath) { "? Present" } else { "? Missing" })"
    Write-Host "?? Osdag-web folder: $(if (Test-Path $osdagWebPath) { "? Present" } else { "? Not yet cloned" })"
    Write-Host "------------------------------------------------" -ForegroundColor DarkGray
    
    Write-Host "`n? Step 3 completed! You are now in your project directory." -ForegroundColor Green
    Write-Host "`n?? TIP: If you close this window accidentally, you can return to this directory by running:" -ForegroundColor Yellow
    Write-Host "    Set-Location '$projectPath'" -ForegroundColor Yellow
}

function Step-DownloadMinicondaEnvironment {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 4: MINICONDA DOWNLOAD & VERIFICATION   ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
  
    # Check if conda is already installed
    try {
        $condaCommand = Get-Command conda -ErrorAction SilentlyContinue
        if ($condaCommand) {
            $condaPath = Split-Path -Parent (Split-Path -Parent $condaCommand.Source)
            Write-Host "? Found conda in PATH at: $condaPath" -ForegroundColor Green
            
            # Get conda version for display
            $condaVersion = & conda --version 2>&1 | Out-String
            Write-Host "   Version: $($condaVersion.Trim())" -ForegroundColor Green
            
            # Store for later use
            $global:condaExecutable = $condaCommand.Source
            $global:existingCondaPath = $condaPath
            
            $skipDownload = Read-Host "Conda is already installed. Skip download? (y/n)"
            if ($skipDownload -eq "y") {
                Write-Host "`n? Step 4 completed! Using existing conda installation." -ForegroundColor Green
                return $true
            }
        }
    }
    catch {
        Write-Host "Conda not found in PATH. Will download installer." -ForegroundColor Yellow
    }

    # Set download directory
    $downloadDir = "$env:USERPROFILE\Downloads"
    if (-not (Test-Path $downloadDir)) {
        try {
            New-Item -Path $downloadDir -ItemType Directory -Force | Out-Null
        } catch {
            $downloadDir = "$env:TEMP"
        }
    }
    
    # Set installer path
    $installerPath = "$downloadDir\Miniconda3-latest-Windows-x86_64.exe"
    
    # Check if we already have the installer
    if (Test-Path $installerPath) {
        Write-Host "?? Existing installer found: $installerPath" -ForegroundColor Yellow
        $redownload = Read-Host "Do you want to redownload the installer? (y/n)"
        
        if ($redownload -ne "y") {
            Write-Host "Using existing installer file." -ForegroundColor Yellow
            $global:condaInstallerPath = $installerPath
            Write-Host "`n? Step 4 completed! Miniconda installer is ready." -ForegroundColor Green
            return $true
        } else {
            # Remove existing file to redownload
            try {
                Remove-Item -Path $installerPath -Force
                Write-Host "Removed existing installer file." -ForegroundColor Yellow
            } catch {
                Write-Host "?? Could not remove existing file. Will try to overwrite." -ForegroundColor Yellow
            }
        }
    }
    
    # Download Miniconda installer
    Write-Host "`n?? Downloading Miniconda installer..." -ForegroundColor Cyan
    $minicondaUrl = "https://repo.anaconda.com/miniconda/Miniconda3-latest-Windows-x86_64.exe"
    
    Write-Host "?? Downloading from: $minicondaUrl"
    Write-Host "?? Saving to: $installerPath"
    
    try {
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($minicondaUrl, $installerPath)
        
        if (Test-Path $installerPath) {
            $fileSize = [math]::Round((Get-Item $installerPath).Length / 1MB, 2)
            Write-Host "? Miniconda installer downloaded successfully! ($fileSize MB)" -ForegroundColor Green
            
            # Store globally for the installation step
            $global:condaInstallerPath = $installerPath
            
            Write-Host "`n? Step 4 completed! Miniconda installer is ready for installation." -ForegroundColor Green
            return $true
        } else {
            throw "Download completed but installer file not found"
        }
    } catch {
        Write-Host "? Error downloading Miniconda installer: $($_.Exception.Message)" -ForegroundColor Red
        
        # Provide manual download instructions
        Write-Host "`n?? MANUAL DOWNLOAD INSTRUCTIONS:" -ForegroundColor Yellow
        Write-Host "1. Visit https://docs.conda.io/en/latest/miniconda.html" -ForegroundColor White
        Write-Host "2. Download 'Miniconda3 Windows 64-bit'" -ForegroundColor White
        Write-Host "3. Save it to: $installerPath" -ForegroundColor White
        
        $manualDownload = Read-Host "`nDid you manually download the installer? (y/n)"
        if ($manualDownload -eq "y") {
            if (Test-Path $installerPath) {
                Write-Host "? Installer found at: $installerPath" -ForegroundColor Green
                $global:condaInstallerPath = $installerPath
                return $true
            } else {
                Write-Host "? Installer not found at the specified location." -ForegroundColor Red
                
                # Ask for custom path
                Write-Host "`nEnter the full path to the downloaded installer:" -ForegroundColor Yellow
                $customPath = Read-Host
                
                if (Test-Path $customPath) {
                    Write-Host "? Installer found at: $customPath" -ForegroundColor Green
                    $global:condaInstallerPath = $customPath
                    return $true
                } else {
                    Write-Host "? Installer not found at: $customPath" -ForegroundColor Red
                    return $false
                }
            }
        } else {
            return $false
        }
    }
}

# === STEP 5: Install Miniconda Environment ===
function Step-InstallMinicondaEnvironment {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 5: INSTALL MINICONDA ENVIRONMENT       ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    
    # Check if Miniconda is already installed
    if (Test-CondaInSession) {
        Write-Host "? Miniconda is already installed!" -ForegroundColor Green
        return $true
    }
    
    # Check if Miniconda installer path is set
    if (-not $global:condaInstallerPath) {
        Write-Host "? Miniconda installer path not set. Please run Step 4 first." -ForegroundColor Red
        return $false
    }
    
    # Let user choose installation location
    Write-Host "`nChoose installation location:" -ForegroundColor Cyan
    Write-Host "1. User folder (recommended): $env:USERPROFILE\Miniconda3" -ForegroundColor White
    Write-Host "2. System folder (requires admin): C:\Miniconda3" -ForegroundColor White
    Write-Host "3. Custom location" -ForegroundColor White
    
    $choice = Read-Host "Enter choice (1-3)"
    
    $installDir = switch ($choice) {
        "1" { "$env:USERPROFILE\Miniconda3" }
        "2" { "C:\Miniconda3" }
        "3" { 
            Write-Host "Enter custom installation path:" -ForegroundColor Cyan
            Read-Host 
        }
        default { "$env:USERPROFILE\Miniconda3" }
    }
    
    # Check if chosen directory needs admin rights
    $needsAdmin = $false
    if ($installDir.StartsWith("C:\Program") -or 
        $installDir.StartsWith("C:\Windows") -or
        $installDir -eq "C:\Miniconda3") {
        $needsAdmin = $true
    }
    
    # Check if running as admin
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if ($needsAdmin -and -not $isAdmin) {
        Write-Host "`n?? Installing to $installDir requires administrator privileges" -ForegroundColor Yellow
        Write-Host "Options:" -ForegroundColor Cyan
        Write-Host "1. Choose a different location (recommended)" -ForegroundColor White
        Write-Host "2. Restart script as administrator" -ForegroundColor White
        
        $adminChoice = Read-Host "Enter choice (1-2)"
        
        if ($adminChoice -eq "1") {
            Write-Host "`nEnter new installation path (e.g., $env:USERPROFILE\Miniconda3):" -ForegroundColor Cyan
            $installDir = Read-Host
        }
        else {
            Write-Host "`n?? Please restart the script with administrator privileges" -ForegroundColor Yellow
            Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
            return $false
        }
    }
    
    # Create installation directory if needed
    if (-not (Test-Path $installDir)) {
        try {
            New-Item -Path $installDir -ItemType Directory -Force | Out-Null
            Write-Host "? Created directory: $installDir" -ForegroundColor Green
        }
        catch {
            Write-Host "? Failed to create directory: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
    
    # Check disk space
    try {
        $drive = [System.IO.Path]::GetPathRoot($installDir)
        # Fix the filter format for Get-WmiObject by removing the trailing backslash
        $driveLetter = $drive.TrimEnd('\')
        $driveInfo = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='$driveLetter'"
        $freeSpaceGB = [math]::Round($driveInfo.FreeSpace / 1GB, 2)
        
        if ($freeSpaceGB -lt 4) {
            Write-Host "?? Warning: Only $freeSpaceGB GB free on $drive" -ForegroundColor Yellow
            Write-Host "   Miniconda requires at least 4GB free space" -ForegroundColor Yellow
            
            $spaceChoice = Read-Host "Continue anyway? (y/n)"
            if ($spaceChoice.ToLower() -ne 'y') {
                return $false
            }
        }
        else {
            Write-Host "? Sufficient disk space: $freeSpaceGB GB available on $drive" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "?? Could not check free disk space: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Write-Host "`n?? Installing Miniconda..." -ForegroundColor Cyan
    
    try {
        # Run the installer
        # Using /D= can cause issues with newer Miniconda installers
        # Try using interactive installation with guidance instead
        Write-Host "Installing to: $installDir" -ForegroundColor Cyan
        Write-Host "`nStarting interactive installer..." -ForegroundColor Cyan
        Write-Host "?? Please follow these important steps:" -ForegroundColor Yellow
        Write-Host "   1. Select 'Just Me' when asked" -ForegroundColor White
        Write-Host "   2. Set the installation path to: $installDir" -ForegroundColor White
        Write-Host "   3. Check the box to 'Add Miniconda3 to my PATH'" -ForegroundColor White
        Write-Host "   4. Complete the installation" -ForegroundColor White
        
        $installerProcess = Start-Process -FilePath $global:condaInstallerPath -Wait -PassThru
        
        # Since we're using interactive mode, we need to check if conda is installed rather than relying on the exit code
        Write-Host "`n?? Checking if Miniconda was installed properly..." -ForegroundColor Cyan
        
        # Wait a moment for installation to complete
        Start-Sleep -Seconds 2
        
        # Check for conda executable
        $condaPaths = @(
            "$installDir\Scripts\conda.exe",
            "$installDir\condabin\conda.bat"
        )
        
        $condaInstalled = $false
        foreach ($path in $condaPaths) {
            if (Test-Path $path) {
                $condaInstalled = $true
                Write-Host "? Found conda at: $path" -ForegroundColor Green
                break
            }
        }
        
        if ($condaInstalled) {
            Write-Host "? Miniconda installed successfully!" -ForegroundColor Green
            
            # Refresh PATH for current session
            Write-Host "`n?? Refreshing PATH environment for current session..." -ForegroundColor Cyan
            $env:Path = "$installDir;$installDir\Scripts;$installDir\condabin;" + $env:Path
            
            # Manually add to system PATH if not already there
            Write-Host "`n?? Checking if Miniconda is in the system PATH..." -ForegroundColor Cyan
            $userPath = [Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::User)
            $systemPath = [Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::Machine)
            
            $pathsToCheck = @(
                "$installDir",
                "$installDir\Scripts",
                "$installDir\condabin"
            )
            
            $pathsToAdd = @()
            foreach ($pathToCheck in $pathsToCheck) {
                if (-not ($userPath -like "*$pathToCheck*") -and -not ($systemPath -like "*$pathToCheck*")) {
                    $pathsToAdd += $pathToCheck
                }
            }
            
            if ($pathsToAdd.Count -gt 0) {
                Write-Host "?? Miniconda paths not found in system PATH. Adding them now..." -ForegroundColor Yellow
                try {
                    # Add to user PATH (doesn't require admin privileges)
                    $newUserPath = $userPath
                    foreach ($pathToAdd in $pathsToAdd) {
                        if (-not ($newUserPath -like "*$pathToAdd*")) {
                            if ($newUserPath) {
                                $newUserPath = "$pathToAdd;$newUserPath"
                            } else {
                                $newUserPath = $pathToAdd
                            }
                        }
                    }
                    
                    [Environment]::SetEnvironmentVariable("PATH", $newUserPath, [System.EnvironmentVariableTarget]::User)
                    Write-Host "? Miniconda paths added to user PATH successfully!" -ForegroundColor Green
                    Write-Host "?? Note: You may need to restart your terminal for changes to take effect." -ForegroundColor Cyan
                }
                catch {
                    Write-Host "?? Failed to update PATH: $($_.Exception.Message)" -ForegroundColor Yellow
                    Write-Host "?? You may need to add Miniconda to your PATH manually:" -ForegroundColor Yellow
                    foreach ($pathToAdd in $pathsToAdd) {
                        Write-Host "   $pathToAdd" -ForegroundColor White
                    }
                }
            }
            else {
                Write-Host "? Miniconda is already in the system PATH." -ForegroundColor Green
            }
            
            # Register conda activation script for this session
            if (-not (Test-Path Function:\conda)) {
                # Try to activate for this session (even if future sessions are set up)
                try {
                    $activateScript = "$installDir\Scripts\activate.ps1"
                    if (Test-Path $activateScript) {
                        . $activateScript
                        Write-Host "? Conda activated for current session" -ForegroundColor Green
                    }
                }
                catch {
                    Write-Host "?? Could not activate conda for current session: $($_.Exception.Message)" -ForegroundColor Yellow
                }
            }
            
            Write-Host "`n? Step 5 completed! Miniconda has been successfully installed." -ForegroundColor Green
            return $true
        } else {
            Write-Host "?? Miniconda installation failed. Please check the installation logs." -ForegroundColor Yellow
            return $false
        }
    } 
    catch {
        Write-Host "? Error installing Miniconda: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to check if conda is available in current session
function Test-CondaInSession {
    try {
        # Try direct command first
        $condaCommand = Get-Command conda -ErrorAction SilentlyContinue
        if ($condaCommand) {
            $condaVersion = conda --version 2>&1 | Out-String
            if ($?) {
                return $true
            }
        }
        
        # If that fails, try full path if we know it
        if ($global:condaExecutable -and (Test-Path $global:condaExecutable)) {
            $condaVersion = & $global:condaExecutable --version 2>&1 | Out-String
            if ($?) {
                return $true
            }
        }
        
        # If all else fails, try the most common locations
        $condaLocations = @(
            "$env:USERPROFILE\Miniconda3\Scripts\conda.exe",
            "$env:USERPROFILE\AppData\Local\Continuum\miniconda3\Scripts\conda.exe",
            "$env:USERPROFILE\AppData\Local\miniconda3\Scripts\conda.exe",
            "C:\Miniconda3\Scripts\conda.exe",
            "C:\ProgramData\Miniconda3\Scripts\conda.exe"
        )
        
        foreach ($loc in $condaLocations) {
            if (Test-Path $loc) {
                $condaVersion = & $loc --version 2>&1 | Out-String
                if ($?) {
                    $global:condaExecutable = $loc
                    return $true
                }
            }
        }
    }
    catch { }
    
    return $false
}

# Function to refresh conda in current session if needed
function Update-CondaSession {
    if (Test-CondaInSession) {
        return $true
    }
    
    Write-Host "?? Activating conda for current session..." -ForegroundColor Cyan
    
    # If we know the conda path, use it
    if ($global:existingCondaPath -and (Test-Path $global:existingCondaPath)) {
        # Add to PATH if needed
        if ($env:Path -notlike "*$global:existingCondaPath*") {
            $env:Path = "$global:existingCondaPath;$global:existingCondaPath\Scripts;$global:existingCondaPath\condabin;" + $env:Path
        }
        
        # Try activation scripts
        $activateScripts = @(
            "$global:existingCondaPath\Scripts\activate.ps1",
            "$global:existingCondaPath\shell\condabin\Conda.psm1"
        )
        
        foreach ($script in $activateScripts) {
            if (Test-Path $script) {
                try {
                    . $script
                    Write-Host "? Conda activated via script: $script" -ForegroundColor Green
                    if (Test-CondaInSession) {
                        return $true
                    }
                }
                catch { }
            }
        }
        
        # Try direct hook setup
        if (Test-Path "$global:existingCondaPath\Scripts\conda.exe") {
            try {
                & "$global:existingCondaPath\Scripts\conda.exe" shell.powershell hook | Out-String | Invoke-Expression
                Write-Host "? Conda activated via hook" -ForegroundColor Green
                if (Test-CondaInSession) {
                    return $true
                }
            }
            catch { }
        }
    }
    
    # Last resort - search all possible locations again
    foreach ($loc in $global:condaLocations) {
        if (Test-Path "$loc\Scripts\conda.exe") {
            try {
                $env:Path = "$loc;$loc\Scripts;$loc\condabin;" + $env:Path
                & "$loc\Scripts\conda.exe" shell.powershell hook | Out-String | Invoke-Expression
                $global:existingCondaPath = $loc
                $global:condaExecutable = "$loc\Scripts\conda.exe"
                Write-Host "? Conda activated from $loc" -ForegroundColor Green
                if (Test-CondaInSession) {
                    return $true
                }
            }
            catch { }
        }
    }
    
    # If we got here, we couldn't activate conda
    Write-Host "?? Could not activate conda in current session" -ForegroundColor Yellow
    Write-Host "   You may need to restart PowerShell and run the script again" -ForegroundColor Yellow
    
    return $false
}

# Function to create and set up conda environment
function Step-SetupCondaEnvironment {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 6: CONDA ENVIRONMENT SETUP             ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    
    # Check if running as administrator
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        Write-Host "`n?? IMPORTANT: This step should be run with administrator privileges" -ForegroundColor Yellow
        Write-Host "For best results, close this window and:" -ForegroundColor Yellow
        Write-Host "1. Right-click on Anaconda Prompt and select 'Run as administrator'" -ForegroundColor White
        Write-Host "2. Navigate to your project directory" -ForegroundColor White
        Write-Host "3. Run: conda create -n osdag-web python=3.8 -y" -ForegroundColor White
        
        $continueAnyway = Read-Host "`nDo you want to continue anyway? (y/n)"
        if ($continueAnyway -ne "y") {
            Write-Host "? Environment setup cancelled. Please restart with admin privileges." -ForegroundColor Red
            return $false
        }
        
        Write-Host "`n?? Continuing without admin privileges. This might cause issues." -ForegroundColor Yellow
    }
    
    # Check if Miniconda is installed
    $minicondaPaths = @(
        "$env:USERPROFILE\Miniconda3",
        "$env:USERPROFILE\AppData\Local\Continuum\miniconda3",
        "$env:USERPROFILE\AppData\Local\miniconda3",
        "C:\Miniconda3",
        "C:\ProgramData\Miniconda3"
    )
    
    $minicondaFound = $false
    $minicondaPath = $null
    $condaExe = $null
    
    foreach ($path in $minicondaPaths) {
        if (Test-Path "$path\Scripts\conda.exe") {
            $minicondaFound = $true
            $minicondaPath = $path
            $condaExe = "$path\Scripts\conda.exe"
            break
        }
    }
    
    if (-not $minicondaFound) {
        Write-Host "? Miniconda installation not found. Please complete Step 4 first." -ForegroundColor Red
        return $false
    }
    
    Write-Host "? Found Miniconda installation at: $minicondaPath" -ForegroundColor Green
    
    # Set environment name to 'osdag-web'
    $envName = "osdag-web"
    Write-Host "`nUsing environment name: 'osdag-web'" -ForegroundColor Yellow
    
    # Set Python version to 3.8
    $pythonVersion = "3.8"
    Write-Host "Using Python $pythonVersion" -ForegroundColor Yellow
    
    # Directly create the environment
    Write-Host "`n?? Creating Conda environment '$envName' with Python $pythonVersion..." -ForegroundColor Cyan
    
    try {
        # Add conda to path for current session if needed
        if ($env:Path -notlike "*$minicondaPath\Scripts*") {
            $env:Path = "$minicondaPath\Scripts;$minicondaPath;$env:Path"
        }
        
        # Display the exact command for user reference
        Write-Host "`n?? Running command: conda create -n $envName python=$pythonVersion -y" -ForegroundColor White
        
        # Execute conda create command directly
        $createProcess = Start-Process -FilePath $condaExe -ArgumentList "create", "-n", $envName, "python=$pythonVersion", "-y" -NoNewWindow -Wait -PassThru
        
        if ($createProcess.ExitCode -ne 0) {
            # Try alternative method using PowerShell
            Write-Host "`n?? First method failed, trying alternative approach..." -ForegroundColor Yellow
            $condaOutput = & $condaExe create -n $envName python=$pythonVersion -y 2>&1
            
            # Check if environment exists
            $envList = & $condaExe env list
            if ($envList -like "*$envName*") {
                Write-Host "? Environment created successfully!" -ForegroundColor Green
            }
            else {
                throw "Failed to create environment. Output: $condaOutput"
            }
        }
        else {
            Write-Host "? Environment created successfully!" -ForegroundColor Green
        }
        
        # Store environment name for later use
        $global:condaEnvName = $envName
        
        Write-Host "`n?? Conda environment setup completed!" -ForegroundColor Green
        Write-Host "Environment '$envName' has been created with Python $pythonVersion." -ForegroundColor Green
        Write-Host "`n? Step 6 completed! Conda environment is ready for use." -ForegroundColor Green
        
        # Provide activation instructions
        Write-Host "`n?? IMPORTANT: To activate this environment, use:" -ForegroundColor Yellow
        Write-Host "   conda activate $envName" -ForegroundColor White
        Write-Host "`n?? TIP: You'll need to activate this environment before running Osdag-web." -ForegroundColor Yellow
        
        return $true
    }
    catch {
        Write-Host "? Failed to create environment: $($_.Exception.Message)" -ForegroundColor Red
        
        # Provide manual instructions with admin emphasis
        Write-Host "`n?? Please try creating the environment manually:" -ForegroundColor Yellow
        Write-Host "   1. Right-click on Anaconda Prompt and select 'Run as administrator'" -ForegroundColor White
        Write-Host "   2. Run: conda create -n osdag-web python=3.8 -y" -ForegroundColor White
        Write-Host "   3. After creation, activate with: conda activate osdag-web" -ForegroundColor White
        
        return $false
    }
}

# === STEP 7: Download PostgreSQL installer ===
function Step-DownloadPGInstaller {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 7: DOWNLOAD POSTGRESQL INSTALLER       ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    
    Write-Host "`n?? Downloading full PostgreSQL graphical installer..."
    $installerUrl = "https://get.enterprisedb.com/postgresql/postgresql-16.2-1-windows-x64.exe"
    
    try {
        Write-Host "?? Downloading from: $installerUrl"
        Write-Host "? This may take a few minutes depending on your internet connection..."
        
        # Add progress bar
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($installerUrl, $installerPath)
        
        if (Test-Path $installerPath) {
            Write-Host "? Installer downloaded successfully to: $installerPath" -ForegroundColor Green
        }
        else {
            throw "Download completed but file not found"
        }
    }
    catch {
        Write-Host "? Download failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Try downloading PostgreSQL manually from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
        return
    }
    
    Write-Host "`n? PostgreSQL installer downloaded successfully!" -ForegroundColor Green
    Write-Host "Proceed to Step 8 to install PostgreSQL." -ForegroundColor Yellow
}

# === STEP 7: Install PostgreSQL ===
function Step-InstallPostgreSQL {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 8: INSTALL POSTGRESQL                  ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    
    if (-not (Test-Path $installerPath)) {
        Write-Host "? PostgreSQL installer not found at: $installerPath" -ForegroundColor Red
        Write-Host "Please run Step 7 to download the PostgreSQL installer first." -ForegroundColor Yellow
        return
    }
    
    Write-Host "`n?? Ready to launch installer GUI..."
    
    Write-Host "`n?? INSTALLATION GUIDE:" -ForegroundColor Yellow
    Write-Host "------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "1?? Select all components:" -ForegroundColor White
    Write-Host "   - PostgreSQL Server"
    Write-Host "   - pgAdmin 4"
    Write-Host "   - Stack Builder"
    Write-Host "   - Command Line Tools"
    Write-Host ""
    Write-Host "2?? Set Data Directory: [IMPORTANT NOTE TO AVOID ERRORS] " -ForegroundColor White
    Write-Host "   C:\PostgreSQL\Data" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3?? Set password:" -ForegroundColor White
    Write-Host "   password" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4?? Keep port as: 5432" -ForegroundColor White
    Write-Host "------------------------------------------------" -ForegroundColor DarkGray
    
    $launchInstaller = Read-Host "`nLaunch the PostgreSQL installer now? (y/n)"
    if ($launchInstaller -eq "y") {
        Write-Host "?? Launching PostgreSQL installer..." -ForegroundColor Cyan
        Start-Process -FilePath $installerPath
        Write-Host "? Installation in progress..." -ForegroundColor Yellow
        Write-Host "When installation is complete, proceed to Step 9." -ForegroundColor Green
    }
    else {
        Write-Host "? You can launch the installer later from: $installerPath" -ForegroundColor Green
        Write-Host "After installation, proceed to Step 9." -ForegroundColor Yellow
    }
}

# === STEP 8: Add PostgreSQL bin directory to system PATH ===
function Step-AddToPath {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 9: ADD POSTGRESQL TO SYSTEM PATH       ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    
    Write-Host "`n?? Searching for PostgreSQL bin directory..."
    
    $pgBinPath = "$installDir\bin"
    $pathFound = $false
    
    # Try to find PostgreSQL bin directory
    if (Test-Path $pgBinPath) {
        $pathFound = $true
        Write-Host "? Found PostgreSQL bin directory at: $pgBinPath" -ForegroundColor Green
    }
    else {
        # Try common alternative locations
        $alternativePaths = @(
            "C:\PostgreSQL\$pgVersion\bin",
            "C:\Program Files\PostgreSQL\$pgVersion\bin",
            "C:\Program Files (x86)\PostgreSQL\$pgVersion\bin"
        )
        
        foreach ($path in $alternativePaths) {
            if (Test-Path $path) {
                $pgBinPath = $path
                $pathFound = $true
                Write-Host "? Found PostgreSQL bin directory at: $pgBinPath" -ForegroundColor Green
                break
            }
        }
    }
    
    if (-not $pathFound) {
        Write-Host "? Could not find PostgreSQL bin directory automatically." -ForegroundColor Red
        Write-Host "Please manually provide the path to your PostgreSQL bin directory"
        $customPath = Read-Host "Enter PostgreSQL bin path (e.g., C:\Program Files\PostgreSQL\16\bin)"
        
        if (-not [string]::IsNullOrWhiteSpace($customPath) -and (Test-Path $customPath)) {
            $pgBinPath = $customPath
            $pathFound = $true
            Write-Host "? Using custom path: $pgBinPath" -ForegroundColor Green
        }
        else {
            Write-Host "? Invalid path provided or PostgreSQL not installed." -ForegroundColor Red
            Write-Host "Please install PostgreSQL first (Step 8) and try again." -ForegroundColor Yellow
            return
        }
    }
    
    # Check if already in PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::Machine)
    if ($currentPath -like "*$pgBinPath*") {
        Write-Host "? PostgreSQL bin directory is already in your system PATH." -ForegroundColor Green
    }
    else {
        try {
            # Add to PATH
            Write-Host "?? Adding PostgreSQL bin directory to system PATH..."
            [Environment]::SetEnvironmentVariable("Path", "$currentPath;$pgBinPath", [System.EnvironmentVariableTarget]::Machine)
            Write-Host "? PostgreSQL bin directory successfully added to system PATH!" -ForegroundColor Green
            Write-Host "?? You'll need to restart your terminal or PowerShell session for changes to take effect." -ForegroundColor Yellow
        }
        catch {
            Write-Host "? Error adding to PATH: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Try running this script as Administrator." -ForegroundColor Yellow
        }
    }
    
    # Test if PostgreSQL commands are available
    Write-Host "`n?? Testing PostgreSQL commands..."
    try {
        # Add path to current session temporarily
        $env:Path = "$env:Path;$pgBinPath"
        
        # Test psql
        $psqlVersion = & "$pgBinPath\psql.exe" --version 2>&1
        Write-Host "? PostgreSQL client found: $psqlVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "?? Unable to test PostgreSQL commands. You may need to restart your terminal." -ForegroundColor Yellow
    }
    
    Write-Host "`n?? TIP: To verify PostgreSQL works, open a new terminal after this script completes" -ForegroundColor Yellow
    Write-Host "    and run: psql --version" -ForegroundColor Yellow
}

# === STEP 9: Check Git installation and Download Git installer ===
# Function to test if Git is installed
function Test-GitInstalled {
    # Check common Git installation paths first
    $commonGitPaths = @(
        "C:\Program Files\Git\bin\git.exe",
        "C:\Program Files (x86)\Git\bin\git.exe", 
        "$env:ProgramFiles\Git\bin\git.exe",
        "$env:ProgramFiles(x86)\Git\bin\git.exe",
        "$env:LOCALAPPDATA\Programs\Git\bin\git.exe"
    )
    
    foreach ($path in $commonGitPaths) {
        if (Test-Path $path) {
            # If Git exists but isn't in PATH, add it temporarily for this session
            $gitDir = Split-Path -Parent $path
            if ($env:Path -notlike "*$gitDir*") {
                $env:Path = "$env:Path;$gitDir"
                Write-Host "Added Git directory to PATH for current session: $gitDir" -ForegroundColor Yellow
            }
            return $true
        }
    }
    
    # Try running git command as fallback
    try {
        $null = & git --version 2>&1
        return $true
    }
    catch {
        return $false
    }
}

# Function to refresh PATH from registry
function RefreshPathFromRegistry {
    try {
        # Get the machine PATH from registry
        $machinePath = [Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::Machine)
        
        # Get the user PATH from registry
        $userPath = [Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::User)
        
        # Combine and set for current process
        $combinedPath = $machinePath
        if ($userPath) {
            $combinedPath = "$combinedPath;$userPath"
        }
        
        # Update current session's PATH
        $env:Path = $combinedPath
        
        Write-Host "? PATH refreshed for current session" -ForegroundColor Green
    }
    catch {
        Write-Host "? Failed to refresh PATH: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Step-CheckAndDownloadGit {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 10: CHECK AND DOWNLOAD GIT INSTALLER    ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    
    Write-Host "`n?? Checking if Git is already installed..."
    
    # Check common Git installation paths first
    $commonGitPaths = @(
        "C:\Program Files\Git\bin\git.exe",
        "C:\Program Files (x86)\Git\bin\git.exe", 
        "$env:ProgramFiles\Git\bin\git.exe",
        "$env:ProgramFiles(x86)\Git\bin\git.exe",
        "$env:LOCALAPPDATA\Programs\Git\bin\git.exe"
    )
    
    foreach ($path in $commonGitPaths) {
        if (Test-Path $path) {
            # If Git exists but isn't in PATH, add it temporarily for this session
            $gitDir = Split-Path -Parent $path
            if ($env:Path -notlike "*$gitDir*") {
                $env:Path = "$env:Path;$gitDir"
                Write-Host "Added Git directory to PATH for current session: $gitDir" -ForegroundColor Yellow
            }
            return $true
        }
    }
    
    # Try running git command as fallback
    try {
        $null = & git --version 2>&1
        return $true
    }
    catch {
        return $false
    }
}

# === STEP 11: Install Git ===
function Step-InstallGit {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 11: INSTALL GIT                        ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    
    # Check if Git is already installed
    Write-Host "`n?? Checking if Git is already installed..."
    
    try {
        $gitVersion = git --version 2>&1
        if ($gitVersion -match "git version") {
            Write-Host "? Git is already installed: $gitVersion" -ForegroundColor Green
            Write-Host "You can proceed to the next step." -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "? Git is not installed or not in PATH." -ForegroundColor Red
        Write-Host "Proceeding with installation..." -ForegroundColor Yellow
    }
    
    # Download Git installer
    $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe"
    
    Write-Host "`n?? Downloading Git installer..." -ForegroundColor Cyan
    Write-Host "?? Downloading from: $gitUrl"
    Write-Host "?? Saving to: $gitInstallerPath"
    
    try {
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($gitUrl, $gitInstallerPath)
        
        if (Test-Path $gitInstallerPath) {
            Write-Host "? Git installer downloaded successfully!" -ForegroundColor Green
            
            Write-Host "`n?? INSTALLATION INSTRUCTIONS:" -ForegroundColor Yellow
            Write-Host "------------------------------------------------" -ForegroundColor DarkGray
            Write-Host "1?? When the installer opens, use these recommended settings:" -ForegroundColor White
            Write-Host "   ? Use Git from Git Bash and from Windows Command Prompt" -ForegroundColor Cyan
            Write-Host "   ? Use OpenSSH" -ForegroundColor Cyan
            Write-Host "   ? Use OpenSSL library" -ForegroundColor Cyan
            Write-Host "   ? Checkout Windows-style, commit Unix-style line endings" -ForegroundColor Cyan
            Write-Host "   ? Use Windows' default console window" -ForegroundColor Cyan
            Write-Host "   ? Enable Git Credential Manager" -ForegroundColor Cyan
            Write-Host "   ? Enable file system caching" -ForegroundColor Cyan
            Write-Host "------------------------------------------------" -ForegroundColor DarkGray
            
            $launchInstaller = Read-Host "`nLaunch the Git installer now? (y/n)"
            if ($launchInstaller -eq "y") {
                Write-Host "?? Launching Git installer..." -ForegroundColor Cyan
                Write-Host "?? Please follow the installation instructions above." -ForegroundColor Yellow
                
                Start-Process -FilePath $gitInstallerPath -Wait
                
                Write-Host "`n? Git installation process completed!" -ForegroundColor Green
                
                # Refresh PATH from registry to include Git
                RefreshPathFromRegistry
                
                # Verify Git installation
                try {
                    $gitVersion = git --version 2>&1
                    if ($gitVersion -match "git version") {
                        Write-Host "? Git installed successfully: $gitVersion" -ForegroundColor Green
                    } else {
                        Write-Host "?? Git installation may have completed, but Git is not in PATH." -ForegroundColor Yellow
                        Write-Host "Please restart your terminal or computer before proceeding." -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "?? Git installation was completed, but verification failed." -ForegroundColor Yellow
                    Write-Host "Please restart your terminal or computer before proceeding." -ForegroundColor Yellow
                }
            } else {
                Write-Host "`n?? You can run the installer later from:" -ForegroundColor Yellow
                Write-Host $gitInstallerPath -ForegroundColor White
            }
        } else {
            throw "Download completed but installer not found"
        }
    } catch {
        Write-Host "? Error downloading or installing Git: $($_.Exception.Message)" -ForegroundColor Red
        
        # Provide manual installation instructions
        Write-Host "`n?? MANUAL INSTALLATION INSTRUCTIONS:" -ForegroundColor Yellow
        Write-Host "1. Visit https://git-scm.com/download/win" -ForegroundColor White
        Write-Host "2. Download the 64-bit Git for Windows Setup" -ForegroundColor White
        Write-Host "3. Run the installer and follow the instructions above" -ForegroundColor White
        Write-Host "4. After installation, restart your terminal or computer" -ForegroundColor White
        
        return $false
    }
    
    Write-Host "`n? Step 11 completed! Git is now installed." -ForegroundColor Green
    return $true
}

# === STEP 11: Clone a GitHub repo ===
function Step-CloneGitRepo {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 12: CLONE GITHUB REPOSITORY             ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    
    Write-Host "`n?? Checking Git installation..."
    
    # Use improved Git check function
    if (-not (Step-CheckAndDownloadGit)) {
        Write-Host "? Git is not installed or not found in PATH." -ForegroundColor Red
        Write-Host "Please run Step 11 to install Git, or restart your terminal." -ForegroundColor Yellow
        return
    }

    $destination = Get-Location
    Write-Host "?? Current directory: $destination"
    
    # Fork instructions with eye-catching formatting
    Write-Host "`n" -NoNewline
    Write-Host "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" -ForegroundColor Red -BackgroundColor Yellow
    Write-Host "!!  IMPORTANT: FORK THE REPOSITORY FIRST  !!" -ForegroundColor Red -BackgroundColor Yellow
    Write-Host "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" -ForegroundColor Red -BackgroundColor Yellow
    
    Write-Host "`n?? FORKING INSTRUCTIONS:" -ForegroundColor Magenta
    Write-Host "1. Go to the official Osdag-web repository:" -ForegroundColor White
    Write-Host "   https://github.com/osdag-admin/Osdag-web" -ForegroundColor Cyan
    Write-Host "2. Log in to your GitHub account" -ForegroundColor White
    Write-Host "3. Click the 'Fork' button in the upper right corner" -ForegroundColor White
    Write-Host "4. " -NoNewline -ForegroundColor White
    Write-Host "✓ MAKE SURE TO CHECK 'COPY ALL BRANCHES'" -ForegroundColor Red
    Write-Host "   This is CRITICAL to get the winter24 branch!" -ForegroundColor Red
    Write-Host "5. After forking, copy the URL of YOUR forked repository" -ForegroundColor White
    Write-Host "   (It should look like: https://github.com/YOUR-USERNAME/Osdag-web)" -ForegroundColor White
    
    Write-Host "`nHave you completed these steps? (y/n)" -ForegroundColor Yellow
    $forked = Read-Host
    
    if ($forked.ToLower() -ne "y") {
        Write-Host "`n? Please fork the repository before continuing." -ForegroundColor Red
        Write-Host "You can run Step 12 again after forking the repository." -ForegroundColor Yellow
        return
    }
    
    # Suggest Osdag-web repository
    Write-Host "`n?? ENTER YOUR FORKED REPOSITORY URL:" -ForegroundColor Yellow
    Write-Host "Paste the URL of YOUR forked repository:" -ForegroundColor Yellow
    
    $repoUrl = Read-Host "`n?? Enter YOUR forked GitHub repo URL"
    if ([string]::IsNullOrWhiteSpace($repoUrl)) {
        Write-Host "? No URL provided. Please enter your forked repository URL." -ForegroundColor Red
        return
    }
    
    $repoName = ($repoUrl.Split("/")[-1]).Replace(".git", "")
    $fullPath = Join-Path $destination $repoName
    
    # Check if repo already exists
    if (Test-Path "$fullPath\.git") {
        Write-Host "?? Repository already exists at: $fullPath" -ForegroundColor Yellow
        $overwrite = Read-Host "Do you want to delete and re-clone it? (y/n)"
        if ($overwrite -eq "y") {
            Write-Host "??? Removing existing repository..." -ForegroundColor Yellow
            Remove-Item -Path $fullPath -Recurse -Force
        }
        else {
            Write-Host "? Using existing repository." -ForegroundColor Green
            return
        }
    }

    Write-Host "`n?? Cloning repository: $repoUrl" -ForegroundColor Cyan
    Write-Host "?? Destination: $fullPath" -ForegroundColor Cyan
    Write-Host "? This may take a few minutes depending on repository size..." -ForegroundColor Yellow
    
    try {
        git clone $repoUrl $fullPath
        if (Test-Path "$fullPath\.git") {
            Write-Host "? Repository cloned successfully!" -ForegroundColor Green
            
            # If it's Osdag-web, suggest next step
            if ($repoName -eq "Osdag-web") {
                Write-Host "`n?? NEXT STEP:" -ForegroundColor Yellow
                Write-Host "Run Step 15 to check out the winter24 branch for Osdag-web." -ForegroundColor Yellow
            }
        }
        else {
            throw "No .git folder found after clone."
        }
    }
    catch {
        Write-Host "? Clone failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Try again or check the repository URL." -ForegroundColor Yellow
    }
}

# === STEP 13: Launch PGAdmin if installed ===
function Step-LaunchPGAdmin {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 13: LAUNCH PGADMIN                     ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    
    Write-Host "`n?? Searching for PGAdmin 4 installation..."
    
    $possiblePaths = @(
        "$installDir\pgAdmin 4\bin\pgAdmin4.exe",
        "$installDir\pgAdmin 4\runtime\pgAdmin4.exe",
        "C:\PostgreSQL\$pgVersion\pgAdmin 4\bin\pgAdmin4.exe",
        "C:\PostgreSQL\$pgVersion\pgAdmin 4\runtime\pgAdmin4.exe",
        "C:\Program Files\PostgreSQL\$pgVersion\pgAdmin 4\bin\pgAdmin4.exe",
        "C:\Program Files\PostgreSQL\$pgVersion\pgAdmin 4\runtime\pgAdmin4.exe",
        "C:\Program Files\pgAdmin 4\bin\pgAdmin4.exe",
        "C:\Program Files\pgAdmin 4\runtime\pgAdmin4.exe",
        "$env:APPDATA\pgAdmin\pgAdmin4.exe",
        "$env:USERPROFILE\AppData\Local\pgAdmin 4\bin\pgAdmin4.exe",
        "$env:USERPROFILE\AppData\Local\pgAdmin 4\runtime\pgAdmin4.exe"
    )

    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            Write-Host "? Found PGAdmin 4 at: $path" -ForegroundColor Green
            Write-Host "?? Launching PGAdmin 4..." -ForegroundColor Cyan
            Start-Process -FilePath $path
            
            Write-Host "`n?? TIP: When PGAdmin 4 opens, you'll need to use:" -ForegroundColor Yellow
            Write-Host "   ?? Username: postgres" -ForegroundColor Yellow
            Write-Host "   ?? Password: password (or your custom password)" -ForegroundColor Yellow
            
            return
        }
    }

    Write-Host "?? PGAdmin not found in standard locations." -ForegroundColor Yellow
    Write-Host "You might need to open it manually from your Start Menu." -ForegroundColor Yellow
    Write-Host "Try searching for 'pgAdmin 4' in your Windows search." -ForegroundColor Yellow
}

# === STEP 14: Create PostgreSQL database ===
function Step-CreateDB {
    Write-Host "`n" -NoNewline
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 14: CREATE POSTGRESQL DATABASE          ?" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    
    Write-Host "`n??? Creating PostgreSQL user & database..."
    
    Write-Host "`n?? ABOUT THIS STEP:" -ForegroundColor Yellow
    Write-Host "This step will create a PostgreSQL role named 'osdagdeveloper' and" -ForegroundColor White
    Write-Host "a database named 'postgres_Intg_osdag' specifically configured for Osdag-web." -ForegroundColor White
    Write-Host "The role will have superuser privileges needed for Osdag database operations." -ForegroundColor White

    # Ask for password with default option
    Write-Host "`n?? PostgreSQL Password:" -ForegroundColor Yellow
    Write-Host "Enter your PostgreSQL superuser (postgres) password." -ForegroundColor White
    Write-Host "If you press Enter without typing, 'password' will be used as default." -ForegroundColor White
    $passwordInput = Read-Host "Password"
    
    if ([string]::IsNullOrWhiteSpace($passwordInput)) {
        $superPassword = "password"
        Write-Host "Using default password: 'password'" -ForegroundColor Green
    }
    else {
        $superPassword = $passwordInput
        Write-Host "Using provided custom password" -ForegroundColor Green
    }

    # Create a batch file to run psql commands
    $batchPath = "$env:TEMP\run_psql_osdag.bat"
    $batchContent = @"
@echo off
echo -------------------------------------------------------------
echo  POSTGRESQL DATABASE SETUP FOR OSDAG-WEB
echo -------------------------------------------------------------
echo.

set PGPASSWORD=$superPassword

echo Connecting to PostgreSQL as user 'postgres'...
echo.
echo Running commands:
echo 1. Creating role 'osdagdeveloper'
echo 2. Creating database 'postgres_Intg_osdag'
echo.

psql -U postgres -c "CREATE ROLE osdagdeveloper PASSWORD 'password' SUPERUSER CREATEDB CREATEROLE INHERIT REPLICATION LOGIN;"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create role 'osdagdeveloper'
    echo.
    echo Possible issues:
    echo - PostgreSQL might not be running
    echo - The password for 'postgres' user might be incorrect
    echo - psql.exe might not be in your PATH
    echo.
    goto :END
) else (
    echo Role 'osdagdeveloper' created or already exists.
)

echo.
psql -U postgres -c "CREATE DATABASE \"postgres_Intg_osdag\" WITH OWNER osdagdeveloper;"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create database 'postgres_Intg_osdag'
    echo.
    goto :END
) else (
    echo Database 'postgres_Intg_osdag' created or already exists.
)

echo.
echo -------------------------------------------------------------
echo  SUCCESS! Database and role created successfully.
echo -------------------------------------------------------------
echo.
echo Database: postgres_Intg_osdag
echo Role: osdagdeveloper
echo Password: password
echo.

:END
echo Press any key to close this window...
pause > nul
"@

    Set-Content -Path $batchPath -Value $batchContent
    
    # Launch the batch file
    Write-Host "`n?? Running PostgreSQL commands..." -ForegroundColor Cyan
    Write-Host "A new window will open to execute the commands. Please wait..." -ForegroundColor Yellow
    
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $batchPath -Wait
    
    # Clean up
    Remove-Item -Path $batchPath -Force -ErrorAction SilentlyContinue
    
    Write-Host "`n?? IMPORTANT:" -ForegroundColor Yellow
    Write-Host "Remember to use these database credentials in Step 16 when configuring Osdag-web:" -ForegroundColor Yellow
    Write-Host "   ?? Username: osdagdeveloper" -ForegroundColor White
    Write-Host "   ?? Password: password" -ForegroundColor White
    Write-Host "   ?? Database: postgres_Intg_osdag" -ForegroundColor White
    
    return $true
}

# === STEP 15: Check Osdag-web folder and checkout winter24 branch ===
function Step-CheckoutOsdagWeb {
    Write-Host "`n" -NoNewline
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 15: CHECKOUT OSDAG-WEB WINTER24 BRANCH         ?" -ForegroundColor Cyan
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    
    Write-Host "`n?? Checking for Osdag-web folder and switching to winter24 branch..."
    
    # Check if Git is installed first
    if (-not (Step-CheckAndDownloadGit)) {
        Write-Host "? Git is not in PATH. Please install Git first." -ForegroundColor Red
        Write-Host "Run Step 11 to install Git." -ForegroundColor Yellow
        return
    }
    
    # Check if Osdag-web folder exists in current directory
    $currentDir = Get-Location
    $osdagWebPath = Join-Path $currentDir "Osdag-web"
    
    if (Test-Path $osdagWebPath) {
        Write-Host "? Found Osdag-web folder at: $osdagWebPath" -ForegroundColor Green
        
        # Change directory to Osdag-web
        Set-Location $osdagWebPath
        
        # Check if it's a git repository
        if (Test-Path (Join-Path $osdagWebPath ".git")) {
            Write-Host "? Osdag-web is a valid Git repository." -ForegroundColor Green
            
            # Attempt to switch to winter24 branch
            Write-Host "`n?? Switching to winter24 branch..." -ForegroundColor Cyan
            
            try {
                # First fetch to make sure we have latest branches
                Write-Host "?? Fetching latest branches..." -ForegroundColor Yellow
                git fetch --all
                
                # Try to switch to winter24 branch
                $output = git checkout winter24 2>&1
                
                # Check if the command succeeded based on output
                if ($output -match "error:" -or $output -match "fatal:") {
                    Write-Host "?? Could not directly switch to winter24 branch." -ForegroundColor Yellow
                    Write-Host "Trying alternative approach..." -ForegroundColor Yellow
                    
                    # Try to create a new local branch tracking the remote winter24
                    $trackOutput = git checkout -b winter24 origin/winter24 2>&1
                    
                    if ($trackOutput -match "error:" -or $trackOutput -match "fatal:") {
                        Write-Host "? Could not switch to winter24 branch. Error details:" -ForegroundColor Red
                        Write-Host "$trackOutput" -ForegroundColor Red
                        
                        # Show additional help for manual switching
                        Write-Host "`n?? Manual instructions to switch to winter24 branch:" -ForegroundColor Yellow
                        Write-Host "1?? Open a new PowerShell window" -ForegroundColor White
                        Write-Host "2?? Run: cd $osdagWebPath" -ForegroundColor White
                        Write-Host "3?? Run: git fetch --all" -ForegroundColor White
                        Write-Host "4?? Run: git checkout winter24" -ForegroundColor White
                        Write-Host "5?? If that doesn't work, try: git checkout -b winter24 origin/winter24" -ForegroundColor White
                    }
                    else {
                        Write-Host "? Successfully created and switched to winter24 branch!" -ForegroundColor Green
                    }
                }
                else {
                    Write-Host "? Successfully switched to winter24 branch!" -ForegroundColor Green
                }
            }
            catch {
                Write-Host "? Error during checkout: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host "Please switch to winter24 branch manually." -ForegroundColor Yellow
            }
            finally {
                # Return to original directory
                Set-Location $currentDir
            }
        }
        else {
            Write-Host "? Osdag-web folder exists but is not a Git repository." -ForegroundColor Red
            Write-Host "Please clone the repository first using Step 11." -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "? Osdag-web folder not found in current directory." -ForegroundColor Red
        Write-Host "Please run Step 12 to clone the repository first." -ForegroundColor Yellow
        return
    }
    
    # Make sure your Miniconda environment from Step 5 is activated
    try {
        $pythonVersion = & python --version 2>&1
        Write-Host "? Python detected: $pythonVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "? Python not found in PATH." -ForegroundColor Red
        Write-Host "Please make sure your Miniconda environment from Step 5 is activated." -ForegroundColor Yellow
        Write-Host "Open Miniconda Prompt and run: conda activate osdag_web" -ForegroundColor Yellow
        return
    }
    
    # Osdag-web folder not found in current directory
    if (-not (Test-Path $osdagWebPath)) {
        Write-Host "? Osdag-web folder not found in current directory." -ForegroundColor Red
        Write-Host "Please run Step 12 to clone the repository first." -ForegroundColor Yellow
        return $false
    }
}

# === STEP 15: Configure PostgreSQL Database Settings in Osdag-web ===
function Step-ConfigurePostgresDB {
    Write-Host "`n" -NoNewline
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 16: CONFIGURE DATABASE SETTINGS                ?" -ForegroundColor Cyan
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    
    Write-Host "`n??? Configuring PostgreSQL Database Settings for Osdag-web..."
    
    # Check if Osdag-web folder exists in current directory
    $currentDir = Get-Location
    $osdagWebPath = Join-Path $currentDir "Osdag-web"
    
    if (-not (Test-Path $osdagWebPath)) {
        Write-Host "? Osdag-web folder not found in current directory." -ForegroundColor Red
        Write-Host "Please run Step 12 to clone the repository first." -ForegroundColor Yellow
        return
    }
    
    # Define file paths
    $settingsPath = Join-Path $osdagWebPath "osdag_web\settings.py"
    $postgresCredsPath = Join-Path $osdagWebPath "osdag_web\postgres_credentials.py"
    $populateDbPath = Join-Path $osdagWebPath "populate_database.py"
    $updateSeqPath = Join-Path $osdagWebPath "update_sequences.py"
    
    # Check if files exist
    $missingFiles = @()
    if (-not (Test-Path $settingsPath)) { $missingFiles += "settings.py" }
    if (-not (Test-Path $populateDbPath)) { $missingFiles += "populate_database.py" }
    if (-not (Test-Path $updateSeqPath)) { $missingFiles += "update_sequences.py" }
    
    if ($missingFiles.Count -gt 0) {
        Write-Host "? Could not find the following files:" -ForegroundColor Red
        foreach ($file in $missingFiles) {
            Write-Host "   - $file" -ForegroundColor Red
        }
        Write-Host "Make sure you have the correct Osdag-web repository and the winter24 branch." -ForegroundColor Yellow
        return
    }

    # Database settings to use for configuration
    $dbSettings = @{
        Name = "postgres_Intg_osdag"
        User = "osdagdeveloper"
        Password = "password"
        Host = "localhost"
        Port = "5432"
    }
    
    Write-Host "`n?? Database Configuration" -ForegroundColor Yellow
    Write-Host "------------------------------------------" -ForegroundColor DarkGray
    Write-Host "Database Name: $($dbSettings.Name)" -ForegroundColor Cyan
    Write-Host "Username: $($dbSettings.User)" -ForegroundColor Cyan
    Write-Host "Password: $($dbSettings.Password)" -ForegroundColor Cyan
    Write-Host "Host: $($dbSettings.Host)" -ForegroundColor Cyan
    Write-Host "Port: $($dbSettings.Port)" -ForegroundColor Cyan
    Write-Host "------------------------------------------" -ForegroundColor DarkGray
    
    $confirm = Read-Host "Confirm applying these database settings to all configuration files? (y/n)"
    if ($confirm -ne "y") {
        Write-Host "? Configuration cancelled." -ForegroundColor Red
        return
    }

    # Update postgres_credentials.py
    $credsUpdated = $false
    if (Test-Path $postgresCredsPath) {
        try {
            # Create new credentials file content
            $newCredsContent = @"
#########################################################
# Author : Atharva Pingale ( FOSSEE Summer Fellow '23 ) #
#########################################################


def get_username() : 
    return "$($dbSettings.User)"

def get_password() :
    return "$($dbSettings.Password)"

def get_host() : 
    return '$($dbSettings.Host)'


def get_port() : 
    return '$($dbSettings.Port)'

def get_database_name() : 
    return '$($dbSettings.Name)'
"@
            # Write the new content
            Set-Content -Path $postgresCredsPath -Value $newCredsContent
            Write-Host "? Updated postgres_credentials.py with correct database settings" -ForegroundColor Green
            $credsUpdated = $true
        }
        catch {
            Write-Host "? Error updating postgres_credentials.py: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Update settings.py directly
    $settingsUpdated = $false
    try {
        # Read settings file
        $settingsContent = Get-Content -Path $settingsPath -Raw
        
        # Create the new DATABASES section
        $databaseSection = @"
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': '$($dbSettings.Name)',
        'USER': '$($dbSettings.User)',
        'PASSWORD': '$($dbSettings.Password)',
        'HOST': '$($dbSettings.Host)',  # This should be the name of the service
        'PORT': '$($dbSettings.Port)',
    }
}
"@
        
        # Replace the existing DATABASES section
        $pattern = '(?s)DATABASES = \{.*?\}(?=\s*#)'
        $updatedSettingsContent = $settingsContent -replace $pattern, $databaseSection
        
        # Save the updated content
        Set-Content -Path $settingsPath -Value $updatedSettingsContent
        Write-Host "? Updated settings.py with correct database configuration" -ForegroundColor Green
        $settingsUpdated = $true
    }
    catch {
        Write-Host "? Error updating settings.py: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Update populate_database.py
    $populateUpdated = $false
    try {
        # Read file
        $populateContent = Get-Content -Path $populateDbPath -Raw
        
        # Create the new connection string
        $connectionLine = "conn = psycopg2.connect(database='$($dbSettings.Name)', host='$($dbSettings.Host)',
                        user='$($dbSettings.User)', password='$($dbSettings.Password)', port='$($dbSettings.Port)')"
        
        # Replace the existing connection line
        $pattern = '(?s)conn = psycopg2\.connect\(.*?(?=\))\)'
        $updatedPopulateContent = $populateContent -replace $pattern, $connectionLine
        
        # Save updated content
        Set-Content -Path $populateDbPath -Value $updatedPopulateContent
        Write-Host "? Updated populate_database.py with correct connection parameters" -ForegroundColor Green
        $populateUpdated = $true
    }
    catch {
        Write-Host "? Error updating populate_database.py: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Update update_sequences.py
    $sequencesUpdated = $false
    try {
        # Read file
        $sequencesContent = Get-Content -Path $updateSeqPath -Raw
        
        # Create the new connection string
        $connectionLine = "conn = psycopg2.connect(database='$($dbSettings.Name)', host='$($dbSettings.Host)',
                        user='$($dbSettings.User)', password='$($dbSettings.Password)', port='$($dbSettings.Port)')"
        
        # Replace the existing connection line
        $pattern = '(?s)conn = psycopg2\.connect\(.*?(?=\))\)'
        $updatedSequencesContent = $sequencesContent -replace $pattern, $connectionLine
        
        # Save updated content
        Set-Content -Path $updateSeqPath -Value $updatedSequencesContent
        Write-Host "? Updated update_sequences.py with correct connection parameters" -ForegroundColor Green
        $sequencesUpdated = $true
    }
    catch {
        Write-Host "? Error updating update_sequences.py: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Report results
    $allUpdated = ($credsUpdated -or -not (Test-Path $postgresCredsPath)) -and $settingsUpdated -and $populateUpdated -and $sequencesUpdated
    
    Write-Host "`n?? Database Configuration Results:" -ForegroundColor Yellow
    Write-Host "------------------------------------------" -ForegroundColor DarkGray
    Write-Host "settings.py: $(if ($settingsUpdated) { "? Updated" } else { "? Failed" })" -ForegroundColor $(if ($settingsUpdated) { "Green" } else { "Red" })
    if (Test-Path $postgresCredsPath) {
        Write-Host "postgres_credentials.py: $(if ($credsUpdated) { "? Updated" } else { "? Failed" })" -ForegroundColor $(if ($credsUpdated) { "Green" } else { "Red" })
    }
    Write-Host "populate_database.py: $(if ($populateUpdated) { "? Updated" } else { "? Failed" })" -ForegroundColor $(if ($populateUpdated) { "Green" } else { "Red" })
    Write-Host "update_sequences.py: $(if ($sequencesUpdated) { "? Updated" } else { "? Failed" })" -ForegroundColor $(if ($sequencesUpdated) { "Green" } else { "Red" })
    
    if ($allUpdated) {
        Write-Host "`n?? DATABASE CONFIGURATION COMPLETED SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "All database files have been updated with the correct settings." -ForegroundColor Green
        Write-Host "Your database should now connect properly when running migrations." -ForegroundColor Green
        
        # Provide next steps
        Write-Host "`n?? NEXT STEPS:" -ForegroundColor Yellow
        Write-Host "------------------------------------------" -ForegroundColor DarkGray
        Write-Host "1?? Make sure PostgreSQL service is running" -ForegroundColor White
        Write-Host "2?? Make sure the database 'postgres_Intg_osdag' exists" -ForegroundColor White
        Write-Host "3?? Go to Step 20 to run the database migrations" -ForegroundColor White
        Write-Host "------------------------------------------" -ForegroundColor DarkGray
    }
    else {
        Write-Host "`n?? Some database files could not be updated." -ForegroundColor Yellow
        Write-Host "You may need to manually edit the files to match these settings:" -ForegroundColor Yellow
        Write-Host "------------------------------------------" -ForegroundColor DarkGray
        Write-Host "Database Name: $($dbSettings.Name)" -ForegroundColor Cyan
        Write-Host "Username: $($dbSettings.User)" -ForegroundColor Cyan
        Write-Host "Password: $($dbSettings.Password)" -ForegroundColor Cyan
        Write-Host "Host: $($dbSettings.Host)" -ForegroundColor Cyan
        Write-Host "Port: $($dbSettings.Port)" -ForegroundColor Cyan
        Write-Host "------------------------------------------" -ForegroundColor DarkGray
    }
    
    # Return to original directory
    Set-Location $currentDir
}

# === STEP 16: Install Visual Studio Build Tools ===
function Step-InstallVSBuildTools {
    Write-Host "`n" -NoNewline
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 17: INSTALL VISUAL STUDIO BUILD TOOLS         ?" -ForegroundColor Cyan
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    
    Write-Host "`n?? Checking for Visual Studio Build Tools..."
    
    # Check if VS Build Tools are already installed
    $vsToolsPaths = @(
        "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2019\BuildTools",
        "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools",
        "${env:ProgramFiles}\Microsoft Visual Studio\2019\BuildTools",
        "${env:ProgramFiles}\Microsoft Visual Studio\2022\BuildTools"
    )
    
    $toolsInstalled = $false
    foreach ($path in $vsToolsPaths) {
        if (Test-Path $path) {
            $toolsInstalled = $true
            Write-Host "? Visual Studio Build Tools found at: $path" -ForegroundColor Green
            break
        }
    }
    
    if ($toolsInstalled) {
        Write-Host "`n? Visual Studio Build Tools are already installed!" -ForegroundColor Green
        Write-Host "You can proceed to the next step." -ForegroundColor Green
        return $true
    }
    
    Write-Host "`n?? Downloading Visual Studio Build Tools installer..."
    
    # URL for VS Build Tools web installer
    $vsUrl = "https://aka.ms/vs/17/release/vs_buildtools.exe"
    $installerPath = "$env:TEMP\vs_buildtools.exe"
    
    try {
        # Download the installer
        Write-Host "?? Downloading from: $vsUrl"
        Write-Host "?? Saving to: $installerPath"
        
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($vsUrl, $installerPath)
        
        if (Test-Path $installerPath) {
            Write-Host "? Download completed successfully!" -ForegroundColor Green
            
            Write-Host "`n?? INSTALLATION INSTRUCTIONS:" -ForegroundColor Yellow
            Write-Host "------------------------------------------------" -ForegroundColor DarkGray
            Write-Host "1?? When the installer opens, select:" -ForegroundColor White
            Write-Host "   ? Desktop development with C++" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "2?? Make sure these components are checked:" -ForegroundColor White
            Write-Host "   ? MSVC v143 - VS 2022 C++ x64/x86 build tools" -ForegroundColor Cyan
            Write-Host "   ? Windows 10/11 SDK" -ForegroundColor Cyan
            Write-Host "   ? C++ CMake tools for Windows" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "3?? Click Install and wait for completion" -ForegroundColor White
            Write-Host "   ?? This may take 15-30 minutes" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "4?? After installation:" -ForegroundColor White
            Write-Host "   ? Restart your computer" -ForegroundColor Cyan
            Write-Host "   ? Continue with the next steps" -ForegroundColor Cyan
            Write-Host "------------------------------------------------" -ForegroundColor DarkGray
            
            $launch = Read-Host "`nLaunch the installer now? (y/n)"
            if ($launch -eq "y") {
                Write-Host "`n?? Launching Visual Studio Build Tools installer..." -ForegroundColor Cyan
                Write-Host "?? Please follow the installation instructions above carefully." -ForegroundColor Yellow
                
                Start-Process -FilePath $installerPath -Wait
                
                Write-Host "`n? Installation process completed!" -ForegroundColor Green
                Write-Host "?? Please restart your computer before proceeding to the next step." -ForegroundColor Yellow
                
                $restart = Read-Host "Would you like to restart your computer now? (y/n)"
                if ($restart -eq "y") {
                    Write-Host "?? Restarting computer in 10 seconds..." -ForegroundColor Yellow
                    Write-Host "Save any open work and close other applications." -ForegroundColor Yellow
                    Start-Sleep -Seconds 10
                    Restart-Computer -Force
                }
            }
            else {
                Write-Host "`n?? You can run the installer later from:" -ForegroundColor Yellow
                Write-Host $installerPath -ForegroundColor White
            }
        }
        else {
            throw "Download completed but installer not found"
        }
    }
    catch {
        Write-Host "? Failed to download Visual Studio Build Tools: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "`n?? Alternative installation method:" -ForegroundColor Yellow
        Write-Host "1. Visit: https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor White
        Write-Host "2. Click Download Build Tools" -ForegroundColor White
        Write-Host "3. Run the installer and follow the instructions above" -ForegroundColor White
        return $false
    }
    
    return $true
}

# === STEP 18: Setup Dependencies from requirements.txt ===
function Step-SetupDependencies {
    Write-Host "`n" -NoNewline
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 18: SETUP DEPENDENCIES FROM REQUIREMENTS.TXT  ?" -ForegroundColor Cyan
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    
    # Detect potential Miniconda/Anaconda paths
    $minicondaPaths = @(
        "$env:USERPROFILE\Miniconda3",
        "$env:USERPROFILE\Anaconda3",
        "$env:USERPROFILE\AppData\Local\Continuum\miniconda3",
        "$env:USERPROFILE\AppData\Local\miniconda3",
        "$env:USERPROFILE\AppData\Local\Continuum\Anaconda3",
        "C:\Miniconda3",
        "C:\Anaconda3",
        "C:\ProgramData\Miniconda3",
        "C:\ProgramData\Anaconda3"
    )
    
    # Find Miniconda installation
    $minicondaPath = $null
    foreach ($path in $minicondaPaths) {
        if (Test-Path "$path\Scripts\conda.exe") {
            $minicondaPath = $path
            break
        }
    }
    
    if (-not $minicondaPath) {
        Write-Host "? Miniconda/Anaconda installation not found." -ForegroundColor Red
        return $false
    }
    
    # Check if Osdag-web directory exists
    $currentDir = Get-Location
    $osdagWebPath = Join-Path $currentDir "Osdag-web"
    
    if (-not (Test-Path $osdagWebPath)) {
        Write-Host "? Osdag-web folder not found in: $currentDir" -ForegroundColor Red
        Write-Host "Please ensure you are in the correct directory." -ForegroundColor Yellow
        return $false
    }
    
    # Check for requirements.txt
    $requirementsPath = Join-Path $osdagWebPath "requirements.txt"
    if (-not (Test-Path $requirementsPath)) {
        Write-Host "? requirements.txt not found in $osdagWebPath" -ForegroundColor Red
        return $false
    }
    
    # Get list of available conda environments
    Write-Host "`n?? Detecting available Miniconda environments..." -ForegroundColor Cyan
    $envList = & "$minicondaPath\Scripts\conda.exe" env list | Where-Object { $_ -match "^\w" -and $_ -notmatch "^#" }
    
    if (-not $envList) {
        Write-Host "? No Miniconda environments found" -ForegroundColor Red
        Write-Host "Please create a Miniconda environment first." -ForegroundColor Yellow
        return $false
    }
    
    # Display available environments
    Write-Host "`nAvailable Miniconda environments:" -ForegroundColor Yellow
    $envArray = @()
    $index = 1
    
    foreach ($env in $envList) {
        $envName = ($env -split '\s+')[0]
        if ($envName -ne "base") {
            Write-Host "$index. $envName" -ForegroundColor White
            $envArray += $envName
            $index++
        }
    }
    
    # Add base environment at the end
    Write-Host "$index. base" -ForegroundColor White
    $envArray += "base"
    
    # Ask user to select an environment
    $selection = $null
    do {
        $selection = Read-Host "`nSelect the Miniconda environment to use (1-$index)"
        if ($selection -match '^\d+$' -and [int]$selection -ge 1 -and [int]$selection -le $index) {
            $selectedEnv = $envArray[[int]$selection - 1]
        }
        else {
            Write-Host "? Invalid selection. Please enter a number between 1 and $index." -ForegroundColor Red
        }
    } while (-not $selectedEnv)
    
    Write-Host "`n? Selected environment: $selectedEnv" -ForegroundColor Green
    
    # Store selected environment name in global variable for other steps
    $global:selectedCondaEnv = $selectedEnv
    $global:minicondaPath = $minicondaPath
    
    # Create a reliable requirements installer Python script
    $requirementsInstallerPath = Join-Path $osdagWebPath "install_requirements.py"
    
    $requirementsInstallerContent = @"
#!/usr/bin/env python
"""
Osdag-web requirements installer
This script safely installs packages from requirements.txt
"""
import subprocess
import sys
import os

def main():
    requirements_file = "requirements.txt"
    
    # Check if file exists
    if not os.path.exists(requirements_file):
        print(f"? ERROR: {requirements_file} not found!")
        sys.exit(1)
    
    print(f"?? Reading requirements from {requirements_file}...")
    with open(requirements_file, "r") as f:
        requirements = [line.strip() for line in f if line.strip() and not line.startswith("#")]
    
    print(f"Found {len(requirements)} packages to install.")
    
    success_count = 0
    failure_count = 0
    skipped_count = 0
    
    # Some packages known to cause issues during installation
    problem_packages = ["pywin32"]
    
    for req in requirements:
        if any(pkg in req for pkg in problem_packages):
            print(f"?? Skipping potentially problematic package: {req}")
            skipped_count += 1
            continue
        
        print(f"\n{'='*60}\nInstalling: {req}\n{'-'*60}")
        try:
            # Try to install with pip
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", req, "--ignore-installed"],
                text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            # Show output
            if result.stdout.strip():
                print(result.stdout)
            
            if result.returncode == 0:
                print(f"? Successfully installed {req}")
                success_count += 1
            else:
                print(f"?? Error installing {req}: {result.stderr}")
                failure_count += 1
        except Exception as e:
            print(f"? Exception when installing {req}: {str(e)}")
            failure_count += 1
    
    print(f"\n{'='*60}\nINSTALLATION SUMMARY\n{'-'*60}")
    print(f"Total packages: {len(requirements)}")
    print(f"? Successfully installed: {success_count}")
    print(f"?? Failed to install: {failure_count}")
    print(f"?? Skipped: {skipped_count}")
    
    if failure_count > 0:
        print("\n?? Some packages failed to install. This might be normal if they were already installed or incompatible.")
        print("You can proceed with the next steps, but if you encounter issues, try installing the failing packages manually.")
    else:
        print("\n?? All packages installed successfully!")

if __name__ == "__main__":
    main()
"@

    # Write the Python script
    Set-Content -Path $requirementsInstallerPath -Value $requirementsInstallerContent
    
    # Prepare the command script for Miniconda prompt
    $commandScript = @"
@echo off
setlocal enabledelayedexpansion
call conda activate $selectedEnv
echo.
echo ? Activated environment: $selectedEnv
echo.
echo ?? Changing to directory: $osdagWebPath
cd /d "$osdagWebPath"
echo.
echo ?? Installing dependencies from Osdag-web/requirements.txt...

echo.
echo ?? NOTE: If some packages are already installed, you may see errors. These can be safely ignored.
echo ?? The script will continue to the next steps regardless.
echo.

:: Run the Python script
echo.
echo ?? Running requirements installation script...
python install_requirements.py

echo ?? Checking installed packages (showing selection)...
pip list | findstr django
pip list | findstr numpy
pip list | findstr psycopg2
echo.
echo ?? Requirements installation completed!
echo.
echo ?? Script completed. Window will close in 10 seconds...
timeout /t 10
exit
"@
    
    # Create a temporary batch file
    $tempBatchFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
    $commandScript | Out-File -FilePath $tempBatchFile -Encoding ASCII
    
    # Launch Miniconda Command Prompt
    Write-Host "`n?? Opening Miniconda Command Prompt to install dependencies..." -ForegroundColor Cyan
    Write-Host "Please follow the on-screen instructions..." -ForegroundColor Yellow
    
    # Create batch file to launch Miniconda Prompt
    $launchScript = @"
@echo off
call "$minicondaPath\Scripts\activate.bat"
start cmd.exe /K "$tempBatchFile"
"@
    
    $launchBatchFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
    $launchScript | Out-File -FilePath $launchBatchFile -Encoding ASCII
    
    # Execute the launch script
    Start-Process $launchBatchFile -Wait
    
    # Clean up temporary batch files
    Remove-Item $tempBatchFile -Force
    Remove-Item $launchBatchFile -Force
    Remove-Item $requirementsInstallerPath -Force -ErrorAction SilentlyContinue
    
    Write-Host "`n? Dependencies from requirements.txt installed!" -ForegroundColor Green
    Write-Host "Continue to Step 19 to install additional packages." -ForegroundColor Yellow
    
    return $true
}

# === STEP 19: Install Additional Conda Packages ===
function Step-InstallAdditionalPackages {
    Write-Host "`n" -NoNewline
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 19: INSTALL ADDITIONAL CONDA PACKAGES         ?" -ForegroundColor Cyan
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    
    # Check if we have the conda environment name from previous step
    if (-not $global:selectedCondaEnv) {
        Write-Host "? No conda environment selected. Please run Step 18 first." -ForegroundColor Red
        return $false
    }
    
    if (-not $global:minicondaPath) {
        Write-Host "? Miniconda path not found. Please run Step 18 first." -ForegroundColor Red
        return $false
    }
    
    $selectedEnv = $global:selectedCondaEnv
    $minicondaPath = $global:minicondaPath
    
    # Check if Osdag-web directory exists
    $currentDir = Get-Location
    $osdagWebPath = Join-Path $currentDir "Osdag-web"
    
    if (-not (Test-Path $osdagWebPath)) {
        Write-Host "? Osdag-web folder not found in: $currentDir" -ForegroundColor Red
        Write-Host "Please ensure you are in the correct directory." -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "`n?? Installing additional conda packages for Osdag-web..." -ForegroundColor Cyan
    Write-Host "Environment: $selectedEnv" -ForegroundColor Cyan
    
    # Prepare the command script for Miniconda prompt
    $commandScript = @"
@echo off
setlocal enabledelayedexpansion
call conda activate $selectedEnv
echo.
echo ? Activated environment: $selectedEnv
echo.
echo ?? Changing to directory: $osdagWebPath
cd /d "$osdagWebPath"
echo.

echo ?? Installing all required packages for Osdag-web...
echo.

:: Create a simple Python script to check and install packages
echo print("Creating package installation helper script...")
echo import sys > install_packages.py
echo import subprocess >> install_packages.py
echo. >> install_packages.py
echo def run_command(cmd): >> install_packages.py
echo     print(f"Running: {' '.join(cmd)}") >> install_packages.py
echo     result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True) >> install_packages.py
echo     print(result.stdout) >> install_packages.py
echo     if result.stderr: >> install_packages.py
echo         print(f"Errors: {result.stderr}") >> install_packages.py
echo     return result.returncode == 0 >> install_packages.py
echo. >> install_packages.py
echo def check_package_installed(package_name): >> install_packages.py
echo     try: >> install_packages.py
echo         __import__(package_name) >> install_packages.py
echo         print(f"? {package_name} is already installed") >> install_packages.py
echo         return True >> install_packages.py
echo     except ImportError: >> install_packages.py
echo         print(f"? {package_name} is not installed") >> install_packages.py
echo         return False >> install_packages.py
echo. >> install_packages.py
echo print("\\n1?? First: Installing conda packages...") >> install_packages.py
echo conda_packages = [ >> install_packages.py
echo     ["conda", "install", "-c", "conda-forge", "pythonocc-core", "pylatex", "-y"], >> install_packages.py
echo ] >> install_packages.py
echo. >> install_packages.py
echo for cmd in conda_packages: >> install_packages.py
echo     print("\\n" + "="*50) >> install_packages.py
echo     run_command(cmd) >> install_packages.py
echo. >> install_packages.py
echo print("\\n2?? Second: Installing critical pip packages...") >> install_packages.py
echo pip_packages = [ >> install_packages.py
echo     ["pip", "install", "psycopg2-binary"], >> install_packages.py
echo     ["pip", "install", "django"], >> install_packages.py
echo     ["pip", "install", "numpy", "pandas", "matplotlib"], >> install_packages.py
echo ] >> install_packages.py
echo. >> install_packages.py
echo for cmd in pip_packages: >> install_packages.py
echo     print("\\n" + "="*50) >> install_packages.py
echo     run_command(cmd) >> install_packages.py
echo. >> install_packages.py
echo print("\\n3?? Verifying installations:") >> install_packages.py
echo critical_packages = ["django", "psycopg2", "numpy", "pandas", "matplotlib"] >> install_packages.py
echo all_installed = True >> install_packages.py
echo print("\\n" + "="*50) >> install_packages.py
echo for package in critical_packages: >> install_packages.py
echo     if not check_package_installed(package): >> install_packages.py
echo         all_installed = False >> install_packages.py
echo. >> install_packages.py
echo if all_installed: >> install_packages.py
echo     print("\\n? All critical packages installed successfully!") >> install_packages.py
echo else: >> install_packages.py
echo     print("\\n?? Some packages may not have installed correctly. Please check the logs above.") >> install_packages.py
echo     print("You may need to run Step 19 again or manually install the missing packages.") >> install_packages.py

:: Run the Python script
echo.
echo ?? Running package installation helper script...
python install_packages.py

:: Delete the temporary script
del install_packages.py

echo.
echo ?? Package installation process completed!
echo.
echo ?? Script completed. Window will close in 10 seconds...
timeout /t 10
exit
"@
    
    # Create a temporary batch file
    $tempBatchFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
    $commandScript | Out-File -FilePath $tempBatchFile -Encoding ASCII
    
    # Launch Miniconda Command Prompt
    Write-Host "`n?? Opening Miniconda Command Prompt to install additional packages..." -ForegroundColor Cyan
    Write-Host "Please follow the on-screen instructions..." -ForegroundColor Yellow
    
    # Create batch file to launch Miniconda Prompt
    $launchScript = @"
@echo off
call "$minicondaPath\Scripts\activate.bat"
start cmd.exe /K "$tempBatchFile"
"@
    
    $launchBatchFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
    $launchScript | Out-File -FilePath $launchBatchFile -Encoding ASCII
    
    # Execute the launch script
    Start-Process $launchBatchFile -Wait
    
    # Clean up temporary batch files
    Remove-Item $tempBatchFile -Force
    Remove-Item $launchBatchFile -Force
    
    Write-Host "`n? Additional conda packages installation attempted!" -ForegroundColor Green
    Write-Host "Continue to Step 20 to modify module_finder.py." -ForegroundColor Yellow
    
    return $true
}

# === STEP 20: Fix Typing Import in module_finder.py ===
function Step-FixTypingImport {
    Write-Host "`n" -NoNewline
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 20: FIX TYPING IMPORT IN MODULE_FINDER.PY     ?" -ForegroundColor Cyan
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    
    # Check if we have the conda environment name from previous step
    if (-not $global:selectedCondaEnv) {
        Write-Host "? No conda environment selected. Please run Step 19 first." -ForegroundColor Red
        return $false
    }
    
    if (-not $global:minicondaPath) {
        Write-Host "? Miniconda path not found. Please run Step 19 first." -ForegroundColor Red
        return $false
    }
    
    $selectedEnv = $global:selectedCondaEnv
    $minicondaPath = $global:minicondaPath
    
    # Check if Osdag-web directory exists
    $currentDir = Get-Location
    $osdagWebPath = Join-Path $currentDir "Osdag-web"
    
    if (-not (Test-Path $osdagWebPath)) {
        Write-Host "? Osdag-web folder not found in: $currentDir" -ForegroundColor Red
        Write-Host "Please ensure you are in the correct directory." -ForegroundColor Yellow
        return $false
    }
    
    # Check if module_finder.py exists
    $moduleFinderPath = Join-Path $osdagWebPath "osdag_api\module_finder.py"
    if (-not (Test-Path $moduleFinderPath)) {
        Write-Host "? module_finder.py not found at: $moduleFinderPath" -ForegroundColor Red
        Write-Host "Please ensure the repository is correctly cloned." -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "`n?? Modifying module_finder.py to fix typing imports..." -ForegroundColor Cyan
    
    # Prepare the command script for Miniconda prompt
    $commandScript = @"
@echo off
setlocal enabledelayedexpansion
call conda activate $selectedEnv
echo.
echo ? Activated environment: $selectedEnv
echo.
echo ?? Changing to directory: $osdagWebPath
cd /d "$osdagWebPath"
echo.
echo ?? Upgrading typing-extensions...
pip install --upgrade typing-extensions
echo.

echo ?? Creating typing import fix script...

:: Create a Python script to modify module_finder.py properly
echo import os > fix_module_finder.py
echo import re >> fix_module_finder.py
echo import sys >> fix_module_finder.py
echo import shutil >> fix_module_finder.py
echo from datetime import datetime >> fix_module_finder.py
echo. >> fix_module_finder.py

echo # Define paths >> fix_module_finder.py
echo module_finder_path = os.path.join("osdag_api", "module_finder.py") >> fix_module_finder.py
echo backup_path = os.path.join("osdag_api", f"module_finder_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.py") >> fix_module_finder.py
echo. >> fix_module_finder.py

echo # Check if file exists >> fix_module_finder.py
echo if not os.path.exists(module_finder_path): >> fix_module_finder.py
echo     print(f"? ERROR: module_finder.py not found at {module_finder_path}") >> fix_module_finder.py
echo     print("Please make sure you're in the correct Osdag-web directory.") >> fix_module_finder.py
echo     sys.exit(1) >> fix_module_finder.py
echo. >> fix_module_finder.py

echo # Create backup of original file >> fix_module_finder.py
echo print(f"?? Creating backup of original file at {backup_path}") >> fix_module_finder.py
echo shutil.copy2(module_finder_path, backup_path) >> fix_module_finder.py
echo. >> fix_module_finder.py

echo # Read the file content >> fix_module_finder.py
echo with open(module_finder_path, 'r') as f: >> fix_module_finder.py
echo     content = f.read() >> fix_module_finder.py
echo. >> fix_module_finder.py

echo # Define patterns to look for >> fix_module_finder.py
echo pattern1 = r'from\s+typing\s+import\s+Dict,\s*Any,\s*List,\s*_Protocol' >> fix_module_finder.py
echo pattern2 = r'from\s+typing_extensions\s+import\s+_Protocol' >> fix_module_finder.py
echo. >> fix_module_finder.py

echo # Check for pattern1 first (common case) >> fix_module_finder.py
echo if re.search(pattern1, content): >> fix_module_finder.py
echo     print("? Found pattern 1: 'from typing import Dict, Any, List, _Protocol'") >> fix_module_finder.py
echo     replacement = 'from typing import Dict, Any, List\\nfrom typing_extensions import Protocol as _Protocol' >> fix_module_finder.py
echo     new_content = re.sub(pattern1, replacement, content) >> fix_module_finder.py
echo     print("?? Replacing with split imports") >> fix_module_finder.py
echo     with open(module_finder_path, 'w') as f: >> fix_module_finder.py
echo         f.write(new_content) >> fix_module_finder.py
echo     print("? Successfully modified module_finder.py") >> fix_module_finder.py
echo     modified = True >> fix_module_finder.py
echo # Check for pattern2 second >> fix_module_finder.py
echo elif re.search(pattern2, content): >> fix_module_finder.py
echo     print("? Found pattern 2: 'from typing_extensions import _Protocol'") >> fix_module_finder.py
echo     replacement = 'from typing_extensions import Protocol as _Protocol' >> fix_module_finder.py
echo     new_content = re.sub(pattern2, replacement, content) >> fix_module_finder.py
echo     print("?? Replacing with 'Protocol as _Protocol'") >> fix_module_finder.py
echo     with open(module_finder_path, 'w') as f: >> fix_module_finder.py
echo         f.write(new_content) >> fix_module_finder.py
echo     print("? Successfully modified module_finder.py") >> fix_module_finder.py
echo     modified = True >> fix_module_finder.py
echo else: >> fix_module_finder.py
echo     print("?? Neither standard pattern was found. Trying full file search...") >> fix_module_finder.py
echo     lines = content.split('\\n') >> fix_module_finder.py
echo     typing_lines = [i for i, line in enumerate(lines) if '_Protocol' in line] >> fix_module_finder.py
echo. >> fix_module_finder.py
echo     if typing_lines: >> fix_module_finder.py
echo         for line_num in typing_lines: >> fix_module_finder.py
echo             print(f"Found _Protocol reference at line {line_num + 1}: {lines[line_num]}") >> fix_module_finder.py
echo. >> fix_module_finder.py
echo         print("\\n?? File structure doesn't match expected patterns. Here are the first 15 lines:") >> fix_module_finder.py
echo         print("="*70) >> fix_module_finder.py
echo         for i in range(min(15, len(lines))): >> fix_module_finder.py
echo             print(f"{i+1:3d}: {lines[i]}") >> fix_module_finder.py
echo         print("="*70) >> fix_module_finder.py
echo. >> fix_module_finder.py
echo         print("\\n?? Attempting manual fix...") >> fix_module_finder.py
echo         # Look for typing import lines >> fix_module_finder.py
echo         typing_import_lines = [i for i, line in enumerate(lines) if 'from typing import' in line] >> fix_module_finder.py
echo         typing_ext_lines = [i for i, line in enumerate(lines) if 'from typing_extensions import' in line] >> fix_module_finder.py
echo. >> fix_module_finder.py
echo         modified = False >> fix_module_finder.py
echo. >> fix_module_finder.py
echo         # Case: There's a typing import but no typing_extensions import >> fix_module_finder.py
echo         if typing_import_lines and not typing_ext_lines: >> fix_module_finder.py
echo             line_num = typing_import_lines[0] >> fix_module_finder.py
echo             print(f"Found typing import at line {line_num + 1}: {lines[line_num]}") >> fix_module_finder.py
echo             lines.insert(line_num + 1, "from typing_extensions import Protocol as _Protocol") >> fix_module_finder.py
echo             if "_Protocol" in lines[line_num]: >> fix_module_finder.py
echo                 lines[line_num] = lines[line_num].replace("_Protocol", "").replace(",,", ",").replace(", ,", ",").rstrip(",") >> fix_module_finder.py
echo                 if lines[line_num].endswith(","): >> fix_module_finder.py
echo                     lines[line_num] = lines[line_num][:-1] >> fix_module_finder.py
echo             print(f"Added typing_extensions import after line {line_num + 1}") >> fix_module_finder.py
echo             modified = True >> fix_module_finder.py
echo. >> fix_module_finder.py
echo         # Case: There's a typing_extensions import but it doesn't use Protocol as _Protocol >> fix_module_finder.py
echo         elif typing_ext_lines: >> fix_module_finder.py
echo             line_num = typing_ext_lines[0] >> fix_module_finder.py
echo             print(f"Found typing_extensions import at line {line_num + 1}: {lines[line_num]}") >> fix_module_finder.py
echo             if "_Protocol" in lines[line_num] and "Protocol as _Protocol" not in lines[line_num]: >> fix_module_finder.py
echo                 lines[line_num] = "from typing_extensions import Protocol as _Protocol" >> fix_module_finder.py
echo                 print(f"Fixed typing_extensions import at line {line_num + 1}") >> fix_module_finder.py
echo                 modified = True >> fix_module_finder.py
echo. >> fix_module_finder.py
echo         if modified: >> fix_module_finder.py
echo             # Write back the modified content >> fix_module_finder.py
echo             with open(module_finder_path, 'w') as f: >> fix_module_finder.py
echo                 f.write('\\n'.join(lines)) >> fix_module_finder.py
echo             print("? Successfully applied manual fix to module_finder.py") >> fix_module_finder.py
echo         else: >> fix_module_finder.py
echo             print("? Couldn't automatically fix the file.") >> fix_module_finder.py
echo             print("\\n?? INSTRUCTIONS FOR MANUAL FIX:") >> fix_module_finder.py
echo             print("1. Open the file: " + module_finder_path) >> fix_module_finder.py
echo             print("2. Look for any import line related to typing and _Protocol") >> fix_module_finder.py
echo             print("3. Make sure you have these two lines:") >> fix_module_finder.py
echo             print("   from typing import Dict, Any, List") >> fix_module_finder.py
echo             print("   from typing_extensions import Protocol as _Protocol") >> fix_module_finder.py
echo             print("4. Save the file after changes") >> fix_module_finder.py
echo     else: >> fix_module_finder.py
echo         print("?? No _Protocol reference found in the file. This might indicate:") >> fix_module_finder.py
echo         print("  - The file has already been fixed") >> fix_module_finder.py
echo         print("  - You have a different version of the file") >> fix_module_finder.py
echo         print("  - The file structure has changed significantly") >> fix_module_finder.py
echo. >> fix_module_finder.py

echo # Show the current imports after modification >> fix_module_finder.py
echo print("\\n?? CURRENT IMPORT LINES IN FILE:") >> fix_module_finder.py
echo print("="*70) >> fix_module_finder.py
echo with open(module_finder_path, 'r') as f: >> fix_module_finder.py
echo     lines = f.readlines() >> fix_module_finder.py
echo     for i, line in enumerate(lines): >> fix_module_finder.py
echo         if 'import ' in line and (i < 20 or 'typing' in line): >> fix_module_finder.py
echo             print(f"{i+1:3d}: {line.rstrip()}") >> fix_module_finder.py
echo print("="*70) >> fix_module_finder.py
echo. >> fix_module_finder.py

echo print("\\n? Module_finder.py processing complete!") >> fix_module_finder.py
echo print(f"Original file backed up to: {backup_path}") >> fix_module_finder.py

:: Run the Python script
echo.
echo ?? Running module_finder.py fix script...
python fix_module_finder.py
set SCRIPT_RESULT=%ERRORLEVEL%

:: Delete the temporary script
del fix_module_finder.py

echo.
if %SCRIPT_RESULT% EQU 0 (
    echo ?? module_finder.py modification process completed!
) else (
    echo ?? There might have been issues with the modification. Check the logs above.
)
echo.
echo ?? Script completed. Window will close in 10 seconds...
timeout /t 10
exit
"@
    
    # Create a temporary batch file
    $tempBatchFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
    $commandScript | Out-File -FilePath $tempBatchFile -Encoding ASCII
    
    # Launch Miniconda Command Prompt
    Write-Host "`n?? Opening Miniconda Command Prompt to modify module_finder.py..." -ForegroundColor Cyan
    Write-Host "Please follow the on-screen instructions..." -ForegroundColor Yellow
    
    # Create batch file to launch Miniconda Prompt
    $launchScript = @"
@echo off
call "$minicondaPath\Scripts\activate.bat"
start cmd.exe /K "$tempBatchFile"
"@
    
    $launchBatchFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
    $launchScript | Out-File -FilePath $launchBatchFile -Encoding ASCII
    
    # Execute the launch script
    Start-Process $launchBatchFile -Wait
    
    # Clean up temporary batch files
    Remove-Item $tempBatchFile -Force
    Remove-Item $launchBatchFile -Force
    
    Write-Host "`n? Module finder typing import fix attempted!" -ForegroundColor Green
    Write-Host "Continue to Step 21 to run database migrations." -ForegroundColor Yellow
    
    return $true
}

# === STEP 21: Run Database Migrations ===
function Step-RunDatabaseMigrations {
    Write-Host "`n" -NoNewline
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 21: RUN DATABASE MIGRATIONS                   ?" -ForegroundColor Cyan
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    
    # Check if we have the conda environment name from previous step
    if (-not $global:selectedCondaEnv) {
        Write-Host "? No conda environment selected. Please run Step 20 first." -ForegroundColor Red
        return $false
    }
    
    if (-not $global:minicondaPath) {
        Write-Host "? Miniconda path not found. Please run Step 20 first." -ForegroundColor Red
        return $false
    }
    
    $selectedEnv = $global:selectedCondaEnv
    $minicondaPath = $global:minicondaPath
    
    # Check if Osdag-web directory exists
    $currentDir = Get-Location
    $osdagWebPath = Join-Path $currentDir "Osdag-web"
    
    if (-not (Test-Path $osdagWebPath)) {
        Write-Host "? Osdag-web folder not found in: $currentDir" -ForegroundColor Red
        Write-Host "Please ensure you are in the correct directory." -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "`n??? Running database setup scripts and migrations..." -ForegroundColor Cyan
    
    # Create a reliable migrations script
    $migrationsScriptPath = Join-Path $osdagWebPath "run_migrations.py"
    
    $migrationsScriptContent = @"
#!/usr/bin/env python
"""
Database migration helper for Osdag-web
This script handles running database migration scripts safely and reports success/failure status
"""

import sys
import subprocess
import importlib.util
import os

def check_module(module_name):
    """Check if a Python module is available"""
    spec = importlib.util.find_spec(module_name)
    if spec is None:
        print(f"? ERROR: Module {module_name} is not installed.")
        print(f"Please run Step 18 first to install required packages.")
        return False
    return True

def run_command(cmd, description):
    """Run a command with proper output handling"""
    print(f"\n{description}")
    print("=" * 70)
    print(f"Running: {' '.join(cmd)}")
    print("-" * 70)
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(f"\n? Command failed with error:")
        print(result.stderr)
        return False
    return True

def main():
    # Check required packages
    required_packages = ["psycopg2", "django"]
    all_packages_available = True
    for package in required_packages:
        if not check_module(package):
            all_packages_available = False
    
    if not all_packages_available:
        print("?? Missing required packages. Please run Step 18 again.")
        sys.exit(1)
    
    # Check if database files exist
    missing_files = []
    if not os.path.exists("populate_database.py"):
        missing_files.append("populate_database.py")
    if not os.path.exists("update_sequences.py"):
        missing_files.append("update_sequences.py")
    if not os.path.exists("manage.py"):
        missing_files.append("manage.py")
    
    if missing_files:
        print(f"? ERROR: The following required files are missing:")
        for file in missing_files:
            print(f"  - {file}")
        print("\nPlease ensure you are in the correct Osdag-web directory.")
        sys.exit(1)
    
    # Run all migration steps
    status = {"populate": False, "sequences": False, "migrate": False}
    
    print("\n??? Running database setup scripts...\n")
    
    # Step 1: Run populate_database.py
    status["populate"] = run_command(["python", "populate_database.py"], "1?? Running populate_database.py")
    
    # Step 2: Run update_sequences.py
    status["sequences"] = run_command(["python", "update_sequences.py"], "2?? Running update_sequences.py")
    
    # Step 3: Run Django migrations
    status["migrate"] = run_command(["python", "manage.py", "migrate"], "3?? Running Django migrations")
    
    # Print summary
    print("\n?? MIGRATION SUMMARY:")
    print("=" * 70)
    print(f"populate_database.py: {'? Success' if status['populate'] else '? Failed'}")
    print(f"update_sequences.py:  {'? Success' if status['sequences'] else '? Failed'}")
    print(f"Django migrations:    {'? Success' if status['migrate'] else '? Failed'}")
    print("=" * 70)
    
    if all(status.values()):
        print("\n?? All database setup steps completed successfully!")
    else:
        print("\n?? Some migration steps failed. See details above.")
        print("You may need to run Step 19 again to ensure all dependencies are installed,")
        print("or check database configuration in Step 14.")

if __name__ == "__main__":
    main()
"@

    # Write the Python script
    Set-Content -Path $migrationsScriptPath -Value $migrationsScriptContent
    
    # Prepare the command script for Miniconda prompt
    $commandScript = @"
@echo off
setlocal enabledelayedexpansion
call conda activate $selectedEnv
echo.
echo ? Activated environment: $selectedEnv
echo.
echo ?? Changing to directory: $osdagWebPath
cd /d "$osdagWebPath"
echo.

echo ?? Running migration helper script...
python run_migrations.py
set MIGRATION_RESULT=%ERRORLEVEL%

echo.
if %MIGRATION_RESULT% EQU 0 (
    echo ?? Database setup and migrations process completed!
) else (
    echo ?? Some issues occurred during migration. Check the logs above.
)
echo.
echo ?? Script completed. Window will close in 10 seconds...
timeout /t 10
exit
"@
    
    # Create a temporary batch file
    $tempBatchFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
    $commandScript | Out-File -FilePath $tempBatchFile -Encoding ASCII
    
    # Launch Miniconda Command Prompt
    Write-Host "`n?? Opening Miniconda Command Prompt to run database migrations..." -ForegroundColor Cyan
    Write-Host "Please follow the on-screen instructions..." -ForegroundColor Yellow
    
    # Create batch file to launch Miniconda Prompt
    $launchScript = @"
@echo off
call "$minicondaPath\Scripts\activate.bat"
start cmd.exe /K "$tempBatchFile"
"@
    
    $launchBatchFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
    $launchScript | Out-File -FilePath $launchBatchFile -Encoding ASCII
    
    # Execute the launch script
    Start-Process $launchBatchFile -Wait
    
    # Clean up temporary batch files
    Remove-Item $tempBatchFile -Force
    Remove-Item $launchBatchFile -Force
    Remove-Item $migrationsScriptPath -Force -ErrorAction SilentlyContinue
    
    Write-Host "`n? Database setup and migrations attempted!" -ForegroundColor Green
    Write-Host "Continue to Step 22 to install Node.js." -ForegroundColor Yellow
    
    return $true
}

# === STEP 24: Run Osdag Web Application ===
function Step-RunOsdagWebApplication {
    Write-Host "`n" -NoNewline
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 24: RUN OSDAG WEB APPLICATION                 ?" -ForegroundColor Cyan
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    
    # Check if we have the conda environment name from previous step
    if (-not $global:selectedCondaEnv) {
        Write-Host "? No conda environment selected. Please run Step 18 first." -ForegroundColor Red
        return $false
    }
    
    if (-not $global:minicondaPath) {
        Write-Host "? Miniconda path not found. Please run Step 18 first." -ForegroundColor Red
        return $false
    }
    
    $selectedEnv = $global:selectedCondaEnv
    $minicondaPath = $global:minicondaPath
    
    # Check if Osdag-web directory exists
    $currentDir = Get-Location
    $osdagWebPath = Join-Path $currentDir "Osdag-web"
    $osdagClientPath = Join-Path $osdagWebPath "osdagclient"
    
    if (-not (Test-Path $osdagWebPath)) {
        Write-Host "? Osdag-web folder not found in: $currentDir" -ForegroundColor Red
        Write-Host "Please ensure you are in the correct directory." -ForegroundColor Yellow
        return $false
    }
    
    if (-not (Test-Path $osdagClientPath)) {
        Write-Host "? osdagclient folder not found in: $osdagWebPath" -ForegroundColor Red
        Write-Host "Please ensure the repository is correctly cloned." -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "`n?? Starting the Osdag-web application..." -ForegroundColor Cyan
    
    # Prepare the command script for Django server
    $djangoScript = @"
@echo off
call conda activate $selectedEnv
echo.
echo ? Activated environment: $selectedEnv
echo.
echo ?? Changing to directory: $osdagWebPath
cd /d "$osdagWebPath"
echo.
echo ?? Starting Django server on port 8000...
python manage.py runserver 8000
"@
    
    # Create a temporary batch file for Django server
    $djangoBatchFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
    $djangoScript | Out-File -FilePath $djangoBatchFile -Encoding ASCII
    
    # Prepare the command script for React client
    $reactScript = @"
@echo off
echo ?? Changing to directory: $osdagClientPath
cd /d "$osdagClientPath"
echo.
echo ?? Installing Node.js dependencies...
call npm install
echo.
echo ?? Starting React development server...
call npm run dev
"@
    
    # Create a temporary batch file for React client
    $reactBatchFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
    $reactScript | Out-File -FilePath $reactBatchFile -Encoding ASCII
    
    # Launch Miniconda Command Prompt for Django server
    Write-Host "`n?? Starting Django server..." -ForegroundColor Cyan
    
    # Create batch file to launch Django server
    $djangoLaunchScript = @"
@echo off
call "$minicondaPath\Scripts\activate.bat"
start cmd.exe /K "$djangoBatchFile"
"@
    
    $djangoLaunchFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
    $djangoLaunchScript | Out-File -FilePath $djangoLaunchFile -Encoding ASCII
    
    # Execute the Django launch script
    Start-Process $djangoLaunchFile
    
    # Wait a bit before starting React server
    Start-Sleep -Seconds 5
    
    # Launch Command Prompt for React client
    Write-Host "`n?? Starting React client..." -ForegroundColor Cyan
    
    # Start React client
    Start-Process "cmd.exe" -ArgumentList "/K", "`"$reactBatchFile`""
    
    # Clean up temporary batch files (delay cleanup to ensure they're used)
    Start-Sleep -Seconds 10
    Remove-Item $djangoBatchFile -Force
    Remove-Item $reactBatchFile -Force
    Remove-Item $djangoLaunchFile -Force
    
    Write-Host "`n? Osdag-web application started successfully!" -ForegroundColor Green
    Write-Host "?? Access the application at: http://localhost:5173/" -ForegroundColor Cyan
    
    Write-Host "`n?? To stop the servers:" -ForegroundColor Yellow
    Write-Host "1. Close the terminal windows" -ForegroundColor White
    Write-Host "2. Or press Ctrl+C in each terminal" -ForegroundColor White
    
    return $true
}

# === STEP 22: Install Node.js (if needed) ===
function Step-InstallNodeJS {
    Write-Host "`n" -NoNewline
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 22: INSTALL NODE.JS                           ?" -ForegroundColor Cyan
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    
    # Check if Node.js is already installed
    try {
        $nodeVersion = node -v 2>&1
        $npmVersion = npm -v 2>&1
        
        if ($nodeVersion -match "v\d+\.\d+\.\d+" -and $npmVersion -match "\d+\.\d+\.\d+") {
            Write-Host "? Node.js is already installed!" -ForegroundColor Green
            Write-Host "   Node.js version: $nodeVersion" -ForegroundColor Green
            Write-Host "   npm version: $npmVersion" -ForegroundColor Green
            Write-Host "`nSkipping installation. You can proceed to Step 23." -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "? Node.js is not installed or not in PATH." -ForegroundColor Red
        Write-Host "Proceeding with installation..." -ForegroundColor Yellow
    }
    
    # Define latest stable Node.js LTS installer URL
    $nodeInstallerUrl = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
    $nodeInstallerPath = "$env:TEMP\node-installer.msi"
    
    Write-Host "`n?? Downloading Node.js installer..." -ForegroundColor Cyan
    
    try {
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($nodeInstallerUrl, $nodeInstallerPath)
        
        if (Test-Path $nodeInstallerPath) {
            Write-Host "? Node.js installer downloaded successfully!" -ForegroundColor Green
            
            # Ask user if they want silent or interactive installation
            Write-Host "`n?? INSTALLATION OPTIONS:" -ForegroundColor Yellow
            Write-Host "1. Silent installation (recommended)" -ForegroundColor White
            Write-Host "2. Interactive installation with GUI" -ForegroundColor White
            
            $installChoice = Read-Host "Choose installation method (1-2)"
            
            if ($installChoice -eq "1") {
                # Silent installation
                Write-Host "`n?? Running silent installation..." -ForegroundColor Cyan
                
                $process = Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $nodeInstallerPath, "/quiet", "/norestart", "ADDLOCAL=ALL" -Wait -PassThru
                
                if ($process.ExitCode -eq 0) {
                    Write-Host "? Node.js installed successfully!" -ForegroundColor Green
                } else {
                    Write-Host "?? Installation may not have completed successfully (Exit code: $($process.ExitCode))." -ForegroundColor Yellow
                    Write-Host "Please try interactive installation or download Node.js manually." -ForegroundColor Yellow
                }
            } else {
                # Interactive installation
                Write-Host "`n?? Launching Node.js installer GUI..." -ForegroundColor Cyan
                Write-Host "Please follow the on-screen instructions to complete installation." -ForegroundColor Yellow
                
                Start-Process -FilePath $nodeInstallerPath -Wait
                Write-Host "? Node.js installation wizard completed!" -ForegroundColor Green
            }
            
            # Refresh PATH to include Node.js
            Write-Host "`n?? Refreshing PATH environment..." -ForegroundColor Cyan
            
            # Define possible Node.js installation paths
            $possibleNodePaths = @(
                "${env:ProgramFiles}\nodejs",
                "${env:ProgramFiles(x86)}\nodejs",
                "$env:APPDATA\npm"
            )
            
            # Add potential Node.js paths to current session
            foreach ($path in $possibleNodePaths) {
                if (Test-Path $path) {
                    if ($env:Path -notlike "*$path*") {
                        $env:Path = "$env:Path;$path"
                    }
                }
            }
            
            # Verify Node.js and npm are available
            try {
                $nodeVersion = node -v 2>&1
                $npmVersion = npm -v 2>&1
                
                if ($nodeVersion -match "v\d+\.\d+\.\d+" -and $npmVersion -match "\d+\.\d+\.\d+") {
                    Write-Host "? Node.js successfully installed and added to PATH!" -ForegroundColor Green
                    Write-Host "   Node.js version: $nodeVersion" -ForegroundColor Green
                    Write-Host "   npm version: $npmVersion" -ForegroundColor Green
                } else {
                    throw "Version check failed"
                }
            } catch {
                Write-Host "?? Node.js installation was completed, but it may not be in your PATH." -ForegroundColor Yellow
                Write-Host "Please restart your terminal or computer before proceeding to Step 23." -ForegroundColor Yellow
            }
            
            # Clean up installer
            Remove-Item $nodeInstallerPath -Force -ErrorAction SilentlyContinue
            
            Write-Host "`n?? NEXT STEPS:" -ForegroundColor Yellow
            Write-Host "------------------------------------------" -ForegroundColor DarkGray
            Write-Host "1?? Proceed to Step 23 to install npm packages" -ForegroundColor White
            Write-Host "2?? If Node.js isn't detected in Step 23, restart your terminal first" -ForegroundColor White
            Write-Host "------------------------------------------" -ForegroundColor DarkGray
            
            return $true
        } else {
            throw "Installer download completed but file not found"
        }
    } catch {
        Write-Host "? Error downloading or installing Node.js: $($_.Exception.Message)" -ForegroundColor Red
        
        # Provide manual installation instructions
        Write-Host "`n?? MANUAL INSTALLATION INSTRUCTIONS:" -ForegroundColor Yellow
        Write-Host "1. Visit https://nodejs.org/en/download/" -ForegroundColor White
        Write-Host "2. Download the Windows Installer (.msi) for your system" -ForegroundColor White
        Write-Host "3. Run the installer and follow the on-screen instructions" -ForegroundColor White
        Write-Host "4. After installation, restart your terminal or computer" -ForegroundColor White
        
        return $false
    }
}

# === STEP 23: Install Frontend npm Dependencies ===
function Step-InstallClientDependencies {
    Write-Host "`n" -NoNewline
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "?  STEP 23: INSTALL FRONTEND DEPENDENCIES             ?" -ForegroundColor Cyan
    Write-Host "+-----------------------------------------------------+" -ForegroundColor Cyan
    
    # Check if Node.js is installed
    try {
        $nodeVersion = node -v
        Write-Host "? Node.js installed: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "? Node.js is not installed. Please run Step 22 first." -ForegroundColor Red
        Write-Host "After installing Node.js, you may need to restart your terminal." -ForegroundColor Yellow
        return $false
    }
    
    # Check if npm is installed
    try {
        $npmVersion = npm -v
        Write-Host "? npm installed: $npmVersion" -ForegroundColor Green
    } catch {
        Write-Host "? npm is not installed. Please run Step 22 first." -ForegroundColor Red
        return $false
    }
    
    # Check if Osdag-web directory exists
    $currentDir = Get-Location
    $osdagWebPath = Join-Path $currentDir "Osdag-web"
    $osdagClientPath = Join-Path $osdagWebPath "osdagclient"
    
    if (-not (Test-Path $osdagWebPath)) {
        Write-Host "? Osdag-web folder not found in: $currentDir" -ForegroundColor Red
        Write-Host "Please run Step 11 to clone the repository first." -ForegroundColor Yellow
        return $false
    }
    
    if (-not (Test-Path $osdagClientPath)) {
        Write-Host "? osdagclient folder not found in: $osdagWebPath" -ForegroundColor Red
        Write-Host "Please ensure the repository is correctly cloned with the winter24 branch." -ForegroundColor Yellow
        return $false
    }
    
    # Check if package.json exists in osdagclient directory
    $packageJsonPath = Join-Path $osdagClientPath "package.json"
    if (-not (Test-Path $packageJsonPath)) {
        Write-Host "? package.json not found in: $osdagClientPath" -ForegroundColor Red
        Write-Host "Please ensure the repository is correctly cloned." -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "`n?? Installing frontend dependencies from package.json..." -ForegroundColor Cyan
    
    # Create a script to run npm install in a new window
    $npmInstallScript = @"
@echo off
cd /d "$osdagClientPath"
echo.
echo ?? Current directory: %CD%
echo.
echo ?? Installing npm dependencies from package.json...
echo.
npm install
set NPM_RESULT=%ERRORLEVEL%
echo.
if %NPM_RESULT% EQU 0 (
    echo ? npm installation completed successfully!
) else (
    echo ?? There were some issues during installation. Check the output above.
)
echo.
echo ?? Press any key to close this window...
pause > nul
"@
    
    # Create a temporary batch file
    $npmBatchFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.bat'
    $npmInstallScript | Out-File -FilePath $npmBatchFile -Encoding ASCII
    
    # Run the batch file
    Write-Host "`n?? Opening command window to install npm dependencies..." -ForegroundColor Yellow
    Write-Host "Please wait for the installation to complete. This may take a few minutes." -ForegroundColor Yellow
    
    # Start the batch file in a new window
    Start-Process "cmd.exe" -ArgumentList "/K", "`"$npmBatchFile`"" -Wait
    
    # Clean up
    Remove-Item $npmBatchFile -Force -ErrorAction SilentlyContinue
    
    Write-Host "`n? Frontend dependencies installation completed!" -ForegroundColor Green
    Write-Host "`n?? NEXT STEPS:" -ForegroundColor Yellow
    Write-Host "------------------------------------------" -ForegroundColor DarkGray
    Write-Host "1?? Run Step 24 to start both backend and frontend servers" -ForegroundColor White
    Write-Host "2?? Or run 'npm run dev' in the osdagclient directory manually" -ForegroundColor White
    Write-Host "------------------------------------------" -ForegroundColor DarkGray
    
    return $true
}

# === Menu UI with improved layout ===
function ShowMenu {
    Write-Host "`n" -NoNewline
    Write-Host "+-----------------------------------------------------------+" -ForegroundColor Magenta
    Write-Host "?                OSDAG-WEB INSTALLATION HELPER                ?" -ForegroundColor Magenta
    Write-Host "+-----------------------------------------------------------+" -ForegroundColor Magenta
    
    Write-Host "`n?? Select a step to run:" -ForegroundColor Cyan
    
    Write-Host "`n?? SYSTEM PREPARATION" -ForegroundColor Yellow
    Write-Host " [1] ?? System Compatibility Check" -ForegroundColor White
    
    Write-Host "`n?? PYTHON ENVIRONMENT" -ForegroundColor Yellow
    Write-Host " [2] ?? Download Python and Add to PATH" -ForegroundColor White
    Write-Host " [3] ?? Navigate to Project Directory" -ForegroundColor White
    Write-Host " [4] ?? Download Miniconda" -ForegroundColor White
    Write-Host " [5] ?? Install Miniconda" -ForegroundColor White
    Write-Host " [6] ?? Setup Conda Environment" -ForegroundColor White
    
    Write-Host "`n?? GIT VERSION CONTROL" -ForegroundColor Yellow
    Write-Host " [10] ?? Check Git Installation & Download Installer" -ForegroundColor White
    Write-Host " [11] ?? Install Git" -ForegroundColor White
    Write-Host " [12] ?? Clone GitHub Repository" -ForegroundColor White
    Write-Host " [15] ?? Checkout winter24 Branch" -ForegroundColor White
    
    Write-Host "`n?? POSTGRESQL DATABASE" -ForegroundColor Yellow
    Write-Host " [7] ?? Download PostgreSQL Installer" -ForegroundColor White
    Write-Host " [8] ?? Install PostgreSQL" -ForegroundColor White
    Write-Host " [9] ?? Add PostgreSQL to System PATH" -ForegroundColor White
    Write-Host " [13] ?? Launch PGAdmin" -ForegroundColor White
    Write-Host " [14] ?? Create PostgreSQL Role + Database" -ForegroundColor White
    Write-Host " [16] ?? Configure Database Settings" -ForegroundColor White
    
    Write-Host "`n?? DEPENDENCIES & BUILD TOOLS" -ForegroundColor Yellow
    Write-Host " [17] ?? Install Visual Studio Build Tools" -ForegroundColor White
    Write-Host " [18] ?? Install Dependencies (requirements.txt)" -ForegroundColor White
    Write-Host " [19] ?? Install Additional Conda Packages" -ForegroundColor White
    Write-Host " [20] ?? Fix Typing Import in module_finder.py" -ForegroundColor White
    Write-Host " [21] ?? Run Database Migrations" -ForegroundColor White
    
    Write-Host "`n?? FRONTEND SETUP & LAUNCH" -ForegroundColor Yellow
    Write-Host " [22] ?? Install Node.js" -ForegroundColor White
    Write-Host " [23] ?? Install Frontend npm Dependencies" -ForegroundColor White
    Write-Host " [24] ?? Run Osdag Web Application" -ForegroundColor White
}

# Function to run the selected step
function RunStep {
    param (
        [int]$step
    )
    
    switch ($step) {
        1 { Step-SystemCompatibilityCheck }
        2 { Step-DownloadAndInstallPython }
        3 { Step-NavigateToDirectory }
        4 { Step-DownloadMinicondaEnvironment }
        5 { Step-InstallMinicondaEnvironment }
        6 { Step-SetupCondaEnvironment }
        7 { Step-DownloadPGInstaller }
        8 { Step-InstallPostgreSQL }
        9 { Step-AddToPath }
        10 { Step-CheckAndDownloadGit }
        11 { Step-InstallGit }
        12 { Step-CloneGitRepo }
        13 { Step-LaunchPGAdmin }
        14 { Step-CreateDB }
        15 { Step-CheckoutOsdagWeb }
        16 { Step-ConfigurePostgresDB }
        17 { Step-InstallVSBuildTools }
        18 { Step-SetupDependencies }
        19 { Step-InstallAdditionalPackages }
        20 { Step-FixTypingImport }
        21 { Step-RunDatabaseMigrations }
        22 { Step-InstallNodeJS }
        23 { Step-InstallClientDependencies }
        24 { Step-RunOsdagWebApplication }
        default { Write-Host "? Invalid selection. Please enter a valid step number." -ForegroundColor Red }
    }
}

# Main program loop
$continue = $true
while ($continue) {
    # Show the menu
    ShowMenu
    
    # Get user selection
    Write-Host "`n?? Enter your choice (1-24), 'all' to run all steps in sequence, or 'exit' to quit:" -ForegroundColor Cyan
    $selection = Read-Host
    
    # Process the selection
    if ($selection -eq "exit") {
        $continue = $false
        Write-Host "`n?? Thank you for using the Osdag-web Installation Helper! Goodbye!" -ForegroundColor Green
    }
    elseif ($selection -eq "all") {
        Write-Host "`n?? Running all steps in sequence..." -ForegroundColor Yellow
        for ($i = 1; $i -le 24; $i++) {
            Write-Host "`n? Running Step $i..." -ForegroundColor Cyan
            RunStep -step $i
            Read-Host "`nPress Enter to continue to the next step..."
        }
        Write-Host "`n?? All steps completed! You can now run Osdag-web." -ForegroundColor Green
    }
    elseif ($selection -match "^\d+$" -and [int]$selection -ge 1 -and [int]$selection -le 24) {
        RunStep -step ([int]$selection)
        Read-Host "`nPress Enter to return to the menu..."
    }
    else {
        Write-Host "? Invalid selection. Please enter a valid step number (1-24), 'all', or 'exit'." -ForegroundColor Red
        Read-Host "Press Enter to continue..."
    }
    
    # Clear the screen for better readability
    Clear-Host
}

# Function to refresh PATH before continuing
function Update-PathEnvironment {
    # Update process environment from registry if needed
    try {
        # Get the current PATH from registry
        $registryPath = 'Registry::HKEY_CURRENT_USER\Environment'
        $userPath = (Get-ItemProperty -Path $registryPath -Name PATH).Path
        
        # Get system PATH
        $systemPath = [Environment]::GetEnvironmentVariable('PATH', 'Machine')
        
        # Combine paths, removing duplicates
        $pathElements = @()
        $pathElements += $userPath -split ';' | Where-Object { $_ }
        $pathElements += $systemPath -split ';' | Where-Object { $_ }
        
        # Convert to HashSet to remove duplicates efficiently
        $pathSet = New-Object System.Collections.Generic.HashSet[string]
        foreach ($element in $pathElements) {
            if ($element) {
                $pathSet.Add($element) | Out-Null
            }
        }
        
        # Set the updated PATH for current process
        $env:Path = $pathSet -join ';'
        
        Write-Host "? PATH environment refreshed from registry" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "?? Could not refresh PATH: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

# SIG # Begin signature block
# This script is unsigned, add a signature block here if needed
# SIG # End signature block


