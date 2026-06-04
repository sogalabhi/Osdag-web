FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Kolkata

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        wget bzip2 software-properties-common curl \
        python3-pip libpq-dev libssl-dev build-essential \
        libgl1 libglu1-mesa \
        wkhtmltopdf texlive-full && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /opt/conda && \
    wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /opt/conda/miniconda.sh && \
    bash /opt/conda/miniconda.sh -b -p /opt/miniconda && \
    rm -f /opt/conda/miniconda.sh && \
    /opt/miniconda/bin/conda init bash

COPY requirements.txt /app/requirements.txt

RUN bash -c "source /opt/miniconda/etc/profile.d/conda.sh && \
    conda create -n myenv python=3.11 -y && \
    conda activate myenv && \
    pip install --upgrade pip pyopenssl && \
    pip install -r requirements.txt"

COPY . /app

ENV LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libstdc++.so.6
EXPOSE 8000

CMD ["bash", "-c", "source /opt/miniconda/etc/profile.d/conda.sh && conda activate myenv && python manage.py runserver 0.0.0.0:8000"]
