FROM python:3.12

WORKDIR /app

COPY requirements.* .

RUN pip install -r requirements.txt

COPY . .

EXPOSE 6000

 # host 7000 -> container 5000 -> app 6000

CMD ["python" , "app.py"]
