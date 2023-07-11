const MarkboardApiBaseUrl = `http://localhost:4000/rocketchat`;

export const ApiVersion = {
    V2: "v2",
    V3: "v3",
};

export const AuthUrl = `${MarkboardApiBaseUrl}/${ApiVersion.V2}/auth`;
export const CreateBoardUrl = `${MarkboardApiBaseUrl}/${ApiVersion.V2}/createBoard`;
export const DeleteBoardUrl = `${MarkboardApiBaseUrl}/${ApiVersion.V2}/deleteBoard`;
export const GetIframeURL = `${MarkboardApiBaseUrl}/${ApiVersion.V2}/oembed`;
