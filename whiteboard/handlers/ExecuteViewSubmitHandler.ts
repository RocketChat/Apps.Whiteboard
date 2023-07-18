import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { WhiteboardApp } from "../WhiteboardApp";
import { UIKitViewSubmitInteractionContext } from "@rocket.chat/apps-engine/definition/uikit";
import { ModalsEnum } from "../enum/Modals";
import { getInteractionRoomData } from "../persistence/roomInteraction";
import { storeBoardName } from "../persistence/boardInteraction";
import { storeAuthData } from "../persistence/authorization";
import { sendNotification, sendMessage } from "../lib/messages";
import { AppEnum } from "../enum/App";
import { createBoard, deleteBoard, getAuth } from "../lib/post/postDetails";
import { IUser } from "@rocket.chat/apps-engine/definition/users/IUser";
import { PreviewBlock } from "../blocks/UtilityBlock";
import { getIframe } from "../lib/get/getIframe";

//This class will handle all the view submit interactions
export class ExecuteViewSubmitHandler {
    constructor(
        private readonly app: WhiteboardApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly persistence: IPersistence,
        private readonly modify: IModify
    ) {}

    public async run(context: UIKitViewSubmitInteractionContext) {
        const { user, view } = context.getInteractionData();
        const AppSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;

        try {
            switch (view.id) {
                case ModalsEnum.DELETE_BOARD_MODAL:
                    if (user.id && view.state) {
                        const { roomId } = await getInteractionRoomData(
                            this.read.getPersistenceReader(),
                            user.id
                        );
                        if (roomId) {
                            const room = await this.read
                                .getRoomReader()
                                .getById(roomId);
                            const boardname =
                                view.state?.[ModalsEnum.BOARD_INPUT_BLOCK_ID]?.[
                                    ModalsEnum.BOARD_NAME_ACTION_ID
                                ];

                            if (room) {
                                const deleteResult = await deleteBoard({
                                    http: this.http,
                                    modify: this.modify,
                                    persistence: this.persistence,
                                    read: this.read,
                                    user: user,
                                    room: roomId,
                                    boardname: boardname,
                                });

                                if (deleteResult == true) {
                                    await sendMessage(
                                        this.modify,
                                        room,
                                        AppSender,
                                        `**${boardname}** whiteboard deleted! by @${user.username}`
                                    );
                                } else {
                                    await sendMessage(
                                        this.modify,
                                        room,
                                        AppSender,
                                        `**${boardname}** whiteboard deletion failed! by @${user.username}`
                                    );
                                }
                            }
                        }
                    }
                    break;

                case ModalsEnum.AUTH_MODAL:
                    if (user.id && view.state) {
                        //Use the persistence functions to store the room data
                        const { roomId } = await getInteractionRoomData(
                            this.read.getPersistenceReader(),
                            user.id
                        );
                        if (roomId) {
                            const room = await this.read
                                .getRoomReader()
                                .getById(roomId);
                            if (room) {
                                const auth = await getAuth({
                                    http: this.http,
                                    modify: this.modify,
                                    persistence: this.persistence,
                                    read: this.read,
                                    user: user,
                                    room: roomId,
                                });

                                if (auth == true) {
                                    const Auth_Status = true;
                                    await storeAuthData(
                                        this.persistence,
                                        user.id,
                                        roomId,
                                        Auth_Status
                                    );
                                    await sendMessage(
                                        this.modify,
                                        room,
                                        AppSender,
                                        `**${AppEnum.APP_ID}** authorized by @${user.username}`
                                    );
                                } else {
                                    await sendNotification(
                                        this.read,
                                        this.modify,
                                        AppSender,
                                        room,
                                        `**${AppEnum.APP_ID}** authorization failed`
                                    );
                                }
                            }
                        }
                    }
                    break;

                default:
                    console.log("View Id not found");
                    break;
            }
        } catch (err) {
            console.log(err);
        }
    }
}
