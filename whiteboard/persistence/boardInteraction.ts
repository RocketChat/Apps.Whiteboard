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
    boardId: string,
    boardData: any,
    messageId: string,
    cover: string,
    title: string,
    privateMessageId: string,
    status: string
): Promise<void> => {
    const boardAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        `${boardId}#BoardName`
    );

    const messageAssociation = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MESSAGE,
        `${messageId}#MessageId`
    );

    const getAllAssociations = new RocketChatAssociationRecord(
        RocketChatAssociationModel.MISC,
        "board"
    );

    await persistence.updateByAssociations(
        [boardAssociation, messageAssociation, getAllAssociations],
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
    boardName: string
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
    records["title"] = boardName;
    await persistence.updateByAssociations(
        [boardAssociation, messageAssociation],
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
): Promise<void> => {
    let records = await getBoardRecordByMessageId(persistenceRead, messageId);
    if (!records) {
        console.log("No records found for boardname");
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

    await persistence.removeByAssociations([
        boardAssociation,
        messageAssociation,
    ]);
};
