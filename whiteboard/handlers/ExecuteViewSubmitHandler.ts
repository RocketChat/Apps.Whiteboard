import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { WhiteboardApp } from "../WhiteboardApp";
import { UIKitViewSubmitInteractionContext } from "@rocket.chat/apps-engine/definition/uikit";
import { ModalsEnum } from "../enum/Modals";
import {
    storeInteractionRoomData,
    getInteractionRoomData,
} from "../persistence/roomInteraction";

//This class will handle all the view submit interactions
export class ExecuteViewSubmitHandler {
    constructor(
        private readonly app: WhiteboardApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly modify: IModify,
        private readonly persistence: IPersistence
    ) {}

    public async run(context: UIKitViewSubmitInteractionContext) {
        const { user, view } = context.getInteractionData();

        try {
            switch (view.id) {
                case ModalsEnum.CREATE_BOARD_MODAL:
                    if (user.id) {
                        //Use the persistence functions to store the room data
                        const { roomId } = await getInteractionRoomData(
                            this.read.getPersistenceReader(),
                            user.id
                        );
                    }
            }
        } catch (err) {
            console.log(err);
        }
    }
}
