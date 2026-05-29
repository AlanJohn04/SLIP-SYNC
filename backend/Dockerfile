FROM python:3.12-slim

WORKDIR /app

# Copy dependencies list
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Command is overridden in docker-compose for dev
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
