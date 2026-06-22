# silk-road frontend — 멀티스테이지(vite build → nginx) — Fargate(linux/amd64) 대상
# 빌드 산출물(dist)을 nginx로 정적 서빙하고, /api 는 같은 task의 backend(localhost:8000)로 프록시.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
