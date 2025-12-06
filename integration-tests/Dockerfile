# Integration Tests Dockerfile
# Autonomous Lunar Logistics - Phase 4

FROM python:3.11-slim

LABEL maintainer="Christopher Modina <cmodina@reversesingularity.ai>"
LABEL description="Integration test runner for Autonomous Lunar Logistics"
LABEL version="0.1.0"

# Set working directory
WORKDIR /tests

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy test files
COPY . .

# Set Python path
ENV PYTHONPATH=/tests:/shared-contracts

# Default command runs all tests
CMD ["python", "-m", "pytest", \
     "contract-validation/", \
     "-v", \
     "--tb=short", \
     "--junitxml=/tests/results/junit.xml", \
     "--html=/tests/results/report.html", \
     "--self-contained-html"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import pytest; print('OK')" || exit 1
