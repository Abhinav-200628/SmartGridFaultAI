"""
SmartGridFaultAI Backend Server Runner.
Launches the FastAPI ASGI application on host 127.0.0.1 and port 8000.
"""
import sys
import os
import uvicorn

# Ensure the backend directory is in the Python module search path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    print("=" * 70)
    print(" SmartGridFaultAI - Backend Simulation Engine Server")
    print(" API Documentation: http://127.0.0.1:8000/docs")
    print(" Health Endpoint:   http://127.0.0.1:8000/api/health")
    print(" Simulation API:    http://127.0.0.1:8000/api/simulation/run")
    print("=" * 70)
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
    )
