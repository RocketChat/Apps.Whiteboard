import {
    ButtonStyle,
    UIKitSurfaceType,
} from "@rocket.chat/apps-engine/definition/uikit";
import { IUIKitSurfaceViewParam } from "@rocket.chat/apps-engine/definition/accessors";
import { UtilityEnum } from "../enum/uitlityEnum";
import { Block } from "@rocket.chat/ui-kit";
import {
    getButton,
    getSectionBlock,
} from "../helpers/blockBuilder";

export async function DeleteModal(
    appId: string,
    messageId: string
): Promise<IUIKitSurfaceViewParam> {
    const block: Block[] = [];

    /* For Text block */
    let descBlock = getSectionBlock(UtilityEnum.DELETE_MODAL_DESC);
    block.push(descBlock);

    // Cancel Button
    let closeButton = getButton(
        UtilityEnum.CANCEL,
        UtilityEnum.CLOSE_BLOCK_ID,
        UtilityEnum.CLOSE_ACTION_ID,
        appId,
        "",
        undefined
    );

    // Delete Button
    const deleteButton = getButton(
        UtilityEnum.DELETE,
        UtilityEnum.DELETE_BLOCK_ID,
        UtilityEnum.DELETE_ACTION_ID,
        appId,
        messageId,
        ButtonStyle.DANGER
    );

    const value = {
        id: UtilityEnum.DELETE_MODAL_ID,
        type: UIKitSurfaceType.MODAL,
        appId: appId,
        title: {
            type: "plain_text" as const,
            text: UtilityEnum.ARE_YOU_SURE,
        },
        close: closeButton,
        submit: deleteButton,
        blocks: block,
    };
    return value;
}
