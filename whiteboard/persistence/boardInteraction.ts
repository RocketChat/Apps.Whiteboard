import {
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";

//functions needed to persist board data while modal and other UI interactions

export const storeBoardRecord = async (
    persistence: IPersistence,
    userId: string,
    roomId: string,
    boardId: string
): Promise<void> => {
    const association = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        `${userId}#BoardName`
    );
    await persistence.updateByAssociation(
        association,
        {
            userId: userId,
            roomId: roomId,
            board: { boardId, elements: [], files: {} },
        },
        true
    );
};

export const getBoardRecord = async (
    persistenceRead: IPersistenceRead,
    userId: string
): Promise<any> => {
    const association = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        `${userId}#BoardName`
    );
    const result = (await persistenceRead.readByAssociation(
        association
    )) as Array<any>;
    return result && result.length ? result[0] : null;
};
