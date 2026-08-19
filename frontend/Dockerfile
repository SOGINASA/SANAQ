FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG REACT_APP_API_URL=/api/v1
ARG REACT_APP_AI_STREAM_URL=/api/v1
ARG REACT_APP_DEFAULT_LOCALE=ru
ARG REACT_APP_ENABLE_MOCKS=false
ARG REACT_APP_SHOW_DEMO_LOGIN=false

ENV REACT_APP_API_URL=${REACT_APP_API_URL} \
    REACT_APP_AI_STREAM_URL=${REACT_APP_AI_STREAM_URL} \
    REACT_APP_DEFAULT_LOCALE=${REACT_APP_DEFAULT_LOCALE} \
    REACT_APP_ENABLE_MOCKS=${REACT_APP_ENABLE_MOCKS} \
    REACT_APP_SHOW_DEMO_LOGIN=${REACT_APP_SHOW_DEMO_LOGIN}

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
