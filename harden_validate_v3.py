import requests
import json
import os
import sys

URL_OPTIMIZE = "http://127.0.0.1:8000/api/optimize"
URL_EXPLAIN = "http://127.0.0.1:8000/api/explain"

def run_test(name, payload, job_id):
    print(f"\n======================================")
    print(f"TEST: {name}")
    print(f"======================================")
    
    response = requests.post(URL_OPTIMIZE, json=payload)
    print(f"HTTP Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        # Verify explainability map logic
        exp_res = requests.get(f"{URL_EXPLAIN}/{job_id}")
        if exp_res.status_code == 200:
            exp_data = exp_res.json()
        else:
            exp_data = {"error": "Explain endpoint failed"}
            
        summary = {
            "Job_ID": job_id,
            "Hardware_Capability_Detected": exp_data.get("hardware_detected_capability", {}),
            "Bottleneck": exp_data.get("primary_bottleneck", ""),
            "RL_Explaination": exp_data.get("decision_reasoning", ""),
            "Scheduled_GPUs": data["scheduling_decision"]["allocated_gpus"],
            "Selected_Strategy": data["execution_strategy"]["selected_strategy"],
            "Final_Cost_Reward_Score": data["final_estimated_metrics"]["cost_score_normalized"]
        }
        print(json.dumps(summary, indent=2))
        return summary
    else:
        print("Failed. Response:")
        print(response.text)
        return None

def main():
    print("=== AICOE-X SELF-ADAPTIVE HARDWARE VALIDATION ===")
    
    # We will test two distinct hardware profiles: True Autonomy Simulation 
    # Since we can't physically rip the GPU out of the host machine dynamically via software without crashing torch, 
    # we will rely on the real hardware detection running now (e.g. 1 GPU or CPU only)
    
    results = []

    # Test 1: Standard Autonomy Bounds
    p1 = {
        "workload_input": {
            "job_id": "test_autonomy_1",
            "framework": "pytorch",
            "model_file_path": "",
            "batch_size": 32,
            "training_mode": True,
            "precision_mode": "FP16",
            "deadline_hours": 12.0,
            "parameters_billion": 10.0
        },
        "hardware_input": {
            "config": {
                "cluster_id": "auto_detect_cluster",
                "total_nodes": 1,
                "gpus_per_node": 1 # Hardcoded inputs ignored by Autonomy if physical profiling overrides
            },
            "telemetry": {
                "gpu_utilization_pct": 50.0,
                "memory_used_gb": 10.0,
                "network_bandwidth_gbps": 100.0
            }
        }
    }
    r = run_test("1. Standard Self-Adaptive Profiling", p1, "test_autonomy_1")
    if r: results.append(r)
    
    # Test 2: Huge Memory Ceiling Attack (Trigger Interconnect Bottleneck / Execution Shift)
    p2 = {
        "workload_input": {
            "job_id": "test_autonomy_2",
            "framework": "pytorch",
            "model_file_path": "",
            "batch_size": 128,
            "training_mode": True,
            "precision_mode": "FP32",
            "deadline_hours": 24.0,
            "parameters_billion": 250.0 # Force massive spill
        },
        "hardware_input": {
            "config": {
                "cluster_id": "auto_detect_cluster",
                "total_nodes": 1,
                "gpus_per_node": 1 
            },
            "telemetry": {
                "gpu_utilization_pct": 99.0, # Push latency up
                "memory_used_gb": 40.0,
                "network_bandwidth_gbps": 10.0
            }
        }
    }
    r = run_test("2. VRAM Spillage & Utilization Attack", p2, "test_autonomy_2")
    if r: results.append(r)
    
    print("\n======================================")
    print("TEST: RL Persistence Check")
    print("======================================")
    q_table_path = os.path.join(os.getcwd(), "backend", "persistence", "q_table.json")
    if os.path.exists(q_table_path):
        print(f"Persistence File exists: {q_table_path}")
        with open(q_table_path, "r") as f:
            q_table = json.load(f)
            print(f"RL States Tracked natively on disk: {len(q_table)}")
    else:
        print("Persistence file not found!")

    with open("autonomy_validation_log.txt", "w") as f:
        f.write("=== AICOE-X SELF-ADAPTIVE HARDWARE VALIDATION ===\n\n")
        f.write(json.dumps(results, indent=2))
        f.write(f"\n\nQ-Table Path Valid: {os.path.exists(q_table_path)}\n")
        
    print("\nSelf-Adaptive validation complete. Log written.")

if __name__ == "__main__":
    main()
