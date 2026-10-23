# ==============================================================================
# ZIMBANI PLATFORM - Production PHP-FPM 8.3 Container (Backend Root)
# ==============================================================================
FROM php:8.3-fpm-alpine AS base

LABEL maintainer="Fab Homes Uganda <tech@fabhomesug.com>"
LABEL description="Zimbani Platform Production Backend Container"

# Install system dependencies and build libraries
RUN apk add --no-cache \
    curl \
    git \
    unzip \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    oniguruma-dev \
    icu-dev \
    netcat-openbsd \
    linux-headers \
    $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        mbstring \
        zip \
        exif \
        pcntl \
        bcmath \
        gd \
        intl \
        opcache \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS \
    && rm -rf /tmp/pear

# Install Composer from official image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy dependency definitions
COPY composer.json composer.lock ./

# Install production dependencies
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

# Copy application source code
COPY . .

# Set permissions
RUN composer dump-autoload --optimize --no-dev \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Switch to non-root user
USER www-data

# Expose PHP-FPM port
EXPOSE 9000

CMD ["php-fpm"]
