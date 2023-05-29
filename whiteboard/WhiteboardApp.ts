import {
    IAppAccessors,
    IConfigurationExtend,
    ILogger,
    IEnvironmentRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { App } from "@rocket.chat/apps-engine/definition/App";
import { IAppInfo } from "@rocket.chat/apps-engine/definition/metadata";
import { WhiteboardCommand } from "./commands/WhiteboardCommand";

export class WhiteboardApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }
    public async extendConfiguration(
        configuration: IConfigurationExtend,
        environmentRead: IEnvironmentRead
    ): Promise<void> {
        const whiteboardBoardCommand: WhiteboardCommand =
            new WhiteboardCommand();
        await configuration.slashCommands.provideSlashCommand(
            whiteboardBoardCommand
        );
    }
}
