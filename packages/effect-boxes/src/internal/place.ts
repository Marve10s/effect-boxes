/** @internal */
import { dual } from "effect/Function";
import type * as Box from "../Box.js";
import type { Place } from "../Layout.js";
import { isAnsi } from "./ansi.js";
import * as internal from "./box.js";

const integer = (value: number, name: string): number => {
  if (!Number.isSafeInteger(value))
    throw new RangeError(`${name} must be a safe integer`);
  return value;
};
const dimension = (value: number, name: string): number => {
  integer(value, name);
  if (value < 0) throw new RangeError(`${name} must be non-negative`);
  return value;
};
const axis = (
  position: Place.Horizontal | Place.Vertical,
  outer: number,
  inner: number,
  first: "left" | "top",
  last: "right" | "bottom"
): number => {
  if (typeof position === "number") return integer(position, "position");
  if (position === first) return 0;
  if (position === "center") return Math.floor((outer - inner) / 2);
  if (position === last) return outer - inner;
  throw new RangeError(`Unsupported placement anchor: ${position}`);
};
const rejectCommands = <A>(self: Box.Box<A>): void => {
  if (
    self.annotation &&
    isAnsi(self.annotation.data) &&
    self.annotation.data.some(
      (attribute) => attribute._tag === "CommandAttribute"
    )
  )
    throw new RangeError("Place does not support Cmd annotations");
  switch (self.content._tag) {
    case "Row":
    case "Col":
      for (const child of self.content.boxes) rejectCommands(child);
      break;
    case "SubBox":
      rejectCommands(self.content.box);
      break;
  }
};

/** @internal */
export const make = dual<
  (options: Place.Options) => <A>(self: Box.Box<A>) => Box.Box<A>,
  <A>(self: Box.Box<A>, options: Place.Options) => Box.Box<A>
>(2, <A>(self: Box.Box<A>, options: Place.Options): Box.Box<A> => {
  const width = dimension(options.width, "width");
  const height = dimension(options.height, "height");
  dimension(self.cols, "source columns");
  dimension(self.rows, "source rows");
  const x = axis(
    options.x === undefined ? "left" : options.x,
    width,
    self.cols,
    "left",
    "right"
  );
  const y = axis(
    options.y === undefined ? "top" : options.y,
    height,
    self.rows,
    "top",
    "bottom"
  );
  rejectCommands(self);
  const left = Math.max(0, x);
  const top = Math.max(0, y);
  const sourceCol = Math.max(0, -x);
  const sourceRow = Math.max(0, -y);
  // Subtract bounded extents rather than adding offsets to source dimensions.
  // This keeps extreme safe-integer offsets from overflowing or cancelling.
  const visibleWidth = Math.max(
    0,
    Math.min(self.cols - sourceCol, width - left)
  );
  const visibleHeight = Math.max(
    0,
    Math.min(self.rows - sourceRow, height - top)
  );
  if (visibleWidth === 0 || visibleHeight === 0)
    return internal.emptyBox(height, width);
  const clipped = internal.cropHeight(
    internal.cropWidth(self, sourceCol, visibleWidth),
    sourceRow,
    visibleHeight
  );
  const row = internal.hcat(
    [
      internal.emptyBox(visibleHeight, left),
      clipped,
      internal.emptyBox(visibleHeight, width - left - visibleWidth),
    ],
    internal.top
  );
  return internal.vcat(
    [
      internal.emptyBox(top, width),
      row,
      internal.emptyBox(height - top - visibleHeight, width),
    ],
    internal.left
  );
});

/** @internal */
export const horizontal = dual<
  (
    width: number,
    position: Place.Horizontal
  ) => <A>(self: Box.Box<A>) => Box.Box<A>,
  <A>(self: Box.Box<A>, width: number, position: Place.Horizontal) => Box.Box<A>
>(
  3,
  <A>(
    self: Box.Box<A>,
    width: number,
    position: Place.Horizontal
  ): Box.Box<A> => make(self, { width, height: self.rows, x: position })
);

/** @internal */
export const vertical = dual<
  (
    height: number,
    position: Place.Vertical
  ) => <A>(self: Box.Box<A>) => Box.Box<A>,
  <A>(self: Box.Box<A>, height: number, position: Place.Vertical) => Box.Box<A>
>(
  3,
  <A>(self: Box.Box<A>, height: number, position: Place.Vertical): Box.Box<A> =>
    make(self, { width: self.cols, height, y: position })
);
