# Deposit Keeper API server (server/ + the vision pipeline in integrations/ + shared/ addresses).
# Secrets come from the host's environment at runtime; nothing secret is copied into the image (.dockerignore).
FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.12.1 /uv /usr/local/bin/uv

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /srv

# Dependencies first, so code changes don't reinstall them.
COPY server/pyproject.toml server/uv.lock server/
RUN uv sync --project server --frozen --no-dev --no-install-project

COPY shared/ shared/
COPY integrations/ integrations/
COPY server/ server/

# Run as a non-root user; the persistent disk (DK_DATA_DIR) must be writable by it.
RUN useradd --create-home --uid 10001 app && mkdir -p /var/data && chown app /var/data
USER app

EXPOSE 10000
# One worker only: nonces and per-lease locks live in this process (server/README.md).
CMD ["sh", "-c", "exec server/.venv/bin/uvicorn server.app.main:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers"]
