import {
    IAppAccessors,
    IConfigurationExtend,
    ILogger,
    IEnvironmentRead,
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { App } from "@rocket.chat/apps-engine/definition/App";
import { IAppInfo } from "@rocket.chat/apps-engine/definition/metadata";
import { WhiteboardCommand } from "./commands/WhiteboardCommand";
import { ExecuteViewSubmitHandler } from "./handlers/ExecuteViewSubmitHandler";
import {
    UIKitViewSubmitInteractionContext,
    UIKitViewCloseInteractionContext,
    UIKitBlockInteractionContext,
    IUIKitResponse,
    UIKitActionButtonInteractionContext,
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
import { compressedString } from "./excalidraw";
import { excalidrawContent } from "./excalidrawContent";
export class WhiteboardApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async executeBlockActionHandler(
        context: UIKitBlockInteractionContext,
        read: IRead,
        http: IHttp,
        modify: IModify,
        persistence: IPersistence
    ): Promise<IUIKitResponse> {
        const handler = new ExecuteBlockActionHandler(
            this,
            read,
            http,
            modify,
            persistence
        );
        return await handler.run(context);
    }

    public async executeViewSubmitHandler(
        context: UIKitViewSubmitInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ) {
        const handler = new ExecuteViewSubmitHandler(
            this,
            read,
            http,
            persistence,
            modify
        );
        await handler.run(context);
    }

    public async extendConfiguration(
        configuration: IConfigurationExtend,
        environmentRead: IEnvironmentRead
    ): Promise<void> {
        const whiteboardBoardCommand: WhiteboardCommand = new WhiteboardCommand(
            this
        );
        await configuration.slashCommands.provideSlashCommand(
            whiteboardBoardCommand
        );
        await configuration.api.provideApi({
            visibility: ApiVisibility.PUBLIC,
            security: ApiSecurity.UNSECURE,
            endpoints: [
                new ExcalidrawEndpoint(this),
                new BundleJsEndpoint(this),
            ],
        });
    }
}
export class ExcalidrawEndpoint extends ApiEndpoint {
    public path = `/board/:id`;

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
