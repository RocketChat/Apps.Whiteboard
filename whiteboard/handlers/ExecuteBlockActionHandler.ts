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
import { ModalsEnum } from "../enum/Modals";

export class ExecuteBlockActionHandler {
    constructor(
        private readonly app: WhiteboardApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly modify: IModify,
        private readonly persistence: IPersistence
    ) {}
    public async run(
        context: UIKitBlockInteractionContext
    ): Promise<IUIKitResponse> {
        const data = context.getInteractionData();

        try {
            const { blockId, user, actionId } = data;
            switch (actionId) {
                case ModalsEnum.PREVIEW_BUTTON_ACTION_ID:
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
