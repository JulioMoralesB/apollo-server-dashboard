FROM python:3.12-slim

WORKDIR /app

RUN groupadd --system --gid 1000 appuser \
    && useradd --system --no-create-home --shell /bin/false --uid 1000 --gid 1000 appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/config && chown appuser:appuser /app/config

USER appuser

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
