FROM golang:1.22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates
COPY go.mod go.sum* ./
RUN go mod download 2>/dev/null || true
COPY . .
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o fxcrm-engine .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /
COPY --from=builder /app/fxcrm-engine /fxcrm-engine
EXPOSE 8080
ENTRYPOINT ["/fxcrm-engine"]
