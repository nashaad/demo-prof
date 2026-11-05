FROM node:22-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
RUN pip install --no-cache-dir uv
ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/opt/venv/bin:$PATH"
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/ ./
COPY data/ /app/data/
COPY --from=frontend /build/dist /app/frontend/dist
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN mkdir -p /app/var
EXPOSE 8080
CMD ["/app/docker-entrypoint.sh"]
