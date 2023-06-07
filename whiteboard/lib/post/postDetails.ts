import {
    IHttp,
    IModify,
    IPersistence,
    IRead,
} from "@rocket.chat/apps-engine/definition/accessors";
import { AuthUrl } from "../constants";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { HttpStatusCode } from "@rocket.chat/apps-engine/definition/accessors";

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
    const { id, username } = user;
    const url = AuthUrl;
    const request = {
        data: {
            name: username,
            type: "post",
        },
        headers: {
            "Content-Type": "application/json",
            "x-auth-token": `${id}`,
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
