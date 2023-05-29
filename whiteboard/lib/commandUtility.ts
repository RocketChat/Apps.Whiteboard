import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { SlashCommandContext } from "@rocket.chat/apps-engine/definition/slashcommands";
import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
    IMessageBuilder
} from "@rocket.chat/apps-engine/definition/accessors";
import { IMessage } from "@rocket.chat/apps-engine/definition/messages";
import { ExecutorProps } from "../definitions/ExecutorProps";
import { WhiteboardApp } from "../WhiteboardApp";

export class CommandUtility implements ExecutorProps{
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

    private async handleCreateBoardCommand(){
        console.log("handleCreateBoardCommand");
    }
    public async resolveCommand(){
        switch(this.command[0]){
            case "createBoard":
                await this.handleCreateBoardCommand();
                break;
            default: console.log('Invalid command')
                break;
        }
    }
}
