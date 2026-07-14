import { run as runTui, type TuiInput } from "@arabcode/tui"
import { Global } from "@arabcode/core/global"
import { AppNodeBuilder } from "@arabcode/core/effect/app-node-builder"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(AppNodeBuilder.build(Global.node)))
}
