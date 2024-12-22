FROM alpine:latest
#FROM alpine
RUN #sed -i 's|dl-cdn.alpinelinux.org|mirrors.aliyun.com|g' /etc/apk/repositories
RUN apk add --no-cache tzdata
ENV TZ=Asia/Shanghai
WORKDIR /app
## 包含: comet / logic / job / dis 的二进制文件
COPY bin/* /app/