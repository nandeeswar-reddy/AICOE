@echo off
echo Starting AICOE-X Prototype...

echo ===================================
echo Setting up Backend
echo ===================================
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
start cmd /k "python main.py"

echo ===================================
echo Setting up Frontend
echo ===================================
cd ..\frontend
start cmd /k "npm run dev"

echo ===================================
echo AICOE-X is running!
echo Backend API: http://localhost:8000
echo Frontend UI: http://localhost:5173
echo ===================================
pause
