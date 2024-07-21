# Swift Deploy

### Components

This Project contains following services and folders:

- `api-server`: HTTP API Server for REST API's
- `socket-server`: To send real-time logs to Frontend.
- `build-server`: Docker Image code which clones, builds and pushes the build to S3
- `s3-reverse-proxy`: Reverse Proxy the subdomains and domains to s3 bucket static assets

