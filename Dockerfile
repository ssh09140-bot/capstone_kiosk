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
RUN npm install

# Copy the rest of the source code
COPY . .

# Generate Prisma client (which now outputs to packages/shared-types)
RUN npm run generate --workspace=kiosk-backend

# --- DEBUG: Print environment variables to check if VITE_API_URL is present ---
RUN echo "--- Printing VITE_ environment variables ---" && printenv | grep VITE_ || echo "--- No VITE_ variables found ---"

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
