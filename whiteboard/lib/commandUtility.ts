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
import {  WhiteboardApp } from "../WhiteboardApp";
import {
    helperMessage,
    sendMessage,
    sendMessageWithAttachment,
} from "./messages";
import { buildHeaderBlock } from "../blocks/UtilityBlock";
import { WhiteboardSlashCommandContext } from "../commands/WhiteboardCommand";
import {
    storeBoardRecord,
} from "../persistence/boardInteraction";
import { randomId } from "./utilts";
import { defaultPreview } from "../assets/defaultPreview";

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

    private async handleNewBoardCommand({
        app,
        context,
        read,
        modify,
        http,
        persistence,
    }: WhiteboardSlashCommandContext) {
        const appUser = (await read.getUserReader().getAppUser())!;
        const sender = context.getSender()!;
        const room = context.getRoom();
        const endpoints = app.getAccessors().providedApiEndpoints;
        const boardEndpoint = endpoints[0];
        if (room) {
            const randomBoardId = randomId();
            const boardURL = `${boardEndpoint.computedPath}?id=${randomBoardId}`;

            const headerBlock = await buildHeaderBlock(
                sender.username,
                "Untitled Board",
                boardURL,
                randomBoardId,
                {
                    width: 500,
                    height: 500,
                }
            );
            const attachments = [
                {
                    collapsed: true,
                    color: "#00000000",
                    imageUrl:defaultPreview
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
                randomBoardId,
                {
                    elements: [],
                    appState: {},
                    files: [],
                },
                messageId,
                "",
                "Untitled Whiteboard"
            );
        }
    }

    private async helperMessage() {
        const appSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;
        await helperMessage(this.modify, this.room, appSender);
    }

    public async resolveCommand(context: WhiteboardSlashCommandContext) {
        switch (this.command[0]) {
            case "new":
                await this.handleNewBoardCommand(context);
                break;
            case "help":
                await this.helperMessage();
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
