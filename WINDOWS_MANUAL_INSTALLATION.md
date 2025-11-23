## Manual Installation Guide for Osdag on Windows

This guide covers the manual steps to set up Osdag-web on a Windows machine, including Python, Miniconda, PostgreSQL, Git, and Node.js setups.

---

### Step 1: System Compatibility Check

- **Requirements**: Ensure your Windows system meets minimum requirements.
- **PowerShell execution policy**: Verify that PowerShell execution policies allow running scripts if needed.

---

### Step 2: Install Python

1. Visit the official Python downloads page: [python.org/downloads](https://www.python.org/downloads)
2. Download the latest Windows 64-bit installer.
3. Run the installer with these options:
   - Check "Add Python to PATH".
   - Choose "Install for all users" if available.
4. After installation, restart your terminal or computer.
5. Verify installation by running in PowerShell:

```powershell
python --version
pip --version
```

---

### Step 3: Set Up Project Directory

1. Decide where to set up your Osdag project (Desktop, Documents, or a custom path).
2. Create the directory manually or verify an existing directory for the project.
3. Inside the project directory, create a marker file `osdag-web-installation.txt` containing project identification and instructions. Example content:

```
OSDAG-WEB INSTALLATION PROJECT

This directory was set up for Osdag-web installation on [date].
```

4. Use this project directory as your working folder for the Osdag installation.

---

### Step 4: Install Miniconda

1. Go to the Miniconda download page: [docs.conda.io/en/latest/miniconda.html](https://docs.conda.io/en/latest/miniconda.html)
2. Download the Miniconda3 Windows 64-bit installer.
3. Run the installer choosing one of the following installation directories:
   - User folder (recommended)
   - System folder (requires admin rights)
   - Custom location
4. If installing in a system folder, run the installer as Administrator.
5. Initialize Miniconda and restart your terminal.

---

### Step 5: Setup Conda Environment

- Create and activate the required Conda environment using the environment file provided in the Osdag project.
- Run these commands inside the project folder:

```powershell
conda env create -f environment.yml
conda activate osdag-env
```

---

### Step 6: Install PostgreSQL

1. Download the PostgreSQL installer from: [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Run the installer with default settings, setting:
   - Username: `postgres`
   - Password: your choice (remember this for later)
3. Add the PostgreSQL `bin` folder to your system `PATH`.

---

### Step 7: Setup PostgreSQL Database

1. Open PGAdmin 4 (search in Start Menu).
2. Connect to the PostgreSQL server with the above credentials.
3. Create a role/user for Osdag:
   - Username: `osdagdeveloper`
   - Password: `password` (or your secure password)
   - Assign necessary privileges (superuser, createdb, createrole).
4. Create a new database, ownership set to the above role:
   - Database name: `postgresIntgosdag`

---

### Step 8: Install Git

1. Download Git for Windows from: [git-scm.com/download/win](https://git-scm.com/download/win)
2. Run the installer with recommended settings:
   - Use Git from Git Bash and Windows Command Prompt.
   - Use OpenSSH.
   - Enable Git Credential Manager.
3. Restart terminal after installation.
4. Verify installation by running:

```powershell
git --version
```

---

### Step 9: Clone Osdag Web Project

1. Fork the `Osdag-web` repository on GitHub (ensure you copy all branches, especially the `winter24` branch).
2. Clone your forked repository locally into your project directory:

```powershell
git clone -b winter24 https://github.com/YOUR-USERNAME/Osdag-web.git
```

3. Navigate into the repository directory.

---

### Step 10: Install Dependencies and Build Tools

1. Install Visual Studio Build Tools from the official Microsoft site if not installed.
2. Inside the project directory, use Conda to install additional required packages if specified.
3. Install Python dependencies:

```powershell
pip install -r requirements.txt
```

4. Apply any required typing/import fixes as per project instructions (if applicable).

---

### Step 11: Install Node.js and Client Dependencies

1. Download and install Node.js from: [nodejs.org/en/download](https://nodejs.org/en/download/)
2. Inside the frontend client directory (`osdagclient`), install npm dependencies:

```powershell
cd osdagclient
npm install
```

---

### Step 12: Database Migrations and Setup

1. Run Django database migrations from the project root (where `manage.py` resides):

```powershell
python manage.py migrate
```

2. Create any necessary superusers or admin accounts:

```powershell
python manage.py createsuperuser
```

---

### Step 13: Run Osdag Web Application

1. Start the backend server:

```powershell
python manage.py runserver
```

2. Start the frontend server (in `osdagclient`):

```powershell
npm run dev
```

3. Access the web app through the appropriate localhost ports as configured (typically `http://127.0.0.1:8000` for backend and a separate port for frontend dev server).

---

### Additional Tips

- **Restart after major installs**: Restart your terminal or computer after major installations like Python, Miniconda, Git, or PostgreSQL to ensure PATH updates.
- **Marker file**: Keep the project marker file `osdag-web-installation.txt` to identify the installation directory.
- **Admin privileges**: Use administrative privileges when required, especially for installations affecting system directories or services.

---

This manual guide outlines the essential steps extracted and adapted from the provided automated script for a Windows environment setup of Osdag-web.


