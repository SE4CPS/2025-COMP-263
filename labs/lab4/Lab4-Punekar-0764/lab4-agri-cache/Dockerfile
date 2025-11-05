FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm i -D nodemon
EXPOSE 3000
CMD ["npm","run","dev"]
