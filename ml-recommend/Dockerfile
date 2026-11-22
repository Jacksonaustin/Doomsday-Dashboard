
FROM python:3.12-slim-bookworm

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.cache/huggingface

COPY requirements.txt ./
# CPU-only torch keeps the image small. Pinned so every build gets the same version.
RUN pip install --no-cache-dir torch==2.15.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

#install the sentence transformer model to avoid downloading it at runtime
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY app ./app


# OpenShift runs as a random UID in group 0; give group 0 the owner's permissions
RUN chgrp -R 0 /app && chmod -R g=u /app


ENV HF_HUB_OFFLINE=1
USER 10001
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
