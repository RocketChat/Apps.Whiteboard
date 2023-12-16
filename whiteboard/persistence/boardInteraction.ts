import {
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";

//functions needed to persist board data while modal and other UI interactions
// Messages can be retrieved by using the messageId, privateMessageId and boardId
// PrivateMessageId is the message id of the private message sent to the user when user modifies the board permission

export const storeBoardRecord = async (
    persistence: IPersistence,
    roomId: string,
    boardId: string,
    boardData: any,
    messageId: string,
    cover: string,
    title: string,
    privateMessageId: string,
    status: string
): Promise<void> => {

    const roomAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.ROOM,
        `${roomId}#BoardName`
    );

    const boardAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        `${boardId}#BoardName`
    );

    const messageAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MESSAGE,
        `${messageId}#MessageId`
    );

    const getAllBoardAssocations = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MISC,
        "board"
    );

    await persistence.updateByAssociations(
        [boardAssociation, messageAssociation, roomAssociation, getAllBoardAssocations],
        {
            id: boardId,
            boardData: {
                elements: boardData.elements,
                appState: boardData.appState,
                files: boardData.files,
            },
            messageId,
            cover,
            title,
            privateMessageId,
            status,
        },
        true
    );
};

// query all records within the "scope" - room
export const getBoardRecordByRoomId = async (
    persistenceRead: IPersistenceRead,
    roomId: string
): Promise<any> => {
    const association = new RocketChatAssociationRecord(
        RocketChatAssociationModel.ROOM,
        `${roomId}#BoardName`
    );
    const result = (await persistenceRead.readByAssociation(
        association
    )) as Array<any>;

    return result;
};

// query all records within the "scope" - board
export const getAllBoardIds = async (persis: IPersistenceRead): Promise<Array<string>> => {
    const associations: Array<RocketChatAssociationRecord> = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'board'),
    ];

    let result: Array<string> = [];
    try {
        const records: Array<{ id: string }> = (await persis.readByAssociations(associations)) as Array<{ id: string }>;

        if (records.length) {
            result = records.map(({ id }) => id);
        }
    } catch (err) {
        console.warn(err);
    }

    return result;
}

// function to get new board name
export const getBoardName = async (persis: IPersistenceRead, roomId: string): Promise<string> => {
    const boardArray = await getBoardRecordByRoomId(persis, roomId);

    let suffix = 1;
    let newName = `Untitled Whiteboard`;

    while (boardArray.some(board => board.title === newName)) {
        suffix++;
        newName = `Untitled Whiteboard ${suffix}`;
    }

    return newName;
};

export const getBoardRecord = async (
    persistenceRead: IPersistenceRead,
    boardId: string
): Promise<any> => {
    const association = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        `${boardId}#BoardName`
    );
    const result = (await persistenceRead.readByAssociation(
        association
    )) as Array<any>;
    return result && result.length ? result[0] : null;
};

export const getBoardRecordByMessageId = async (
    persistenceRead: IPersistenceRead,
    messageId: string
): Promise<any> => {
    const association = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MESSAGE,
        `${messageId}#MessageId`
    );
    const result = (await persistenceRead.readByAssociation(
        association
    )) as Array<any>;
    return result && result.length ? result[0] : null;
};

export const updateBoardnameByMessageId = async (
    persistence: IPersistence,
    persistenceRead: IPersistenceRead,
    messageId: string,
    boardName: string,
    roomId: string
): Promise<void> => {
    let records = await getBoardRecordByMessageId(persistenceRead, messageId);
    if (!records) {
        return;
    }
    const boardId = records["id"];

    const boardAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        `${boardId}#BoardName`
    );
    const messageAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MESSAGE,
        `${messageId}#MessageId`
    );
    const roomAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.ROOM,
        `${roomId}#BoardName`
    );
    records["title"] = boardName;

    await persistence.updateByAssociations(
        [boardAssociation, messageAssociation, roomAssociation],
        records,
        true
    );
};

export const updatePrivateMessageIdByMessageId = async (
    persistence: IPersistence,
    persistenceRead: IPersistenceRead,
    messageId: string,
    privateMessageId: string
): Promise<void> => {
    let records = await getBoardRecordByMessageId(persistenceRead, messageId);
    if (!records) {
        console.log("No records found for private message id");
        return;
    }
    const boardId = records["id"];

    const boardAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        `${boardId}#BoardName`
    );

    const messageAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MESSAGE,
        `${messageId}#MessageId`
    );

    records["privateMessageId"] = privateMessageId;

    await persistence.updateByAssociations(
        [boardAssociation, messageAssociation],
        records,
        false
    );
};

export const updateBoardStatusByMessageId = async (
    persistence: IPersistence,
    persistenceRead: IPersistenceRead,
    messageId: string,
    status: string
): Promise<void> => {
    let records = await getBoardRecordByMessageId(persistenceRead, messageId);
    if (!records) {
        console.log("No records found");
        return;
    }
    const boardId = records["id"];

    const boardAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        `${boardId}#BoardName`
    );

    const messageAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MESSAGE,
        `${messageId}#MessageId`
    );

    records["status"] = status;
    await persistence.updateByAssociations(
        [boardAssociation, messageAssociation],
        records,
        false
    );
};

export const storeBoardRecordByPrivateMessageId = async (
    messageId: string,
    privateMessageId: string,
    persistence: IPersistence
): Promise<void> => {
    const record = {
        messageId,
    };
    const privateMessageAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MESSAGE,
        `${privateMessageId}#PrivateMessageId`
    );
    await persistence.updateByAssociations(
        [privateMessageAssociation],
        record,
        true
    );
};

export const getMessageIdByPrivateMessageId = async (
    persistenceRead: IPersistenceRead,
    privateMessageId: string
): Promise<any> => {
    const association = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MESSAGE,
        `${privateMessageId}#PrivateMessageId`
    );
    const result = (await persistenceRead.readByAssociation(
        association
    )) as Array<any>;
    return result && result.length ? result[0] : null;
};

export const deleteBoardByMessageId = async (
    persistence: IPersistence,
    persistenceRead: IPersistenceRead,
    messageId: string
): Promise<string> => {
    let records = await getBoardRecordByMessageId(persistenceRead, messageId);
    console.log("records", records)
    if (!records) {
        console.log("No records found for boardname");
        return "";
    }
    const boardId = records["id"];

    const boardAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        `${boardId}#BoardName`
    );
    const messageAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MESSAGE,
        `${messageId}#MessageId`
    );

    await persistence.removeByAssociations([
        boardAssociation,
        messageAssociation,
    ]);

    return records.title;
};
