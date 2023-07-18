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

export async function PreviewBlock(
    username: string,
    url: string,
    title: string,
    description: string,
    dimnesions: {
        width: number;
        height: number;
    }
): Promise<Array<Block>> {
    const block: Block[] = [];

    const previewBlock = await getPreviewBlock(
        url,
        title,
        description,
        dimnesions
    );
    block.push(previewBlock);

    const editbutton = await getButton(
        "Edit Board",
        "edit",
        "edit",
        "Edit",
        ButtonStyle.PRIMARY,
        "http://localhost:3000/api/apps/public/c986f058-d8d5-496f-9c1c-06e39a95b229/excalidraw"
    );
    const buttonElements: Array<ButtonElement> = [];
    buttonElements.push(editbutton);

    const actionBlock = await getActionsBlock("edit", buttonElements);
    block.push(actionBlock);
    return block;
}
