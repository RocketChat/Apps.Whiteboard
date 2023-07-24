import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { WhiteboardApp } from "../WhiteboardApp";
import {
    IUIKitResponse,
    UIKitActionButtonInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { UtilityEnum } from "../enum/uitlityEnum";
import { sendMessage, sendMessageWithAttachment } from "../lib/messages";
import { randomId } from "../utilts";
import { buildHeaderBlock } from "../blocks/UtilityBlock";
import { defaultPreview } from "../assets/defaultPreview";
import { storeBoardRecord } from "../persistence/boardInteraction";

export class ExecuteActionButtonHandler {
    constructor(
        private readonly app: WhiteboardApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly persistence: IPersistence,
        private readonly modify: IModify
    ) {}
    public async run(
        context: UIKitActionButtonInteractionContext
    ): Promise<IUIKitResponse> {
        const data = context.getInteractionData();

        try {
            const { actionId, user } = data;
            switch (actionId) {
                case UtilityEnum.CREATE_WHITEBOARD_MESSAGE_BOX_ACTION_ID:
                    const room = context.getInteractionData().room;
                    const sender = context.getInteractionData().user;
                    if (room) {
                        const endpoints =
                            this.app.getAccessors().providedApiEndpoints;
                        const boardEndpoint = endpoints[0];
                        const randomBoardId = randomId();
                        const boardURL = `${boardEndpoint.computedPath}?id=${randomBoardId}`;
                        const appUser = (await this.read
                            .getUserReader()
                            .getAppUser())!;

                        const headerBlock = await buildHeaderBlock(
                            sender.username,
                            "Untitled Board",
                            boardURL,
                            randomBoardId,
                            {
                                width: 500,
                                height: 500,
                            }
                        );
                        const attachments = [
                            {
                                collapsed: true,
                                color: "#00000000",
                                imageUrl: defaultPreview,
                            },
                        ];
                        const messageId = await sendMessageWithAttachment(
                            this.modify,
                            room,
                            appUser,
                            `Whiteboard created by @${sender.username}`,
                            attachments,
                            headerBlock
                        );
                        storeBoardRecord(
                            this.persistence,
                            randomBoardId,
                            {
                                elements: [],
                                appState: {},
                                files: [],
                            },
                            messageId,
                            "",
                            "Untitled Whiteboard"
                        );
                    }

                    return context.getInteractionResponder().successResponse();
                default:
                    return context.getInteractionResponder().successResponse();
            }
        } catch (err) {
            console.log(err);
            return context.getInteractionResponder().errorResponse();
        }
    }
}
