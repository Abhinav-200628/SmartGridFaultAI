"""
SmartGridFaultAI Configuration and Standard Electrical Constants.
"""


class ElectricalConstants:
    """Standard transmission line and grid physical parameters."""
    # ACSR Conductor typical per-km parameters (Drake / Partridge conductors)
    R1_PER_KM: float = 0.125    # Positive/Negative sequence resistance (Ohm/km)
    L1_PER_KM: float = 1.25e-3  # Positive/Negative sequence inductance (H/km)
    
    # Zero sequence parameters (with typical earth return path)
    R0_PER_KM: float = 0.375    # Zero sequence resistance (Ohm/km) ~ 3 * R1
    L0_PER_KM: float = 3.75e-3  # Zero sequence inductance (H/km) ~ 3 * L1
    
    # Ground return parameters
    GROUND_RESISTANCE: float = 0.5   # Substation ground grid resistance (Ohm)
    GROUND_INDUCTANCE: float = 0.001 # Ground return loop inductance (H)


class AppConfig:
    """Backend server configuration."""
    PROJECT_NAME: str = "SmartGridFaultAI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]


config = AppConfig()
constants = ElectricalConstants()
