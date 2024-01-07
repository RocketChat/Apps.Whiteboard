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
import { buildHeaderBlock, deletionHeaderBlock } from "../blocks/UtilityBlock";
import { WhiteboardSlashCommandContext } from "../commands/WhiteboardCommand";
import {
    deleteBoards,
    getBoardName,
    getMessageIdByRoomName,
    storeBoardRecord,
} from "../persistence/boardInteraction";
import { randomId } from "./utilts";
import { defaultPreview } from "../assets/defaultPreview";

import {
    checkBoardNameByRoomId,
    getMessageIdByBoardName,
    deleteBoardByMessageId,
} from "../persistence/boardInteraction";
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

    // handleNewBoardCommand is used to handle the /whiteboard create command

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
        const appId = app.getID();
        const params = this.context.getArguments();

        // the name specified in command "/whiteboard new"
        let createBoardName =
            params.length > 1 ? params.slice(1).join(" ") : "";

        const repeatBoardName = await checkBoardNameByRoomId(
            this.read.getPersistenceReader(),
            room.id,
            createBoardName
        );
        if (repeatBoardName) {
            console.log("Whiteboard name exist in the room!");
            const message = this.modify
                .getCreator()
                .startMessage()
                .setSender(appUser)
                .setRoom(room)
                .setText(
                    `Oops! The whiteboard named *${createBoardName}* is already there in the room. Please try again with different whiteboard name`
                )
                .setParseUrls(true);

            await this.read
                .getNotifier()
                .notifyRoom(room, message.getMessage());
        } else {
            if (room) {
                const randomBoardId = randomId();
                const boardURL = `${boardEndpoint.computedPath}?id=${randomBoardId}`;

                // The variable "untitledName" stores "Untitled" if the name is not specified
                const untitledName = await getBoardName(
                    read.getPersistenceReader(),
                    room.id
                );

                // The variable "name" stores the board name if specified in the command; otherwise it defaults to "Untitled"
                let name = "";
                if (createBoardName == "") {
                    name = untitledName;
                } else {
                    name = createBoardName;
                }

                if (name) {
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

    // handleListCommand is used to handle the /whiteboard delete command

    private async deleteBoardCommand() {
        const appId = this.app.getID();
        const user = this.context.getSender();
        const params = this.context.getArguments();
        const room: IRoom = this.context.getRoom();
        const appSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;

        // the name specified in command "/whiteboard delete"
        let deleteBoardName =
            params.length > 1 ? params.slice(1).join(" ") : "";

        if (deleteBoardName == "") {
            const message = this.modify
                .getCreator()
                .startMessage()
                .setSender(appSender)
                .setRoom(room)
                .setText(
                    "Please specify the name of the whiteboard you wish to delete"
                )
                .setParseUrls(true);

            await this.read
                .getNotifier()
                .notifyRoom(room, message.getMessage());
        } 
                
        else if (
            deleteBoardName == "untitled" ||
            deleteBoardName == "Untitled"
        ) {
            const message = this.modify
                .getCreator()
                .startMessage()
                .setSender(appSender)
                .setRoom(room)
                .setText("Unititled Whiteboard can not be deleted")
                .setParseUrls(true);

            await this.read
                .getNotifier()
                .notifyRoom(room, message.getMessage());
        } else {
            const repeatBoardName:boolean = await checkBoardNameByRoomId(
                this.read.getPersistenceReader(),
                room.id,
                deleteBoardName
            );
            if (repeatBoardName) {
                const messageId = await getMessageIdByBoardName(
                    this.read.getPersistenceReader(),
                    room.id,
                    deleteBoardName
                );

                if (messageId) {
                    const AppSender: IUser = (await this.read
                        .getUserReader()
                        .getAppUser()) as IUser;

                    // Board data is deleted from database
                    await deleteBoardByMessageId(
                        this.persistence,
                        this.read.getPersistenceReader(),
                        messageId
                    );
                    console.log("Whiteboard is deleted from database!!!!");

                    // Message is Updated to "Deletion"
                    const room = await this.read
                        .getMessageReader()
                        .getRoom(messageId);
                    if (room) {
                        // Extracted the message to be updated
                        const message = await this.modify
                            .getUpdater()
                            .message(messageId, AppSender);

                        // Deletion header block as board get deleted
                        const deleteHeaderBlock = await deletionHeaderBlock(
                            user.username,
                            deleteBoardName
                        );

                        // Some message configurations
                        message.setEditor(user).setRoom(room);
                        message.setBlocks(deleteHeaderBlock);
                        message.removeAttachment(0);

                        // Message is finished modified and saved to database
                        await this.modify.getUpdater().finish(message);
                    }
                    await Promise.all([
                        sendMessage(
                            this.modify,
                            this.room,
                            appSender,
                            `The *${deleteBoardName}* whiteboard has been deleted successfully`
                        ),
                    ]);
                } else {
                    console.log("MessageId not found");
                }
            } else {
                const message = this.modify
                    .getCreator()
                    .startMessage()
                    .setSender(appSender)
                    .setRoom(room)
                    .setText(
                        `Oops! The whiteboard named *${deleteBoardName}* is not found in this room. Please check the whiteboard name and try again`
                    )
                    .setParseUrls(true);

                await this.read
                    .getNotifier()
                    .notifyRoom(room, message.getMessage());
            }
        }
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
            case "delete":
                await this.deleteBoardCommand();
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
