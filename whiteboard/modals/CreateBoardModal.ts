import {
    UIKitInteractionContext,
    UIKitSurfaceType,
} from "@rocket.chat/apps-engine/definition/uikit";
import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
    IUIKitSurfaceViewParam,
} from "@rocket.chat/apps-engine/definition/accessors";
import { SlashCommandContext } from "@rocket.chat/apps-engine/definition/slashcommands";
import { UtilityEnum } from "../enum/uitlityEnum";
import { Block,TextObject } from "@rocket.chat/ui-kit";
import {
    getButton,
    getDividerBlock,
    getInputBox,
    getSectionBlock,
} from "../helpers/blockBuilder";

export async function CreateBoardModal({
    slashCommandContext,
    read,
    modify,
    http,
    persistence,
    uikitcontext,
}: {
    modify: IModify;
    read: IRead;
    persistence: IPersistence;
    http: IHttp;
    slashCommandContext?: SlashCommandContext;
    uikitcontext?: UIKitInteractionContext;
}): Promise<IUIKitSurfaceViewParam> {

    const block: Block[] = [];

    let boardInputBlock = await getInputBox(
        UtilityEnum.BOARD_INPUT_LABEL,
        UtilityEnum.BOARD_INPUT_PLACEHOLDER,
        UtilityEnum.BOARD_INPUT_BLOCK_ID,
        UtilityEnum.BOARD_NAME_ACTION_ID,
        ""
    );
    block.push(boardInputBlock);

    let closeButton = await getButton(
        UtilityEnum.CLOSE,
        UtilityEnum.CLOSE_BLOCK_ID,
        UtilityEnum.CLOSE_ACTION_ID,
        "danger"
    );
    let submitButton = await getButton(
        UtilityEnum.SUBMIT,
        UtilityEnum.SUBMIT_BLOCK_ID,
        UtilityEnum.SUBMIT_ACTION_ID,
        "primary"
    );

    const value = {
        id: UtilityEnum.NEW_BOARD_MODAL,
        type: UIKitSurfaceType.MODAL,
        title:{
            type:'plain_text' as const,
            text:UtilityEnum.NEW_BOARD_TITLE
        },
        close:closeButton,
        submit:submitButton,
        blocks: block,
    }
    return value;
}
