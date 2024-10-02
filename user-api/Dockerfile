FROM public.ecr.aws/lambda/nodejs:20 AS builder

# Set working directory
WORKDIR /var/task

# Copy package files
COPY package*.json ./

# Install all dependencies including devDependencies
RUN npm install

# Copy source files and TypeScript config
COPY tsconfig.json ./
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM public.ecr.aws/lambda/nodejs:20

# Set working directory
WORKDIR /var/task

# Copy built artifacts and node_modules from the builder stage
COPY --from=builder /var/task/dist ./dist
COPY --from=builder /var/task/node_modules ./node_modules

# Copy package.json (needed for npm start, if ever used)
COPY package.json ./

# Use a non-root user
USER nobody

# Set the CMD to your handler
CMD [ "dist/index.handler" ]
