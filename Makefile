# Define variables
CLIENT_DIR := client
WHITEBOARD_DIR := whiteboard
USERNAME := your_username
PASSWORD := your_password
LOCAL_URL := http://localhost:3000

# Define targets and their dependencies/actions
.PHONY: all

all: build deploy

build:
	cd $(CLIENT_DIR) && npm run build && npm run build:excalidraw
	@echo "Build completed successfully."

deploy:
	cd $(WHITEBOARD_DIR) && rc-apps deploy --url $(LOCAL_URL) --username $(USERNAME) --password $(PASSWORD)
	@echo "Deployment completed successfully."