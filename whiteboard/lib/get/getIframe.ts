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
        const responseBody = JSON.parse(response.content);
        const iframeHtml = responseBody.html;
        const url = responseBody.provider_url;
        return { iframeHtml, url };
    } else {
        return undefined;
    }
}
