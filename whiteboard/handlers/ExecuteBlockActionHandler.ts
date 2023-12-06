import {
    IHttp,
    IModify,
    IPersistence,
    IPersistenceRead,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { WhiteboardApp } from "../WhiteboardApp";
import {
    IUIKitResponse,
    UIKitBlockInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { UtilityEnum } from "../enum/uitlityEnum";
import { SettingsModal } from "../modals/SettingsModal";
import { DeleteModal } from "../modals/DeleteModal";
import { IUser } from "@rocket.chat/apps-engine/definition/users";

// ExecuteBlockActionHandler is used to handle the block actions
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
            const {
                actionId,
                triggerId,
                user,
                room,
                value,
                message,
                container,
            } = data;

            const appSender = this.app;
            console.log(`appSender : ${appSender}`);
            const appId = data.appId;
            // The id of the message (created when the user created the whiteboard)
            const messageId = data.message?.id;
            const AppSender: IUser = (await this.read
                .getUserReader()
                .getAppUser()) as IUser;
            switch (actionId) {
                // handleSettingsButtonAction is used to handle the settings button action
                case UtilityEnum.SETTINGS_BUTTON_ACTION_ID:
                    if (messageId) {
                        console.log(
                            `Under Modal Settings, button is clicked !!!!`
                        );
                        const modal = await SettingsModal(appId, messageId);
                        await Promise.all([
                            console.log("Waiting for response!!!!!!!!!!!!!!"),
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

                // Add the case for the delete button action
                case UtilityEnum.DELETE_BUTTON_ACTION_ID:
                    if (messageId) {
                        console.log(`Delete button is clicked !!!`);
                        const modal = await DeleteModal(appId, messageId);
                        await Promise.all([
                            console.log("Waiting for response!!!!!!!!!!!!!!"),
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
