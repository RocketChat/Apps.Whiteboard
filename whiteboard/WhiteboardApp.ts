import {
    IAppAccessors,
    IConfigurationExtend,
    ILogger,
    IEnvironmentRead,
    IHttp,
    IModify,
    IPersistence,
    IPersistenceRead,
    IRead,
    IAppInstallationContext,
} from "@rocket.chat/apps-engine/definition/accessors";
import { App } from "@rocket.chat/apps-engine/definition/App";
import { IAppInfo } from "@rocket.chat/apps-engine/definition/metadata";
import { WhiteboardCommand } from "./commands/WhiteboardCommand";
import {
    UIKitBlockInteractionContext,
    IUIKitResponse,
    UIKitActionButtonInteractionContext,
    IUIKitInteractionHandler,
    UIKitViewSubmitInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { ExecuteBlockActionHandler } from "./handlers/ExecuteBlockActionHandler";
import {
    ApiSecurity,
    ApiVisibility,
} from "@rocket.chat/apps-engine/definition/api";
import {
    ApiEndpoint,
    IApiEndpointInfo,
    IApiRequest,
    IApiResponse,
} from "@rocket.chat/apps-engine/definition/api";
import { Buffer } from "buffer";
import { compressedString } from "./assets/excalidraw";
import { excalidrawContent } from "./assets/excalidrawContent";
import { ExecuteActionButtonHandler } from "./handlers/ExecuteActionButtonHandler";
import {
    getBoardRecord,
    storeBoardRecord,
} from "./persistence/boardInteraction";
import { UIActionButtonContext } from "@rocket.chat/apps-engine/definition/ui";
import { UtilityEnum } from "./enum/uitlityEnum";
import { ExecuteViewSubmitHandler } from "./handlers/ExecuteViewSubmitHandler";
import { AppEnum } from "./enum/App";
import { getDirect, sendDirectMessage } from "./lib/messages";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
export class WhiteboardApp extends App implements IUIKitInteractionHandler {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }
    // Execute Handlers
    public async executeBlockActionHandler(
        context: UIKitBlockInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<IUIKitResponse> {
        const handler = new ExecuteBlockActionHandler(
            this,
            read,
            http,
            persistence,
            modify,
            context
        );
        return await handler.run();
    }

    public async executeActionButtonHandler(
        context: UIKitActionButtonInteractionContext, //Keep this sequence of parameters
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<IUIKitResponse> {
        const handler = new ExecuteActionButtonHandler(
            this,
            read,
            http,
            persistence,
            modify
        );
        return await handler.run(context);
    }

    public async executeViewSubmitHandler(
        context: UIKitViewSubmitInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<IUIKitResponse> {
        const handler = new ExecuteViewSubmitHandler(
            this,
            read,
            http,
            persistence,
            modify,
            context
        );
        return await handler.run();
    }
    public async onInstall(
        context: IAppInstallationContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ): Promise<void> {
        sendDirectMessage(
            read,
            modify,
            context.user,
            `Whiteboard App Installed Successfully 🎉 \n *Whiteboard App Commands*
            \`/whiteboard new\` - Create a new whiteboard
            \`/whiteboard help\` - Display helper message
            You can use \`Create Whiteboard\` Action Button to create a new whiteboard as well \n
            Refer https://github.com/RocketChat/Apps.Whiteboard documentation for more details 🚀`,
            persistence
        );
    }

    public async initialize(
        configuration: IConfigurationExtend
    ): Promise<void> {
        const whiteboardBoardCommand: WhiteboardCommand = new WhiteboardCommand(
            this
        );
        await configuration.slashCommands.provideSlashCommand(
            whiteboardBoardCommand
        );

        configuration.ui.registerButton({
            actionId: UtilityEnum.CREATE_WHITEBOARD_MESSAGE_BOX_ACTION_ID,
            labelI18n: "create_whiteboard",
            context: UIActionButtonContext.MESSAGE_BOX_ACTION,
        });

        await configuration.api.provideApi({
            visibility: ApiVisibility.PUBLIC,
            security: ApiSecurity.UNSECURE,
            endpoints: [
                new ExcalidrawEndpoint(this),
                new UpdateBoardEndpoint(this),
                new BundleJsEndpoint(this),
                new GetBoardEndpoint(this),
                new DeleteBoardEndpoint(this),
            ],
        });
    }
}

// Excalidraw endpoint serves whole html excalidraw content
export class ExcalidrawEndpoint extends ApiEndpoint {
    public path = `board`;

    public async get(): Promise<IApiResponse> {
        const content = excalidrawContent;
        return {
            status: 200,
            headers: {
                "Content-Type": "text/html",
                "Content-Security-Policy":
                    "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'",
            },
            content,
        };
    }
}

// Bundle.js endpoint servers whole javascript excalidraw client content in compressed format
// This is done to reduce the size of the content
// Source code of uncompressed version is in client/src/excalidraw-app/index.tsx file
export class BundleJsEndpoint extends ApiEndpoint {
    public path = "bundle.js";

    public async get(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<IApiResponse> {
        const content = Buffer.from(compressedString, "base64");
        return {
            status: 200,
            headers: {
                "Content-Type": "text/javascript",
                "Content-Encoding": "br",
            },
            content,
        };
    }
}

// GetBoardEndpoint serves the board data from the database
// This endpoint is used to get the board data when user clicks on the edit button
export class GetBoardEndpoint extends ApiEndpoint {
    public path = `board/get`;

    public async get(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<IApiResponse> {
        console.log(`Under GET request`);
        const boardId = request.query.id;

        const boardData = await getBoardRecord(
            read.getPersistenceReader(),
            boardId
        );
        const { id, ...rest } = boardData;
        return {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Security-Policy":
                    "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'",
            },
            content: {
                data: {
                    ...rest,
                    boardId: id,
                },
                success: true,
            },
        };
    }
}

// UpdateBoardEndpoint updates the board data in the database
// This endpoint is used to update the preview Image.

export class UpdateBoardEndpoint extends ApiEndpoint {
    public path = `board/update`;

    public async post(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<IApiResponse> {
        console.log(`Under POST request`);
        const boardId = request.content.boardId;
        const boardData = request.content.boardData;
        const cover = request.content.cover;
        const title = request.content.title;

        const savedBoardata = await getBoardRecord(
            read.getPersistenceReader(),
            boardId
        );
        const { messageId, privateMessageId, status } = savedBoardata;
        const user = (await read.getMessageReader().getSenderUser(messageId))!;
        const room = await read.getMessageReader().getRoom(messageId);
        const AppSender = (await read.getUserReader().getAppUser()) as IUser;
        const directRoom = await getDirect(
            read,
            modify,
            AppSender,
            user.username
        );
        if (room) {
            await storeBoardRecord(
                persis,
                boardId,
                boardData,
                messageId,
                cover,
                title,
                privateMessageId,
                status
            );
            if (privateMessageId.length > 0 && status == UtilityEnum.PRIVATE) {
                if (directRoom) {
                    const previewMsg = (
                        await modify
                            .getUpdater()
                            .message(privateMessageId, user)
                    )
                        .setEditor(AppSender)
                        .setRoom(directRoom)
                        .setSender(AppSender)
                        .setParseUrls(true)
                        .setUsernameAlias(AppEnum.APP_NAME)
                        .setAttachments([
                            {
                                collapsed: true,
                                color: "#00000000",
                                imageUrl: cover,
                                type: "image",
                            },
                        ]);
                    await modify.getUpdater().finish(previewMsg);
                }
            } else {
                const previewMsg = (
                    await modify.getUpdater().message(messageId, user)
                )
                    .setEditor(user)
                    .setSender(user)
                    .setRoom(room)
                    .setParseUrls(true)
                    .setUsernameAlias(AppEnum.APP_NAME)
                    .setAttachments([
                        {
                            collapsed: true,
                            color: "#00000000",
                            imageUrl: cover,
                            type: "image",
                        },
                    ]);
                await modify.getUpdater().finish(previewMsg);
            }
        }

        return this.json({
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Security-Policy":
                    "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'",
            },
            content: {
                success: true,
            },
        });
    }
}

// New class for the delete endpoint
export class DeleteBoardEndpoint extends ApiEndpoint {
    public path = `board/delete`;

    public async delete(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<IApiResponse> {
        console.log(`Under DELETE request`);
        const boardId = request.content.boardId;

        // Assuming you have a function named deleteBoardRecord in BoardInteraction.ts
        // This function should handle the deletion logic
        // await deleteMessageByMessageID(persis, boardId);

        console.log(`DeleteBoardEndpoint is hit !!!!!!!!!!!!`);

        return this.json({
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Security-Policy":
                    "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'",
            },
            content: {
                success: true,
            },
        });
    }
}
