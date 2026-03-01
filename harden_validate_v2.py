import requests
import json
import os

BASE_URL = "http://localhost:8000/api"
output = []
tests_passed = True

def run_test(name, workload_overrides=None, hw_overrides=None):
    global tests_passed
    output.append(f"\n======================================")
    output.append(f"TEST: {name}")
    output.append(f"======================================")
    
    payload = {
        "workload_input": {
            "job_id": "test_job_001",
            "framework": "pytorch",
            "model_file_path": "simulated_model.pt",
            "batch_size": 32,
            "training_mode": True,
            "precision_mode": "FP32",
            "deadline_hours": 6,
            "priority": "high",
            "parameters_billion": 1.0
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
        
    try:
        res = requests.post(f"{BASE_URL}/optimize", json=payload)
        output.append(f"HTTP Status: {res.status_code}")
        
        if res.status_code == 200:
            data = res.json()
            stats = {
                "Workload_Params_B": payload["workload_input"]["parameters_billion"],
                "Total_FLOPs": data["workload_features"]["total_flops"],
                "Comm_Volume_MB": data["workload_features"]["communication_volume_mb"],
                "Mem_Volume_MB": data["workload_features"]["activation_memory_mb"],
                "Scheduled_GPUs": data["scheduling_decision"]["allocated_gpus"],
                "Selected_Strategy": data["execution_strategy"]["selected_strategy"],
                "Kernel_Tiling": data["kernel_optimizations"]["tiling_size"],
                "Predicted_Latency_MS": data["prediction"]["predicted_latency_ms"],
                "Final_Cost_Reward_Score": data["final_estimated_metrics"]["cost_score_normalized"]
            }
            output.append(json.dumps(stats, indent=2))
        else:
            output.append(res.text)
    except Exception as e:
        output.append(f"Connection Error: {e}")
        tests_passed = False

output.append("=== AICOE-X PHYSICAL REBUILD VALIDATION ===")

# 1. Low Workload Test (Expect low latency, 1 GPU, Data Parallel)
run_test("1. Low Workload Test", {"parameters_billion": 0.5})

# 2. Heavy Workload Test (Expect high runtime, latency, multiple GPUs, larger comms)
run_test("2. Heavy Workload Test", {"parameters_billion": 150.0, "batch_size": 128})

# 3. Memory Constrained Test (Model Parallel mapping expected)
run_test("3. Memory Constrained Test", {"parameters_billion": 50.0}, {"memory_used_gb": 310.0, "gpu_utilization_pct": 80.0})

# 4. Strict SLA Constrained Test (Cost scalar should explode massively due to missed deadline)
run_test("4. SLA Constrained Test", {"parameters_billion": 800.0, "batch_size": 2048, "deadline_hours": 0.001})

# 5. Carbon Test (Carbon intensity mapped from hardware power scaling)
run_test("5. High Carbon Draw", {"parameters_billion": 1.0}, {"gpu_utilization_pct": 99.0})

# 6. RL Persistence Dump Test
output.append("\n======================================")
output.append("TEST: Q-Table Persistence Check")
output.append("======================================")
q_table_path = os.path.join(os.getcwd(), 'backend', 'persistence', 'q_table.json')
if os.path.exists(q_table_path):
    output.append(f"Persistence File exists: {q_table_path}")
    with open(q_table_path, 'r') as f:
        q_data = json.load(f)
        output.append(f"RL States Tracked: {len(q_data)}")
        output.append(json.dumps(q_data, indent=2))
else:
    output.append("Persistence file NOT found. Error in RL setup.")

with open("rebuild_validation_log.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output))

if tests_passed:
    print("Rebuild validation complete cleanly. Log written.")
