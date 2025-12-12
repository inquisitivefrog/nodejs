FROM nginx:alpine

# Install wget and netcat for health checks and waiting
RUN apk add --no-cache wget netcat-openbsd

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy wait script
COPY wait-for-servers.sh /wait-for-servers.sh
RUN chmod +x /wait-for-servers.sh

# Create log directory
RUN mkdir -p /var/log/nginx

# Expose port 80
EXPOSE 80

# Override entrypoint to use our wait script
ENTRYPOINT ["/wait-for-servers.sh"]

