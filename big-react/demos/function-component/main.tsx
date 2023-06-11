// @ts-nocheck
import { createRoot } from "react-dom";
// import { createRoot } from "@react/react-noop-renderer";
import { useState } from "react";

// function App() {
//   const [count, setCount] = useState(0);

//   window.setCount = setCount;

//   return count === 3 ? <Child /> : <div>{count}</div>;
// }

// function Child() {
//   return <div>react</div>;
// }

// function App() {
//   const [count, setCount] = useState(0);

//   return <button onClick={() => setCount(count + 1)}>{count}</button>;
//   // return <button onClickCapture={() => setCount(count + 1)}>{count}</button>;
// }

// function App() {
//   const [count, setCount] = useState(0);

//   const child =
//     count % 2 === 0
//       ? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
//       : [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>];

//   return <ul onClick={() => setCount(count + 1)}>{child}</ul>;
// }

// function App() {
//   return (
//     <>
//       <div></div>
//       <div></div>
//     </>
//   );
// }

// function App() {
//   return (
//     <ul>
//       <>
//         <li>1</li>
//         <li>2</li>
//       </>
//       <li>3</li>
//       <li>4</li>
//     </ul>
//   );
// }

// function App() {
//   const [count, setCount] = useState(0);
//   const arr = [<li>c</li>, <li>d</li>];

//   return (
//     <>
//       <button onClick={() => setCount(count + 1)}>{count}</button>

//       <ul>
//         <li>a</li>
//         <li>b</li>
//         {count % 2 === 0 ? arr : arr.concat().reverse()}
//       </ul>
//     </>
//   );
// }

// function App() {
//   return (
//     <>
//       <ul>
//         <li key="1">
//           <span>153</span>
//           <span>153</span>
//         </li>
//         <li key="2">2</li>
//         <li key="3">3</li>
//         <li key="4">4</li>
//         {[<li key="5">5</li>, <li key="6">6</li>]}
//       </ul>

//       <div></div>
//     </>
//   );
// }

// function App() {
//   const [count, setCount] = useState(0);

//   return (
//     <button
//       onClick={() => {
//         setCount(count => count + 1);
//         setCount(count => count + 1);
//         setCount(count => count + 1);
//       }}
//     >
//       {count}
//     </button>
//   );
// }

// function App() {
//   const [count, setCount] = useState(0);

//   useEffect(() => {
//     console.log("App mount");
//   }, []);

//   useEffect(() => {
//     console.log("count change create", count);
//     return () => {
//       console.log("count change destroy", count);
//     };
//   }, [count]);

//   return (
//     <div
//       onClick={() => {
//         setCount(count => count + 1);
//       }}
//     >
//       {count === 0 ? <Child /> : "noop"}
//     </div>
//   );
// }

// function Child() {
//   useEffect(() => {
//     console.log("Child mount");
//     return () => console.log("Child unmount");
//   }, []);

//   return "i am child";
// }

// createRoot(document.getElementById("root") as HTMLDivElement).render(<App />);

// function App() {
//   return (
//     <>
//       <Child />
//       <div>hello world</div>
//     </>
//   );
// }

// function Child() {
//   return "Child";
// }

// const root = createRoot();
// root.render(<App />);
// window.root = root;

function App() {
  const [state, setState] = useState(100);

  return (
    <ul
      onClick={() => {
        setState(50);
        setState(v => {
          return v + 1;
        });
      }}
    >
      {new Array(state).fill(0).map((_, i) => {
        return <Child key={i}>{i}</Child>;
      })}
    </ul>
  );
}

function Child({ children }) {
  const now = performance.now();
  while (performance.now() - now < 4) {
    //
  }

  return <li>{children}</li>;
}

createRoot(document.getElementById("root") as HTMLDivElement).render(<App />);
