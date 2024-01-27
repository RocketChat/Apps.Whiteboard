import {
    IHttp,
    IModify,
    IPersistence,
    IPersistenceRead,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { WhiteboardApp } from "../WhiteboardApp";
import {
    IUIKitResponse,
    UIKitBlockInteractionContext,
} from "@rocket.chat/apps-engine/definition/uikit";
import { UtilityEnum } from "../enum/uitlityEnum";
import { SettingsModal } from "../modals/SettingsModal";
import { DeleteModal } from "../modals/DeleteModal";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { addUsertoBoardOwner, hasPermission } from "../lib/messages";
import { PermissionModal } from '../modals/PermissionModal';
import { IMessage } from "@rocket.chat/apps-engine/definition/messages";
import { RocketChatAssociationModel, RocketChatAssociationRecord } from "@rocket.chat/apps-engine/definition/metadata";
import { EditModal } from "../modals/EditModal";

// ExecuteBlockActionHandler is used to handle the block actions
export class ExecuteBlockActionHandler {
    constructor(
        private readonly app: WhiteboardApp,
        private readonly read: IRead,
        private readonly http: IHttp,
        private readonly persistence: IPersistence,
        private readonly modify: IModify,
        private readonly context: UIKitBlockInteractionContext
    ) { }
    public async run(): Promise<IUIKitResponse> {
        const data = this.context.getInteractionData();
        try {
            const {
                actionId,
                triggerId,
                user,
                room,
                value,
                message,
                container,
            } = data;

            const read = this.read;
            const appId = data.appId;
            // The id of the message (created when the user created the whiteboard)
            const messageId = data.message?.id;
            const appSender: IUser = (await this.read
                .getUserReader()
                .getAppUser()) as IUser;

            let boolean = true
            if (messageId) {
                boolean = await hasPermission(user, read, messageId)
            }


            if (boolean) {
                switch (actionId) {
                    case UtilityEnum.SETTINGS_BUTTON_ACTION_ID:
                        if (messageId) {
                            const modal = await SettingsModal(appId, messageId);
                            await Promise.all([
                                this.modify.getUiController().openSurfaceView(
                                    modal,
                                    {
                                        triggerId,
                                    },
                                    user
                                ),
                            ]);
                        }
                        return this.context
                            .getInteractionResponder()
                            .successResponse();

                    // Add the case for the delete button action
                    case UtilityEnum.DELETE_BUTTON_ACTION_ID:
  
                        if (messageId) {
                            const modal = await DeleteModal(appId, messageId);
                            await Promise.all([
                                this.modify.getUiController().openSurfaceView(
                                    modal,
                                    {
                                        triggerId,
                                    },
                                    user
                                ),
                            ]);
                        }

                        return this.context
                            .getInteractionResponder()
                            .successResponse();
                        
                    case UtilityEnum.YES_ACTION_ID:
                        return this.context
                            .getInteractionResponder()
                            .successResponse();

                    case UtilityEnum.OPEN_BUTTON_ACTION_ID:
                        const boardData = this.context.getInteractionData().value
                        
                        const boardURL = boardData?.split(",")[0].trim();
                        const interactionBoardName = boardData?.split(",")[1].trim();
                        
                        if (boardURL && messageId && interactionBoardName) {
                            const modal = await EditModal(appId, boardURL, messageId, interactionBoardName);
                            await Promise.all([
                                this.modify.getUiController().openSurfaceView(
                                    modal,
                                    {
                                        triggerId,
                                    },
                                    user
                                ),
                            ]);
                            
                        }
                        return this.context
                            .getInteractionResponder()
                            .successResponse();
                    
                    case UtilityEnum.ALLOW_BUTTON_ACTION_ID:
                        const data = this.context.getInteractionData();
                        const userName = data.value?.split(",")[0].trim();
                        const boardName = data.value?.split(",")[1].trim();
                        const userForBoardPermission = data.value?.split(",")[2].trim();
                        const permissionMessageId = data.container.id;
                        const messageAssociation = new RocketChatAssociationRecord(
                            RocketChatAssociationModel.MESSAGE,
                            `${permissionMessageId}#MessageId`
                        );
                        const messageRead = await read.getPersistenceReader().readByAssociation(messageAssociation)
                        if(room && userName && boardName && userForBoardPermission){
                            const userForBoardPermissionData = await addUsertoBoardOwner(this.read, room, this.persistence, userName.trim(), boardName, userForBoardPermission, "allow")
                            const boardOwnerData = await read.getUserReader().getByUsername(userName)
                            const message:IMessage = {text:`Permission granted for board ${boardName}`, room:room, sender: appSender} 
                            if(userForBoardPermissionData){
                                this.modify.getNotifier().notifyUser(userForBoardPermissionData, message)
                            }
                            else{
                                console.log("UserData", userForBoardPermissionData)
                            }
                         
                        }
                        
                        return this.context
                            .getInteractionResponder()
                            .successResponse();

                    case UtilityEnum.DENY_BUTTON_ACTION_ID:
                       
                        if(room && userName && boardName && userForBoardPermission){
                            const userData = await addUsertoBoardOwner(this.read, room, this.persistence, userName.trim(), boardName.trim(), userForBoardPermission.trim(), "deny")
    
                            const message:IMessage = {text:"Permission denied", room:room, sender: appSender} 
                            if(userData)
                            this.modify.getNotifier().notifyUser(userData, message)
                            else
                            console.log("UserData", userData)

                        }

                        return this.context
                            .getInteractionResponder()
                            .successResponse();


                    default:
                        return this.context
                            .getInteractionResponder()
                            .successResponse();
                }

            }
            else {
                if (messageId) {
                    
                    const modal = await PermissionModal(appId, messageId);
                    await Promise.all([
                        this.modify.getUiController().openSurfaceView(
                            modal,
                            {
                                triggerId,
                            },
                            user
                        ),
                    ]);
                }
                return this.context.getInteractionResponder().successResponse();

            }
        }
        catch (err) {
            console.log(err);
            return this.context.getInteractionResponder().errorResponse();
        }
    }
}
