# ==============================================================================
# ZIMBANI PLATFORM - Production PHP-FPM 8.3 Container
# ==============================================================================
FROM php:8.4-fpm-alpine AS base

LABEL maintainer="Fab Homes Uganda <tech@fabhomesug.com>"
LABEL description="Zimbani Platform Production PHP-FPM 8.4 Container"

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

# Copy application configuration
COPY docker/backend/php.ini /usr/local/etc/php/conf.d/custom.ini
COPY docker/backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy dependency definitions first to maximize Docker layer cache
COPY zimbani-backend/composer.json zimbani-backend/composer.lock ./

# Install production dependencies
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

# Copy application source code
COPY zimbani-backend/ .

# Finish composer autoloader and manifest discovery
RUN composer dump-autoload --optimize --no-dev \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Switch to non-root user
USER www-data

# Expose PHP-FPM port
EXPOSE 9000

# Set entrypoint and default command
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["php-fpm"]
