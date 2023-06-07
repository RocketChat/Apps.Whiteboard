const MarkboardApiBaseUrl = "http://localhost:4000/rocketchat";

export const ApiVersion = {
    V2: "v2",
    V3: "v3",
};

export const AuthUrl = `${MarkboardApiBaseUrl}/${ApiVersion.V2}/auth`;
export const CreateBoardUrl = `${MarkboardApiBaseUrl}/${ApiVersion.V2}/createBoard`;
