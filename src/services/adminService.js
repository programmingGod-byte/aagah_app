import { ADMIN_MANAGEMENT_API_URL, ADMIN_MANAGEMENT_API_KEY } from '@env';

const handleApiCall = async (payload) => {
    try {
        const response = await fetch(ADMIN_MANAGEMENT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ADMIN_MANAGEMENT_API_KEY,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`API call failed: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Admin Service Error:', error);
        throw error;
    }
};

export const getAllAdmins = async () => {
    return handleApiCall({ action: 'get_all' });
};

export const addAdmin = async (name, email, password) => {
    return handleApiCall({
        action: 'add',
        admin_name: name,
        admin_email: email,
        admin_password: password,
    });
};

export const updateAdmin = async (email, name, password) => {
    return handleApiCall({
        action: 'update',
        admin_email: email,
        admin_name: name,
        admin_password: password,
    });
};

export const deleteAdmin = async (email) => {
    return handleApiCall({
        action: 'delete',
        admin_email: email,
    });
};
