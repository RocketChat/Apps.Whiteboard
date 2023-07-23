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
    constructor(
        private readonly app: WhiteboardApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly persistence: IPersistence,
        private readonly modify: IModify,
    ) {}
    public async run(
        context: UIKitBlockInteractionContext
    ): Promise<IUIKitResponse> {
        const data = context.getInteractionData();

        try {
            const { blockId, user, actionId } = data;
            switch (actionId) {
                case UtilityEnum.PREVIEW_BUTTON_ACTION_ID:
                    console.log("Preview block clicked");
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
