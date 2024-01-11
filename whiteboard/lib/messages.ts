import {
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom, RoomType } from "@rocket.chat/apps-engine/definition/rooms";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { NotificationsController } from "./notifications";
import { Block } from "@rocket.chat/ui-kit";
import { IMessageAttachment } from "@rocket.chat/apps-engine/definition/messages";
import { AppEnum } from "../enum/App";
import {
    getBoardRecordByMessageId,
    getBoardRecordByRoomId,
    getBoardRecordByRoomIdandBoardId,
} from "../persistence/boardInteraction";
import { IMessage } from "@rocket.chat/apps-engine/definition/messages";
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { DeleteModal } from '../modals/DeleteModal';
import { PermissionModal } from "../modals/PermissionModal";
import { UIKitBlockInteractionContext } from '@rocket.chat/apps-engine/definition/uikit';

// getDirect is used to get the direct room between the app user and the user

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

// sendMessage is used to send a message to a room

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
        .setParseUrls(true)
        .setText(message);

    if (blocks !== undefined) {
        msg.setBlocks(blocks);
    }

    return await modify.getCreator().finish(msg);
}

// sendMessageWithAttachment is used to send a message with attachments to a room

export async function sendMessageWithAttachment(
    modify: IModify,
    room: IRoom,
    sender: IUser,
    message: string,
    attachments?: Array<IMessageAttachment>,
    blocks?: Array<Block>
): Promise<string> {
    const msg = modify
        .getCreator()
        .startMessage()
        .setSender(sender)
        .setUsernameAlias(AppEnum.APP_NAME)
        .setRoom(room)
        .setParseUrls(true)
        .setText(message);

    if (attachments !== undefined) {
        msg.setAttachments(attachments);
    }
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

// sendNotification is used to send a notification to a user,notification is a message which is not visible to other users

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

// sendDirectMessage is used to send a direct message to a user

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
    read: IRead,
    modify: IModify,
    room: IRoom,
    appUser: IUser
) {
    const text = `*Whiteboard App Commands*
    \`/whiteboard new <board name>\` - Create a new whiteboard
    \`/whiteboard delete <board name>\` - Delete a whiteboard
    \`/whiteboard help\` - Display helper message
    \`/whiteboard list\` - List all the board names in the room
    You can use \`Create Whiteboard\` Action Button to create a new whiteboard as well \n
    Refer https://github.com/RocketChat/Apps.Whiteboard for more details 🚀
    `;

    const msg = modify
        .getCreator()
        .startMessage()
        .setSender(appUser)
        .setRoom(room)
        .setText(text)
        .setParseUrls(true);

    return await read.getNotifier().notifyRoom(room, msg.getMessage());
}

// function to handle /whiteboard list command
export async function handleListCommand(
    read: IRead,
    modify: IModify,
    room: IRoom,
    appUser: IUser
) {
    const boardDataArray: string[] = [];

    const boardData = await getBoardRecordByRoomId(
        read.getPersistenceReader(),
        room.id
    );

    if (boardData !== undefined && boardData.length > 0) {
        for (let i = 0; i < boardData.length; i++) {
            const boardDataCheck = await getBoardRecordByRoomIdandBoardId(
                read.getPersistenceReader(),
                room.id,
                boardData[i].id
            );

            boardDataArray.push(
                boardDataCheck ? boardDataCheck.title : "Error here messages.ts"
            );
        }

        const text = `*All existing boards are*:
                ${boardDataArray.join("\n")}
                `;

        const msg = modify
            .getCreator()
            .startMessage()
            .setSender(appUser)
            .setRoom(room)
            .setText(text)
            .setParseUrls(true);

        return await read.getNotifier().notifyRoom(room, msg.getMessage());
    }

    const text = `No boards found`;

    const msg = modify
        .getCreator()
        .startMessage()
        .setSender(appUser)
        .setRoom(room)
        .setText(text)
        .setParseUrls(true);

    return await read.getNotifier().notifyRoom(room, msg.getMessage());
}

// Function to delete a message
export async function deleteMessage(
    modify: IModify,
    sender: IUser,
    message: IMessage
): Promise<void> {
    try {
        // Call the deleteMessage method from IModifyDeleter
        await modify.getDeleter().deleteMessage(message, sender);
        console.log(`Message deleted successfully`);
    } catch (error) {
        console.error(`Error deleting message: ${error}`);
    }
}

// Function to check if the user has rights or not
export async function hasPermission(
    user: IUser,
    room: IRoom | undefined,
    read: IRead,
    messageId: string,
    modify: IModify,
    context: any
) {
    console.log("messageId", messageId)
    console.log("user", user)
    // console.log("room", room)
    // console.log("triggerString", triggerId)

    // Get the board data from the database
    const boardData = await getBoardRecordByMessageId(read.getPersistenceReader(), messageId)

    // console.log("boardData", boardData)

    // Check whethet boardData.boardOwner contains user
    let checkBoolean = false;
    for (let i = 0; i < boardData.boardOwner.length; i++) {
        console.log("boardOwner", boardData.boardOwner[i])
        if (boardData.boardOwner[i].id === user.id) {
            checkBoolean = true;
            break;
        }
    }

    console.log("checkBoolean", checkBoolean)
    // If checkBoolean is false then ask the user for permision
    if (checkBoolean === false) {
        return false 
    }

    return true

    // If checkBoolean is true then allow user to perform the action
}
