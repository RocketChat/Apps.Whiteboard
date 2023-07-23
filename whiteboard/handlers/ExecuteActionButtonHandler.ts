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
import { UtilityEnum} from "../enum/uitlityEnum";

export class ExecuteActionButtonHandler {
    constructor(
        private readonly app: WhiteboardApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly modify: IModify,
        private readonly persistence: IPersistence
    ) {}
    public async run(
        context: UIKitActionButtonInteractionContext
    ): Promise<IUIKitResponse> {
        const data = context.getInteractionData();

        try {
            const { actionId, user } = data;
            switch (actionId) {
                case UtilityEnum.RENAME_BUTTON_ACTION_ID:
                    console.log("RENAME BUTTON CLICKED");
                    return context.getInteractionResponder().successResponse();
                case UtilityEnum.CREATE_WHITEBOARD_MESSAGE_BOX_ACTION_ID:
                    console.log("CREATE NEW WHITEBOARD BUTTON CLICKED");
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
