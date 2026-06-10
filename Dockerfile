FROM continuumio/miniconda3:24.11.1-0

WORKDIR /app

ENV TZ=Asia/Kolkata \
    DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libgl1 \
    libglu1-mesa \
    wkhtmltopdf \
    texlive-latex-base \
    texlive-fonts-recommended \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt

RUN conda config --add channels conda-forge && \
    conda config --set channel_priority strict && \
    conda create -n osdag_env python=3.11 pythonocc-core cairo -y && \
    conda clean -afy

RUN /opt/conda/envs/osdag_env/bin/pip install --no-cache-dir -r requirements.txt

COPY . /app

RUN mkdir -p /app/staticfiles /app/media /app/osifiles /app/logs && \
    useradd -u 8888 deployuser && \
    chown -R deployuser:deployuser /app

USER deployuser

EXPOSE 8000

CMD ["/opt/conda/envs/osdag_env/bin/gunicorn", "config.asgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--timeout", "60"]