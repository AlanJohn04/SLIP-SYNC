FROM node:20-slim

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Command is overridden in docker-compose for dev
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
