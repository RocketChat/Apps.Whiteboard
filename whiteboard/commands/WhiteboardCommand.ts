import {
    ISlashCommand,
    SlashCommandContext,
} from "@rocket.chat/apps-engine/definition/slashcommands";
import {
    IHttp,
    IMessageBuilder,
    IModify,
    IModifyCreator,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { WhiteboardApp } from "../WhiteboardApp";
import { CommandUtility } from "../lib/commandUtility";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IMessage } from "@rocket.chat/apps-engine/definition/messages";

export class WhiteboardCommand implements ISlashCommand {
    public constructor() {}
    public command= "whiteboard";
    public i18nDescription= "";
    public providesPreview= false;
    public i18nParamsExample= "";

    // public async executor(
    //     context: SlashCommandContext,
    //     read: IRead,
    //     modify: IModify,
    //     http: IHttp,
    //     persistence: IPersistence
    // ): Promise<void> {

    //     const command = context.getArguments();
    //     const sender = context.getSender();
    //     const room = context.getRoom();

    //     if(!Array.isArray(command)){
    //         return;
    //     }

    //     const commandUtility = new CommandUtility({
    //         sender,
    //         room,
    //         command: command,
    //         context,
    //         read,
    //         modify,
    //         http,
    //         persistence,
    //         app: this.app,
    //     });
    //     await commandUtility.resolveCommand();
    // }

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
      ): Promise<void> {
        const creator: IModifyCreator = modify.getCreator()
        const sender: IUser = (await read.getUserReader().getAppUser()) as IUser
        const room: IRoom = context.getRoom()
        const messageTemplate: IMessage = {
          text: 'Whieboard Integration by Vinayak',
          sender,
          room
        }
        const messageBuilder: IMessageBuilder = creator.startMessage(messageTemplate)
        await creator.finish(messageBuilder)
      }
}
