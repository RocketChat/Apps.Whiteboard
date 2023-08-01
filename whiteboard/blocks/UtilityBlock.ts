import { ButtonStyle } from "@rocket.chat/apps-engine/definition/uikit";
import {
    getButton,
    getActionsBlock,
    getMarkdownBlock,
} from "../helpers/blockBuilder";
import {
    ActionsBlock,
    ButtonElement,
    ContextBlock,
    DividerBlock,
    InputBlock,
    Option,
    SectionBlock,
    StaticSelectElement,
    Block,
    TextObject,
    PlainText,
} from "@rocket.chat/ui-kit";
import { UtilityEnum } from "../enum/uitlityEnum";

export async function buildHeaderBlock(
    username: string,
    boardURL: string,
    appId: string,
    boardname?: string
): Promise<Array<Block>> {
    const block: Block[] = [];
    const openbutton = getButton(
        "Edit Board",
        UtilityEnum.PREVIEW_BLOCK_ID,
        UtilityEnum.OPEN_BUTTON_ACTION_ID,
        appId,
        "Open",
        ButtonStyle.PRIMARY,
        boardURL
    );

    const settingButton = getButton(
        "⚙️ Settings",
        UtilityEnum.PREVIEW_BLOCK_ID,
        UtilityEnum.SETTINGS_BUTTON_ACTION_ID,
        appId,
        "Settings",
        undefined
    );
    let markdownBlock: SectionBlock;
    if (boardname == undefined) {
        markdownBlock = getMarkdownBlock(
            `*Untitled Whiteboard* by \`@${username}\``
        );
    } else {
        markdownBlock = getMarkdownBlock(
            `*${boardname} Whiteboard* by \`@${username}\``
        );
    }

    const attachmentsButton = getButton(
        UtilityEnum.ATTACHMENTS,
        UtilityEnum.ATTACHMENTS_BLOCK_ID,
        UtilityEnum.ATTACHMENTS_ACTION_ID,
        appId,
        undefined
    );

    const actionBlock = getActionsBlock(UtilityEnum.PREVIEW_BLOCK_ID, [
        settingButton,
        openbutton,
        attachmentsButton
    ]);
    block.push(markdownBlock);
    block.push(actionBlock);
    return block;
}
