# 🚀 Whiteboard App for Rocket.Chat 🎨

Enhance your collaborative experience with diagrams, drawings, and more using the Whiteboard Integration in Rocket.Chat. The **Whiteboard App** provides a seamless environment for real-time visual communication and brainstorming.

![Whiteboard](https://github.com/RocketChat/Apps.Whiteboard/assets/92238941/f6b77aa6-cb76-49d2-a83b-445b116fd1f0)

## How to Use the App

### Create a Whiteboard

#### Through Slash Commands:

- Use `/whiteboard help` for a helpful message.
- Use `/whiteboard list` to list all created boards in the room.
- Use `/whiteboard new <board name>` to create a new whiteboard.
- Use `/whiteboard delete <board name>` to delete a whiteboard.

#### Through Action Buttons:

- Click on the "Create Whiteboard" action button to generate a new whiteboard.

![Action button](https://github.com/RocketChat/Apps.Whiteboard/assets/92238941/58647f66-13ec-4808-814a-e2e1be783328)

### Using the Whiteboard

- Click on the `Edit board` button, and you will be directed to a new whiteboard tab.

  ![image](https://github.com/RocketChat/Apps.Whiteboard/assets/92238941/8c0107df-9a66-4435-9b17-e7cb73d3881c)

- User edits will be stored in real-time as an image preview in the message.

<table>
  <tr>
    <td><img src="https://github.com/RocketChat/Apps.Whiteboard/assets/92238941/f550edbd-baf7-4122-acff-d4240def97ec" alt="Image 1"></td>
    <td><img src="https://github.com/RocketChat/Apps.Whiteboard/assets/92238941/3a385c99-6366-43d9-a1b2-6654a95dac1c" alt="Image 2"></td>
  </tr>
</table>

- Click on the `Settings` button to modify the `board name` and make the board `public/private`.

![image](https://github.com/RocketChat/Apps.Whiteboard/assets/92238941/285896e1-995e-457d-9911-8a77bdf4679c)

## Whiteboard App Policies

- [Privacy Policy](https://docs.google.com/document/d/1TnEIvkCBgvsd0QcuHJAqloPL9O5g5rS62MVgLd4dou8/edit?usp=sharing)
- [Terms of Use](https://docs.google.com/document/d/10rs2D-b3f7SzT6-liMQNdZ6XqSC6vSiLYsvEG3Ip2d4/edit?usp=sharing)

## Local Setup Guide

### Join our app's community from [here](https://open.rocket.chat/channel/white-board-integration-team) 💻🧑‍🤝‍🧑🚀.

#### Make sure you have a working Rocket.Chat server and Apps-Engine CLI for your machine. You can setup the server for your local machine from [here](https://developer.rocket.chat/open-source-projects/server/server-environment-setup) and CLI from [here](https://developer.rocket.chat/apps-engine/getting-started/rocket.chat-app-engine-cli).

1. Navigate to the `client` folder:

   ```bash
   cd client
   ```

2. Install all required packages:

   ```bash
   npm install
   ```

3. Build the webpack bundle for the Excalidraw React app:

   ```bash
   npm run build
   ```

4. Execute the build.js script to generate build scripts for `excalidraw.ts` and `excalidrawContent.ts`:

   ```bash
   npm run build:excalidraw
   ```

5. Change directory to `whiteboard` and install all Rocket chat app packages :
   ```bash
   cd ../whiteboard/
   ```
   ```bash
   npm install
   ```
6. Deploy your app locally

   ```bash
   rc-apps deploy --url http://localhost:3000 --username ${username} --password ${password}
   ```

   Your username and password are your local server's user credentials .Verify the successful build by accessing the `/excalidraw` endpoint in the Whiteboard app settings. You can access the React app through the provided URL.

### Instead of running the above commands, you can simply use the shortcut commands

1. #### Run the following command within the `Apps.Whiteboard` folder

   ```bash
   cd client \
   && npm install \
   && npm run build \
   && npm run build:excalidraw \
   && cd ../whiteboard/ \
   && npm install \
   && rc-apps deploy --url http://localhost:3000 --username ${username} --password ${password}

   ```

   Make sure to replace ${username} and ${password} with the actual username and password values of your local server's user credentials

2. #### You can use the Makefile to run the server as well

   ```bash
   make YOUR_USERNAME=${username} YOUR_PASSWORD=${password}
   ```

   Make sure to replace ${username} and ${password} with the actual username and password values of your local server's user credentials. Alternatively, you can modify the Makefile directly by replacing the USERNAME and PASSWORD variables.

   #### Additional Commands:

   For build:

   ```bash
   make build YOUR_USERNAME=${username} YOUR_PASSWORD=${password}
   ```

   For deploy:

   ```bash
   make deploy YOUR_USERNAME=${username} YOUR_PASSWORD=${password}
   ```

## Gitpod Setup Guide

Follow these steps to set up your development environment using Gitpod:

1. **Visit Gitpod Website:**

   - Go to [Gitpod](https://www.gitpod.io/) and click on the dashboard.

2. **Login with GitHub:**

   - Login to Gitpod using your GitHub account credentials.

3. **Create a New Workspace:**

   - Click on the "New Workspace" button.
   - In the dropdown menu, select the repository you want to work on, specifically the `Apps.Whiteboard` repository that you've previously forked on GitHub.

4. **Continue and Wait:**

   - Click "Continue" and give it some time to initialize your workspace.

5. **Start Coding:**
   - After a few seconds, you'll see a fully-functional code editor in your browser.
   - Feel free to start coding, making changes, and contribute to the `Apps.Whiteboard` repository.

That's it! You are now set up and ready to contribute. If you encounter any issues or have questions, refer to the [Gitpod documentation](https://www.gitpod.io/docs/) or reach out to the community for assistance.

Happy coding!

## GSoC'23 Work: [Whiteboard App Report](https://github.com/CulturalProfessor/Google-Summer-of-Code-23)

Explore our documentation and engage with the Rocket.Chat Apps community:

- **Rocket.Chat Apps TypeScript Definitions Documentation**: Learn about Rocket.Chat Apps TypeScript definitions and how to use them.

  - [Documentation](https://rocketchat.github.io/Rocket.Chat.Apps-engine/)

- **Rocket.Chat Apps TypeScript Definitions Repository**: Contribute and explore the open-source repository for Rocket.Chat Apps TypeScript definitions.

  - [GitHub Repository](https://github.com/RocketChat/Rocket.Chat.Apps-engine)

- **Example Rocket.Chat Apps**: Find inspiration in a collection of example Rocket.Chat Apps, providing practical implementations.

  - [Example Apps](https://github.com/graywolf336/RocketChatApps)

- **Community Forums**: Engage with the Rocket.Chat Apps community through our forums.

  - [App Requests](https://forums.rocket.chat/c/rocket-chat-apps/requests)
  - [App Guides](https://forums.rocket.chat/c/rocket-chat-apps/guides)
  - [Community Forums](https://forums.rocket.chat/c/rocket-chat-apps)

- **Community Chat Channel**: Join the conversation in our community chat channel.

  - [#rocketchat-apps on Open.Rocket.Chat](https://open.rocket.chat/channel/rocketchat-apps)

- **Apps Community Channel**: Join the conversation in our app's community channel.
  - [#white board integration team](https://open.rocket.chat/channel/white-board-integration-team)

Feel free to explore, learn, and collaborate within the Rocket.Chat Apps ecosystem. Happy coding!

## Contributors

<a href="https://github.com/RocketChat/Apps.Whiteboard/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=RocketChat/Apps.Whiteboard" />
</a>

![Alt](https://repobeats.axiom.co/api/embed/f94cc230be688e1693940ca25ea39ef39cb143c9.svg "Repobeats analytics image")
