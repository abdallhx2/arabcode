import { Effect } from "effect"
import { effectCmd } from "../../effect-cmd"

export const AgentCommand = effectCmd({
  command: "agent <name>",
  describe: "عرض تفاصيل إعدادات الوكيل",
  builder: (yargs) =>
    yargs
      .positional("name", {
        type: "string",
        demandOption: true,
        description: "اسم الوكيل",
      })
      .option("tool", {
        type: "string",
        description: "معرّف الأداة المراد تنفيذها",
      })
      .option("params", {
        type: "string",
        description: "معاملات الأداة بصيغة JSON أو كائن JS حرفي",
      }),
  handler: (args) =>
    Effect.gen(function* () {
      const { debugAgent } = yield* Effect.promise(() => import("./agent.handler"))
      return yield* debugAgent(args)
    }),
})
