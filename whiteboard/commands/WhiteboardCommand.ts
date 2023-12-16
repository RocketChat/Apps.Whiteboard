import {
    ISlashCommand,
    SlashCommandContext,
} from "@rocket.chat/apps-engine/definition/slashcommands";
import {
    IHttp,
    IModify,
    IPersistence,
    IPersistenceRead,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { WhiteboardApp } from "../WhiteboardApp";
import { CommandUtility } from "../lib/commandUtility";

export interface WhiteboardSlashCommandContext {
    app: WhiteboardApp;
    context: SlashCommandContext;
    read: IRead;
    modify: IModify;
    http: IHttp;
    persistence: IPersistence
}
// Parent class for all the slash commands
export class WhiteboardCommand implements ISlashCommand {
    public constructor(private readonly app: WhiteboardApp) {}
    public command = "whiteboard";
    public i18nDescription = "";
    public providesPreview = false;
    public i18nParamsExample = "";

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persistence: IPersistence
    ): Promise<void> {
        const command = context.getArguments();
        const sender = context.getSender();
        const room = context.getRoom();

        if (!Array.isArray(command)) {
            return;
        }

        const commandUtility = new CommandUtility({
            sender,
            room,
            command: command,
            context,
            read,
            modify,
            http,
            persistence,
            app: this.app,
        });

        await commandUtility.resolveCommand({
            app: this.app,
            context,
            read,
            modify,
            http,
            persistence
        });
    }
}
