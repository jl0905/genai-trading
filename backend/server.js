import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001; // Different from frontend port

app.use(cors());
app.use(express.json());

// Helper function to run Python scripts
const runPythonScript = (scriptName, args = []) => {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [path.join(__dirname, 'scripts', scriptName), ...args]);
    let result = '';
    let error = '';

    python.stdout.on('data', (data) => {
      result += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${error}`));
      } else {
        try {
          const jsonResult = JSON.parse(result);
          resolve(jsonResult);
        } catch (e) {
          resolve(result);
        }
      }
    });
  });
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend server is running' });
});

// Example route to connect to your Google Finance script
app.get('/api/googlefin', async (req, res) => {
  try {
    const data = await runPythonScript('googlefin.py');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Example route with parameters
app.post('/api/googlefin', async (req, res) => {
  try {
    const { symbol, period } = req.body;
    const data = await runPythonScript('googlefin.py', [symbol, period]);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stock data endpoints
app.get('/api/stock', async (req, res) => {
  try {
    const { symbol = 'AAPL', period = '6mo' } = req.query;
    const data = await runPythonScript('stockdata.py', [`--symbol=${symbol}`, `--period=${period}`]);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stocks/multi', async (req, res) => {
  try {
    const data = await runPythonScript('stockdata.py', ['--multi']);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
