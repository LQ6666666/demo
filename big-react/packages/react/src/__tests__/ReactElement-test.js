let React;
// let ReactDOM;
let ReactTestUtils;

describe("ReactElement", () => {
  let ComponentFC;

  beforeEach(() => {
    jest.resetModules();

    React = require("react");
    // ReactDOM = require("react-dom");
    ReactTestUtils = require("react-dom/test-utils");
    // NOTE: We're explicitly not using JSX here. This is intended to test
    // classic JS without JSX.
    ComponentFC = () => {
      return React.createElement("div");
    };
  });

  it("returns a complete element according to spec", () => {
    const element = React.createElement(ComponentFC);
    expect(element.type).toBe(ComponentFC);
    expect(element.key).toBe(null);
    expect(element.ref).toBe(null);

    expect(element.props).toEqual({});
  });

  // it("should warn when `key` is being accessed on composite element", () => {
  //   const container = document.createElement("div");
  //   class Child extends React.Component {
  //     render() {
  //       return <div> {this.props.key} </div>;
  //     }
  //   }
  //   class Parent extends React.Component {
  //     render() {
  //       return (
  //         <div>
  //           <Child key="0" />
  //           <Child key="1" />
  //           <Child key="2" />
  //         </div>
  //       );
  //     }
  //   }
  //   expect(() => ReactDOM.render(<Parent />, container)).toErrorDev(
  //     "Child: `key` is not a prop. Trying to access it will result " +
  //       "in `undefined` being returned. If you need to access the same " +
  //       "value within the child component, you should pass it as a different " +
  //       "prop. (https://reactjs.org/link/special-props)"
  //   );
  // });

  // it("should warn when `key` is being accessed on a host element", () => {
  //   const element = <div key="3" />;
  //   expect(() => void element.props.key).toErrorDev(
  //     "div: `key` is not a prop. Trying to access it will result " +
  //       "in `undefined` being returned. If you need to access the same " +
  //       "value within the child component, you should pass it as a different " +
  //       "prop. (https://reactjs.org/link/special-props)",
  //     { withoutStack: true }
  //   );
  // });

  // it("should warn when `ref` is being accessed", () => {
  //   const container = document.createElement("div");
  //   class Child extends React.Component {
  //     render() {
  //       return <div> {this.props.ref} </div>;
  //     }
  //   }
  //   class Parent extends React.Component {
  //     render() {
  //       return (
  //         <div>
  //           <Child ref={React.createRef()} />
  //         </div>
  //       );
  //     }
  //   }
  //   expect(() => ReactDOM.render(<Parent />, container)).toErrorDev(
  //     "Child: `ref` is not a prop. Trying to access it will result " +
  //       "in `undefined` being returned. If you need to access the same " +
  //       "value within the child component, you should pass it as a different " +
  //       "prop. (https://reactjs.org/link/special-props)"
  //   );
  // });

  it("allows a string to be passed as the type", () => {
    const element = React.createElement("div");
    expect(element.type).toBe("div");
    expect(element.key).toBe(null);
    expect(element.ref).toBe(null);
    expect(element.props).toEqual({});
  });

  it("returns an immutable element", () => {
    const element = React.createElement(ComponentFC);

    expect(() => (element.type = "div")).not.toThrow();
  });

  it("does not reuse the original config object", () => {
    const config = { foo: 1 };
    const element = React.createElement(ComponentFC, config);
    expect(element.props.foo).toBe(1);
    config.foo = 2;
    expect(element.props.foo).toBe(1);
  });

  it("does not fail if config has no prototype", () => {
    const config = Object.create(null, { foo: { value: 1, enumerable: true } });
    const element = React.createElement(ComponentFC, config);
    expect(element.props.foo).toBe(1);
  });

  it("extracts key and ref from the config", () => {
    const element = React.createElement(ComponentFC, {
      key: "12",
      ref: "34",
      foo: "56"
    });
    expect(element.type).toBe(ComponentFC);
    expect(element.key).toBe("12");
    expect(element.ref).toBe("34");
    expect(element.props).toEqual({ foo: "56" });
  });

  it("extracts null key and ref", () => {
    const element = React.createElement(ComponentFC, {
      key: null,
      ref: null,
      foo: "12"
    });
    expect(element.type).toBe(ComponentFC);
    expect(element.key).toBe("null");
    expect(element.ref).toBe(null);
    expect(element.props).toEqual({ foo: "12" });
  });

  it("ignores undefined key and ref", () => {
    const props = {
      foo: "56",
      key: undefined,
      ref: undefined
    };
    const element = React.createElement(ComponentFC, props);
    expect(element.type).toBe(ComponentFC);
    expect(element.key).toBe(null);
    expect(element.ref).toBe(null);
    expect(element.props).toEqual({ foo: "56" });
  });

  it("ignores key and ref warning getters", () => {
    const elementA = React.createElement("div");
    const elementB = React.createElement("div", elementA.props);
    expect(elementB.key).toBe(null);
    expect(elementB.ref).toBe(null);
  });

  it("coerces the key to a string", () => {
    const element = React.createElement(ComponentFC, {
      key: 12,
      foo: "56"
    });
    expect(element.type).toBe(ComponentFC);
    expect(element.key).toBe("12");
    expect(element.ref).toBe(null);

    expect(element.props).toEqual({ foo: "56" });
  });

  // it("preserves the owner on the element", () => {
  //   let element;

  //   const Wrapper = () => {
  //     return (element = React.createElement(ComponentFC));
  //   };

  //   const instance = ReactTestUtils.renderIntoDocument(React.createElement(Wrapper));
  //   // @ts-ignore
  //   expect(element.stateNode).toBe(instance);
  // });

  it("merges an additional argument onto the children prop", () => {
    const a = 1;
    const element = React.createElement(
      ComponentFC,
      {
        children: "text"
      },
      a
    );
    expect(element.props.children).toBe(a);
  });

  it("does not override children if no rest args are provided", () => {
    const element = React.createElement(ComponentFC, {
      children: "text"
    });
    expect(element.props.children).toBe("text");
  });

  it("overrides children if null is provided as an argument", () => {
    const element = React.createElement(
      ComponentFC,
      {
        children: "text"
      },
      null
    );
    expect(element.props.children).toBe(null);
  });

  it("merges rest arguments onto the children prop in an array", () => {
    const a = 1;
    const b = 2;
    const c = 3;
    const element = React.createElement(ComponentFC, null, a, b, c);
    expect(element.props.children).toEqual([1, 2, 3]);
  });

  // NOTE: We're explicitly not using JSX here. This is intended to test
  // classic JS without JSX.
  // it("allows static methods to be called using the type property", () => {
  //   class StaticMethodComponentClass extends React.Component {
  //     render() {
  //       return React.createElement("div");
  //     }
  //   }
  //   StaticMethodComponentClass.someStaticMethod = () => "someReturnValue";

  //   const element = React.createElement(StaticMethodComponentClass);
  //   expect(element.type.someStaticMethod()).toBe("someReturnValue");
  // });

  // NOTE: We're explicitly not using JSX here. This is intended to test
  // classic JS without JSX.
  it("is indistinguishable from a plain object", () => {
    const element = React.createElement("div", { className: "foo" });
    const object = {};
    expect(element.constructor).toBe(object.constructor);
  });

  // // NOTE: We're explicitly not using JSX here. This is intended to test
  // // classic JS without JSX.
  // it("should use default prop value when removing a prop", () => {
  //   class Component extends React.Component {
  //     render() {
  //       return React.createElement("span");
  //     }
  //   }
  //   Component.defaultProps = { fruit: "persimmon" };

  //   const container = document.createElement("div");
  //   const instance = ReactDOM.render(React.createElement(Component, { fruit: "mango" }), container);
  //   expect(instance.props.fruit).toBe("mango");

  //   ReactDOM.render(React.createElement(Component), container);
  //   expect(instance.props.fruit).toBe("persimmon");
  // });

  // // NOTE: We're explicitly not using JSX here. This is intended to test
  // // classic JS without JSX.
  // it("should normalize props with default values", () => {
  //   class Component extends React.Component {
  //     render() {
  //       return React.createElement("span", null, this.props.prop);
  //     }
  //   }
  //   Component.defaultProps = { prop: "testKey" };

  //   const instance = ReactTestUtils.renderIntoDocument(React.createElement(Component));
  //   expect(instance.props.prop).toBe("testKey");

  //   const inst2 = ReactTestUtils.renderIntoDocument(React.createElement(Component, { prop: null }));
  //   expect(inst2.props.prop).toBe(null);
  // });

  // it("throws when changing a prop (in dev) after element creation", () => {
  //   class Outer extends React.Component {
  //     render() {
  //       const el = <div className="moo" />;

  //       if (__DEV__) {
  //         expect(function () {
  //           el.props.className = "quack";
  //         }).toThrow();
  //         expect(el.props.className).toBe("moo");
  //       } else {
  //         el.props.className = "quack";
  //         expect(el.props.className).toBe("quack");
  //       }

  //       return el;
  //     }
  //   }
  //   const outer = ReactTestUtils.renderIntoDocument(<Outer color="orange" />);
  //   if (__DEV__) {
  //     expect(ReactDOM.findDOMNode(outer).className).toBe("moo");
  //   } else {
  //     expect(ReactDOM.findDOMNode(outer).className).toBe("quack");
  //   }
  // });

  // it("throws when adding a prop (in dev) after element creation", () => {
  //   const container = document.createElement("div");
  //   class Outer extends React.Component {
  //     render() {
  //       const el = <div>{this.props.sound}</div>;

  //       if (__DEV__) {
  //         expect(function () {
  //           el.props.className = "quack";
  //         }).toThrow();
  //         expect(el.props.className).toBe(undefined);
  //       } else {
  //         el.props.className = "quack";
  //         expect(el.props.className).toBe("quack");
  //       }

  //       return el;
  //     }
  //   }
  //   Outer.defaultProps = { sound: "meow" };
  //   const outer = ReactDOM.render(<Outer />, container);
  //   expect(ReactDOM.findDOMNode(outer).textContent).toBe("meow");
  //   if (__DEV__) {
  //     expect(ReactDOM.findDOMNode(outer).className).toBe("");
  //   } else {
  //     expect(ReactDOM.findDOMNode(outer).className).toBe("quack");
  //   }
  // });

  it("does not warn for NaN props", () => {
    const Test = () => {
      return <div />;
    };

    // @ts-ignore
    const test = ReactTestUtils.renderIntoDocument(<Test value={+undefined} />);
    expect(test.props.value).toBeNaN();
  });
});
