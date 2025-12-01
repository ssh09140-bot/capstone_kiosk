# Stage 1: Build the application
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json for all workspaces to leverage Docker cache
COPY package*.json ./
COPY kiosk-admin/package*.json ./kiosk-admin/
COPY kiosk-backend/package.json ./kiosk-backend/
COPY kiosk-app/package*.json ./kiosk-app/
COPY packages/shared-types/package*.json ./packages/shared-types/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Generate Prisma client (which now outputs to packages/shared-types)
RUN npm run generate --workspace=kiosk-backend

# Use build arguments for environment variables (set in Render dashboard)
ARG VITE_API_URL
ARG VITE_TOSS_CLIENT_KEY

# Set environment variables from build arguments
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_TOSS_CLIENT_KEY=${VITE_TOSS_CLIENT_KEY}

# Firebase Environment Variables
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID

ENV VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}
ENV VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}
ENV VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}
ENV VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}
ENV VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}
ENV VITE_FIREBASE_MEASUREMENT_ID=${VITE_FIREBASE_MEASUREMENT_ID}

# Build the kiosk-admin frontend
RUN npm run build --workspace=kiosk-admin

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine

# Copy the built static files from the builder stage
COPY --from=builder /app/kiosk-admin/dist /usr/share/nginx/html

# Copy the Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 and start Nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
