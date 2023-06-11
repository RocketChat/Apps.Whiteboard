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
import { ModalsEnum } from "../enum/Modals";
import { Block,TextObject } from "@rocket.chat/ui-kit";
import {
    getButton,
    getDividerBlock,
    getInputBox,
    getSectionBlock,
} from "../helpers/blockBuilder";

export async function DeleteBoardModal({
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
        ModalsEnum.BOARD_INPUT_LABEL,
        ModalsEnum.BOARD_INPUT_PLACEHOLDER,
        ModalsEnum.BOARD_INPUT_BLOCK_ID,
        ModalsEnum.BOARD_NAME_ACTION_ID,
        ""
    );
    block.push(boardInputBlock);

    let closeButton = await getButton(
        ModalsEnum.CLOSE,
        ModalsEnum.CLOSE_BLOCK_ID,
        ModalsEnum.CLOSE_ACTION_ID,
        "danger"
    );
    let submitButton = await getButton(
        ModalsEnum.SUBMIT,
        ModalsEnum.SUBMIT_BLOCK_ID,
        ModalsEnum.SUBMIT_ACTION_ID,
        "primary"
    );

    const value = {
        id: ModalsEnum.DELETE_BOARD_MODAL,
        type: UIKitSurfaceType.MODAL,
        title:{
            type:'plain_text' as const,
            text:ModalsEnum.DELETE_BOARD_TITLE
        },
        close:closeButton,
        submit:submitButton,
        blocks: block,
    }
    return value;
}
