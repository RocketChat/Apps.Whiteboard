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

export class ExecuteBlockActionHandler {
    private context: UIKitBlockInteractionContext;
    constructor(context: UIKitBlockInteractionContext) {
        this.context = context;
    }
    public async run(): Promise<IUIKitResponse> {
        const data = this.context.getInteractionData();

        try {
            const { actionId } = data;
            switch (actionId) {
                case UtilityEnum.SETTINGS_BUTTON_ACTION_ID:
                    console.log("Settings button clicked");
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
