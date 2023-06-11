/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

/* eslint-disable no-func-assign */

"use strict";

let React;
let ReactNoop;
let Scheduler;
let act;
let useEffect;

describe("ReactHooksWithNoopRenderer", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    // @ts-ignore
    ReactNoop = require("react-noop-renderer");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    act = require("jest-react").act;
    Scheduler = require("scheduler");
    React = require("react");

    useEffect = React.useEffect;
  });

  test("passive unmounts on deletion are fired in parent -> child order", async () => {
    const root = ReactNoop.createRoot();

    function Parent() {
      console.log("Parent");
      useEffect(() => {
        return () => Scheduler.unstable_yieldValue("Unmount parent");
      });
      // @ts-ignore
      return <Child />;
    }

    function Child() {
      useEffect(() => {
        return () => Scheduler.unstable_yieldValue("Unmount child");
      });
      return "Child";
    }

    await act(async () => {
      root.render(<Parent />);
    });

    // @ts-ignore
    expect(root).toMatchRenderedOutput("Child");
    await act(async () => {
      root.render(null);
    });
    // @ts-ignore
    expect(Scheduler).toHaveYielded(["Unmount parent", "Unmount child"]);
  });
});
