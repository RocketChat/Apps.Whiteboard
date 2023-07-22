import { Excalidraw, WelcomeScreen } from "@excalidraw/excalidraw";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import {
  AppState,
  BinaryFiles,
  ExcalidrawAPIRefValue,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types/types";
import { useEffect, useState, useRef, useMemo, Ref } from "react";
import debounce from "lodash.debounce";
import { exportToSvg } from "@excalidraw/excalidraw";

export interface BoardData {
  boardId: string;
  boardData: {
    elements: readonly ExcalidrawElement[];
    appState: AppState;
    files: BinaryFiles;
  };
  cover: string;
  title: string;
}

async function getBoardData(baseURL: string, boardId: string) {
  const res = await fetch(`${baseURL}/board/get?id=${boardId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Content-Security-Policy":
        "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'",
    },
  });
  return await res.json();
}

async function postBoardData(baseURL: string, board: BoardData) {
  //   const { boardData: board, boardId } = boardData
  //   const resp = await getBoardData(baseURL, boardId);
  //   const { boardData: remoteBoard } = resp.data

  //   const remoteElements = Array.isArray(remoteBoard?.elements)
  //     ? remoteBoard!.elements
  //     : [];
  //   const elements = reconcileElements(
  //     board.elements,
  //     remoteElements,
  //     localAppState
  //   );
  //   const files = Object.assign({}, board.files, remoteBoard?.files);
  //   const result = await Services.get("board").saveBoard({
  //     ...board,
  //     elements,
  //     files,
  //   });

  fetch(`${baseURL}/board/update/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Security-Policy":
        "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'",
    },
    body: JSON.stringify(board),
  })
    .then((res) => res.json())
    .then((data) => console.log("Update Data Success", data));
}

const createOnChange = (
  baseURL: string,
  boardId: string,
) =>
  debounce(
    async (
      elements: readonly ExcalidrawElement[],
      state: AppState,
      files: BinaryFiles
    ) => {
      console.log({
        boardId,
        boardData: { elements, appState: state, files },
        cover: "",
        title: "",
      });
      const exportToSvgResult = await exportToSvg({
        elements,
        appState: state,
        files,
      });

      const svg = exportToSvgResult.outerHTML;

      const svgBase64 = btoa(svg);
      const svgBase64String = `data:image/svg+xml;base64,${svgBase64}`;
      console.log("svgBase64String", svgBase64String);

      postBoardData(baseURL, {
        boardId,
        boardData: { elements, appState: state, files },
        cover: svgBase64String,
        title: "",
      });
    },
    1000
  );

function App() {
  const fullURL = window.location.href;
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get("id") ?? "";
  const baseURL = fullURL.replace(`/board?id=${boardId}`, "");
  const [userId, setUserId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawAPIRefValue | null>(null);

  useEffect(() => {
    console.log("excalidrawAPI updated", excalidrawAPI);
    if (excalidrawAPI != null) {
      getBoardData(baseURL, boardId).then((resp) => {
        const { boardData, userId, roomId } = resp.data;
        setUserId(userId);
        setRoomId(roomId);
        console.log({
          excalidrawAPI,
          boardData,
        });
        (window as any).excalidrawAPI = excalidrawAPI;
        (excalidrawAPI as any)?.updateScene({
          ...boardData,
          collaborators: [],
          commitHistory: true,
        });
      });
    }
  }, [excalidrawAPI]);

  return (
    <div className="main-Excalidraw">
      <Excalidraw
        ref={(api) => setExcalidrawAPI(api)}
        onChange={createOnChange(baseURL, boardId)}
      >
        <WelcomeScreen />
      </Excalidraw>
    </div>
  );
}

export default App;
