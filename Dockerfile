# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Set the working directory
WORKDIR /app

# Install system dependencies (Java 17 headless, Git, curl, etc.)
# We use 'openjdk-17-jdk-headless' to save ~150MB of unused Java GUI libraries
RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    openjdk-17-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (v20) for Playwright/npm tasks
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy backend requirements.txt first to leverage Docker cache
COPY python_backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Strictly install ONLY Chromium for Playwright to save ~500MB+
RUN npx playwright install chromium --with-deps

# Copy the rest of the backend source code into /app
COPY python_backend/ .

# Expose the API port
EXPOSE 8000

# Command to run the FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
