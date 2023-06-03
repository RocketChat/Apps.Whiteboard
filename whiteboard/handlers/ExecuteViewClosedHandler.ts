import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { WhiteboardApp } from "../WhiteboardApp";
import { UIKitViewCloseInteractionContext } from "@rocket.chat/apps-engine/definition/uikit";
import { storeInteractionRoomData } from "../persistence/roomInteraction";
import { ModalsEnum } from "../enum/Modals";

export class ExecuteViewClosedHandler {
    constructor(
        private readonly app: WhiteboardApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly modify: IModify,
        private readonly persistence: IPersistence
    ) {}

    public async run(context: UIKitViewCloseInteractionContext) {
        const { user, view, room } = context.getInteractionData();

        try {
            switch (view.id) {
                case ModalsEnum.CREATE_BOARD_MODAL:
                    if (user.id) {
                        //Use the persistence functions to store the room data
                    }
                    break;
            }
        } catch (err) {
            console.log(err);
        }
    }
}
