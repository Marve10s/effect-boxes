import { describe, expect, it } from "vitest";
import * as Box from "../src/Box";

describe("cropping aligned boxes", () => {
  it("should retain right-aligned content when the horizontal crop selects it", () => {
    const box = Box.alignHoriz(Box.text("abc"), Box.right, 6);
    const cropped = Box.cropWidth(box, 3, 3);

    expect(Box.renderPlainSync(box)).toBe("   abc");
    expect(Box.renderPlainSync(cropped)).toBe("abc");
  });

  it("should retain bottom-aligned content when the vertical crop selects it", () => {
    const box = Box.moveDown(Box.text("abc"), 2);
    const cropped = Box.cropHeight(box, 2, 1);

    expect(Box.renderPlainSync(box)).toBe("   \n   \nabc");
    expect(Box.renderPlainSync(cropped)).toBe("abc");
  });

  it("should preserve the selected padding around centered content", () => {
    const box = Box.alignHoriz(Box.text("abcd"), Box.center1, 10);
    const cropped = Box.cropWidth(box, 0, 8);

    expect(Box.renderPlainSync(box)).toBe("   abcd   ");
    expect(Box.renderPlainSync(cropped)).toBe("   abcd ");
  });

  it("should crop the visible portion when centered content is already clipped", () => {
    const box = Box.alignHoriz(Box.text("abcdef"), Box.center1, 3);
    const cropped = Box.cropWidth(box, 1, 1);

    expect(Box.renderPlainSync(box)).toBe("bcd");
    expect(Box.renderPlainSync(cropped)).toBe("c");
  });
});

describe("cropping follows rendered center alignment", () => {
  it("selects the same columns for both center variants and odd/even extents", () => {
    for (const alignment of [Box.center1, Box.center2]) {
      for (let inner = 1; inner <= 6; inner++) {
        for (let outer = 1; outer <= 6; outer++) {
          const source = Box.alignHoriz(
            Box.text("ABCDEF".slice(0, inner)),
            alignment,
            outer
          );
          const rendered = Box.renderPlainSync(source);
          for (let offset = 0; offset <= outer; offset++) {
            for (let width = 0; width <= outer; width++) {
              expect(
                Box.renderPlainSync(Box.cropWidth(source, offset, width))
              ).toBe(rendered.slice(offset, offset + width));
            }
          }
        }
      }
    }
  });

  it("selects the same rows for both center variants and odd/even extents", () => {
    for (const alignment of [Box.center1, Box.center2]) {
      for (let inner = 1; inner <= 6; inner++) {
        for (let outer = 1; outer <= 6; outer++) {
          const source = Box.alignVert(
            Box.text("ABCDEF".slice(0, inner).split("").join("\n")),
            alignment,
            outer
          );
          const rendered = Box.renderPlainSync(source).split("\n");
          for (let offset = 0; offset <= outer; offset++) {
            for (let height = 0; height <= outer; height++) {
              expect(
                Box.renderPlainSync(Box.cropHeight(source, offset, height))
              ).toBe(rendered.slice(offset, offset + height).join("\n"));
            }
          }
        }
      }
    }
  });
});
