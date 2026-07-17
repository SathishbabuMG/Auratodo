FROM python:3.12-slim AS build

WORKDIR /app


COPY requirements.txt .

RUN pip install --no-cache-dir --target=/python -r requirements.txt

COPY . .

FROM gcr.io/distroless/python3-debian12

WORKDIR /app

COPY --from=build /app /app
COPY --from=build /python /python

ENV PYTHONPATH="/python"


EXPOSE 6000



CMD ["app.py"]

