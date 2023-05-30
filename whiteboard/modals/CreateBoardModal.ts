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
import { IUIKitModalViewParam } from "@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder";

export async function CreateBoardModal({
    modify,
    read,
    persistence,
    http,
    uikitcontext,
}: {
    modify: IModify;
    read: IRead;
    persistence: IPersistence;
    http: IHttp;
    uikitcontext?: UIKitInteractionContext;
}): Promise<IUIKitModalViewParam> {
    const block = modify.getCreator().getBlockBuilder();

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
        id: "block-id",
        type: UIKitSurfaceType.MODAL,
        title: block.newPlainTextObject("Create Whiteboard"),
        blocks: block.getBlocks(),
        submit: block.newButtonElement({
            text: block.newPlainTextObject("Submit"),
        }),
    };
    return value;
}
