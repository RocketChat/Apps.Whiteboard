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

// Header block when whiteboard is deleted
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

// Header block for boardOwners to give permissions to the user
export async function permissionHeaderBlock(
    username: string,
    userForBoardPermission: string,
    boardname: string,
    appId: string,
): Promise<Array<Block>> {
    const block: Block[] = [];

    const grantPermissionButton = getButton(
        "Allow",
        UtilityEnum.PERMISSION_BLOCK_ID,
        UtilityEnum.ALLOW_BUTTON_ACTION_ID,
        appId,
        `${username}, ${boardname}, ${userForBoardPermission}`,
        ButtonStyle.PRIMARY
    );
    

    const denyPermissionButton = getButton(
        "Deny",
        UtilityEnum.PERMISSION_BLOCK_ID,
        UtilityEnum.DENY_BUTTON_ACTION_ID,
        appId,
        `${username}, ${boardname}, ${userForBoardPermission}`,
        ButtonStyle.DANGER
    );

    let markdownBlock: SectionBlock;
        markdownBlock = getMarkdownBlock(
            `${username} wants to edit *${boardname}*`
        );

    const actionBlock = getActionsBlock(UtilityEnum.PERMISSION_BLOCK_ID, [
        grantPermissionButton,
        denyPermissionButton
    ]);
    block.push(markdownBlock);
    block.push(actionBlock);
    return block;
}
