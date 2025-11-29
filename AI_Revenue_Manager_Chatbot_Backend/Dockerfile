# Use Python 3.12 (Cloud Run default)
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Copy requirements first to leverage caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

EXPOSE 8080
# CMD ["python", "app.py"]
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
# CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "${PORT}"]
# CMD uvicorn app:app --host 0.0.0.0 --port $PORT

