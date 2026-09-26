# WordShift launch dashboard. Built by `gcloud run deploy --source .` (deploy.sh).
# The base image is pinned by digest (node:22-bookworm-slim, Node 22.23.3, built
# 2026-09-23), so every deploy builds on the same bytes. Bump it on purpose now
# and then for security fixes: take the new digest from
#   docker buildx imagetools inspect node:22-bookworm-slim
# (or the Docker-Content-Digest header of a HEAD request for the tag), then redeploy.
FROM node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
# pg and its dependencies need no install scripts; never run any.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY src ./src
COPY public ./public
USER node
EXPOSE 8080
CMD ["node", "src/server.js"]
