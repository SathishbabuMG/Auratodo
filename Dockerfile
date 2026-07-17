FROM python:3.12 AS build

WORKDIR /app

RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"


COPY requirements.* .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

FROM gcr.io/distroless/python3-debian12

WORKDIR /app

COPY --from=build /app /app
COPY --from=build /venv /venv

EXPOSE 6000

CMD ["app.py"]

