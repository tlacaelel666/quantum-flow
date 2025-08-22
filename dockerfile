# Use an official Node.js image as the base image
FROM node:18-ubuntu

# Set the working directory in the container
WORKDIR /home/user/studio

# Copy package.json and package-lock.json (or yarn.lock) to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port your application listens on
EXPOSE 3000

# Command to start the application
CMD ["npm", "start"]
