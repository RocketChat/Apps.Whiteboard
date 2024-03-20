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
    removeUserFromBoardOwner,
    sendMessage,
    sendMessageWithAttachment,
    sendNotification,
} from "./messages";
import { buildHeaderBlock, buildHeaderBlockAfterPermission, deletionHeaderBlock } from "../blocks/UtilityBlock";
import { WhiteboardSlashCommandContext } from "../commands/WhiteboardCommand";
import {
    deleteBoards,
    getBoardName,
    getMessageIdByRoomName,
    storeBoardRecord,
} from "../persistence/boardInteraction";
import { randomId } from "./utilts";
import { defaultPreview } from "../assets/defaultPreview";

import {checkBoardNameByRoomId, getMessageIdByBoardName, deleteBoardByMessageId, getBoardRecordByRoomId} from '../persistence/boardInteraction';
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

        const boardOwner = [sender]
        
        // check the roomAdmin
        const users =  await read.getRoomReader().getMembers(room.id)
        for(const user of users){
            if(user.roles.includes('admin') || user.roles.includes('owner') || user.roles.includes('moderator')){
                if(sender.username != user.username){
                    boardOwner.push(user)
                }

            }
        }

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

            await sendNotification(this.read, this.modify, sender, room, `Oops! The whiteboard named *${createBoardName}* is already there in the room. Please try again with different whiteboard name`)
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
                        "Public",
                        boardOwner
                    );
                }
            }
        }
    }

    // helperMessage is used to send the helper message to the user and /whiteboard help command

    private async helperMessage() {
        await helperMessage(this.read, this.modify, this.room, this.sender);
    }

    // handleListCommand is used to handle the /whiteboard list command

    private async handleListCommand() {
        await handleListCommand(this.read, this.modify, this.room, this.sender);
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
            await sendNotification(this.read, this.modify, user, room, "Please specify the name of the whiteboard you wish to delete")
        } 
                
        else if (
            deleteBoardName == "untitled" ||
            deleteBoardName == "Untitled"
        ) {
            await sendNotification(this.read, this.modify, user, room, "Unititled Whiteboard can not be deleted")
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
                await sendNotification(this.read, this.modify, user, room, `Oops! The whiteboard named *${deleteBoardName}* is not found in this room. Please check the whiteboard name and try again`)
            }
        }
    }

    // denyUser is used to handle the /whiteboard deny {userName} of {boardName} command
    private async denyUser() {

        const user = this.context.getSender();
        const params = this.context.getArguments();
        const room: IRoom = this.context.getRoom();
        const appSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;

        // the name specified in command "/whiteboard delete"
        const requiredParams = params.slice(1)
        const index = requiredParams.indexOf('of')
        const userName = requiredParams.slice(0,index).join(" ").trim()
        const boardName = requiredParams.slice(index+1).join(" ").trim()

        // Get the board data from the database
        const boardData = await getBoardRecordByRoomId(this.read.getPersistenceReader(), room.id)
        let requiredBoardData;
        for (let i = 0; i < boardData.length; i++) {
        if (boardData[i].title == boardName) {
            requiredBoardData = boardData[i]
            break;
            }
        }
        // If board not found
        if(!requiredBoardData){
            const message = {room: room, sender: appSender, text: "Board not found"}
            return this.read.getNotifier().notifyUser(user, message);
        }
        // If board found
        else{
            // check whether the user is admin or board Owner or not
            const match = requiredBoardData.boardOwner.find(obj => obj.id === user.id)
            if(match){
                // if the user is admin or board Owner
                const response = await removeUserFromBoardOwner(this.room, this.persistence, userName, requiredBoardData)
                if(response !== undefined){
                    const message = {room: room, sender: appSender, text: `**${userName}** has been removed from the rights of **${boardName}**.`}
                    return this.read.getNotifier().notifyUser(user, message);
                }
                else{
                    const message = {room: room, sender: appSender, text: "Some error occured!"}
                    return this.read.getNotifier().notifyUser(user, message);
                }

            }
            else{
                // if the user is not admin or board Owner
                const message = {room: room, sender: appSender, text: "You are not authorized to perform this action"}
                return this.read.getNotifier().notifyUser(user, message);
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
            case "deny":
                await this.denyUser();
                break;
            default:
                await Promise.all([
                    sendNotification(
                        this.read,
                        this.modify,
                        this.sender,
                        this.room,
                        "Please enter a valid command !!!"
                    ),
                    this.helperMessage(),
                ]);
                break;
        }
    }
}
