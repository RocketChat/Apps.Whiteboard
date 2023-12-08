import { ButtonStyle } from "@rocket.chat/apps-engine/definition/uikit";
import {
    ActionsBlock,
    ButtonElement,
    ContextBlock,
    DividerBlock,
    InputBlock,
    Option,
    SectionBlock,
    StaticSelectElement,
} from "@rocket.chat/ui-kit";
import { PreviewBlockWithPreview } from "@rocket.chat/ui-kit";
import { LayoutBlockType } from "@rocket.chat/ui-kit/dist/esm/blocks/LayoutBlockType";

// Important functions used to build the blocks for the modals and messages

export function getInputBox(
    labelText: string,
    placeholderText: string,
    blockId: string,
    actionId: string,
    appId: string,
    initialValue?: string,
    multiline?: boolean
) {
    const block: InputBlock = {
        type: "input",
        label: {
            type: "plain_text",
            text: labelText,
        },
        element: {
            type: "plain_text_input",
            placeholder: {
                type: "plain_text",
                text: placeholderText,
            },
            appId,
            blockId,
            actionId,
            initialValue,
            multiline,
        },
    };
    return block;
}

export function getInputBoxDate(
    labelText: string,
    placeholderText: string,
    blockId: string,
    actionId: string,
    appId: string,
    initialDate?: string
) {
    const block: InputBlock = {
        type: "input",
        label: {
            type: "plain_text",
            text: labelText,
        },
        element: {
            type: "datepicker",
            placeholder: {
                type: "plain_text",
                text: placeholderText,
            },
            appId,
            blockId,
            actionId,
            initialDate,
        },
    };
    return block;
}

export function getButton(
    labelText: string,
    blockId: string,
    actionId: string,
    appId: string,
    value?: string,
    style?: ButtonStyle.PRIMARY | ButtonStyle.DANGER,
    url?: string
) {
    const button: ButtonElement = {
        type: "button",
        text: {
            type: "plain_text",
            text: labelText,
            emoji: true,
        },
        appId,
        blockId,
        actionId,
        url,
        value,
        style,
    };
    return button;
}

export function getSectionBlock(labelText: string, accessory?: any) {
    const block: SectionBlock = {
        type: "section",
        text: {
            type: "plain_text",
            text: labelText,
        },
        accessory: accessory,
    };
    return block;
}

export function getMarkdownBlock(labelText: string) {
    const block: SectionBlock = {
        type: "section",
        text: {
            type: "mrkdwn",
            text: labelText,
        },
    };
    return block;
}

export function getDividerBlock() {
    const block: DividerBlock = {
        type: "divider",
    };
    return block;
}

export function getContextBlock(elementText: string) {
    const block: ContextBlock = {
        type: "context",
        elements: [
            {
                type: "plain_text",
                text: elementText,
            },
        ],
    };
    return block;
}

export function getStaticSelectElement(
    placeholderText: string,
    options: Array<Option>,
    appId: string,
    blockId: string,
    actionId: string,
    initialValue?: Option["value"]
) {
    const block: StaticSelectElement = {
        type: "static_select",
        placeholder: {
            type: "plain_text",
            text: placeholderText,
        },
        options,
        appId,
        blockId,
        actionId,
        initialValue,
    };
    return block;
}

export function getOptions(text: string, value: string) {
    const block: Option = {
        text: { type: "plain_text", text: text },
        value: value,
    };
    return block;
}

export function getActionsBlock(
    blockId: string,
    elements: Array<ButtonElement> | Array<StaticSelectElement>
) {
    const block: ActionsBlock = {
        type: "actions",
        blockId,
        elements,
    };
    return block;
}

export function getPreviewBlock(
    url: string,
    title: string,
    boardURL: string,
    dimensions?: {
        width: number;
        height: number;
    }
) {
    const block: PreviewBlockWithPreview = {
        preview: {
            url,
            dimensions: {
                width: dimensions?.width || 500,
                height: dimensions?.height || 500,
            },
        },
        type: LayoutBlockType.PREVIEW,
        title: [
            {
                type: "plain_text",
                text: title,
            },
        ],
        description: [],
        externalUrl: boardURL,
        oembedUrl: boardURL,
        thumb: undefined,
    };
    return block;
}

export function getDeleteButton(
    labelText: string,
    blockId: string,
    actionId: string,
    appId: string,
    value?: string,
    style?: ButtonStyle.PRIMARY | ButtonStyle.DANGER,
    url?: string
) {
    const button: ButtonElement = {
        type: "button",
        text: {
            type: "plain_text",
            text: labelText,
            emoji: true,
        },
        appId,
        blockId,
        actionId,
        url,
        value,
        style,
    };
    return button;
}
