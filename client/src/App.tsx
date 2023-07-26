// import {
//   Excalidraw,
//   WelcomeScreen,
//   exportToCanvas,
// } from "@excalidraw/excalidraw";
// import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
// import {
//   AppState,
//   BinaryFiles,
//   ExcalidrawAPIRefValue,
//   ExcalidrawImperativeAPI,
// } from "@excalidraw/excalidraw/types/types";
// import { useEffect, useState, useRef, useMemo, Ref } from "react";
// import debounce from "lodash.debounce";

// export interface BoardData {
//   boardId: string;
//   boardData: {
//     elements: readonly ExcalidrawElement[];
//     appState: AppState;
//     files: BinaryFiles;
//   };
//   cover: string;
//   title: string;
// }

// async function getBoardData(baseURL: string, boardId: string) {
//   const res = await fetch(`${baseURL}/board/get?id=${boardId}`, {
//     method: "GET",
//     headers: {
//       "Content-Type": "application/json",
//       "Content-Security-Policy":
//         "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'",
//     },
//   });
//   return res.json();
// }

// async function postBoardData(baseURL: string, board: BoardData) {
//   //   const { boardData: board, boardId } = boardData
//   //   const resp = await getBoardData(baseURL, boardId);
//   //   const { boardData: remoteBoard } = resp.data

//   //   const remoteElements = Array.isArray(remoteBoard?.elements)
//   //     ? remoteBoard!.elements
//   //     : [];
//   //   const elements = reconcileElements(
//   //     board.elements,
//   //     remoteElements,
//   //     localAppState
//   //   );
//   //   const files = Object.assign({}, board.files, remoteBoard?.files);
//   //   const result = await Services.get("board").saveBoard({
//   //     ...board,
//   //     elements,
//   //     files,
//   //   });

//   fetch(`${baseURL}/board/update`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Content-Security-Policy":
//         "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'",
//     },
//     body: JSON.stringify(board),
//   })
//     .then((res) => res.json())
//     .then((data) => console.log("Update Data Success", data));
// }

// const createOnChange = (baseURL: string, boardId: string) =>
//   debounce(
//     async (
//       elements: readonly ExcalidrawElement[],
//       state: AppState,
//       files: BinaryFiles
//     ) => {
//       console.log({
//         boardId,
//         boardData: { elements, appState: state, files },
//         cover: "",
//         title: "",
//       });

//       const canvas = await exportToCanvas({
//         elements,
//         appState: state,
//         files,
//         maxWidthOrHeight: 360*3,
//         getDimensions: (width, height) => ({
//           width: 360*2,
//           height: 360*2,
//           scale: 3,
//         }),
//         exportPadding: 20,
//       });

//       const canvasBase64 = canvas.toDataURL();
//       console.log("canvasBase64", canvasBase64);

//       postBoardData(baseURL, {
//         boardId,
//         boardData: { elements, appState: state, files },
//         cover: canvasBase64,
//         title: "",
//       });
//     },
//     1000
//   );

// function App() {
//   const fullURL = window.location.href;
//   const urlParams = new URLSearchParams(window.location.search);
//   const boardId = urlParams.get("id") ?? "";
//   const baseURL = fullURL.replace(`/board?id=${boardId}`, "");
//   const [userId, setUserId] = useState<string>("");
//   const [roomId, setRoomId] = useState<string>("");
//   const [excalidrawAPI, setExcalidrawAPI] =
//     useState<ExcalidrawAPIRefValue | null>(null);

//   useEffect(() => {
//     console.log("excalidrawAPI updated", excalidrawAPI);
//     if (excalidrawAPI != null) {
//       getBoardData(baseURL, boardId).then((resp) => {
//         const { boardData, userId, roomId } = resp.data;
//         setUserId(userId);
//         setRoomId(roomId);
//         console.log({
//           excalidrawAPI,
//           boardData,
//         });
//         (window as any).excalidrawAPI = excalidrawAPI;
//         (excalidrawAPI as any)?.updateScene({
//           ...boardData,
//           collaborators: [],
//           commitHistory: true,
//         });
//       });
//     }
//   }, [excalidrawAPI]);

//   return (
//     <div className="main-Excalidraw">
//       <Excalidraw
//         ref={(api) => setExcalidrawAPI(api)}
//         onChange={createOnChange(baseURL, boardId)}
//       >
//         <WelcomeScreen />
//       </Excalidraw>
//     </div>
//   );
// }

// export default App;

import React, { useEffect, forwardRef } from "react";
import { InitializeApp } from "./components/InitializeApp";
import App from "./components/App";
import { isShallowEqual } from "./utils";

import "../excalidraw/css/app.scss";
import "../excalidraw/css/styles.scss";

import { AppProps, ExcalidrawAPIRefValue, ExcalidrawProps } from "./types";
import { defaultLang } from "./i18n";
import { DEFAULT_UI_OPTIONS } from "./constants";
import { Provider } from "jotai";
import { jotaiScope, jotaiStore } from "./jotai";
import Footer from "./components/footer/FooterCenter";
import MainMenu from "./components/main-menu/MainMenu";
import WelcomeScreen from "./components/welcome-screen/WelcomeScreen";
import LiveCollaborationTrigger from "./components/live-collaboration/LiveCollaborationTrigger";

