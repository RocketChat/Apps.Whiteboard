import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { WhiteboardApp } from "../WhiteboardApp";
import {
    IUIKitResponse,
    UIKitBlockInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { UtilityEnum } from "../enum/uitlityEnum";
import { SettingsModal } from "../modals/SettingsModal";
import { getBoardRecordByMessageId } from "../persistence/boardInteraction";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { MessageActionButtonsAlignment } from "@rocket.chat/apps-engine/definition/messages";

export class ExecuteBlockActionHandler {
    constructor(
        private readonly app: WhiteboardApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly persistence: IPersistence,
        private readonly modify: IModify,
        private readonly context: UIKitBlockInteractionContext
    ) {}
    public async run(): Promise<IUIKitResponse> {
        const data = this.context.getInteractionData();
        try {
            const { actionId, triggerId, user, room } = data;
            const appSender = this.app;
            const appId = data.appId;
            const messageId = data.message?.id;
            const AppSender: IUser = (await this.read
                .getUserReader()
                .getAppUser()) as IUser;
            switch (actionId) {
                case UtilityEnum.SETTINGS_BUTTON_ACTION_ID:
                    console.log("Settings button clicked");
                    if (messageId) {
                        const modal = await SettingsModal(appId, messageId);
                        await Promise.all([
                            this.modify.getUiController().openSurfaceView(
                                modal,
                                {
                                    triggerId,
                                },
                                user
                            ),
                        ]);
                    }
                    return this.context
                        .getInteractionResponder()
                        .successResponse();

                case UtilityEnum.ATTACHMENTS_ACTION_ID:
                    if (messageId && room) {
                        const boardRecord = await getBoardRecordByMessageId(
                            this.read.getPersistenceReader(),
                            messageId
                        );
                        const filesObject = Object.values(
                            boardRecord.boardData.files
                        );
                        const urlArray: string[] = [];

                        const message = await this.modify
                            .getUpdater()
                            .message(messageId, AppSender);
                        message.setEditor(user).setRoom(room);

                        filesObject.forEach((element: Object) => {
                            urlArray.push(element["dataURL"]);
                        });
                        if (
                            message.getAttachments().length ==
                            urlArray.length + 1
                        ) {
                            return this.context
                                .getInteractionResponder()
                                .successResponse();
                        }
                        urlArray.forEach((element: string) => {
                            message.addAttachment({
                                color: "#00000000",
                                title: {
                                    link: element,
                                    displayDownloadLink: true,
                                    value: "Click to download asset",
                                },
                                thumbnailUrl: element,
                            });
                        });

                        await this.modify.getUpdater().finish(message);
                    }

                    return this.context
                        .getInteractionResponder()
                        .successResponse();
                default:
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
