import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { SlashCommandContext } from "@rocket.chat/apps-engine/definition/slashcommands";
import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { ExecutorProps } from "../definitions/ExecutorProps";
import { WhiteboardApp } from "../WhiteboardApp";
import {
    handleListCommand,
    helperMessage,
    sendMessage,
    sendMessageWithAttachment,
} from "./messages";
import { buildHeaderBlock } from "../blocks/UtilityBlock";
import { WhiteboardSlashCommandContext } from "../commands/WhiteboardCommand";
import { getBoardName, storeBoardRecord } from "../persistence/boardInteraction";
import { randomId } from "./utilts";
import { defaultPreview } from "../assets/defaultPreview";

//CommandUtility is used to handle the commands

export class CommandUtility implements ExecutorProps {
    sender: IUser;
    room: IRoom;
    command: string[];
    context: SlashCommandContext;
    read: IRead;
    modify: IModify;
    http: IHttp;
    persistence: IPersistence;
    app: WhiteboardApp;

    constructor(props: ExecutorProps) {
        this.sender = props.sender;
        this.room = props.room;
        this.command = props.command;
        this.context = props.context;
        this.read = props.read;
        this.modify = props.modify;
        this.http = props.http;
        this.persistence = props.persistence;
        this.app = props.app;
    }

    // handleNewBoardCommand is used to handle the /whiteboard new command

    private async handleNewBoardCommand({
        app,
        context,
        read,
        modify,
        http,
        persistence
    }: WhiteboardSlashCommandContext) {
        const appUser = (await read.getUserReader().getAppUser())!;
        const sender = context.getSender()!;
        const room = context.getRoom();
        const endpoints = app.getAccessors().providedApiEndpoints;
        const boardEndpoint = endpoints[0];
        const appId = app.getID();
        if (room) {
            const randomBoardId = randomId();
            const boardURL = `${boardEndpoint.computedPath}?id=${randomBoardId}`;

            const name = await getBoardName(read.getPersistenceReader(), room.id)

            if(name){
                const headerBlock = await buildHeaderBlock(
                    sender.username,
                    boardURL,
                    appId,
                    name
                );
                const attachments = [
                    {
                        collapsed: true,
                        color: "#00000000",
                        imageUrl: defaultPreview,
                    },
                ];
                const messageId = await sendMessageWithAttachment(
                    this.modify,
                    room,
                    appUser,
                    `Whiteboard created by @${sender.username}`,
                    attachments,
                    headerBlock
                );
    
                storeBoardRecord(
                    persistence,
                    room.id,
                    randomBoardId,
                    {
                        elements: [],
                        appState: {},
                        files: [],
                    },
                    messageId,
                    "",
                    name,
                    "",
                    "Public"
                );
                
            }

        }
    }

    // helperMessage is used to send the helper message to the user and /whiteboard help command

    private async helperMessage() {
        const appSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;
        await helperMessage(this.read, this.modify, this.room, appSender);
    }

    // handleListCommand is used to handle the /whiteboard list command

    private async handleListCommand() {
        const appSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;
        await handleListCommand(this.read, this.modify, this.room, appSender);
    }

    public async resolveCommand(context: WhiteboardSlashCommandContext) {
        switch (this.command[0]) {
            case "new":
                await this.handleNewBoardCommand(context);
                break;
            case "help":
                await this.helperMessage();
                break;
            case "list":
                await this.handleListCommand();
                break;
            default:
                const appSender: IUser = (await this.read
                    .getUserReader()
                    .getAppUser()) as IUser;
                await Promise.all([
                    sendMessage(
                        this.modify,
                        this.room,
                        appSender,
                        "Please enter a valid command !!!"
                    ),
                    this.helperMessage(),
                ]);
                break;
        }
    }
}
