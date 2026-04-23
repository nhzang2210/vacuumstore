// js/api.js
const API_BASE = 'http://localhost:3000';

const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Lỗi server');
            }
            return data;
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },

    // Auth
    register: (data) => api.request('/api/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => api.request('/api/login', { method: 'POST', body: JSON.stringify(data) }),

    // Products
    getProducts: () => api.request('/api/products'),

    // Orders
    createOrder: (orderData) => api.request('/api/orders', { method: 'POST', body: JSON.stringify(orderData) })
};

window.api = api;   // Cho phép gọi từ các file HTML khác