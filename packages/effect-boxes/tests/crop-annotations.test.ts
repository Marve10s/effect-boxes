import { HashMap, Option } from "effect";
import { describe, expect, it } from "vitest";
import * as Annotation from "../src/Annotation";
import * as Ansi from "../src/Ansi";
import * as Box from "../src/Box";
import * as Reactive from "../src/Reactive";

const annotations = <A>(self: Box.Box<A>): unknown[] => {
  const own: unknown[] = self.annotation ? [self.annotation.data] : [];
  switch (self.content._tag) {
    case "Row":
    case "Col":
      return own.concat(self.content.boxes.flatMap(annotations));
    case "SubBox":
      return own.concat(annotations(self.content.box));
    default:
      return own;
  }
};

describe("cropping annotation scopes", () => {
  it("retains a nested composite Row's style across a horizontal crop", () => {
    const nested = Box.hcat([Box.text("AB"), Box.text("CD")], Box.top).pipe(
      Box.annotate(Ansi.red)
    );
    const source = Box.hcat([Box.text("!"), nested, Box.text("?")], Box.top);
    const cropped = Box.cropWidth(source, 2, 2);
    expect(Box.renderPlainSync(cropped)).toBe("BC");
    expect(Box.renderPrettySync(cropped)).toContain("\x1b[31mBC");
    expect(annotations(cropped)).toEqual([Ansi.red.data]);
    expect(annotations(source)).toEqual([Ansi.red.data]);
  });

  it("retains parent and child metadata without flattening or duplicating scopes", () => {
    const child = Box.text("AB").pipe(
      Box.annotate(Annotation.createAnnotation("child"))
    );
    const parent = Box.hcat([child, Box.text("CD")], Box.top).pipe(
      Box.annotate(Annotation.createAnnotation("parent"))
    );
    const source = Box.hcat([Box.text("!"), parent], Box.top);
    const cropped = Box.cropWidth(source, 2, 2);
    expect(Box.renderPlainSync(cropped)).toBe("BC");
    expect(annotations(cropped)).toEqual(["parent", "child"]);
  });

  it("preserves nested Col scopes through vertical and subsequent horizontal crops", () => {
    const nested = Box.vcat([Box.text("AB"), Box.text("CD")], Box.left).pipe(
      Box.annotate(Annotation.createAnnotation("column"))
    );
    const source = Box.vcat([Box.text("!!"), nested], Box.left);
    const cropped = Box.cropWidth(Box.cropHeight(source, 1, 2), 1, 1);
    expect(Box.renderPlainSync(cropped)).toBe("B\nD");
    expect(annotations(cropped)).toEqual(["column"]);
  });

  it("keeps aligned wrapper and inner annotations through both axes", () => {
    const inner = Box.hcat([Box.text("AB"), Box.text("CD")], Box.top).pipe(
      Box.annotate(Annotation.createAnnotation("inner"))
    );
    const wrapper = Box.align(
      Box.top,
      Box.left,
      3,
      6
    )(inner).pipe(Box.annotate(Annotation.createAnnotation("wrapper")));
    const source = Box.vcat([Box.text("!!!!!!"), wrapper], Box.left);
    const cropped = Box.cropWidth(Box.cropHeight(source, 1, 1), 1, 2);
    expect(Box.renderPlainSync(cropped)).toBe("BC");
    expect(annotations(cropped)).toEqual(["wrapper", "inner"]);
  });

  it("tracks the retained geometry of a nested reactive Row", () => {
    const nested = Reactive.makeReactive(
      Box.hcat([Box.text("AB"), Box.text("CD")], Box.top),
      "group"
    );
    const source = Box.hcat([Box.text("!"), nested, Box.text("?")], Box.top);
    const cropped = Box.cropWidth(source, 2, 2);
    expect(
      Option.getOrUndefined(
        HashMap.get(Reactive.getPositions(cropped), "group")
      )
    ).toEqual({ row: 0, col: 0, rows: 1, cols: 2 });
  });
});
