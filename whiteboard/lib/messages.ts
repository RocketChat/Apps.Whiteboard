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
    storeBoardRecord,
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
        const modifiedAttachments = attachments.map(attachment => ({
            ...attachment,
            collapsed: false,
        }));
        msg.setAttachments(modifiedAttachments);
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
    user: IUser
) {
    const text = `*Whiteboard App Commands*
    \`/whiteboard new <board name>\` - Create a new whiteboard
    \`/whiteboard delete <board name>\` - Delete a whiteboard
    \`/whiteboard help\` - Display helper message
    \`/whiteboard list\` - List all the board names in the room
    \`/whiteboard deny <user name> of <board name>\` - Deny a user to edit the board
    You can use \`Create Whiteboard\` Action Button to create a new whiteboard as well \n
    Refer https://github.com/RocketChat/Apps.Whiteboard for more details 🚀
    `;

    return await sendNotification(read, modify, user, room, text)
}

// function to handle /whiteboard list command
export async function handleListCommand(
    read: IRead,
    modify: IModify,
    room: IRoom,
    user: IUser
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

        return await sendNotification(read, modify, user, room, text);
    }

    const text = `No boards found`;

    return await sendNotification(read, modify, user, room, text);
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
    read: IRead,
    messageId: string,
) {

    // Get the board data from the database
    const boardData = await getBoardRecordByMessageId(read.getPersistenceReader(), messageId)


    // Check whethet boardData.boardOwner contains user
    let checkBoolean = false;
    for (let i = 0; i < boardData.boardOwner.length; i++) {
        if (boardData.boardOwner[i].id === user.id) {
            checkBoolean = true;
            break;
        }
    }

    if(user.roles.includes("admin") || user.roles.includes("owner") || user.roles.includes("moderator")){
        checkBoolean = true
    }

    // If checkBoolean is false then ask the user for permision
    if (checkBoolean === false) {
        return false 
    }

    // If checkBoolean is true then allow user to perform the action
    return true

}

export async function addUsertoBoardOwner(
    read: IRead,
    room: IRoom,
    persistance: IPersistence,
    userName: string,
    boardName: string,
    userNameForBoardPermission: string,
    permission: string
){
    if(permission==="allow"){
        // Get the user data from the database
        const userForBoardPermission = await read.getUserReader().getByUsername(userNameForBoardPermission)
    
        // Get the board data from the database
        const boardData = await getBoardRecordByRoomId(read.getPersistenceReader(), room.id)
        let requiredBoardData;
        for (let i = 0; i < boardData.length; i++) {
            if (boardData[i].title == boardName) {
                requiredBoardData = boardData[i]
                break;
            }
        }
        // Add the user to the boardOwner
        const boardOwnerArray = [ userForBoardPermission ]
        for(let i=0;i<requiredBoardData.boardOwner.length;i++){
            boardOwnerArray.push(requiredBoardData.boardOwner[i])
        }

    // Update the boardData in the database
    await storeBoardRecord(
        persistance,
        room.id,
        requiredBoardData.id,
        requiredBoardData.boardData,
        requiredBoardData.messageId,
        requiredBoardData.cover,
        requiredBoardData.title,
        requiredBoardData.privateMessageId,
        requiredBoardData.status,
        boardOwnerArray
        )

    return userForBoardPermission
    }
    else if(permission==="deny"){
        const userForBoardPermission = await read.getUserReader().getByUsername(userNameForBoardPermission)
        return userForBoardPermission
    }

    else{
        console.log("Error has occured! ", read, room, userName, boardName, userNameForBoardPermission, permission)
        return undefined
    }
}


// function to remove user from boardRights
export const removeUserFromBoardOwner = async (
    room: IRoom,
    persistance: IPersistence,
    userName: string,
    board: any,
) => {

    // Add the user to the boardOwner
    const boardOwners = board.boardOwner

    // Filter the user from the boardOwner
    const boardOwnerArray = boardOwners.filter((boardOwner) => boardOwner.username !== userName)
    
    if(boardOwnerArray === boardOwners){
        return undefined
    }
    else{
        // Update the boardData in the database
        await storeBoardRecord(
            persistance,
            room.id,
            board.id,
            board.boardData,
            board.messageId,
            board.cover,
            board.title,
            board.privateMessageId,
            board.status,
            boardOwnerArray
            )
        return boardOwnerArray
    }
}