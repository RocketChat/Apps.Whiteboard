import {
    HttpStatusCode,
    IHttp,
} from "@rocket.chat/apps-engine/definition/accessors";
import { GetIframeURL } from "../constants";

export async function getIframe({
    http,
    boardname,
}: {
    http: IHttp;
    boardname: string;
}) {
    const url = `${GetIframeURL}/${boardname}`;
    const request = {
        headers: {
            "Content-Type": "application/json",
        },
    };
    const response = await http.get(url, request);
    if (response.statusCode == HttpStatusCode.OK && response.content) {
        return response;
    } else {
        return undefined;
    }
}
