import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const runFullOptimization = async (workloadData: any, hardwareData: any) => {
    try {
        const response = await apiClient.post('/optimize', {
            workload_input: workloadData,
            hardware_input: hardwareData,
        });
        return response.data;
    } catch (error) {
        console.error('Error running optimization:', error);
        throw error;
    }
};

export const fetchCapabilityProfile = async () => {
    const res = await apiClient.get('/capability_profile');
    return res.data;
};

export const fetchTelemetry = async () => {
    const res = await apiClient.get('/telemetry');
    return res.data;
};

export const fetchCalibrationStatus = async () => {
    const res = await apiClient.get('/calibration_status');
    return res.data;
};

export const fetchRLStatus = async () => {
    const res = await apiClient.get('/rl_status');
    return res.data;
};

export const fetchExplanation = async (jobId: string) => {
    const res = await apiClient.get(`/explain/${jobId}`);
    return res.data;
};
