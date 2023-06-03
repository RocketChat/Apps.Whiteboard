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
} from "@rocket.chat/apps-engine/definition/uikit";
import { ExecuteViewClosedHandler } from "./handlers/ExecuteViewClosedHandler";
import { ExecuteBlockActionHandler } from "./handlers/ExecuteBlockActionHandler";

export class WhiteboardApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async executeViewClosedHandler(
        context: UIKitViewCloseInteractionContext,
        read: IRead,
        http: IHttp,
        modify: IModify,
        persistence: IPersistence
    ) {
        const handler = new ExecuteViewClosedHandler(
            this,
            read,
            http,
            modify,
            persistence
        );
        await handler.run(context);
    }

    public async executeBlockActionHandler(
        context: UIKitBlockInteractionContext,
        read: IRead,
        http: IHttp,
        modify: IModify,
        persistence: IPersistence
    ) {
        const handler = new ExecuteBlockActionHandler(
            this,
            read,
            http,
            modify,
            persistence
        );
        await handler.run(context);
    }

    public async executeViewSubmitHandler(
        context: UIKitViewSubmitInteractionContext,
        read: IRead,
        http: IHttp,
        modify: IModify,
        persistence: IPersistence
    ) {
        const handler = new ExecuteViewSubmitHandler(
            this,
            read,
            http,
            modify,
            persistence
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
    }
}
