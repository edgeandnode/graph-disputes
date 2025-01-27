FROM node:lts as dependencies
WORKDIR /dispute-frontend
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:lts as builder
WORKDIR /dispute-frontend
COPY . .
COPY --from=dependencies /dispute-frontend/node_modules ./node_modules
RUN yarn build

FROM node:lts as runner
WORKDIR /dispute-frontend
ENV NODE_ENV production
# If you are using a custom next.config.js file, uncomment this line.
COPY --from=builder /dispute-frontend/next.config.js ./
COPY --from=builder /dispute-frontend/public ./public
COPY --from=builder /dispute-frontend/.next ./.next
COPY --from=builder /dispute-frontend/node_modules ./node_modules
COPY --from=builder /dispute-frontend/package.json ./package.json

EXPOSE 3000
CMD ["yarn", "start"]