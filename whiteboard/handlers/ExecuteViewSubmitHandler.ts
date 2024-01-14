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
import { buildHeaderBlock, deletionHeaderBlock } from "../blocks/UtilityBlock";
import {
    getBoardRecordByMessageId,
    getMessageIdByPrivateMessageId,
    storeBoardRecordByPrivateMessageId,
    updateBoardStatusByMessageId,
    updateBoardnameByMessageId,
    updatePrivateMessageIdByMessageId,
    deleteBoardByMessageId,
    checkBoardNameByRoomId,
} from "../persistence/boardInteraction";
import { getDirect } from "../lib/messages";
import { IMessageAttachment } from "@rocket.chat/apps-engine/definition/messages";
import { AppEnum } from "../enum/App";

//This class will handle all the view submit interactions from the modals
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
        const { user, view, triggerId, actionId } =
            this.context.getInteractionData();
        const AppSender: IUser = (await this.read
            .getUserReader()
            .getAppUser()) as IUser;
        const appId = AppSender.appId;
        try {
            switch (view.id) {
                // This case is used to handle the submit interaction from the settings modal
                case UtilityEnum.SETTINGS_MODAL_ID:
                    if (view.state && appId) {
                        const newBoardname =
                            view.state?.[UtilityEnum.BOARD_INPUT_BLOCK_ID]?.[
                                UtilityEnum.BOARD_INPUT_ACTION_ID
                            ];

                        // This is used to get the board status(public/private) from the settings modal
                        const newBoardStatus =
                            view.state[UtilityEnum.BOARD_SELECT_BLOCK_ID]?.[
                                UtilityEnum.BOARD_SELECT_ACTION_ID
                            ];

                        const messageId =
                            this.context.getInteractionData().view.submit
                                ?.value;

                        // Checking The status of current whiteboard
                        var currentBoardStatus = "";
                        if (messageId) {
                            const messageIdFromPrivateMessageId = (
                                await getMessageIdByPrivateMessageId(
                                    this.read.getPersistenceReader(),
                                    messageId
                                )
                            )?.messageId;

                            // Check if the message is a private message or not
                            if (messageIdFromPrivateMessageId != null) {
                                currentBoardStatus = "private";
                            } else {
                                currentBoardStatus = "public";
                            }
                        }

                        if (messageId) {
                            const messageIdFromPrivateMessageId = (
                                await getMessageIdByPrivateMessageId(
                                    this.read.getPersistenceReader(),
                                    messageId
                                )
                            )?.messageId;

                            const room = await this.read
                                .getMessageReader()
                                .getRoom(messageId);

                            var repeatBoardName = false;
                            if (room) {
                                repeatBoardName = await checkBoardNameByRoomId(
                                    this.read.getPersistenceReader(),
                                    room.id,
                                    newBoardname
                                );
                            }

                            if (repeatBoardName) {
                                const room = await this.read
                                    .getMessageReader()
                                    .getRoom(messageId);
                                if (room) {
                                    const newMessage = this.modify
                                        .getCreator()
                                        .startMessage()
                                        .setSender(AppSender)
                                        .setRoom(room)
                                        .setText(
                                            `Oops! The whiteboard named *${newBoardname}* is already there in the room. Please try again with different whiteboard name`
                                        )
                                        .setParseUrls(true);

                                    await this.read
                                        .getNotifier()
                                        .notifyRoom(
                                            room,
                                            newMessage.getMessage()
                                        );
                                }
                            } else {
                                if (room) {
                                    // Check if the message is a private message or not
                                    if (messageIdFromPrivateMessageId != null) {
                                        await updateBoardnameByMessageId(
                                            this.persistence,
                                            this.read.getPersistenceReader(),
                                            messageIdFromPrivateMessageId,
                                            newBoardname,
                                            room.id
                                        );
                                    } else {
                                        await updateBoardnameByMessageId(
                                            this.persistence,
                                            this.read.getPersistenceReader(),
                                            messageId,
                                            newBoardname,
                                            room.id
                                        );
                                    }
                                }

                                if (room) {
                                    const message = await this.modify
                                        .getUpdater()
                                        .message(messageId, AppSender);

                                    const url =
                                        message.getBlocks()[1]["elements"][1][
                                            "url"
                                        ];
                                    // Updating header block for new boardname
                                    const updateHeaderBlock =
                                        await buildHeaderBlock(
                                            user.username,
                                            url,
                                            appId,
                                            newBoardname
                                        );

                                    message.setEditor(user).setRoom(room);

                                    // Board status is changed
                                    if (newBoardStatus != undefined) {
                                        if (
                                            newBoardStatus != undefined &&
                                            newBoardStatus ==
                                                UtilityEnum.PRIVATE &&
                                            newBoardname == undefined
                                        ) {
                                            if (
                                                currentBoardStatus == "private"
                                            ) {
                                                console.log(
                                                    "Board name is not changed & Board status is also not changed"
                                                );
                                            } else if (
                                                currentBoardStatus == "public"
                                            ) {
                                                await this.publicToPrivate(
                                                    message,
                                                    messageId,
                                                    AppSender,
                                                    user,
                                                    newBoardname,
                                                    undefined
                                                );
                                            }
                                        } else if (
                                            newBoardStatus != undefined &&
                                            newBoardStatus ==
                                                UtilityEnum.PRIVATE &&
                                            newBoardname != undefined
                                        ) {
                                            // Have to apply changes here
                                            if (
                                                currentBoardStatus == "private"
                                            ) {
                                                message.setBlocks(
                                                    updateHeaderBlock
                                                );
                                                await this.modify
                                                    .getUpdater()
                                                    .finish(message);
                                            } else if (
                                                currentBoardStatus == "public"
                                            ) {
                                                await this.publicToPrivate(
                                                    message,
                                                    messageId,
                                                    AppSender,
                                                    user,
                                                    newBoardname,
                                                    updateHeaderBlock
                                                );
                                            }
                                        } else if (
                                            newBoardStatus != undefined &&
                                            newBoardStatus ==
                                                UtilityEnum.PUBLIC &&
                                            newBoardname == undefined
                                        ) {
                                            if (
                                                currentBoardStatus == "private"
                                            ) {
                                                await this.privateToPublic(
                                                    message,
                                                    messageId,
                                                    AppSender,
                                                    user,
                                                    newBoardname,
                                                    undefined
                                                );
                                            } else if (
                                                currentBoardStatus == "public"
                                            ) {
                                                console.log(
                                                    "Board name is not changed & Board status is also not changed"
                                                );
                                            }
                                        } else if (
                                            newBoardStatus != undefined &&
                                            newBoardStatus ==
                                                UtilityEnum.PUBLIC &&
                                            newBoardname != undefined
                                        ) {
                                            // Have to apply changes here
                                            if (
                                                currentBoardStatus == "private"
                                            ) {
                                                await this.privateToPublic(
                                                    message,
                                                    messageId,
                                                    AppSender,
                                                    user,
                                                    newBoardname,
                                                    updateHeaderBlock
                                                );
                                            } else if (
                                                currentBoardStatus == "public"
                                            ) {
                                                message.setBlocks(
                                                    updateHeaderBlock
                                                );
                                                await this.modify
                                                    .getUpdater()
                                                    .finish(message);
                                            }
                                        }
                                    }

                                    // Only boardname is changed
                                    else {
                                        // Have to apply changes here
                                        if (
                                            newBoardStatus == undefined &&
                                            newBoardname != undefined
                                        ) {
                                            message.setBlocks(
                                                updateHeaderBlock
                                            );
                                        }
                                        await this.modify
                                            .getUpdater()
                                            .finish(message);
                                    }
                                } else {
                                    console.log("Room not found");
                                }
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

                // Add the case for the delete modal
                case UtilityEnum.DELETE_MODAL_ID:
                    if (view.state && appId) {
                        const messageId =
                            this.context.getInteractionData().view.submit
                                ?.value;

                        if (messageId) {
                            // Board data is deleted from database
                            const boardName = await deleteBoardByMessageId(
                                this.persistence,
                                this.read.getPersistenceReader(),
                                messageId
                            );

                            // Message is Updated to "Deletion"
                            const room = await this.read
                                .getMessageReader()
                                .getRoom(messageId);
                            if (room) {
                                // Extracted the message to be updated
                                const message = await this.modify
                                    .getUpdater()
                                    .message(messageId, AppSender);

                                // Deletion header block as board get deleted
                                const deleteHeaderBlock =
                                    await deletionHeaderBlock(
                                        user.username,
                                        boardName
                                    );

                                // Some message configurations
                                message.setEditor(user).setRoom(room);
                                message.setBlocks(deleteHeaderBlock);
                                message.removeAttachment(0);

                                // Message is finished modified and saved to database
                                await this.modify.getUpdater().finish(message);
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
    // This function is used to convert a public board to private board
    private async publicToPrivate(
        message: IMessageBuilder,
        messageId: string,
        AppSender: IUser,
        user: IUser,
        newBoardName: string,
        updateHeaderBlock?: any
    ) {
        const directRoom = await getDirect(
            this.read,
            this.modify,
            AppSender,
            user.username
        );
        const publicRoom = await this.read
            .getMessageReader()
            .getRoom(messageId);

        // Below functionality is storing the name of the whiteboard getting changed from Private to Public in displayName variable
        const msg = await this.read.getMessageReader().getById(messageId);
        const nameString = msg?.blocks?.[0]["text"]?.["text"];
        const nameFromMessage = nameString.match(/\*(.*?)\*/)[1];
        var displayName = nameFromMessage;
        if (newBoardName != undefined) {
            displayName = newBoardName;
        }

        if (directRoom && publicRoom) {
            const privateMessageId = (
                await getBoardRecordByMessageId(
                    this.read.getPersistenceReader(),
                    messageId
                )
            ).privateMessageId;
            const privateMessage = await this.modify
                .getUpdater()
                .message(privateMessageId, AppSender);
            //If private message already exists update it
            if (privateMessageId.length > 0) {
                privateMessage
                    .setSender(AppSender)
                    .setRoom(directRoom)
                    .setEditor(AppSender)
                    .setUsernameAlias(AppEnum.APP_NAME)
                    .setText("");
                const privateMessageAttachments = message.getAttachments();
                privateMessageAttachments.forEach(
                    (attachment: IMessageAttachment) => {
                        privateMessage.addAttachment(attachment);
                    }
                );

                if (updateHeaderBlock != undefined) {
                    privateMessage.setBlocks(updateHeaderBlock);
                } else {
                    privateMessage.setBlocks(message.getBlocks());
                }
                await this.modify.getUpdater().finish(privateMessage);
            } else {
                const privateMessage = this.modify.getCreator().startMessage();
                privateMessage
                    .setSender(AppSender)
                    .setRoom(directRoom)
                    .setEditor(AppSender)
                    .setUsernameAlias(AppEnum.APP_NAME)
                    .setText("");
                const privateMessageAttachments = message.getAttachments();
                privateMessageAttachments.forEach(
                    (attachment: IMessageAttachment) => {
                        privateMessage.addAttachment(attachment);
                    }
                );
                if (updateHeaderBlock != undefined) {
                    privateMessage.setBlocks(updateHeaderBlock);
                } else {
                    privateMessage.setBlocks(message.getBlocks());
                }
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
            }
            await updateBoardStatusByMessageId(
                this.persistence,
                this.read.getPersistenceReader(),
                messageId,
                UtilityEnum.PRIVATE
            );
            message
                .setBlocks([])
                .setRoom(publicRoom)
                .setAttachments([])
                .setText(
                    `Whiteboard named *${displayName}* has been made private by \`@${user.username}\``
                )
                .setUsernameAlias(AppEnum.APP_NAME);
            await this.modify.getUpdater().finish(message);
        } else {
            console.log("Direct or Public room not found");
        }
    }

    // This function is used to convert a private board to public board
    private async privateToPublic(
        privateMessage: IMessageBuilder,
        privateMessageId: string,
        AppSender: IUser,
        user: IUser,
        newBoardName: string,
        updateHeaderBlock?: any
    ) {
        const messageId = (
            await getMessageIdByPrivateMessageId(
                this.read.getPersistenceReader(),
                privateMessageId
            )
        ).messageId;
        const directRoom = await getDirect(
            this.read,
            this.modify,
            AppSender,
            user.username
        );
        const publicRoom = await this.read
            .getMessageReader()
            .getRoom(messageId);

        // Below functionality is storing the name of the whiteboard getting changed from Private to Public in displayName variable
        const msg = await this.read.getMessageReader().getById(messageId);
        const nameString = msg?.text;
        let nameFromMessage = "";
        if (nameString !== undefined) {
            const matchResult = nameString.match(/\*(.*?)\*/);

            if (matchResult !== null) {
                nameFromMessage = matchResult[1];
            } else {
                console.log("No match found");
            }
        } else {
            console.log("nameString is undefined or null");
        }
        var displayName = nameFromMessage;
        if (newBoardName != undefined) {
            displayName = newBoardName;
        }

        if (!publicRoom) {
            console.log("Public room not found");
            return;
        }
        if (!directRoom) {
            console.log("Direct room not found");
            return;
        }
        await updateBoardStatusByMessageId(
            this.persistence,
            this.read.getPersistenceReader(),
            messageId,
            UtilityEnum.PUBLIC
        );
        const attachments = privateMessage.getAttachments();
        const publicMessage = await this.modify
            .getUpdater()
            .message(messageId, AppSender);
        publicMessage
            .setEditor(AppSender)
            .setRoom(publicRoom)
            .setAttachments(attachments)
            .setText("");
        if (updateHeaderBlock != undefined) {
            publicMessage.setBlocks(updateHeaderBlock);
        } else {
            publicMessage.setBlocks(privateMessage.getBlocks());
        }
        await this.modify.getUpdater().finish(publicMessage);
        privateMessage
            .setBlocks([])
            .setAttachments([])
            .setSender(AppSender)
            .setRoom(directRoom)
            .setEditor(AppSender)
            .setUsernameAlias(AppEnum.APP_NAME)
            .setText(
                `Whiteboard named *${displayName}* has been made public by \`@${user.username}\``
            );
        await this.modify.getUpdater().finish(privateMessage);
    }
}
