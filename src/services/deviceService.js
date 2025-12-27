import axios from 'axios';
import {
    DEVICE_TYPE,
    AWS_DEVICE_LOCATION_API_KEY,
    AAGAH_DEVICE_KEY,
    DEVICES_API_URL,
    DATA_API_URL,
    DEVICE_INFO_API_URL,
    REGISTER_DEVICE_API_URL,
    ALERTS_API_URL,
    ALERTS_API_KEY,
    MEDIA_API_URL,
    MEDIA_API_KEY,
    ADMIN_LOGIN_API_URL,
    ADMIN_LOGIN_API_KEY
} from '@env';

const headers = {
    'Content-Type': 'application/json',
    'x-api-key': AWS_DEVICE_LOCATION_API_KEY,
};

export const fetchDevices = async (latitude, longitude, email) => {
    try {
        const response = await axios.post(
            DEVICES_API_URL,
            {
                latitude,
                longitude,
                radius: 40000,
                email,
            },
            { headers }
        );
        console.log(response.data)
        return response.data;
    } catch (error) {
        console.error('Error fetching devices:', error);
        throw error;
    }
};

export const addDevice = async (latitude, longitude, email, deviceId) => {
    try {
        const response = await axios.post(
            DEVICES_API_URL,
            {
                latitude,
                longitude,
                radius: 40000,
                email,
                deviceId,
            },
            { headers }
        );
        return response.data;
    } catch (error) {
        console.error('Error adding device:', error);
        throw error;
    }
};

export const fetchDeviceData = async (deviceId, metric, startDate, endDate) => {
    try {
        console.log('Fetching data:', { deviceId, metric, startDate, endDate });
        const response = await axios.get(DATA_API_URL, {
            params: {
                device_id: deviceId,
                metric: metric,
                start_date: startDate,
                end_date: endDate
            },
            // Note: Data API might not need the same x-api-key if it's open or uses different auth. 
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${metric} data:`, error);
        // Return empty array on error to prevent app crash
        return [];
    }
};

export const getDeviceInfo = async (deviceId) => {
    try {
        const response = await axios.post(
            DEVICE_INFO_API_URL,
            { device_id: deviceId },
            { headers: { 'Content-Type': 'application/json' } }
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching device info:', error);
        return null;
    }
};

export const registerDeviceToken = async (deviceToken, email, latitude, longitude) => {
    try {
        const body = {
            deviceToken: deviceToken,
            email: email,
            isAdmin: DEVICE_TYPE === 'admin' ? "true" : "false",
        };

        if (latitude && longitude) {
            body.latitude = String(latitude);
            body.longitude = String(longitude);
        }

        const response = await fetch(REGISTER_DEVICE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': AAGAH_DEVICE_KEY,
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (response.ok) {

            console.log('Registration Success:', data.message);
            return data;
        } else {
            console.error('Registration Failed:', data);
        }
    } catch (error) {
        console.error('Network Error during registration:', error);
    }
};

export const fetchAlerts = async (latitude, longitude) => {
    try {
        const response = await fetch(ALERTS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ALERTS_API_KEY,
            },
            body: JSON.stringify({
                action: "get",
                latitude: latitude,
                longitude: longitude,
            }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching alerts:', error);
        throw error;
    }
};

export const resolveAlert = async (alertId, deviceId, alert_timestamp, latitude, longitude) => {
    try {
        const response = await fetch(ALERTS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ALERTS_API_KEY,
            },
            body: JSON.stringify({
                action: "set",
                alert_id: alertId,
                device_id: deviceId,
                alert_timestamp: alert_timestamp,
                latitude: latitude,
                longitude: longitude,
            }),
        });

        console.log(JSON.stringify({
            action: "set",
            alert_id: alertId,
            device_id: deviceId,
            alert_timestamp: alert_timestamp,
            latitude: latitude,
            longitude: longitude,
        }));
        const data = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        console.error('Error resolving alert:', error);
        throw error;
    }
};

export const deleteAlert = async (alertId, alert_timestamp) => {
    try {
        const response = await fetch(ALERTS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ALERTS_API_KEY,
            },
            body: JSON.stringify({
                action: "delete",
                alert_id: alertId,
                alert_timestamp: alert_timestamp,
            }),
        });

        console.log("Delete Alert API Response Status:", response.status);
        const data = await response.json();
        console.log("Delete Alert API Data:", data);
        return data;
    } catch (error) {
        console.error('Error deleting alert:', error);
        throw error;
    }
};

export const createAlert = async (alertData) => {
    try {
        console.log("Sending Create Alert Request:", { headers: { ...headers, action: 'create' }, body: alertData });
        const response = await fetch(ALERTS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ALERTS_API_KEY,
                'action': 'create'
            },
            body: JSON.stringify(alertData),
        });

        console.log("Create Alert API Response Status:", response.status);
        const text = await response.text();
        console.log("Create Alert API raw response:", text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.warn("Could not parse response as JSON");
            data = { message: text };
        }

        return data;
    } catch (error) {
        console.error('Error creating alert:', error);
        throw error;
    }
};

export const fetchDeviceMedia = async (deviceId, year, month, day, type) => {
    try {
        const response = await fetch(MEDIA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': MEDIA_API_KEY,
            },
            body: JSON.stringify({
                device_id: deviceId,
                year,
                month,
                day,
                type
            }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching device media:', error);
        return [];
    }
};

export const verifyAdminLogin = async (email, password) => {
    try {
        const response = await fetch(ADMIN_LOGIN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ADMIN_LOGIN_API_KEY,
            },
            body: JSON.stringify({
                admin_email: email,
                admin_password: password,
            }),
        });

        const data = await response.json();
        return data; // Expecting { verified: true, message: "Login successful" }
    } catch (error) {
        console.error('Error verifying admin login:', error);
        throw error;
    }
};
