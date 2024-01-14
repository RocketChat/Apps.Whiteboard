import { ButtonStyle } from "@rocket.chat/apps-engine/definition/uikit";
import {
    getButton,
    getActionsBlock,
    getMarkdownBlock,
    getDeleteButton,
} from "../helpers/blockBuilder";
import { SectionBlock, Block } from "@rocket.chat/ui-kit";
import { UtilityEnum } from "../enum/uitlityEnum";

//Header block for all new whiteboards
export async function buildHeaderBlock(
    username: string,
    boardURL: string,
    appId: string,
    boardname?: string
): Promise<Array<Block>> {
    const block: Block[] = [];
    const openbutton = getButton(
        "Edit board",
        UtilityEnum.PREVIEW_BLOCK_ID,
        UtilityEnum.OPEN_BUTTON_ACTION_ID,
        appId,
        "Open",
        ButtonStyle.PRIMARY,
        boardURL
    );

    const settingButton = getButton(
        "Settings",
        UtilityEnum.PREVIEW_BLOCK_ID,
        UtilityEnum.SETTINGS_BUTTON_ACTION_ID,
        appId,
        "Settings",
        undefined
    );

    const deleteButton = getDeleteButton(
        "Delete board",
        UtilityEnum.PREVIEW_BLOCK_ID,
        UtilityEnum.DELETE_BUTTON_ACTION_ID,
        appId,
        "Delete",
        ButtonStyle.DANGER
    );

    let markdownBlock: SectionBlock;
    if (boardname == undefined) {
        markdownBlock = getMarkdownBlock(
            `*Untitled Whiteboard* by \`@${username}\``
        );
    } else {
        markdownBlock = getMarkdownBlock(`*${boardname}* by \`@${username}\``);
    }

    const actionBlock = getActionsBlock(UtilityEnum.PREVIEW_BLOCK_ID, [
        settingButton,
        openbutton,
        deleteButton,
    ]);
    block.push(markdownBlock);
    block.push(actionBlock);
    return block;
}

// Header block to take user back to the board

export async function goToBoardBlock(
    boardURL: string,
    appId: string,
    boardname?: string
): Promise<Array<Block>> {
    const block: Block[] = [];
    const goToBoardButton = getButton(
        `Go to the ${boardname} board`,
        UtilityEnum.GOTO_BOARD_BLOCK_ID,
        UtilityEnum.GOTO_BOARD_BUTTON_ACTION_ID,
        appId,
        "GOTO",
        ButtonStyle.PRIMARY,
        boardURL
    );

    let markdownBlock: SectionBlock;
        markdownBlock = getMarkdownBlock(`*${boardname}* board`);

    const actionBlock = getActionsBlock(UtilityEnum.PREVIEW_BLOCK_ID, [
        goToBoardButton,
    ]);
    block.push(markdownBlock);
    block.push(actionBlock);
    return block;
}
// export async function deletionHeaderBlock(
//     username: string,
//     boardname: string
// ): Promise<Array<Block>> {
//     const block: Block[] = [];

//     let deletionBlock: SectionBlock;
//     deletionBlock = getMarkdownBlock(
//         `*${boardname} is deleted* by \`@${username}\``
//     );
//     block.push(deletionBlock);
//     return block;
// }

export async function deletionHeaderBlock(
    username: string,
    boardname: string
): Promise<Array<Block>> {
    const block: Block[] = [];

    let deletionBlock: SectionBlock;
    deletionBlock = getMarkdownBlock(
        `*${boardname} is deleted* by \`@${username}\``
    );
    block.push(deletionBlock);
    return block;
}
