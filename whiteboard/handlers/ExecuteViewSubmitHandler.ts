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
import { sendNotification, sendMessage } from "../lib/messages";
import { AppEnum } from "../enum/App";
import { IUser } from "@rocket.chat/apps-engine/definition/users/IUser";

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
        const { user, view, room } = this.context.getInteractionData();
        const roomId = room?.id;
        const AppSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;

        try {
            switch (view.id) {
                case UtilityEnum.SETTINGS_MODAL_ID:
                    if (user.id && view.state) {
                        const roomId = this.context.getInteractionData();

                        if (roomId) {
                            const boardname =
                                view.state?.[
                                    UtilityEnum.BOARD_INPUT_BLOCK_ID
                                ]?.[UtilityEnum.BOARD_INPUT_ACTION_ID];

                            console.log("Board name", boardname);
                        }
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
