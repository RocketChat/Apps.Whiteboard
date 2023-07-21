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
import { ModalsEnum } from "../enum/Modals";
import { previewBlock } from "../blocks/UtilityBlock";
import { WhiteboardSlashCommandContext } from "../commands/WhiteboardCommand";
import {
    getBoardRecord,
    storeBoardRecord,
} from "../persistence/boardInteraction";
import { randomId } from "../utilts";
import {
    MessageActionType,
    MessageProcessingType,
} from "@rocket.chat/apps-engine/definition/messages";

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
            const baseUrl = await read
                .getEnvironmentReader()
                .getServerSettings()
                .getValueById("Site_Url");

            const preview = await previewBlock(
                appUser.username,
                "",
                `Untitled Whiteboard`,
                boardURL,
                randomBoardId,

                {
                    width: 500,
                    height: 316,
                }
            );
            const attachments = [
                {
                    collapsed: true,
                    color: "#00000000",
                    imageUrl:
                        "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDE5MSAxOTMiIHdpZHRoPSIxOTEiIGhlaWdodD0iMTkzIj4KICA8IS0tIHN2Zy1zb3VyY2U6ZXhjYWxpZHJhdyAtLT4KICAKICA8ZGVmcz4KICAgIDxzdHlsZSBjbGFzcz0ic3R5bGUtZm9udHMiPgogICAgICBAZm9udC1mYWNlIHsKICAgICAgICBmb250LWZhbWlseTogIlZpcmdpbCI7CiAgICAgICAgc3JjOiB1cmwoImh0dHBzOi8vdW5wa2cuY29tL0BleGNhbGlkcmF3L2V4Y2FsaWRyYXdAMC4xNS4yL2Rpc3QvZXhjYWxpZHJhdy1hc3NldHMvVmlyZ2lsLndvZmYyIik7CiAgICAgIH0KICAgICAgQGZvbnQtZmFjZSB7CiAgICAgICAgZm9udC1mYW1pbHk6ICJDYXNjYWRpYSI7CiAgICAgICAgc3JjOiB1cmwoImh0dHBzOi8vdW5wa2cuY29tL0BleGNhbGlkcmF3L2V4Y2FsaWRyYXdAMC4xNS4yL2Rpc3QvZXhjYWxpZHJhdy1hc3NldHMvQ2FzY2FkaWEud29mZjIiKTsKICAgICAgfQogICAgPC9zdHlsZT4KICA8L2RlZnM+CiAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjE5MSIgaGVpZ2h0PSIxOTMiIGZpbGw9IiNmZmZmZmYiPjwvcmVjdD48ZyBzdHJva2UtbGluZWNhcD0icm91bmQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwIDEwKSByb3RhdGUoMCA4NS41IDg2LjUpIj48cGF0aCBkPSJNNzYuNjMgLTAuMiBDODcuMzEgLTIuNjEsIDEwMC44MSAwLjQyLCAxMTIuMDUgNC4zNSBDMTIzLjMgOC4yOCwgMTM1LjQ2IDE1LjQ0LCAxNDQuMTIgMjMuMzcgQzE1Mi43NyAzMS4zLCAxNTkuNDMgNDEuMywgMTYzLjk4IDUxLjk0IEMxNjguNTMgNjIuNTcsIDE3MS41NyA3NS4zMywgMTcxLjQyIDg3LjE3IEMxNzEuMjYgOTkuMDIsIDE2OC4wOSAxMTIuMTgsIDE2My4wMyAxMjMuMDIgQzE1Ny45NyAxMzMuODUsIDE0OS43NyAxNDQuNSwgMTQxLjA2IDE1Mi4xOSBDMTMyLjM0IDE1OS44NywgMTIxLjUzIDE2NS44NywgMTEwLjcyIDE2OS4xNCBDOTkuOTEgMTcyLjQyLCA4Ny43NyAxNzMuMzQsIDc2LjE5IDE3MS44NSBDNjQuNjIgMTcwLjM3LCA1MS40OSAxNjYuMDEsIDQxLjI4IDE2MC4yMiBDMzEuMDcgMTU0LjQzLCAyMS41IDE0Ni41LCAxNC45MiAxMzcuMTEgQzguMzUgMTI3LjcxLCAzLjk0IDExNS4yOSwgMS44MiAxMDMuODcgQy0wLjMgOTIuNDQsIC0wLjMzIDgwLjA2LCAyLjIxIDY4LjU1IEM0Ljc1IDU3LjA0LCAxMC4zMiA0NC4yOCwgMTcuMDcgMzQuODEgQzIzLjgxIDI1LjM1LCAzMi4zIDE3LjQ1LCA0Mi42OSAxMS43NSBDNTMuMDcgNi4wNCwgNzIuNTMgMi4zNSwgNzkuMzUgMC42IEM4Ni4xOCAtMS4xNSwgODMuNDQgLTAuMjQsIDgzLjYyIDEuMjQgTTk2LjY4IC0wLjA4IEMxMDcuODIgLTAuMzksIDEyMC4xIDQuNjQsIDEyOS45NCAxMC41IEMxMzkuNzcgMTYuMzcsIDE0OS4xIDI1LjUzLCAxNTUuNzEgMzUuMTMgQzE2Mi4zMiA0NC43MiwgMTY3LjU0IDU2LjIyLCAxNjkuNiA2OC4xIEMxNzEuNjUgNzkuOTcsIDE3MC43OSA5NC43MywgMTY4LjAyIDEwNi4zNyBDMTY1LjI1IDExOCwgMTU5LjUgMTI4LjY5LCAxNTMgMTM3LjkxIEMxNDYuNSAxNDcuMTMsIDEzOC43IDE1NS44NCwgMTI5LjAzIDE2MS42OSBDMTE5LjM1IDE2Ny41NSwgMTA2Ljc3IDE3MS45NCwgOTQuOTMgMTczLjAzIEM4My4wOSAxNzQuMTEsIDY5LjExIDE3MiwgNTggMTY4LjE4IEM0Ni45IDE2NC4zNiwgMzYuNTYgMTU4LjExLCAyOC4zMSAxNTAuMTEgQzIwLjA1IDE0Mi4xMSwgMTMuMTYgMTMwLjg2LCA4LjQ4IDEyMC4xOSBDMy43OSAxMDkuNTIsIDAuNTQgOTcuODIsIDAuMTkgODYuMDkgQy0wLjE2IDc0LjM2LCAxLjUxIDYwLjY1LCA2LjM5IDQ5Ljc4IEMxMS4yNiAzOC45MSwgMjAuNjIgMjguNDMsIDI5LjQyIDIwLjg3IEMzOC4yMSAxMy4zMSwgNDguMDYgNy45OSwgNTkuMTUgNC40NCBDNzAuMjMgMC44OCwgOTAuMjEgLTAuMDMsIDk1Ljk0IC0wLjQ0IEMxMDEuNjcgLTAuODUsIDkzLjg0IDAuMjcsIDkzLjUzIDEuOTgiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIj48L3BhdGg+PC9nPjwvc3ZnPg==",
                },
            ];
            const messageId = await sendMessageWithAttachment(
                this.modify,
                room,
                appUser,
                `Whiteboard created by @${sender.username}`,
                attachments,
                preview
            );
            storeBoardRecord(
                persistence,
                appUser.id,
                room.id,
                randomBoardId,
                {
                    elements: [],
                    appState: {},
                    files: [],
                },
                messageId,
                "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDE5MSAxOTMiIHdpZHRoPSIxOTEiIGhlaWdodD0iMTkzIj4KICA8IS0tIHN2Zy1zb3VyY2U6ZXhjYWxpZHJhdyAtLT4KICAKICA8ZGVmcz4KICAgIDxzdHlsZSBjbGFzcz0ic3R5bGUtZm9udHMiPgogICAgICBAZm9udC1mYWNlIHsKICAgICAgICBmb250LWZhbWlseTogIlZpcmdpbCI7CiAgICAgICAgc3JjOiB1cmwoImh0dHBzOi8vdW5wa2cuY29tL0BleGNhbGlkcmF3L2V4Y2FsaWRyYXdAMC4xNS4yL2Rpc3QvZXhjYWxpZHJhdy1hc3NldHMvVmlyZ2lsLndvZmYyIik7CiAgICAgIH0KICAgICAgQGZvbnQtZmFjZSB7CiAgICAgICAgZm9udC1mYW1pbHk6ICJDYXNjYWRpYSI7CiAgICAgICAgc3JjOiB1cmwoImh0dHBzOi8vdW5wa2cuY29tL0BleGNhbGlkcmF3L2V4Y2FsaWRyYXdAMC4xNS4yL2Rpc3QvZXhjYWxpZHJhdy1hc3NldHMvQ2FzY2FkaWEud29mZjIiKTsKICAgICAgfQogICAgPC9zdHlsZT4KICA8L2RlZnM+CiAgPHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjE5MSIgaGVpZ2h0PSIxOTMiIGZpbGw9IiNmZmZmZmYiPjwvcmVjdD48ZyBzdHJva2UtbGluZWNhcD0icm91bmQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwIDEwKSByb3RhdGUoMCA4NS41IDg2LjUpIj48cGF0aCBkPSJNNzYuNjMgLTAuMiBDODcuMzEgLTIuNjEsIDEwMC44MSAwLjQyLCAxMTIuMDUgNC4zNSBDMTIzLjMgOC4yOCwgMTM1LjQ2IDE1LjQ0LCAxNDQuMTIgMjMuMzcgQzE1Mi43NyAzMS4zLCAxNTkuNDMgNDEuMywgMTYzLjk4IDUxLjk0IEMxNjguNTMgNjIuNTcsIDE3MS41NyA3NS4zMywgMTcxLjQyIDg3LjE3IEMxNzEuMjYgOTkuMDIsIDE2OC4wOSAxMTIuMTgsIDE2My4wMyAxMjMuMDIgQzE1Ny45NyAxMzMuODUsIDE0OS43NyAxNDQuNSwgMTQxLjA2IDE1Mi4xOSBDMTMyLjM0IDE1OS44NywgMTIxLjUzIDE2NS44NywgMTEwLjcyIDE2OS4xNCBDOTkuOTEgMTcyLjQyLCA4Ny43NyAxNzMuMzQsIDc2LjE5IDE3MS44NSBDNjQuNjIgMTcwLjM3LCA1MS40OSAxNjYuMDEsIDQxLjI4IDE2MC4yMiBDMzEuMDcgMTU0LjQzLCAyMS41IDE0Ni41LCAxNC45MiAxMzcuMTEgQzguMzUgMTI3LjcxLCAzLjk0IDExNS4yOSwgMS44MiAxMDMuODcgQy0wLjMgOTIuNDQsIC0wLjMzIDgwLjA2LCAyLjIxIDY4LjU1IEM0Ljc1IDU3LjA0LCAxMC4zMiA0NC4yOCwgMTcuMDcgMzQuODEgQzIzLjgxIDI1LjM1LCAzMi4zIDE3LjQ1LCA0Mi42OSAxMS43NSBDNTMuMDcgNi4wNCwgNzIuNTMgMi4zNSwgNzkuMzUgMC42IEM4Ni4xOCAtMS4xNSwgODMuNDQgLTAuMjQsIDgzLjYyIDEuMjQgTTk2LjY4IC0wLjA4IEMxMDcuODIgLTAuMzksIDEyMC4xIDQuNjQsIDEyOS45NCAxMC41IEMxMzkuNzcgMTYuMzcsIDE0OS4xIDI1LjUzLCAxNTUuNzEgMzUuMTMgQzE2Mi4zMiA0NC43MiwgMTY3LjU0IDU2LjIyLCAxNjkuNiA2OC4xIEMxNzEuNjUgNzkuOTcsIDE3MC43OSA5NC43MywgMTY4LjAyIDEwNi4zNyBDMTY1LjI1IDExOCwgMTU5LjUgMTI4LjY5LCAxNTMgMTM3LjkxIEMxNDYuNSAxNDcuMTMsIDEzOC43IDE1NS44NCwgMTI5LjAzIDE2MS42OSBDMTE5LjM1IDE2Ny41NSwgMTA2Ljc3IDE3MS45NCwgOTQuOTMgMTczLjAzIEM4My4wOSAxNzQuMTEsIDY5LjExIDE3MiwgNTggMTY4LjE4IEM0Ni45IDE2NC4zNiwgMzYuNTYgMTU4LjExLCAyOC4zMSAxNTAuMTEgQzIwLjA1IDE0Mi4xMSwgMTMuMTYgMTMwLjg2LCA4LjQ4IDEyMC4xOSBDMy43OSAxMDkuNTIsIDAuNTQgOTcuODIsIDAuMTkgODYuMDkgQy0wLjE2IDc0LjM2LCAxLjUxIDYwLjY1LCA2LjM5IDQ5Ljc4IEMxMS4yNiAzOC45MSwgMjAuNjIgMjguNDMsIDI5LjQyIDIwLjg3IEMzOC4yMSAxMy4zMSwgNDguMDYgNy45OSwgNTkuMTUgNC40NCBDNzAuMjMgMC44OCwgOTAuMjEgLTAuMDMsIDk1Ljk0IC0wLjQ0IEMxMDEuNjcgLTAuODUsIDkzLjg0IDAuMjcsIDkzLjUzIDEuOTgiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIj48L3BhdGg+PC9nPjwvc3ZnPg==",
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
