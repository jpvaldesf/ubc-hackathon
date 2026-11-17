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

# The server runs as the unprivileged "app" user. entrypoint.sh starts as root only to take ownership
# of the runtime-mounted disk, then drops privileges with setpriv (fail the build if it's missing).
RUN useradd --create-home --uid 10001 app && command -v setpriv

EXPOSE 10000
# One worker only: nonces and per-lease locks live in this process (server/README.md).
CMD ["server/entrypoint.sh"]
