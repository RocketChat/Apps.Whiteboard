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

                case UtilityEnum.BOARD_SELECT_ACTION_ID:
                    console.log("Data",data.value);
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
