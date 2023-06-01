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
        blockId: "board-name",
        element: block.newPlainTextInputElement({
            actionId: "board-name",
            placeholder: block.newPlainTextObject("Board Name"),
        }),
        label: block.newPlainTextObject("Board Name"),
    });

    const value = {
        appId: "whiteboard-app",
        id: "create-board-modal",
        type: UIKitSurfaceType.MODAL,
        title: block.newPlainTextObject("Create Whiteboard"),
        blocks: block.getBlocks(),
        submit: block.newButtonElement({
            text: block.newPlainTextObject("Submit"),
        }),
    };
    return value;
}
