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
        if (triggerId) {
            const modal = await AuthModal({
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
    }

    private async handleRemoveAuthCommand() {
        const roomData = await getInteractionRoomData(
            this.read.getPersistenceReader(),
            this.sender.id
        );
        const authStatus = roomData.auth_status;
        if (authStatus === true) {
            await storeInteractionRoomData(
                this.persistence,
                this.sender.id,
                this.room.id,
                "",
                false
            );
            sendMessage(
                this.modify,
                this.room,
                this.sender,
                "**whiteboard-app** authentication removed"
            );
        } else {
            sendMessage(
                this.modify,
                this.room,
                this.sender,
                "You are not authenticated"
            );
        }
    }

    private async handleAuthStatus() {
        const roomData = await getInteractionRoomData(
            this.read.getPersistenceReader(),
            this.sender.id
        );
        const authStatus = roomData.auth_status;
        return authStatus;
    }

    private async handleCreateBoardCommand() {
        const triggerId = this.context.getTriggerId();
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
                this.sender,
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
            case "help":
                helperMessage(this.modify, this.room, this.sender);
                break;
            default:
                await Promise.all([
                    sendMessage(
                        this.modify,
                        this.room,
                        this.sender,
                        "Please enter a valid command !!!"
                    ),
                    helperMessage(this.modify, this.room, this.sender),
                ]);
                break;
        }
    }
}
