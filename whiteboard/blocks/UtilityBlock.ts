import { ButtonStyle } from "@rocket.chat/apps-engine/definition/uikit";
import {
    getPreviewBlock,
    getButton,
    getActionsBlock,
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
import { ModalsEnum } from "../enum/Modals";

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

    // const previewBlock = await getPreviewBlock(imageURL, title, boardURL,dimnesions);
    // block.push(previewBlock);

    const openbutton = await getButton(
        "Open Board",
        "open",
        ModalsEnum.OPEN_BUTTON_ACTION_ID,
        "Open",
        ButtonStyle.PRIMARY,
        boardURL
    );

    const actionBlock = await getActionsBlock(ModalsEnum.PREVIEW_BLOCK_ID, [
        openbutton,
    ]);
    block.push(actionBlock);
    return block;
}