const ExcalidrawBase = (props: ExcalidrawProps) => {
  const {
    onChange,
    initialData,
    excalidrawRef,
    isCollaborating = false,
    onPointerUpdate,
    renderTopRightUI,
    renderSidebar,
    langCode = defaultLang.code,
    viewModeEnabled,
    zenModeEnabled,
    gridModeEnabled,
    libraryReturnUrl,
    theme,
    name,
    renderCustomStats,
    onPaste,
    detectScroll = true,
    handleKeyboardGlobally = false,
    onLibraryChange,
    autoFocus = false,
    generateIdForFile,
    onLinkOpen,
    onPointerDown,
    onScrollChange,
    children,
  } = props;

  const canvasActions = props.UIOptions?.canvasActions;

  const UIOptions: AppProps["UIOptions"] = {
    ...props.UIOptions,
    canvasActions: {
      ...DEFAULT_UI_OPTIONS.canvasActions,
      ...canvasActions,
    },
  };

  if (canvasActions?.export) {
    UIOptions.canvasActions.export.saveFileToDisk =
      canvasActions.export?.saveFileToDisk ??
      DEFAULT_UI_OPTIONS.canvasActions.export.saveFileToDisk;
  }

  if (
    UIOptions.canvasActions.toggleTheme === null &&
    typeof theme === "undefined"
  ) {
    UIOptions.canvasActions.toggleTheme = true;
  }

  useEffect(() => {
    // Block pinch-zooming on iOS outside of the content area
    const handleTouchMove = (event: TouchEvent) => {
      // @ts-ignore
      if (typeof event.scale === "number" && event.scale !== 1) {
        event.preventDefault();
      }
    };

    document.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });

    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return (
    <Provider unstable_createStore={() => jotaiStore} scope={jotaiScope}>
      <InitializeApp langCode={langCode} theme={theme}>
        <App
          onChange={onChange}
          initialData={initialData}
          excalidrawRef={excalidrawRef}
          isCollaborating={isCollaborating}
          onPointerUpdate={onPointerUpdate}
          renderTopRightUI={renderTopRightUI}
          langCode={langCode}
          viewModeEnabled={viewModeEnabled}
          zenModeEnabled={zenModeEnabled}
          gridModeEnabled={gridModeEnabled}
          libraryReturnUrl={libraryReturnUrl}
          theme={theme}
          name={name}
          renderCustomStats={renderCustomStats}
          UIOptions={UIOptions}
          onPaste={onPaste}
          detectScroll={detectScroll}
          handleKeyboardGlobally={handleKeyboardGlobally}
          onLibraryChange={onLibraryChange}
          autoFocus={autoFocus}
          generateIdForFile={generateIdForFile}
          onLinkOpen={onLinkOpen}
          onPointerDown={onPointerDown}
          onScrollChange={onScrollChange}
          renderSidebar={renderSidebar}
        >
          {children}
        </App>
      </InitializeApp>
    </Provider>
  );
};

type PublicExcalidrawProps = Omit<ExcalidrawProps, "forwardedRef">;

const areEqual = (
  prevProps: PublicExcalidrawProps,
  nextProps: PublicExcalidrawProps,
) => {
  // short-circuit early
  if (prevProps.children !== nextProps.children) {
    return false;
  }

  const {
    initialData: prevInitialData,
    UIOptions: prevUIOptions = {},
    ...prev
  } = prevProps;
  const {
    initialData: nextInitialData,
    UIOptions: nextUIOptions = {},
    ...next
  } = nextProps;

  // comparing UIOptions
  const prevUIOptionsKeys = Object.keys(prevUIOptions) as (keyof Partial<
    typeof DEFAULT_UI_OPTIONS
  >)[];
  const nextUIOptionsKeys = Object.keys(nextUIOptions) as (keyof Partial<
    typeof DEFAULT_UI_OPTIONS
  >)[];

  if (prevUIOptionsKeys.length !== nextUIOptionsKeys.length) {
    return false;
  }

  const isUIOptionsSame = prevUIOptionsKeys.every((key) => {
    if (key === "canvasActions") {
      const canvasOptionKeys = Object.keys(
        prevUIOptions.canvasActions!,
      ) as (keyof Partial<typeof DEFAULT_UI_OPTIONS.canvasActions>)[];
      return canvasOptionKeys.every((key) => {
        if (
          key === "export" &&
          prevUIOptions?.canvasActions?.export &&
          nextUIOptions?.canvasActions?.export
        ) {
          return (
            prevUIOptions.canvasActions.export.saveFileToDisk ===
            nextUIOptions.canvasActions.export.saveFileToDisk
          );
        }
        return (
          prevUIOptions?.canvasActions?.[key] ===
          nextUIOptions?.canvasActions?.[key]
        );
      });
    }
    return prevUIOptions[key] === nextUIOptions[key];
  });

  return isUIOptionsSame && isShallowEqual(prev, next);
};

const forwardedRefComp = forwardRef<
  ExcalidrawAPIRefValue,
  PublicExcalidrawProps
>((props, ref) => <ExcalidrawBase {...props} excalidrawRef={ref} />);

export const Excalidraw = React.memo(forwardedRefComp, areEqual);
Excalidraw.displayName = "Excalidraw";

