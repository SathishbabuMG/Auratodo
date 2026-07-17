FROM python:3.12 as build

WORKDIR /app

COPY requirements.* .

RUN pip install -r requirements.txt

COPY . .

FROM python:3.12-slim

WORKDIR /app

COPY --from=build /app /app
COPY --from=build /usr/local /usr/local

EXPOSE 6000

CMD ["python" , "app.py"]

