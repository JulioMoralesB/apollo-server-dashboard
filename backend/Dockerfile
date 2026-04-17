FROM python:3.12-slim

WORKDIR /app

RUN groupadd --system --gid 1000 appuser \
    && useradd --system --no-create-home --shell /bin/false --uid 1000 --gid 1000 appuser \
    && apt-get update && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/entrypoint.sh

EXPOSE 8001

ENTRYPOINT ["/app/entrypoint.sh"]
