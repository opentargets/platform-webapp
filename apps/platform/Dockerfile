# ------------------------------------------------------------------------ BUILD
FROM alpine:3.21 AS nginx-base

RUN apk add --no-cache nginx brotli nginx-mod-http-brotli && \
    # Point pid to /var/lib/nginx (owned by nginx user)
    # Drop user directive because we already run as nginx
    sed -i \
        -e 's|/var/run/nginx.pid|/var/lib/nginx/nginx.pid|' \
        -e '/^user/d' \
        /etc/nginx/nginx.conf

# ---------------------------------------------------------------------- RUNTIME
FROM nginx-base

COPY --chown=nginx:nginx ./bundle-platform   /usr/share/nginx/html
COPY --chown=nginx:nginx ./etc/platform.conf /etc/nginx/http.d/platform.conf
COPY --chmod=755         ./etc/entrypoint.sh /entrypoint.sh

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
