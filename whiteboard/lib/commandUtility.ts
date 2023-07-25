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
import { ExcalidrawEndpoint, WhiteboardApp } from "../WhiteboardApp";
import { CreateBoardModal } from "../modals/CreateBoardModal";
import { AuthModal } from "../modals/AuthModal";
import {
    helperMessage,
    sendMessage,
    sendMessageWithAttachment,
} from "./messages";
import { getAuthData, clearAuthData } from "../persistence/authorization";
import { DeleteBoardModal } from "../modals/DeleteBoardModal";
import { UtilityEnum } from "../enum/uitlityEnum";
import { buildHeaderBlock } from "../blocks/UtilityBlock";
import { WhiteboardSlashCommandContext } from "../commands/WhiteboardCommand";
import {
    getBoardRecord,
    storeBoardRecord,
} from "../persistence/boardInteraction";
import { randomId } from "./utilts";
import {
    MessageActionType,
    MessageProcessingType,
} from "@rocket.chat/apps-engine/definition/messages";
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

    private async handleAuthCommand() {
        const triggerId = this.context.getTriggerId();
        const appSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;
        if (triggerId) {
            const modal = await AuthModal({
                slashCommandContext: this.context,
                read: this.read,
                modify: this.modify,
                http: this.http,
                persistence: this.persistence,
            });

            const Auth_Status = await getAuthData(
                this.read.getPersistenceReader(),
                this.sender.id
            );
            if (Auth_Status.auth_status === true) {
                sendMessage(
                    this.modify,
                    this.room,
                    appSender,
                    "**whiteboard-app** already authenticated"
                );
            } else {
                await Promise.all([
                    this.modify.getUiController().openSurfaceView(
                        modal,
                        {
                            triggerId,
                        },
                        this.context.getSender()
                    ),
                ]);
            }
        }
    }

    private async handleRemoveAuthCommand() {
        const authStatus = await this.handleAuthStatus();
        const appSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;
        if (authStatus === true) {
            await clearAuthData(this.persistence, this.sender.id, this.room.id);
            sendMessage(
                this.modify,
                this.room,
                appSender,
                "**whiteboard-app** authentication removed by @" +
                    this.sender.username
            );
        } else {
            sendMessage(
                this.modify,
                this.room,
                appSender,
                "You are not authenticated"
            );
        }
    }

    private async handleAuthStatus() {
        const authData = await getAuthData(
            this.read.getPersistenceReader(),
            this.sender.id
        );
        const authStatus = authData.auth_status;
        return authStatus;
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

    private async handleDeleteBoardCommand() {
        const triggerId = this.context.getTriggerId();
        const appSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;
        const authStatus = await this.handleAuthStatus();
        if (authStatus === true) {
            if (triggerId) {
                const modal = await DeleteBoardModal({
                    slashCommandContext: this.context,
                    read: this.read,
                    modify: this.modify,
                    http: this.http,
                    persistence: this.persistence,
                });

                await Promise.all([
                    this.modify.getUiController().openSurfaceView(
                        modal,
                        {
                            triggerId,
                        },
                        this.context.getSender()
                    ),
                ]);
            }
        } else {
            sendMessage(
                this.modify,
                this.room,
                appSender,
                "Please authenticate yourself first !!!"
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
            case "auth":
                this.handleAuthCommand();
                break;
            case "remove-auth":
                await this.handleRemoveAuthCommand();
                break;
            case "new":
                await this.handleNewBoardCommand(context);
                break;
            case "delete":
                await this.handleDeleteBoardCommand();
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
