FROM python:3.11-slim

WORKDIR /app

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

# Copy application files
COPY server.py .
COPY index.html .
COPY transforms/ ./transforms/

# Create data directory
RUN mkdir -p /app/data && chown -R appuser:appuser /app

# Copy initial tasks data if exists
COPY data/tasks.json /app/data/tasks.json 2>/dev/null || echo "No tasks.json to copy"

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/')" || exit 1

# Start the server
CMD ["python", "server.py"]
