FROM ubuntu:20.04

# Set non-interactive mode to avoid apt-get prompts during build
ARG DEBIAN_FRONTEND=noninteractive

# Install dependencies and clean up after installation to save space
RUN apt-get update && \
    apt-get install -y \
    software-properties-common \
    curl \
    sudo \
    nodejs \
    git \
    git-core \
    gcc \
    make \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js 18.x and global npm packages
RUN curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash - && \
    apt-get install -y nodejs && \
    npm install -g yarn rimraf typescript

# Set the working directory
WORKDIR /application

# Copy package.json and install dependencies
COPY package.json yarn.lock ./
RUN npm pkg delete scripts.postinstall
RUN yarn config set network-timeout 60000 && \
    yarn install --frozen-lockfile --prefer-offline

# Copy application files
COPY . .

# Build the application
RUN yarn run build

# Generate JSON schemas
RUN node dist/libs/schemaGenerator.js

# Expose ports
EXPOSE 7022

# Start the application
CMD ["yarn", "run", "serve"]
