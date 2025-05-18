# frontend/Dockerfile
FROM node:18

WORKDIR /app

# Copy only what we need to install dependencies
COPY package.json ./

# Install exactly what's specified (no guessing by Docker)
RUN npm install

# Now copy the rest of the app
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
