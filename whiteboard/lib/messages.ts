import {
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom, RoomType } from "@rocket.chat/apps-engine/definition/rooms";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { NotificationsController } from "./notifications";
import { Block, TextObject } from "@rocket.chat/ui-kit";

export async function getDirect(
    read: IRead,
    modify: IModify,
    appUser: IUser,
    username: string
): Promise<IRoom | undefined> {
    const usernames = [appUser.username, username];
    let room: IRoom;
    try {
        room = await read.getRoomReader().getDirectByUsernames(usernames);
    } catch (error) {
        console.error(error);
        return;
    }
    if (room) {
        return room;
    } else {
        let roomId: string;
        const newRoom = modify
            .getCreator()
            .startRoom()
            .setType(RoomType.DIRECT_MESSAGE)
            .setCreator(appUser)
            .setMembersToBeAddedByUsernames(usernames);
        roomId = await modify.getCreator().finish(newRoom);
        return await read.getRoomReader().getById(roomId);
    }
}

export async function sendMessage(
    modify: IModify,
    room: IRoom,
    sender: IUser,
    message: string,
    blocks?: Array<Block>
): Promise<string> {
    const msg = modify
        .getCreator()
        .startMessage()
        .setSender(sender)
        .setRoom(room)
        .setParseUrls(false)
        .setText(message);

    if (blocks !== undefined) {
        msg.setBlocks(blocks);
    }

    return await modify.getCreator().finish(msg);
}

export async function sendLink(
    modify: IModify,
    room: IRoom,
    sender: IUser,
    message: string,
    blocks?: Array<Block>
): Promise<string> {
    const msg = modify
        .getCreator()
        .startMessage()
        .setSender(sender)
        .setRoom(room)
        .setParseUrls(true)
        .setText(message);

    if (blocks !== undefined) {
        msg.setBlocks(blocks);
    }

    return await modify.getCreator().finish(msg);
}

export async function shouldSendMessage(
    read: IRead,
    user: IUser,
    persistence: IPersistence
): Promise<boolean> {
    const notificationsController = new NotificationsController(
        read,
        persistence,
        user
    );
    const notificationsStatus =
        await notificationsController.getNotificationsStatus();
    return notificationsStatus ? notificationsStatus.status : true;
}

export async function sendNotification(
    read: IRead,
    modify: IModify,
    user: IUser,
    room: IRoom,
    message: string
): Promise<void> {
    const appUser = (await read.getUserReader().getAppUser()) as IUser;

    const msg = modify
        .getCreator()
        .startMessage()
        .setSender(appUser)
        .setRoom(room)
        .setText(message);

    return read.getNotifier().notifyUser(user, msg.getMessage());
}

export async function sendDirectMessage(
    read: IRead,
    modify: IModify,
    user: IUser,
    message: string,
    persistence: IPersistence
): Promise<string> {
    const appUser = (await read.getUserReader().getAppUser()) as IUser;
    const targetRoom = (await getDirect(
        read,
        modify,
        appUser,
        user.username
    )) as IRoom;

    const shouldSend = await shouldSendMessage(read, user, persistence);

    if (!shouldSend) {
        return "";
    }

    return await sendMessage(modify, targetRoom, appUser, message);
}

export function isUserHighHierarchy(user: IUser): boolean {
    const clearanceList = ["admin", "owner", "moderator"];
    return user.roles.some((role) => clearanceList.includes(role));
}

export async function helperMessage(
    modify: IModify,
    room: IRoom,
    appUser: IUser
) {
    const text = `*Whiteboard App Commands*
    \`/whiteboard auth\` - Provide User Details to whiteboard app
    \`/whiteboard remove-auth\` - Remove User Details from whiteboard app
    \`/whiteboard create\` - Create a new whiteboard
    \`/whiteboard delete\` - Delete a whiteboard
    \`/whiteboard help\` - Display this message
    `;

    const msg = modify
        .getCreator()
        .startMessage()
        .setSender(appUser)
        .setRoom(room)
        .setText(text);

    return await modify.getCreator().finish(msg);
}
