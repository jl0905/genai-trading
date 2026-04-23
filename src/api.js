const API_BASE_URL = 'http://localhost:3000/api';

export const api = {
  // Authentication
  login: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    return response.json();
  },

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

  // Stock data endpoints
  getStockData: async (symbol = 'AAPL', period = '6mo') => {
    const response = await fetch(`${API_BASE_URL}/stock?symbol=${symbol}&period=${period}`);
    return response.json();
  },

  getMultipleStocks: async () => {
    const response = await fetch(`${API_BASE_URL}/stocks/multi`);
    return response.json();
  },

  // Stock data by date range (for dynamic chart loading)
  getStockDataRange: async (symbol, start, end) => {
    const params = new URLSearchParams({ symbol, start, end });
    const response = await fetch(`${API_BASE_URL}/stock/range?${params}`);
    return response.json();
  },

  // Search stocks via Yahoo Finance API proxy
  searchStocks: async (query) => {
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
    return response.json();
  },
};
