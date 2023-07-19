import { Excalidraw } from "@excalidraw/excalidraw";
import { useEffect, useState } from "react";

function App() {
  //post request to rocket chat about board Data

  const boardId=window.location.pathname.split("/")[4]

  const [boardData, setBoardData] = useState<any>(null);
  
  useEffect(() => {
    fetch("board/:id/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        boardId: boardId,
        boardData: boardData,
      }),
    })
      .then((res) => res.json())
      .then((data) => console.log(data));
  }, [boardData]);

  return (
    <>
      <div className="main-Excalidraw">
        <Excalidraw
          onChange={(elements, state) =>
            setBoardData({ elements: elements, state: state })
          }
        />
      </div>
    </>
  );
}

export default App;
