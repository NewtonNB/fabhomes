# ==============================================================================
# ZIMBANI PLATFORM - Production React 19 Frontend Container (Frontend Root)
# ==============================================================================

# Stage 1: Build the React Application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies cleanly
RUN npm ci

# Copy frontend source code
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine AS runner

LABEL maintainer="Fab Homes Uganda <tech@fabhomesug.com>"
LABEL description="Zimbani Platform Production Frontend Container"

# Copy default SPA Nginx config
RUN printf 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

# Copy compiled assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
