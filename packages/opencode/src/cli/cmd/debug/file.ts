import { EOL } from "os"
import { Effect } from "effect"
import { FileSystem } from "@opencode-ai/core/filesystem"
import { LocationServiceMap, locationServiceMapLayer } from "@opencode-ai/core/location-services"
import { Location } from "@opencode-ai/core/location"
import { AbsolutePath, RelativePath } from "@opencode-ai/core/schema"
import { effectCmd } from "../../effect-cmd"
import { cmd } from "../cmd"

const filesystem = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provide(LocationServiceMap.Service.get(Location.Ref.make({ directory: AbsolutePath.make(process.cwd()) }))),
    Effect.provide(locationServiceMapLayer),
  )

const FileSearchCommand = effectCmd({
  command: "search <query>",
  describe: "البحث عن الملفات حسب الاستعلام",
  builder: (yargs) =>
    yargs.positional("query", {
      type: "string",
      demandOption: true,
      description: "استعلام البحث",
    }),
  handler: Effect.fn("Cli.debug.file.search")(function* (args) {
    const results = yield* Effect.orDie(filesystem(FileSystem.Service.use((svc) => svc.find({ query: args.query }))))
    process.stdout.write(results.map((item) => item.path).join(EOL) + EOL)
  }),
})

const FileReadCommand = effectCmd({
  command: "read <path>",
  describe: "قراءة محتوى الملف بصيغة JSON",
  builder: (yargs) =>
    yargs.positional("path", {
      type: "string",
      demandOption: true,
      description: "مسار الملف المراد قراءته",
    }),
  handler: Effect.fn("Cli.debug.file.read")(function* (args) {
    const file = yield* filesystem(FileSystem.Service.use((svc) => svc.read({ path: RelativePath.make(args.path) })))
    process.stdout.write(
      JSON.stringify(
        { content: Buffer.from(file.content).toString("base64"), encoding: "base64", mime: file.mime },
        null,
        2,
      ) + EOL,
    )
  }),
})

const FileListCommand = effectCmd({
  command: "list <path>",
  describe: "عرض الملفات في مجلد",
  builder: (yargs) =>
    yargs.positional("path", {
      type: "string",
      demandOption: true,
      description: "مسار المجلد المراد عرض ملفاته",
    }),
  handler: Effect.fn("Cli.debug.file.list")(function* (args) {
    const files = yield* filesystem(FileSystem.Service.use((svc) => svc.list({ path: RelativePath.make(args.path) })))
    process.stdout.write(JSON.stringify(files, null, 2) + EOL)
  }),
})

export const FileCommand = cmd({
  command: "file",
  describe: "أدوات تصحيح نظام الملفات",
  builder: (yargs) =>
    yargs.command(FileReadCommand).command(FileListCommand).command(FileSearchCommand).demandCommand(),
  async handler() {},
})
