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
import { sendDirectMessage } from "../lib/messages";

//This class will handle all the view submit interactions
export class ExecuteViewSubmitHandler {
    constructor(
        private readonly app: WhiteboardApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly modify: IModify,
        private readonly persistence: IPersistence
    ) {}

    public async run(
        context: UIKitViewSubmitInteractionContext,
        persistence: IPersistence
    ) {
        const { user, view } = context.getInteractionData();

        try {
            switch (view.id) {
                case ModalsEnum.CREATE_BOARD_MODAL:
                    if (user.id && view.state) {
                        //Use the persistence functions to store the room data
                        const { roomId } = await getInteractionRoomData(
                            this.read.getPersistenceReader(),
                            user.id
                        );
                        if (roomId) {
                            const boardname =
                                view.state?.[ModalsEnum.BOARD_INPUT_BLOCK_ID]?.[
                                    ModalsEnum.BOARD_NAME_ACTION_ID
                                ];
                            // await storeInteractionRoomData(
                            //     persistence,
                            //     user.id,
                            //     roomId,
                            //     boardname
                            // );

                            //send message "board created"
                            const message = "Board Created";
                            await sendDirectMessage(
                                this.read,
                                this.modify,
                                user,
                                message,
                                persistence
                            );
                        }
                    }
            }
        } catch (err) {
            console.log(err);
        }
    }
}
