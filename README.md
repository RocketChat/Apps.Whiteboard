# Whiteboard
Boost your collaborative experience with diagrams, drawings and more via Rocket.Chat `Apps.Whiteboard`.

![image](https://github.com/RocketChat/Apps.Whiteboard/assets/32427260/e4ce670e-9b6a-4a77-8ac2-58730b63b79f)


## Local Setup Guide
- First `cd client` folder and run `npm install` to install all packages
- Run `npm build` to build webpack bundle for excalidraw react app
- Run `npm build:excalidraw` to execute build.js script to write build scripts to excalidraw.ts and excalidraw html to excalidrawContent.ts
- Run `cd ../whiteboard/` and ` $  rc-apps deploy --url http://localhost:3000 --username ${username} --password ${password}` ,add `--update` flag to if you want update your app changes
To verify successful build you can view endpoint `/excalidraw` in whiteboard-app settings and access the react app through url provided

## Getting Started
Now that you have generated a blank default Rocket.Chat App, what are you supposed to do next?
Start developing! Open up your favorite editor, our recommended one is Visual Studio code,
and start working on your App. Once you have something ready to test, you can either
package it up and manually deploy it to your test instance or you can use the CLI to do so.
Here are some commands to get started:
- `rc-apps package`: this command will generate a packaged app file (zip) which can be installed **if** it compiles with TypeScript
- `rc-apps deploy`: this will do what `package` does but will then ask you for your server url, username, and password to deploy it for you

## Documentation
Here are some links to examples and documentation:
- [Rocket.Chat Apps TypeScript Definitions Documentation](https://rocketchat.github.io/Rocket.Chat.Apps-engine/)
- [Rocket.Chat Apps TypeScript Definitions Repository](https://github.com/RocketChat/Rocket.Chat.Apps-engine)
- [Example Rocket.Chat Apps](https://github.com/graywolf336/RocketChatApps)
- Community Forums
  - [App Requests](https://forums.rocket.chat/c/rocket-chat-apps/requests)
  - [App Guides](https://forums.rocket.chat/c/rocket-chat-apps/guides)
  - [Top View of Both Categories](https://forums.rocket.chat/c/rocket-chat-apps)
- [#rocketchat-apps on Open.Rocket.Chat](https://open.rocket.chat/channel/rocketchat-apps)
