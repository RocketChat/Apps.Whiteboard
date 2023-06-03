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

    private async handleCreateBoardCommand() {
        const triggerId = this.context.getTriggerId();
        if (triggerId) {
            const modal = await CreateBoardModal({
                slashCommandContext: this.context,
                read: this.read,
                modify: this.modify,
                http: this.http,
                persistence: this.persistence,
            });

            await Promise.all([
                this.modify.getUiController().openModalView(
                    modal,
                    {
                        triggerId,
                    },
                    this.context.getSender()
                ),
            ]);
        }
    }
    public async resolveCommand() {
        switch (this.command[0]) {
            case "create":
                await this.handleCreateBoardCommand();
                break;
            default:
                "Please enter a valid command.";
                break;
        }
    }
}
