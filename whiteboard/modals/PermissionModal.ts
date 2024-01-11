import {
    ButtonStyle,
    UIKitSurfaceType,
} from "@rocket.chat/apps-engine/definition/uikit";
import { IUIKitSurfaceViewParam } from "@rocket.chat/apps-engine/definition/accessors";
import { UtilityEnum } from "../enum/uitlityEnum";
import { Block, Option, InputBlock } from "@rocket.chat/ui-kit";
import {
    getButton,
    getInputBox,
    getSectionBlock,
    getStaticSelectElement,
} from "../helpers/blockBuilder";

export async function PermissionModal(
    appId: string,
    messageId: string
): Promise<IUIKitSurfaceViewParam> {
    const block: Block[] = [];

    /* For Text block */
    let descBlock = getSectionBlock(UtilityEnum.PERMISSION_DESC);
    block.push(descBlock);

    // Cancel Button
    let dismissalButton = getButton(
        UtilityEnum.NO,
        UtilityEnum.NO_BLOCK_ID,
        UtilityEnum.NO_ACTION_ID,
        appId,
        "",
        undefined
    );

    // Delete Button
    const approveButton = getButton(
        UtilityEnum.YES,
        UtilityEnum.YES_BLOCK_ID,
        UtilityEnum.YES_ACTION_ID,
        appId,
        messageId,
        undefined
    );

    const value = {
        id: UtilityEnum.PERMISSION_MODAL_ID,
        type: UIKitSurfaceType.MODAL,
        appId: appId,
        title: {
            type: "plain_text" as const,
            text: UtilityEnum.PERMISSION_DENIED,
        },
        close: dismissalButton,
        submit: approveButton,
        blocks: block,
    };
    return value;
}
