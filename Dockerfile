# Use an official Python runtime as a parent image (slim version for smaller size)
FROM python:3.11-slim-bookworm

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files into the container at /app
# (This will be affected by .dockerignore)
COPY . .

# Make port 5000 available to the world outside this container
# Flask default port is 5000
EXPOSE 5000

# Define environment variables (optional, but good practice)
ENV FLASK_APP=server.py
ENV FLASK_RUN_HOST=0.0.0.0
# To run in production mode, you might set FLASK_ENV=production
# For development, Flask defaults to development mode if FLASK_DEBUG is not set, or use FLASK_DEBUG=1
# ENV FLASK_DEBUG=0 # Or 1 for development debugging

# Run server.py when the container launches
# Using exec form for CMD is generally recommended
CMD ["flask", "run"] 