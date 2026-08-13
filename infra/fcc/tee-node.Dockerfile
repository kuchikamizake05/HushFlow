# syntax=docker/dockerfile:1
# Official source identity is intentionally literal and review-controlled.
FROM golang:1.25.1-trixie@sha256:ff83f3762390c2cccb53618ccc18af23e556aff9b1db4428637e9f63287c8171 AS builder

ARG SOURCE_DATE_EPOCH=1785100800
ENV SOURCE_DATE_EPOCH=$SOURCE_DATE_EPOCH
WORKDIR /build

RUN git clone --filter=blob:none https://github.com/flare-foundation/tee-node.git tee-node && \
    cd tee-node && \
    git checkout v0.0.24 && \
    test "$(git rev-parse HEAD)" = "adc67a29eb7162f6f1b5dabcbca320009480695e"

WORKDIR /build/tee-node
RUN go mod download && go mod verify
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 GOFLAGS="-buildvcs=false" \
    go build -trimpath -ldflags="-buildid= -s -w" -o /app/server ./cmd/extension
RUN cp assets/google_confidential_space_root.crt /app/google_confidential_space_root.crt && \
    find /app -exec touch -h -d @${SOURCE_DATE_EPOCH} {} +

FROM gcr.io/distroless/static-debian12@sha256:20bc6c0bc4d625a22a8fde3e55f6515709b32055ef8fb9cfbddaa06d1760f838
WORKDIR /app
COPY --from=builder /app/server /app/server
COPY --from=builder /app/google_confidential_space_root.crt /app/assets/google_confidential_space_root.crt
ENV MODE=0
EXPOSE 5500
CMD ["/app/server"]
