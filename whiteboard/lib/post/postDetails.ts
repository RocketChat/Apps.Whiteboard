import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { AuthUrl, CreateBoardUrl, DeleteBoardUrl } from "../constants";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { HttpStatusCode } from "@rocket.chat/apps-engine/definition/accessors";
import { getAuthData } from "../../persistence/authorization";

export async function getAuth({
    http,
    modify,
    persistence,
    read,
    user,
    room,
}: {
    http: IHttp;
    modify: IModify;
    persistence: IPersistence;
    read: IRead;
    user: IUser;
    room: string;
}) {
    const { id } = user;
    const url = AuthUrl;
    const request = {
        data: {
            userId: id,
        },
        headers: {
            "Content-Type": "application/json",
        },
    };
    const response = await http.post(url, request);
    console.log("response", response);
    if (response.statusCode == HttpStatusCode.OK) {
        return true;
    } else {
        throw new Error("Server error");
    }
}

export async function createBoard({
    http,
    modify,
    persistence,
    read,
    user,
    room,
    boardname,
}: {
    http: IHttp;
    modify: IModify;
    persistence: IPersistence;
    read: IRead;
    user: IUser;
    room: string;
    boardname: string;
}) {
    const { id, username } = user;
    const url = CreateBoardUrl;
    const auth = await getAuthData(read.getPersistenceReader(), id);
    const { auth_status } = auth;

    if (auth_status === true) {
        const request = {
            data: {
                userId: id,
                userName: username,
                boardName: boardname,
            },
            headers: {
                "Content-Type": "application/json",
            },
        };
        const response = await http.post(url, request);
        console.log("response", response);
        if (response.statusCode == HttpStatusCode.OK) {
            return "success";
        } else if (response.statusCode == HttpStatusCode.CONFLICT) {
            return "conflict";
        } else {
            return "error";
        }
    } else {
        throw new Error("Server error");
    }
}

export async function deleteBoard({
    http,
    modify,
    persistence,
    read,
    user,
    room,
    boardname,
}: {
    http: IHttp;
    modify: IModify;
    persistence: IPersistence;
    read: IRead;
    user: IUser;
    room: string;
    boardname: string;
}) {
    const { id, username } = user;
    const url = DeleteBoardUrl;
    const auth = await getAuthData(read.getPersistenceReader(), id);
    const { auth_status } = auth;

    if (auth_status === true) {
        const request = {
            data: {
                userId: id,
                userName: username,
                boardName: boardname,
            },
            headers: {
                "Content-Type": "application/json",
            },
        };
        const response = await http.post(url, request);
        console.log("response", response);
        if (response.statusCode == HttpStatusCode.OK) {
            return true;
        } else {
            return false;
        }
    } else {
        throw new Error("Server error");
    }
}
