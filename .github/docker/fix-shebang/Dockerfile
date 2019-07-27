FROM golang:latest

LABEL "com.github.actions.name"="fix-shebang"
LABEL "com.github.actions.description"="Fix shebang on cli.js"
LABEL "com.github.actions.icon"="code"
LABEL "com.github.actions.color"="gray-dark"

LABEL version="0.0.1"
LABEL repository="https://github.com/judge2020/cloudflare-file-hosting"
LABEL maintainer="Hunter Ray <me@judge.sh>"


COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
