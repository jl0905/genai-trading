const API_BASE_URL = 'http://localhost:3001/api';

export const api = {
  // Health check
  health: async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  },

  // Bitcoin price from Google Finance script
  getBitcoinPrice: async () => {
    const response = await fetch(`${API_BASE_URL}/googlefin`);
    return response.json();
  },

  // Example POST request
  postBitcoinPrice: async (data) => {
    const response = await fetch(`${API_BASE_URL}/googlefin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
