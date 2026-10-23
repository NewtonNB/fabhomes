# ==============================================================================
# ZIMBANI PLATFORM - Production React 19 + TypeScript + Vite Container
# ==============================================================================

# Stage 1: Build the React Application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY zimbani-frontend/package.json zimbani-frontend/package-lock.json ./

# Install dependencies cleanly
RUN npm ci

# Copy frontend source code
COPY zimbani-frontend/ .

# Build production bundle
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine AS runner

LABEL maintainer="Fab Homes Uganda <tech@fabhomesug.com>"
LABEL description="Zimbani Platform Production Frontend Container"

# Copy custom Nginx configuration
COPY docker/frontend/nginx-frontend.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
