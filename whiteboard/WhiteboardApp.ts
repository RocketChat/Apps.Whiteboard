import {
    IAppAccessors,
    IConfigurationExtend,
    ILogger,
    IEnvironmentRead,
    IHttp,
    IModify,
    IPersistence,
    IRead,
    IPersistenceRead,
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
    getBoardRecordByMessageId,
    storeBoardRecord,
} from "./persistence/boardInteraction";
import { UIActionButtonContext } from "@rocket.chat/apps-engine/definition/ui";
import { UtilityEnum } from "./enum/uitlityEnum";
import { ExecuteViewSubmitHandler } from "./handlers/ExecuteViewSubmitHandler";
import { AppEnum } from "./enum/App";
import { getDirect } from "./lib/messages";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
export class WhiteboardApp extends App implements IUIKitInteractionHandler {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

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

    public async initialize(
        configuration: IConfigurationExtend,
        environmentRead: IEnvironmentRead
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
            ],
        });
    }
}
export class ExcalidrawEndpoint extends ApiEndpoint {
    public path = `board`;

    public async get(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<IApiResponse> {
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
        const boardId = request.content.boardId;
        const boardData = request.content.boardData;
        const cover = request.content.cover;
        const title = request.content.title;

        const boardata = await getBoardRecord(
            read.getPersistenceReader(),
            boardId
        );
        const msgId = boardata.messageId;

        const user = (await read.getMessageReader().getSenderUser(msgId))!;
        const room = await read.getMessageReader().getRoom(msgId);
        const privateMessageId = boardata.privateMessageId;
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
                msgId,
                cover,
                title,
                privateMessageId
            );
            if (privateMessageId.length > 0) {
                if (directRoom) {
                    const previewMsg = (
                        await modify
                            .getUpdater()
                            .message(privateMessageId, user)
                    )
                        .setEditor(user)
                        .setRoom(directRoom)
                        .setSender(user)
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
                    await modify.getUpdater().message(msgId, user)
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
