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
import { CreateBoardModal } from "../modals/CreateBoardModal";
import { AuthModal } from "../modals/AuthModal";
import { helperMessage, sendMessage } from "./messages";
import {
    getInteractionRoomData,
    storeInteractionRoomData,
} from "../persistence/roomInteraction";
import { storeBoardName } from "../persistence/boardInteraction";
import {
    storeAuthData,
    getAuthData,
    clearAuthData,
} from "../persistence/authorization";
import { DeleteBoardModal } from "../modals/DeleteBoardModal";

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

    private async handleCreateBoardCommand() {
        const triggerId = this.context.getTriggerId();
        const appSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;
        const authStatus = await this.handleAuthStatus();
        if (authStatus === true) {
            if (triggerId) {
                const modal = await CreateBoardModal({
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

    public async resolveCommand() {
        switch (this.command[0]) {
            case "auth":
                this.handleAuthCommand();
                break;
            case "remove-auth":
                await this.handleRemoveAuthCommand();
                break;
            case "create":
                await this.handleCreateBoardCommand();
                break;
            case "delete":
                await this.handleDeleteBoardCommand();
                break;
            case "help":
                helperMessage(this.modify, this.room, this.sender);
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
                    helperMessage(this.modify, this.room, this.sender),
                ]);
                break;
        }
    }
}
