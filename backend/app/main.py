"""
FastAPI Main Application for SmartGridFaultAI.
Provides REST API endpoints for dynamic 3-phase power waveform generation and fault simulation.
"""
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.config import config
from app.models.schemas import SimulationInput, SimulationResult
from app.simulation.engine import ElectricalSimulationEngine

app = FastAPI(
    title="SmartGridFaultAI - Simulation & Protection API",
    description=(
        "Backend REST API for AI-Based Smart Grid Fault Detection, "
        "Classification, Localization & Automatic Switching System."
    ),
    version=config.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for React/Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["General"])
def read_root():
    """Root status and welcome endpoint."""
    return {
        "project": config.PROJECT_NAME,
        "version": config.VERSION,
        "status": "ONLINE",
        "description": "Smart Grid Dynamic Waveform Simulation Engine",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend operational readiness."""
    return {
        "status": "HEALTHY",
        "version": config.VERSION,
        "simulation_engine": "READY",
    }


@app.post(
    "/api/simulation/run",
    response_model=SimulationResult,
    status_code=status.HTTP_200_OK,
    tags=["Simulation"],
    summary="Execute dynamic three-phase power waveform simulation",
)
def run_simulation_endpoint(payload: SimulationInput) -> SimulationResult:
    """
    Executes a numerical simulation run for a 3-phase AC power system.
    Dynamically generates time-domain waveforms (Va, Vb, Vc, Ia, Ib, Ic)
    under normal operating conditions or specified fault scenarios (LG, LL, LLG, LLL, Open-Circuit).
    """
    try:
        result = ElectricalSimulationEngine.run_simulation(payload)
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation calculation error: {str(exc)}",
        )
