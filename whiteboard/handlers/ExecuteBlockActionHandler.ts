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
            const { actionId } = data;
            switch (actionId) {
                case ModalsEnum.SUBMIT_ACTION_ID: {
                    console.log("Submit action triggered");
                    return {
                        success: true,
                    };
                }
                default:
                    return {
                        success: false,
                    };
            }
        } catch (err) {
            console.log(err);
            return {
                success: false,
            };
        }
    }
}
