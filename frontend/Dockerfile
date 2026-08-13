# Multi-stage build für optimierte Production-Images

# Build Stage
FROM node:22-alpine as build

WORKDIR /app

# Package files kopieren für besseres Caching
COPY package.json package-lock.json ./
RUN npm ci --only=production --silent

# Source code kopieren und bauen
COPY . .

# Build-time configuration (React inlines these into the bundle)
ARG REACT_APP_API_URL
ARG REACT_APP_API_KEY
ARG REACT_APP_AUTH_USER
ARG REACT_APP_AUTH_PASSWORD
ENV REACT_APP_API_URL=$REACT_APP_API_URL \
    REACT_APP_API_KEY=$REACT_APP_API_KEY \
    REACT_APP_AUTH_USER=$REACT_APP_AUTH_USER \
    REACT_APP_AUTH_PASSWORD=$REACT_APP_AUTH_PASSWORD

RUN npm run build

# Production Stage
FROM nginx:alpine

# Nginx-Konfiguration für React SPA
COPY --from=build /app/build /usr/share/nginx/html

# Custom nginx.conf für React Router
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf && \
    echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '    root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    index index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '' >> /etc/nginx/conf.d/default.conf && \
    echo '    # Gzip Kompression' >> /etc/nginx/conf.d/default.conf && \
    echo '    gzip on;' >> /etc/nginx/conf.d/default.conf && \
    echo '    gzip_vary on;' >> /etc/nginx/conf.d/default.conf && \
    echo '    gzip_min_length 1024;' >> /etc/nginx/conf.d/default.conf && \
    echo '    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;' >> /etc/nginx/conf.d/default.conf && \
    echo '' >> /etc/nginx/conf.d/default.conf && \
    echo '    # React Router SPA Support' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '        add_header Cache-Control "no-cache, no-store, must-revalidate";' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '' >> /etc/nginx/conf.d/default.conf && \
    echo '    # Static Assets Caching' >> /etc/nginx/conf.d/default.conf && \
    echo '    location /static/ {' >> /etc/nginx/conf.d/default.conf && \
    echo '        expires 1y;' >> /etc/nginx/conf.d/default.conf && \
    echo '        add_header Cache-Control "public, immutable";' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '' >> /etc/nginx/conf.d/default.conf && \
    echo '    # Security Headers' >> /etc/nginx/conf.d/default.conf && \
    echo '    add_header X-Frame-Options "SAMEORIGIN" always;' >> /etc/nginx/conf.d/default.conf && \
    echo '    add_header X-Content-Type-Options "nosniff" always;' >> /etc/nginx/conf.d/default.conf && \
    echo '    add_header Referrer-Policy "no-referrer-when-downgrade" always;' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]