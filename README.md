# Whiteboard App for Rocket.Chat

Enhance your collaborative experience with diagrams, drawings, and more using Whiteboard Integration in Rocket.Chat. **Whiteboard App** provides a seamless environment for real-time visual communication and brainstorming.

![Whiteboard](https://github.com/RocketChat/Apps.Whiteboard/assets/92238941/f6b77aa6-cb76-49d2-a83b-445b116fd1f0)

## How to Use App

### Create Whiteboard

#### Through Slash Commands:

- Use `/whiteboard new` to create a new whiteboard.

- Use `/whiteboard help` for a helper message.

#### Through Action Buttons:

- Click on the "Create Whiteboard" action button to create a new whiteboard.

![Action button](https://github.com/RocketChat/Apps.Whiteboard/assets/92238941/58647f66-13ec-4808-814a-e2e1be783328)

### Using Whiteboard

- Click on `Edit board` button and you will be directed to a new whiteboard tab.
  ![image](https://github.com/RocketChat/Apps.Whiteboard/assets/92238941/8c0107df-9a66-4435-9b17-e7cb73d3881c)

- User's edits will be stored in realtime as a image preview in the message.

<table>
  <tr>
    <td><img src="https://github.com/RocketChat/Apps.Whiteboard/assets/92238941/f550edbd-baf7-4122-acff-d4240def97ec" alt="Image 1"></td>
    <td><img src="https://github.com/RocketChat/Apps.Whiteboard/assets/92238941/3a385c99-6366-43d9-a1b2-6654a95dac1c" alt="Image 2"></td>
  </tr>
</table>

- Click on `Settings` button to modify `boardname` and make board `public/private`.
![image](https://github.com/RocketChat/Apps.Whiteboard/assets/92238941/285896e1-995e-457d-9911-8a77bdf4679c)

## Whiteboard App Policies

- [Privacy Policy](https://docs.google.com/document/d/1TnEIvkCBgvsd0QcuHJAqloPL9O5g5rS62MVgLd4dou8/edit?usp=sharing)
- [Terms of Use](https://docs.google.com/document/d/10rs2D-b3f7SzT6-liMQNdZ6XqSC6vSiLYsvEG3Ip2d4/edit?usp=sharing)

## Local Setup Guide
### Join our community from [here](https://open.rocket.chat/channel/white-board-integration-team) 💻🧑‍🤝‍🧑🚀.
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
7. Deploy your app locally
   ```bash
   rc-apps deploy --url http://localhost:3000 --username ${username} --password ${password}
   ```
   
   Your username and password are your local server's user credentials .Verify the successful build by accessing the `/excalidraw` endpoint in the Whiteboard app settings. You can access the React app through the provided URL.

## GSoC'23 Work: [Whiteboard App Report]( https://github.com/CulturalProfessor/Google-Summer-of-Code-23)

## Resources

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

Feel free to explore, learn, and collaborate within the Rocket.Chat Apps ecosystem. Happy coding!
