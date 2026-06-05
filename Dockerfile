FROM python:3.12-slim

WORKDIR /app

COPY . .

RUN mkdir -p downloads

EXPOSE 8080

CMD ["python3", "serve.py"]
