import {
    IPersistence,
    IPersistenceRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from "@rocket.chat/apps-engine/definition/metadata";

//functions needed to persist auth data while modal and other UI interactions

export const storeAuthData = async (
    persistence: IPersistence,
    userId: string,
    roomId: string,
    auth_status: boolean
): Promise<void> => {
    const association = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        `${userId}#AuthStatus`
    );
    await persistence.updateByAssociation(
        association,
        {
            userId: userId,
            roomId: roomId,
            auth_status: auth_status,
        },
        true
    );
};

export const getAuthData = async (
    persistenceRead: IPersistenceRead,
    userId: string
): Promise<any> => {
    const association = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        `${userId}#AuthStatus`
    );
    const result = (await persistenceRead.readByAssociation(
        association
    )) as Array<any>;
    return result && result.length ? result[0] : null;
};

export const clearAuthData = async (
    persistence: IPersistence,
    userId: string,
    roomId: string
): Promise<void> => {
    const association = new RocketChatAssociationRecord(
        RocketChatAssociationModel.USER,
        `${userId}#AuthStatus`
    );
    await persistence.updateByAssociation(association, {
        userId: userId,
        roomId: roomId,
        auth_status: false,
    });
};
