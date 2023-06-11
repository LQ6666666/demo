// @ts-nocheck
import { createRoot } from "react-dom";
import { useState, useRef, useEffect } from "react";

function App() {
  const [isDel, del] = useState(false);
  const divRef = useRef(null);

  console.log("render divRef", divRef.current);

  useEffect(() => {
    console.log("useEffect divRef", divRef.current);
  }, []);

  return (
    <div ref={divRef} onClick={() => del(true)}>
      {isDel ? null : <Child />}
    </div>
  );
}

function Child() {
  return <p ref={dom => console.log("dom is:", dom)}>Child</p>;
}

createRoot(document.getElementById("root") as HTMLDivElement).render(<App />);
