@echo off
REM HealthCareTree - Setup Script for Windows
REM Chạy script này để cài đặt tất cả dependencies

setlocal enabledelayedexpansion

echo ==========================================
echo 🌱 HealthCareTree - Automated Setup
echo ==========================================
echo.

REM Check Python
echo [*] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [x] Python not found. Please install Python 3.8+
    exit /b 1
)
python --version
echo [+] Python found
echo.

REM Create virtual environment
echo [*] Setting up Python virtual environment...
if not exist "venv" (
    python -m venv venv
    echo [+] Virtual environment created
) else (
    echo [+] Virtual environment already exists
)
echo.

REM Activate venv
call venv\Scripts\activate.bat

REM Install Python packages
echo [*] Installing Python packages...
pip install --upgrade pip
pip install ultralytics opencv-python numpy torch
echo [+] Python packages installed
echo.

REM Check Node.js
echo [*] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [x] Node.js not found. Please install Node.js 14+
    exit /b 1
)
node --version
echo [+] Node.js found
echo.

REM Install Backend dependencies
echo [*] Installing Backend dependencies...
cd src\backend
call npm install
cd ..\..
echo [+] Backend dependencies installed
echo.

REM Create .env file
echo [*] Creating configuration files...
if not exist "src\backend\.env" (
    (
        echo MONGODB_URI=mongodb://localhost:27017/healthcaretree
        echo PORT=3000
        echo NODE_ENV=development
    ) > src\backend\.env
    echo [+] .env file created
)
echo.

REM Download YOLO model
echo [*] Downloading YOLO model...
python -c "from ultralytics import YOLO; YOLO('yolo11n.pt')"
echo [+] YOLO model ready
echo.

REM Summary
echo ==========================================
echo [+] Setup completed successfully!
echo ==========================================
echo.
echo 📝 Next steps:
echo 1. Update IP address in:
echo    - firmware/config.h (SERVER_HOST)
echo    - src/frontend/js/api.js (API_BASE_URL)
echo.
echo 2. Start services (open new terminals):
echo    - MongoDB: mongod
echo    - Backend: cd src\backend && npm start
echo    - Frontend: cd src\frontend && python -m http.server 8000
echo.
echo 3. Upload firmware to ESP32 using Arduino IDE
echo.
echo 4. Visit http://localhost:8000
echo.
echo 📚 For detailed guide, see SETUP_GUIDE.md
echo ==========================================
echo.
pause
