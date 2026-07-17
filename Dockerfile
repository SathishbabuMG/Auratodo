FROM python:3.12 AS build

WORKDIR /app

COPY requirements.* .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

FROM gcr.io/distroless/python3-debian12

WORKDIR /app

COPY --from=build /app /app
COPY --from=build /usr/local /usr/local

EXPOSE 6000

CMD ["app.py"]

