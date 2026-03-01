import requests
import json
import time

BASE_URL = "http://localhost:8000/api"
output = []

def run_test(name, workload_overrides=None, hw_overrides=None):
    output.append(f"\n======================================")
    output.append(f"TEST: {name}")
    output.append(f"======================================")
    
    payload = {
        "workload_input": {
            "job_id": "test_job_001",
            "framework": "pytorch",
            "model_file_path": "simulated_model.pt",
            "batch_size": 64,
            "training_mode": True,
            "precision_mode": "FP32",
            "deadline_hours": 6,
            "priority": "high",
            "parameters_billion": 1.5
        },
        "hardware_input": {
            "config": {
                "cluster_id": "cluster-alpha",
                "total_nodes": 4,
                "gpus_per_node": 8
            },
            "telemetry": {
                "gpu_utilization_pct": 50.0,
                "memory_used_gb": 10.0,
                "network_bandwidth_gbps": 100.0
            }
        }
    }
    
    if workload_overrides:
        payload["workload_input"].update(workload_overrides)
    if hw_overrides:
        payload["hardware_input"]["telemetry"].update(hw_overrides)
        
    res = requests.post(f"{BASE_URL}/optimize", json=payload)
    if res.status_code == 200:
        data = res.json()
        
        stats = {
            "Total_FLOPs": data["workload_features"]["total_flops"],
            "Prediction_Latency_MS": data["prediction"]["predicted_latency_ms"],
            "Prediction_Energy_J": data["prediction"]["predicted_energy_j"],
            "Scheduled_GPUs": data["scheduling_decision"]["allocated_gpus"],
            "Selected_Strategy": data["execution_strategy"]["selected_strategy"],
            "Suggest_Mixed_Precision?": data["kernel_optimizations"]["suggested_mixed_precision"],
            "Final_Latency_MS": data["final_estimated_metrics"]["estimated_final_latency_ms"]
        }
        output.append(f"Result HTTP: 200 OK")
        output.append(f"Key Metrics:\n{json.dumps(stats, indent=2)}")
        
        # Validation checks
        assert stats["Prediction_Latency_MS"] >= 50.0
        assert stats["Prediction_Energy_J"] > 0
        assert stats["Final_Latency_MS"] >= 50.0
        assert stats["Scheduled_GPUs"] >= 1
    else:
        output.append(f"Result HTTP: {res.status_code}")
        output.append(f"Error Detail: {res.text}")

# Normal workload
run_test("1. Standard Workload", workload_overrides={"parameters_billion": 2.0})

# Massive workload (triggers Multi-GPU and Hybrid Strategy)
run_test("2. Massive Workload (High FLOPs/Memory)", 
         workload_overrides={"parameters_billion": 150.0, "batch_size": 512, "precision_mode": "FP16"},
         hw_overrides={"gpu_utilization_pct": 10.0})

# Small Inference workload under extreme memory pressure
run_test("3. Small Workload / Memory Pressure", 
         workload_overrides={"parameters_billion": 0.5, "batch_size": 8, "training_mode": False},
         hw_overrides={"gpu_utilization_pct": 95.0, "memory_used_gb": 310.0})

# Invalid Workload
run_test("4. Invalid Negative Input", workload_overrides={"batch_size": -10, "parameters_billion": -5.0})

with open("hardening_validation_results.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output))

print("Validation complete. Check hardening_validation_results.txt")
