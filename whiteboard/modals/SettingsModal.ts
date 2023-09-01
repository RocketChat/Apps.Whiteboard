import {
    ButtonStyle,
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
import { Block, TextObject } from "@rocket.chat/ui-kit";
import {
    getActionsBlock,
    getButton,
    getDividerBlock,
    getInputBox,
    getSectionBlock,
    getStaticSelectElement,
} from "../helpers/blockBuilder";

export async function SettingsModal(
    appId: string,
    messageId: string
): Promise<IUIKitSurfaceViewParam> {
    const block: Block[] = [];

    let settingsTextBlock = getSectionBlock(UtilityEnum.SETTINGS_LABEL);
    block.push(settingsTextBlock);
    let boardInputBlock = getInputBox(
        UtilityEnum.BOARD_INPUT_LABEL,
        UtilityEnum.BOARD_INPUT_PLACEHOLDER,
        UtilityEnum.BOARD_INPUT_BLOCK_ID,
        UtilityEnum.BOARD_INPUT_ACTION_ID,
        appId
    );
    block.push(boardInputBlock);

    let options = [
        {
            text: {
                type: "plain_text" as const,
                text: "Public",
            },
            value: UtilityEnum.PUBLIC,
        },
        {
            text: {
                type: "plain_text" as const,
                text: "Private",
            },
            value: UtilityEnum.PRIVATE,
        },
    ];
    let StaticSelectElement = getStaticSelectElement(
        UtilityEnum.BOARD_SELECT_LABEL,
        options,
        appId,
        UtilityEnum.BOARD_SELECT_BLOCK_ID,
        UtilityEnum.BOARD_SELECT_ACTION_ID,
    );

    let actionStaticSelectBlock = getActionsBlock(
        UtilityEnum.BOARD_SELECT_BLOCK_ID,
        [StaticSelectElement]
    );
    block.push(actionStaticSelectBlock);
    let closeButton = getButton(
        UtilityEnum.CANCEL,
        UtilityEnum.CLOSE_BLOCK_ID,
        UtilityEnum.CLOSE_ACTION_ID,
        appId,
        "",
        ButtonStyle.DANGER
    );
    let submitButton = getButton(
        UtilityEnum.SUBMIT,
        UtilityEnum.SUBMIT_BLOCK_ID,
        UtilityEnum.SUBMIT_ACTION_ID,
        appId,
        messageId,
        ButtonStyle.PRIMARY
    );
    const value = {
        id: UtilityEnum.SETTINGS_MODAL_ID,
        type: UIKitSurfaceType.MODAL,
        appId: appId,
        title: {
            type: "plain_text" as const,
            text: UtilityEnum.SETTINGS_TITLE,
        },
        close: closeButton,
        submit: submitButton,
        blocks: block,
    };
    return value;
}
