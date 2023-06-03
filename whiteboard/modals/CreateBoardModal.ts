import {
    UIKitInteractionContext,
    UIKitSurfaceType,
} from "@rocket.chat/apps-engine/definition/uikit";
import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import {
    storeInteractionRoomData,
    getInteractionRoomData,
} from "../persistence/roomInteraction";
import { IUIKitModalViewParam } from "@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder";
import { SlashCommandContext } from "@rocket.chat/apps-engine/definition/slashcommands";
import { ModalsEnum } from "../enum/Modals";
import { AppEnum } from "../enum/App";
import { TextObjectType } from "@rocket.chat/apps-engine/definition/uikit";

export async function CreateBoardModal({
    modify,
    read,
    persistence,
    http,
    slashCommandContext,
    uikitcontext,
}: {
    modify: IModify;
    read: IRead;
    persistence: IPersistence;
    http: IHttp;
    slashCommandContext?: SlashCommandContext;
    uikitcontext?: UIKitInteractionContext;
}): Promise<IUIKitModalViewParam> {
    const block = modify.getCreator().getBlockBuilder();

    const room = slashCommandContext?.getRoom();
    const user = slashCommandContext?.getSender();

    if (user?.id) {
        let roomId;
        if (room?.id) {
            roomId = room.id;
            await storeInteractionRoomData(persistence, user.id, roomId);
        } else {
            roomId = (
                await getInteractionRoomData(
                    read.getPersistenceReader(),
                    user.id
                )
            ).roomId;
        }
    }

    block.addInputBlock({
        blockId: ModalsEnum.BOARD_INPUT_BLOCK_ID,
        label: block.newPlainTextObject(ModalsEnum.BOARD_INPUT_LABEL),
        element: block.newPlainTextInputElement({
            actionId: ModalsEnum.BOARD_NAME_ACTION_ID,
            placeholder: {
                text: ModalsEnum.BOARD_NAME,
                type: TextObjectType.PLAINTEXT,
            },
        }),
    });

    const value = {
        appId: AppEnum.APP_ID,
        id: ModalsEnum.CREATE_BOARD_MODAL,
        type: UIKitSurfaceType.MODAL,
        title: block.newPlainTextObject(ModalsEnum.CREATE_BOARD_TITLE),
        blocks: block.getBlocks(),
        submit: block.newButtonElement({
            actionId: ModalsEnum.SUBMIT_ACTION_ID,
            text: {
                type: TextObjectType.PLAINTEXT,
                text: ModalsEnum.SUBMIT,
            },
        }),
    };
    return value;
}
