FROM python:3.12.14-slim-trixie@sha256:44ff437bba879d4941b710a369a8f19266aea34b29002807f0c487fabc9eec9b
WORKDIR /tmp
RUN apt-get update && apt-get download ffmpeg=7:7.1.5-0+deb13u1 && mv ffmpeg_*.deb pinned-ffmpeg.deb && echo '8669bc77e55393c14e0dd257ba9a916007cb6da0e1074c9b5e1d53812024f2af  pinned-ffmpeg.deb' | sha256sum -c - && apt-get install -y --no-install-recommends ./pinned-ffmpeg.deb && rm -f /tmp/pinned-ffmpeg.deb && rm -rf /var/lib/apt/lists/*
COPY workers/mms/requirements-lock.txt /tmp/requirements-lock.txt
RUN python -m pip install --no-cache-dir --require-hashes --only-binary=:all: --timeout 60 -r /tmp/requirements-lock.txt && python -m pip check
RUN useradd --uid 10001 --create-home worker && mkdir -p /state /models /app && chown worker:worker /state /models /app
WORKDIR /app
COPY workers/mms/vinlook_mms ./vinlook_mms
COPY workers/mms/tests ./tests
COPY services/content/src/adapters/hybrid-v1.json ./hybrid-v1.json
COPY workers/mms/hybrid-v1.sha256 ./hybrid-v1.json.sha256
ENV PYTHONDONTWRITEBYTECODE=1 HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 HF_HUB_DISABLE_TELEMETRY=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1
USER worker
ENTRYPOINT ["python", "-m", "vinlook_mms"]
CMD ["check"]
