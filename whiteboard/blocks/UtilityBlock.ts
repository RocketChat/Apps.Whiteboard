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
    title: string,
    boardURL: string,
    randomBoardId: string,
    dimnesions: {
        width: number;
        height: number;
    }
): Promise<Array<Block>> {
    const block: Block[] = [];

    const openbutton = getButton(
        "Edit Board",
        "edit",
        UtilityEnum.OPEN_BUTTON_ACTION_ID,
        "Open",
        ButtonStyle.PRIMARY,
        boardURL
    );

    const renameButton = getButton(
        "⚙️",
        "edit info",
        UtilityEnum.OPEN_BUTTON_ACTION_ID,
        "Information",
        undefined,
        boardURL
    );

    const markdownBlock = getMarkdownBlock(`*Untitled Whiteboard* by \`@${username}\``);

    const actionBlock = getActionsBlock(UtilityEnum.PREVIEW_BLOCK_ID, [
        renameButton,
        openbutton,
    ]);
    block.push(markdownBlock);
    block.push(actionBlock);
    return block;
}
