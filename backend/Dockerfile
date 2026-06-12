FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy database schema and generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code and build backend
COPY . .
RUN npm run build

# Set environment defaults
ENV PORT=5000
ENV NODE_ENV=production

# Expose backend port
EXPOSE 5000

# Start server
CMD ["npm", "run", "start"]
