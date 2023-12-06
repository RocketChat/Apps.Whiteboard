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

export async function DeleteModal(
    appId: string,
    messageId: string
): Promise<IUIKitSurfaceViewParam> {
    const block: Block[] = [];

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
            text: UtilityEnum.DELETE,
        },
        submit: deleteButton,
        blocks: block,
    };
    return value;
}
