import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { WhiteboardApp } from "../WhiteboardApp";
import {
    IUIKitResponse,
    UIKitViewSubmitInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { UtilityEnum } from "../enum/uitlityEnum";
import { IUser } from "@rocket.chat/apps-engine/definition/users/IUser";
import { buildHeaderBlock } from "../blocks/UtilityBlock";
import { updateBoardnameByMessageId } from "../persistence/boardInteraction";

//This class will handle all the view submit interactions
export class ExecuteViewSubmitHandler {
    constructor(
        private readonly app: WhiteboardApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly persistence: IPersistence,
        private readonly modify: IModify,
        private readonly context: UIKitViewSubmitInteractionContext
    ) {}

    public async run(): Promise<IUIKitResponse> {
        const { user, view } = this.context.getInteractionData();

        const AppSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;
        const appId = AppSender.appId;
        try {
            switch (view.id) {
                case UtilityEnum.SETTINGS_MODAL_ID:
                    if (view.state && appId) {
                        const boardname =
                            view.state?.[UtilityEnum.BOARD_INPUT_BLOCK_ID]?.[
                                UtilityEnum.BOARD_INPUT_ACTION_ID
                            ];
                        const messageId =
                            this.context.getInteractionData().view.submit
                                ?.value;

                        console.log(messageId);

                        if (messageId) {
                            await updateBoardnameByMessageId(
                                this.persistence,
                                messageId,
                                boardname
                            );
                            const room = await this.read
                                .getMessageReader()
                                .getRoom(messageId);

                            if (room) {
                                const message = await this.modify
                                    .getUpdater()
                                    .message(messageId, AppSender);

                                const url =
                                    message.getBlocks()[1]["elements"][1][
                                        "url"
                                    ];
                                console.log(url);
                                const updateHeaderBlock =
                                    await buildHeaderBlock(
                                        user.username,
                                        url,
                                        appId,
                                        boardname
                                    );

                                message.setEditor(user).setRoom(room);
                                message.setBlocks(updateHeaderBlock);

                                await this.modify.getUpdater().finish(message);
                            } else {
                                console.log("Room not found");
                            }
                        } else {
                            console.log("MessageId not found");
                        }
                    } else {
                        console.log("Submit Failed");
                    }

                    return this.context
                        .getInteractionResponder()
                        .successResponse();
                default:
                    console.log("View Id not found");
                    return this.context
                        .getInteractionResponder()
                        .successResponse();
            }
        } catch (err) {
            console.log(err);
            return this.context.getInteractionResponder().errorResponse();
        }
    }
}
