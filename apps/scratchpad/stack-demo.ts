/** biome-ignore-all lint/suspicious/noConsole: runnable terminal example */
import { Effect, Option } from "effect";
import * as Ansi from "effect-boxes/Ansi";
import * as Box from "effect-boxes/Box";
import { Layer, Place, Stack } from "effect-boxes/Layout";
import * as Reactive from "effect-boxes/Reactive";
import * as Renderer from "effect-boxes/Renderer";

const background = Box.text("Dashboard\n\nProjects  Reports  Settings").pipe(
  Place.make({ width: 48, height: 10 }),
  Box.annotate(Ansi.blue)
);
const styledPopup = Box.vcat(
  [Box.text("Save changes?"), Box.text("Enter to confirm")],
  Box.left
).pipe(Box.pad(1, 2), Box.border("rounded"), Box.annotate(Ansi.yellow));
const popup = Box.hcat([styledPopup], Box.top).pipe(
  Reactive.makeReactive("popup")
);
const cover = Box.text("Status").pipe(Box.annotate(Ansi.green));
const stack = Stack.make(
  [
    Layer.make(background),
    Layer.make(popup, { x: 12, y: 2, z: 1 }),
    Layer.make(cover, { x: 20, y: 4, z: 2 }),
  ],
  { width: 48, height: 10 }
);
const rendered = Effect.runSync(
  Renderer.frame(stack, { preserveWhitespace: true }).pipe(
    Effect.provide(Renderer.AnsiRendererLive)
  )
);
console.log(rendered.output);
const region = Reactive.getRegion(rendered.resolved.regions, "popup");
if (Option.isSome(region)) {
  console.log("Visible popup fragments:", region.value.visible);
}
console.log(
  "Popup hit:",
  Reactive.hitTest(rendered.resolved, { row: 3, col: 14 })
);
console.log(
  "Covered hit:",
  Reactive.hitTest(rendered.resolved, { row: 4, col: 21 })
);
