# Step 1: Build the application
FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project to the working directory
COPY . .

# Use the correct .env file based on the NODE_ENV argument
ARG NODE_ENV=production
COPY ./.env.${NODE_ENV} ./.env

# Build the project
RUN npm run build

# Step 2: Create a lightweight production image
FROM node:20-slim

WORKDIR /app

# Copy built files from the builder stage
COPY --from=builder /app ./

# Install production dependencies
RUN npm install --production

# Expose the application's port
EXPOSE 3000

# Set the default environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/server.js"]
