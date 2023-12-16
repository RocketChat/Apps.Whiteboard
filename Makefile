# Define variables
CLIENT_DIR := client
WHITEBOARD_DIR := whiteboard
USERNAME := your_username # replace it with your username
PASSWORD := your_password # replace it with your password
LOCAL_URL := http://localhost:3000 # replace it with your local url

# Check if the user has provided custom values for USERNAME and PASSWORD
ifdef YOUR_USERNAME
	USERNAME := $(YOUR_USERNAME)
endif

ifdef YOUR_PASSWORD
	PASSWORD := $(YOUR_PASSWORD)
endif

# Define targets and their dependencies/actions
.PHONY: all

all: build deploy

build:
	cd $(CLIENT_DIR) && npm run build && npm run build:excalidraw
	@echo "Build completed successfully."

deploy:
	cd $(WHITEBOARD_DIR) && rc-apps deploy --url $(LOCAL_URL) --username=$(USERNAME) --password=$(PASSWORD)
	@echo "Deployment completed successfully."