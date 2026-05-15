# --- Stage 1: Build the frontend ---
FROM node:20-slim AS frontend-build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: Run the backend + serve built frontend ---
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ backend/

# Copy the built frontend from stage 1
COPY --from=frontend-build /app/dist dist/

EXPOSE 10000

# Use shell form so $PORT is expanded at runtime (Render injects PORT)
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}
