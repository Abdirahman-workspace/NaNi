FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# FFmpeg will also be used by the video-processing worker.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

USER node
EXPOSE 8080

CMD ["npm", "run", "api"]
