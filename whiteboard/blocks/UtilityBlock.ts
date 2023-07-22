import { ButtonStyle } from "@rocket.chat/apps-engine/definition/uikit";
import {
    getPreviewBlock,
    getButton,
    getActionsBlock,
    getContextBlock,
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

export async function previewBlock(
    username: string,
    imageURL: string,
    title: string,
    boardURL: string,
    randomBoardId: string,
    dimnesions: {
        width: number;
        height: number;
    }
): Promise<Array<Block>> {
    const block: Block[] = [];

    // const previewBlock = await getPreviewBlock(
    //     imageURL,
    //     title,
    //     boardURL,
    //     dimnesions
    // );
    // block.push(previewBlock);

    const openbutton = await getButton(
        "Edit Board",
        "edit",
        UtilityEnum.OPEN_BUTTON_ACTION_ID,
        "Open",
        ButtonStyle.PRIMARY,
        boardURL
    );

    const renameButton = await getButton(
        "Rename Board",
        "edit",
        UtilityEnum.OPEN_BUTTON_ACTION_ID,
        "Open",
        undefined,
        boardURL
    );

    const actionBlock = await getActionsBlock(UtilityEnum.PREVIEW_BLOCK_ID, [
        renameButton,
        openbutton,
    ]);
    block.push(actionBlock);
    return block;
}
