import {
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { UtilityEnum } from "../enum/uitlityEnum";

//functions needed to persist board data while modal and other UI interactions

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
    await persistence.updateByAssociations(
        [boardAssociation, messageAssociation],
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
