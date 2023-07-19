import { Excalidraw, WelcomeScreen } from "@excalidraw/excalidraw";
import { useEffect, useState } from "react";

function App() {
  const fullURL = window.location.href;
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get("id");

  const baseURL = fullURL.replace(`/board?id=${boardId}`, "");

  const [boardData, setBoardData] = useState<any>(null);

  useEffect(() => {
    getBoardData();
  }, []);

  function saveBoardData(elements: any, state: any, files: any) {
    setBoardData(elements);
  }

  function postBoardData() {
    console.log(boardData);
    if (boardData) {
      fetch(`${baseURL}/board/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Security-Policy": "default-src 'self'",
        },
        body: JSON.stringify({
          boardId: boardId,
          boardData: boardData,
        }),
      })
        .then((res) => res.json())
        .then((data) => console.log(data));
    }
  }

  function getBoardData() {
    fetch(`${baseURL}/board/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Security-Policy": "default-src 'self'",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setBoardData(data);
      });
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      postBoardData();
    }, 1000);
    return () => clearTimeout(timer);
  }, [boardData]);

  return (
    <>
      <div className="main-Excalidraw">
        <Excalidraw
          onChange={(elements, state, files) =>
            saveBoardData(elements, state, files)
          }
        >
          <WelcomeScreen />
        </Excalidraw>
      </div>
    </>
  );
}

export default App;
