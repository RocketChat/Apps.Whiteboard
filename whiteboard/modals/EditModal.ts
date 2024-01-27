import {
    ButtonStyle,
    UIKitSurfaceType,
} from "@rocket.chat/apps-engine/definition/uikit";
import { IUIKitSurfaceViewParam } from "@rocket.chat/apps-engine/definition/accessors";
import { UtilityEnum } from "../enum/uitlityEnum";
import {Block, Option, InputBlock, SectionBlock} from '@rocket.chat/ui-kit';
import {getButton, getInputBox, getSectionBlock, getStaticSelectElement, getActionsBlock, getMarkdownBlock} from '../helpers/blockBuilder';

export async function EditModal(
    appId: string,
    boardURL: string,
    messageId: string,
    boardName: string,
    ): Promise<IUIKitSurfaceViewParam> {
    const block: Block[] = [];

    /* For Text block */
    let descBlock = getSectionBlock(UtilityEnum.EDIT_DESC);
    block.push(descBlock);

    // Cancel Button
    const dismissalButton = getButton(
        UtilityEnum.NO,
        UtilityEnum.NO_EDIT_BLOCK_ID,
        UtilityEnum.NO_EDIT_ACTION_ID,
        appId,
        "No",
        ButtonStyle.DANGER
    );

    // Approve Button
    const approveButton = getButton(
        UtilityEnum.EDIT,
        UtilityEnum.YES_EDIT_BLOCK_ID,
        UtilityEnum.YES_EDIT_ACTION_ID,
        appId,
        `${messageId}, ${boardName}`,
        ButtonStyle.PRIMARY,
        boardURL
    );


    const value = {
        id: UtilityEnum.EDIT_MODAL_ID,
        type: UIKitSurfaceType.MODAL,
        appId: appId,
        title: {
            type: "plain_text" as const,
            text: UtilityEnum.ARE_YOU_SURE,
        },
        close: dismissalButton,
        submit: approveButton,
        blocks: block,
    };


    return value;
}