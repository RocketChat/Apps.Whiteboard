import {
    ButtonStyle,
    UIKitSurfaceType,
} from "@rocket.chat/apps-engine/definition/uikit";
import { IUIKitSurfaceViewParam } from "@rocket.chat/apps-engine/definition/accessors";
import { UtilityEnum } from "../enum/uitlityEnum";
import { Block, Option, InputBlock } from "@rocket.chat/ui-kit";
import {
    getButton,
    getInputBox,
    getSectionBlock,
    getStaticSelectElement,
} from "../helpers/blockBuilder";
import { getBoardRecordByRoomId, updateBoardnameByMessageId } from '../persistence/boardInteraction';

export async function SettingsModal(
    appId: string,
    messageId: string,
    boardName: string,
    boardStatus: string,
): Promise<IUIKitSurfaceViewParam> {
    const block: Block[] = [];

    // Call the modified function to get the board name
    // const boardRecords = await getBoardRecordByRoomId(persistenceRead, roomId);

    /* For Settings Text block */
    let settingsTextBlock = getSectionBlock(UtilityEnum.SETTINGS_LABEL);
    block.push(settingsTextBlock);

    /* For Board Input block */
    let boardInputBlock = getInputBox(
        UtilityEnum.BOARD_INPUT_LABEL,
        UtilityEnum.BOARD_INPUT_PLACEHOLDER,
        UtilityEnum.BOARD_INPUT_BLOCK_ID,
        UtilityEnum.BOARD_INPUT_ACTION_ID,
        appId,
        boardName,
    );
    block.push(boardInputBlock);

    /* For input Choice block */
    let options: Array<Option> = [
        {
            text: {
                type: "plain_text",
                text: "Public",
            },
            value: UtilityEnum.PUBLIC,
        },
        {
            text: {
                type: "plain_text",
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
        boardStatus,
    );

    // Event handling for dropdown selection
    StaticSelectElement.actionId = UtilityEnum.BOARD_SELECT_ACTION_ID;

    let inputChoiceBlock: InputBlock = {
        type: "input",
        label: {
            type: "plain_text",
            text: UtilityEnum.BOARD_PRIVACY_LABEL,
        },
        element: StaticSelectElement,
    };
    block.push(inputChoiceBlock);

    let closeButton = getButton(
        UtilityEnum.CANCEL,
        UtilityEnum.CLOSE_BLOCK_ID,
        UtilityEnum.CLOSE_ACTION_ID,
        appId,
        "",
        undefined
    );

    // Event handling for closing modal
    closeButton.actionId = UtilityEnum.CLOSE_ACTION_ID;

    let submitButton = getButton(
        UtilityEnum.SUBMIT,
        UtilityEnum.SUBMIT_BLOCK_ID,
        UtilityEnum.SUBMIT_ACTION_ID,
        appId,
        messageId,
        ButtonStyle.PRIMARY
    );

    // Event handling for closing modal
    submitButton.actionId = UtilityEnum.SUBMIT_ACTION_ID;

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
