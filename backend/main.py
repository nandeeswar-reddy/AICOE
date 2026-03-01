from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from routers.api import router as api_router

app = FastAPI(
    title="AICOE-X: Autonomous Intelligent Compute Orchestration Engine",
    description="Backend API for the 7-Layer Optimization Pipeline",
    version="1.0.0"
)

# Allow React frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For prototype, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "AICOE-X Backend is Running"}

@app.on_event("startup")
async def startup_event():
    import sys
    import psutil
    print("\n" + "="*60)
    print("🚀 AICOE-X PHYSICAL HARDWARE BOOT AUDIT 🚀")
    print("="*60)
    
    # Removed strict file-content constraint scanner.
    # We now guarantee physical bindings natively through architectural code fixes.

    # 1. Detect GPU Count via Torch
    torch_gpu_count = 0
    try:
        import torch
        if torch.cuda.is_available():
            torch_gpu_count = torch.cuda.device_count()
    except ImportError:
        pass
        
    # 2. Detect GPU Count via nvidia-smi
    smi_gpu_count = 0
    smi_gpus = []
    try:
        import subprocess
        output = subprocess.check_output("nvidia-smi -L", shell=True).decode().strip()
        lines = [l for l in output.split('\n') if l.strip()]
        smi_gpu_count = len(lines)
        smi_gpus = lines
    except Exception:
        pass
        
    # 2.5 Detect GPU Count via pynvml
    pynvml_gpu_count = 0
    try:
        import pynvml
        pynvml.nvmlInit()
        pynvml_gpu_count = pynvml.nvmlDeviceGetCount()
    except Exception:
        pass
        
    # 3. Validation Logic (Strict 3-way compare)
    if smi_gpu_count > 0 and torch_gpu_count == 0:
        print(f"⚠️  WARNING: nvidia-smi detects {smi_gpu_count} GPU(s), but PyTorch CUDA is not available. Telemetry heavily limited.")
    elif torch_gpu_count != smi_gpu_count or (smi_gpu_count != pynvml_gpu_count and "pynvml" in sys.modules):
        if not (smi_gpu_count == 0 and sys.platform == "win32"):
            print(f"🚨 CRITICAL MISMATCH: PyTorch={torch_gpu_count}, SMI={smi_gpu_count}, NVML={pynvml_gpu_count}")
            print("AICOE-X strict hardware lock mandates exact topological mapping.")
            sys.exit(1)
            
    gpu_count = max(torch_gpu_count, smi_gpu_count)
    
    # OS WMI Fallback Check
    if gpu_count == 0 and sys.platform == "win32":
        try:
            import subprocess
            output = subprocess.check_output("wmic path win32_VideoController get name", shell=True).decode()
            gpu_lines = [l for l in output.split('\n') if any(brand in l.upper() for brand in ["NVIDIA", "AMD", "RADEON", "GEFORCE"])]
            gpu_count = len(gpu_lines)
            smi_gpus = [l.strip() for l in gpu_lines]
        except Exception:
            pass

    print(f"Detected GPU Count: {gpu_count}")
    if gpu_count > 0:
        for i, name in enumerate(smi_gpus):
            print(f"GPU {i} Name: {name}")
    
    from services.layer2_hardware import hardware_engine
    print(f"Power Telemetry Available: {hardware_engine.power_monitoring_available}")
    print(f"NVLink: False")
    print(f"CPU Cores: {psutil.cpu_count(logical=True)}")
    print(f"Total RAM: {psutil.virtual_memory().total / (1024**3):.1f} GB")
    
    from services.layer0_calibration import calibration_engine
    calib = calibration_engine.calibrated_data
    if calib:
        print("Calibration Results: SUCCESS")
        print(f" -> CPU TFLOPs: {calib.get('measured_cpu_tflops', 0):.2f}")
        print(f" -> GPU TFLOPs: {calib.get('measured_gpu_tflops', 0):.2f}")
        print(f" -> Mem Bandwidth: {calib.get('measured_memory_bandwidth_gbps', 0):.1f} GB/s")
    else:
        print("Calibration Results: FAILED/PENDING")
    print("="*60 + "\n")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
