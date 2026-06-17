FROM python:3.11-alpine

WORKDIR /app

# Install build deps for psutil
RUN apk add --no-cache gcc musl-dev linux-headers

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY metrics_collector.py .

CMD ["python", "-u", "metrics_collector.py"]
