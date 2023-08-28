import {
    IHttp,
    IMessageBuilder,
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
import { IUser } from "@rocket.chat/apps-engine/definition/users/IUser";
import { buildHeaderBlock } from "../blocks/UtilityBlock";
import {
    getBoardRecordByMessageId,
    getMessageIdByPrivateMessageId,
    storeBoardRecordByPrivateMessageId,
    updateBoardStatusByMessageId,
    updateBoardnameByMessageId,
    updatePrivateMessageIdByMessageId,
} from "../persistence/boardInteraction";
import { getDirect, sendMessage, sendNotification } from "../lib/messages";
import { IMessageAttachment } from "@rocket.chat/apps-engine/definition/messages";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms/IRoom";
import { AppEnum } from "../enum/App";

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
        const { user, view } = this.context.getInteractionData();
        const AppSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;
        const appId = AppSender.appId;
        try {
            switch (view.id) {
                case UtilityEnum.SETTINGS_MODAL_ID:
                    if (view.state && appId) {
                        const boardname =
                            view.state?.[UtilityEnum.BOARD_INPUT_BLOCK_ID]?.[
                                UtilityEnum.BOARD_INPUT_ACTION_ID
                            ];
                        const messageId =
                            this.context.getInteractionData().view.submit
                                ?.value;

                        if (messageId) {
                            await updateBoardnameByMessageId(
                                this.persistence,
                                messageId,
                                boardname
                            );
                            const room = await this.read
                                .getMessageReader()
                                .getRoom(messageId);

                            if (room) {
                                const message = await this.modify
                                    .getUpdater()
                                    .message(messageId, AppSender);

                                const url =
                                    message.getBlocks()[1]["elements"][1][
                                        "url"
                                    ];
                                const updateHeaderBlock =
                                    await buildHeaderBlock(
                                        user.username,
                                        url,
                                        appId,
                                        boardname
                                    );

                                message.setEditor(user).setRoom(room);
                                message.setBlocks(updateHeaderBlock);

                                if (
                                    view.state[
                                        UtilityEnum.BOARD_SELECT_BLOCK_ID
                                    ] != undefined &&
                                    view.state[
                                        UtilityEnum.BOARD_SELECT_BLOCK_ID
                                    ][UtilityEnum.BOARD_SELECT_ACTION_ID] !=
                                        undefined
                                ) {
                                    const boardStatus =
                                        view.state[
                                            UtilityEnum.BOARD_SELECT_BLOCK_ID
                                        ][UtilityEnum.BOARD_SELECT_ACTION_ID];
                                    if (
                                        boardStatus != undefined &&
                                        boardStatus == UtilityEnum.PRIVATE
                                    ) {
                                        await this.publicToPrivate(
                                            message,
                                            messageId,
                                            AppSender,
                                            user
                                        );
                                    }
                                    if (
                                        boardStatus != undefined &&
                                        boardStatus == UtilityEnum.PUBLIC
                                    ) {
                                        this.privateToPublic(
                                            message,
                                            messageId,
                                            AppSender,
                                            user
                                        );
                                    }
                                } else {
                                    await this.modify
                                        .getUpdater()
                                        .finish(message);
                                }
                            } else {
                                console.log("Room not found");
                            }
                        } else {
                            console.log("MessageId not found");
                        }
                    } else {
                        console.log("Submit Failed");
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
    private async publicToPrivate(
        message: IMessageBuilder,
        messageId: string,
        AppSender: IUser,
        user: IUser
    ) {
        const directRoom = await getDirect(
            this.read,
            this.modify,
            AppSender,
            user.username
        );
        if (directRoom) {
            const privateMessage = this.modify.getCreator().startMessage();
            privateMessage
                .setSender(AppSender)
                .setRoom(directRoom)
                .setEditor(AppSender)
                .setBlocks(message.getBlocks())
                .setUsernameAlias(AppEnum.APP_NAME)
                .setText("");
            const privateMessageAttachments = message.getAttachments();
            privateMessageAttachments.forEach(
                (attachment: IMessageAttachment) => {
                    privateMessage.addAttachment(attachment);
                }
            );
            const privateMessageId = await this.modify
                .getCreator()
                .finish(privateMessage);

            await storeBoardRecordByPrivateMessageId(
                messageId,
                privateMessageId,
                this.persistence
            );
            await updatePrivateMessageIdByMessageId(
                this.persistence,
                this.read.getPersistenceReader(),
                messageId,
                privateMessageId
            );
            await updateBoardStatusByMessageId(
                this.persistence,
                this.read.getPersistenceReader(),
                messageId,
                UtilityEnum.PRIVATE
            );
            message
                .setBlocks([])
                .setAttachments([])
                .setText(
                    `(This whiteboard has been made private by \`@${user.username}\`)`
                )
                .setUsernameAlias(AppEnum.APP_NAME);
            await this.modify.getUpdater().finish(message);
        }
    }
    private async privateToPublic(
        privateMessage: IMessageBuilder,
        privateMessageId: string,
        AppSender: IUser,
        user: IUser
    ) {
        const messageId = (
            await getMessageIdByPrivateMessageId(
                this.read.getPersistenceReader(),
                privateMessageId
            )
        ).messageId;
        await updateBoardStatusByMessageId(
            this.persistence,
            this.read.getPersistenceReader(),
            messageId,
            UtilityEnum.PUBLIC
        );
        const attachments = privateMessage.getAttachments();
        const blocks = privateMessage.getBlocks();
        const publicMessage = await this.modify
            .getUpdater()
            .message(messageId, AppSender);
        publicMessage
            .setEditor(AppSender)
            .setBlocks(blocks)
            .setAttachments(attachments)
            .setText("");
        await this.modify.getUpdater().finish(publicMessage);
        privateMessage
            .setBlocks([])
            .setAttachments([])
            .setSender(AppSender)
            .setEditor(AppSender)
            .setUsernameAlias(AppEnum.APP_NAME)
            .setText(
                `(This whiteboard has been made public by \`@${user.username}\`)`
            );
        await this.modify.getUpdater().finish(privateMessage);
    }
}
