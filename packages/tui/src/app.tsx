import { render, TimeToFirstDraw, useRenderer, useTerminalDimensions } from "@opentui/solid"
import { registerOpencodeSpinner } from "./component/register-spinner"
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui"
import { Deferred, Effect } from "effect"
import { Global } from "@arabcode/core/global"
import { Flag } from "@arabcode/core/flag/flag"
import { InstallationVersion } from "@arabcode/core/installation/version"
import { ClipboardProvider, useClipboard } from "./context/clipboard"
import { ExitProvider, useExit } from "./context/exit"
import { EpilogueProvider } from "./context/epilogue"
import * as Selection from "./util/selection"
import { createCliRenderer, MouseButton } from "@opentui/core"
import { RouteProvider, useRoute } from "./context/route"
import {
  Switch,
  Match,
  createEffect,
  createMemo,
  ErrorBoundary,
  createSignal,
  onMount,
  onCleanup,
  batch,
  Show,
  on,
} from "solid-js"
import { TuiPathsProvider, TuiStartupProvider, TuiTerminalEnvironmentProvider, useTuiStartup } from "./context/runtime"
import { DialogProvider, useDialog } from "./ui/dialog"
import { DialogProvider as DialogProviderList } from "./component/dialog-provider"
import { ErrorComponent } from "./component/error-component"
import { PluginRouteMissing } from "./component/plugin-route-missing"
import { ProjectProvider, useProject } from "./context/project"
import { EditorContextProvider } from "./context/editor"
import { useEvent } from "./context/event"
import { SDKProvider, useSDK } from "./context/sdk"
import { StartupLoading } from "./component/startup-loading"
import { SyncProvider, useSync } from "./context/sync"
import { DataProvider } from "./context/data"
import { LocationProvider } from "./context/location"
import { LocalProvider, useLocal } from "./context/local"
import { PermissionProvider } from "./context/permission"
import { DialogModel } from "./component/dialog-model"
import { useConnected } from "./component/use-connected"
import { DialogMcp } from "./component/dialog-mcp"
import { DialogStatus } from "./component/dialog-status"
import { DialogDebug } from "./component/dialog-debug"
import { DialogThemeList } from "./component/dialog-theme-list"
import { DialogHelp } from "./ui/dialog-help"
import { DialogAgent } from "./component/dialog-agent"
import { DialogSessionList } from "./component/dialog-session-list"
import { DialogWorkspaceList } from "./component/dialog-workspace-list"
import { DialogConsoleOrg } from "./component/dialog-console-org"
import { ThemeProvider, useTheme } from "./context/theme"
import { Home } from "./routes/home"
import { Session } from "./routes/session"
import { PromptHistoryProvider } from "./component/prompt/history"
import { FrecencyProvider } from "./component/prompt/frecency"
import { PromptStashProvider } from "./component/prompt/stash"
import { DialogAlert } from "./ui/dialog-alert"
import { DialogConfirm } from "./ui/dialog-confirm"
import { ToastProvider, useToast } from "./ui/toast"
import { isDefaultTitle } from "./util/session"
import { KVProvider, useKV } from "./context/kv"
import * as Model from "./util/model"
import { ArgsProvider, useArgs, type Args } from "./context/args"
import open from "open"
import { PromptRefProvider, usePromptRef } from "./context/prompt"
import { TuiConfigProvider, useTuiConfig, type TuiConfig } from "./config"
import { createTuiApiAdapters } from "./plugin/adapters"
import { createTuiApi } from "./plugin/api"
import { createPluginRuntime, PluginRuntimeProvider, usePluginRuntime, type TuiPluginHost } from "./plugin/runtime"
import { CommandPaletteDialog } from "./component/command-palette"
import {
  COMMAND_PALETTE_COMMAND,
  OPENCODE_BASE_MODE,
  OpencodeKeymapProvider,
  registerOpencodeKeymap,
  useBindings,
  useOpencodeKeymap,
} from "./keymap"

import type { EventSource } from "./context/sdk"
import { DialogVariant } from "./component/dialog-variant"
import { createTuiAttention } from "./attention"
import * as TuiAudio from "./audio"
import { win32DisableProcessedInput, win32FlushInputBuffer, win32IsLegacyConsole } from "./terminal-win32"
import { destroyRenderer } from "./util/renderer"
import { cliErrorMessage, errorFormat } from "./util/error"
import { BIDI_EXPLICIT_ENTER, BIDI_EXPLICIT_EXIT } from "./util/rtl"
import { installBidiResumeGuard, installRtlHooks, uninstallRtlHooks, writeRendererEscape } from "./util/rtl-hook"

registerOpencodeSpinner()

const appGlobalBindingCommands = [
  "session.list",
  "session.new",
  "session.quick_switch.1",
  "session.quick_switch.2",
  "session.quick_switch.3",
  "session.quick_switch.4",
  "session.quick_switch.5",
  "session.quick_switch.6",
  "session.quick_switch.7",
  "session.quick_switch.8",
  "session.quick_switch.9",
] as const

const appBindingCommands = [
  "command.palette.show",
  "model.list",
  "model.cycle_recent",
  "model.cycle_recent_reverse",
  "model.cycle_favorite",
  "model.cycle_favorite_reverse",
  "agent.list",
  "mcp.list",
  "agent.cycle",
  "agent.cycle.reverse",
  "variant.cycle",
  "variant.list",
  "provider.connect",
  "console.org.switch",
  "opencode.status",
  "opencode.debug",
  "theme.switch",
  "theme.switch_mode",
  "theme.mode.lock",
  "help.show",
  "docs.open",
  "diff.open",
  "workspace.list",
  "app.debug",
  "app.console",
  "app.heap_snapshot",
  "terminal.suspend",
  "terminal.title.toggle",
  "app.toggle.animations",
  "app.toggle.file_context",
  "app.toggle.diffwrap",
  "app.toggle.paste_summary",
  "app.toggle.session_directory_filter",
] as const

export type TuiInput = {
  url: string
  args: Args
  config: TuiConfig.Resolved
  onSnapshot?: () => Promise<string[]>
  directory?: string
  fetch?: typeof fetch
  headers?: RequestInit["headers"]
  events?: EventSource
  pluginHost: TuiPluginHost
}

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "message" in error.data &&
    typeof error.data.message === "string"
  ) {
    return error.data.message
  }
  return error instanceof Error ? error.message : String(error)
}

function isVersionGreater(left: string, right: string) {
  const parse = (value: string) => {
    const [core, prerelease] = value.replace(/^v/, "").split("-", 2)
    return { core: core.split(".").map((part) => Number.parseInt(part, 10) || 0), prerelease }
  }
  const a = parse(left)
  const b = parse(right)
  for (let index = 0; index < Math.max(a.core.length, b.core.length); index++) {
    const difference = (a.core[index] ?? 0) - (b.core[index] ?? 0)
    if (difference) return difference > 0
  }
  if (a.prerelease === b.prerelease) return false
  if (!a.prerelease) return true
  if (!b.prerelease) return false
  return a.prerelease.localeCompare(b.prerelease, undefined, { numeric: true }) > 0
}

export const run = Effect.fn("Tui.run")(function* (input: TuiInput) {
  const global = yield* Global.Service
  const exit = { epilogue: undefined as string | undefined, reason: undefined as unknown }
  const result = yield* Effect.scoped(
    Effect.gen(function* () {
      // تحويل RTL على مستوى التطبيق: يجب تركيبه قبل بناء أي مكوّن نصي
      const rtlActive = installRtlHooks()
      // وضع BiDi explicit يُبثّ قبل إنشاء الـ renderer (قبل دخول الشاشة البديلة):
      // VTE يختم كل سطر بحالة BiDi لحظة إنشائه عند دخول 1049h — تأكيدٌ لاحق
      // لا يعالج الأسطر المختومة ضمنياً فيظهر العربي معكوساً في أول تشغيل.
      // لا سباق هنا: قناة الكتابة الأصلية لم تُنشأ بعد، وstdout متزامن.
      if (rtlActive) process.stdout.write(BIDI_EXPLICIT_ENTER)
      const renderer = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () =>
            createCliRenderer({
              externalOutputMode: "passthrough",
              targetFps: 60,
              gatherStats: false,
              exitOnCtrlC: false,
              useKittyKeyboard: {},
              autoFocus: false,
              openConsoleOnError: false,
              useMouse: !Flag.OPENCODE_DISABLE_MOUSE && input.config.mouse,
              consoleOptions: {
                keyBindings: [{ name: "y", ctrl: true, action: "copy-selection" }],
              },
            }),
          catch: (error) => (error instanceof Error ? error : new Error(String(error))),
        }),
        (renderer) =>
          Effect.sync(() => {
            if (rtlActive) uninstallRtlHooks()
            destroyRenderer(renderer)
            // الاستعادة بعد تدمير الـ renderer عبر stdout مباشرة: الكتابة عبر
            // writeOut كانت تموت مع خيط الكتابة قبل التدفق فيتسرّب وضع explicit
            // إلى صدفة المستخدم (وكان التسريب يخفي خلل الترتيب في التشغيل الثاني).
            if (rtlActive) process.stdout.write(BIDI_EXPLICIT_EXIT)
          }),
      )
      // وضع BiDi explicit: يمنع الطرفيات الداعمة (VTE) من إعادة ترتيب ترتيبنا.
      // عبر قناة الـ renderer الأصلية لضمان وصوله بعد إعداد الطرفية وقبل أول إطار.
      if (rtlActive) {
        writeRendererEscape(renderer, BIDI_EXPLICIT_ENTER)
        // أي resume (تعليق ctrl+z ثم fg، محرر خارجي...) يعيد تهيئة الطرفية
        // ويُسقط الوضع — الحارس يعيد بثّه بعد كل resume تلقائياً.
        installBidiResumeGuard(renderer)
      }
      win32DisableProcessedInput()
      const keymap = createDefaultOpenTuiKeymap(renderer)
      yield* Effect.acquireRelease(
        Effect.sync(() => registerOpencodeKeymap(keymap, renderer, input.config)),
        (unregister) => Effect.sync(unregister),
      )
      yield* Effect.addFinalizer(() =>
        Effect.promise(async () => {
          try {
            await input.pluginHost.dispose()
          } catch (error) {
            console.error("Failed to dispose TUI plugins", error)
          }
        }),
      )
      yield* Effect.addFinalizer(() => Effect.sync(TuiAudio.dispose))
      const shutdown = yield* Deferred.make<unknown>()
      const onSighup = () => destroyRenderer(renderer)
      yield* Effect.acquireRelease(
        Effect.sync(() => process.on("SIGHUP", onSighup)),
        () => Effect.sync(() => process.off("SIGHUP", onSighup)),
      )
      renderer.once("destroy", () => Deferred.doneUnsafe(shutdown, Effect.void))
      const pluginRuntime = createPluginRuntime()

      yield* Effect.tryPromise(async () => {
        // Prewarm palette before ThemeProvider mounts so `system` theme avoids a first-paint fallback flash.
        void renderer.getPalette({ size: 16 }).catch(() => undefined)
        const mode = (await renderer.waitForThemeMode(1000)) ?? "dark"
        if (renderer.isDestroyed) return

        await render(() => {
          return (
            <ExitProvider
              exit={(reason) => {
                if (renderer.isDestroyed) return
                exit.reason = reason
                destroyRenderer(renderer)
              }}
            >
              <EpilogueProvider set={(value) => (exit.epilogue = value)}>
                <ErrorBoundary fallback={(error, reset) => <ErrorComponent error={error} reset={reset} mode={mode} />}>
                  <TuiPathsProvider
                    value={{
                      cwd: process.cwd(),
                      home: global.home,
                      state: global.state,
                      worktree: global.data + "/worktree",
                    }}
                  >
                    <TuiTerminalEnvironmentProvider
                      value={{
                        platform: process.platform,
                        multiplexer: process.env.TMUX ? "tmux" : process.env.STY ? "screen" : undefined,
                        displayServer: process.env.WAYLAND_DISPLAY
                          ? "wayland"
                          : process.env.DISPLAY
                            ? "x11"
                            : undefined,
                      }}
                    >
                      <TuiStartupProvider
                        value={{
                          initialRoute: process.env.OPENCODE_ROUTE ? JSON.parse(process.env.OPENCODE_ROUTE) : undefined,
                          skipInitialLoading: Boolean(process.env.OPENCODE_FAST_BOOT),
                        }}
                      >
                        <ClipboardProvider>
                          <OpencodeKeymapProvider keymap={keymap}>
                            <ArgsProvider {...input.args}>
                              <KVProvider>
                                <ToastProvider>
                                  <RouteProvider
                                    initialRoute={
                                      input.args.continue
                                        ? {
                                            type: "session",
                                            sessionID: "dummy",
                                          }
                                        : undefined
                                    }
                                  >
                                    <TuiConfigProvider config={input.config}>
                                      <PluginRuntimeProvider value={pluginRuntime}>
                                        <SDKProvider
                                          url={input.url}
                                          directory={input.directory}
                                          fetch={input.fetch}
                                          headers={input.headers}
                                          events={input.events}
                                        >
                                          <PermissionProvider>
                                            <ProjectProvider>
                                              <SyncProvider>
                                                <DataProvider>
                                                  <ThemeProvider mode={mode}>
                                                    <LocalProvider>
                                                      <PromptStashProvider>
                                                        <DialogProvider>
                                                          <FrecencyProvider>
                                                            <PromptHistoryProvider>
                                                              <PromptRefProvider>
                                                                <EditorContextProvider>
                                                                  <LocationProvider>
                                                                    <App
                                                                      onSnapshot={input.onSnapshot}
                                                                      pluginHost={input.pluginHost}
                                                                    />
                                                                  </LocationProvider>
                                                                </EditorContextProvider>
                                                              </PromptRefProvider>
                                                            </PromptHistoryProvider>
                                                          </FrecencyProvider>
                                                        </DialogProvider>
                                                      </PromptStashProvider>
                                                    </LocalProvider>
                                                  </ThemeProvider>
                                                </DataProvider>
                                              </SyncProvider>
                                            </ProjectProvider>
                                          </PermissionProvider>
                                        </SDKProvider>
                                      </PluginRuntimeProvider>
                                    </TuiConfigProvider>
                                  </RouteProvider>
                                </ToastProvider>
                              </KVProvider>
                            </ArgsProvider>
                          </OpencodeKeymapProvider>
                        </ClipboardProvider>
                      </TuiStartupProvider>
                    </TuiTerminalEnvironmentProvider>
                  </TuiPathsProvider>
                </ErrorBoundary>
              </EpilogueProvider>
            </ExitProvider>
          )
        }, renderer)
      })
      yield* Deferred.await(shutdown)
      return { epilogue: exit.epilogue, reason: exit.reason }
    }),
  )
  yield* Effect.sync(() => {
    win32FlushInputBuffer()
    if (result.reason !== undefined)
      process.stderr.write((cliErrorMessage(result.reason) ?? errorFormat(result.reason)) + "\n")
    if (result.epilogue) process.stdout.write(result.epilogue + "\n")
  })
})

function App(props: { onSnapshot?: () => Promise<string[]>; pluginHost: TuiPluginHost }) {
  const startup = useTuiStartup()
  const tuiConfig = useTuiConfig()
  const route = useRoute()
  const dimensions = useTerminalDimensions()
  const renderer = useRenderer()
  const dialog = useDialog()
  const local = useLocal()
  const kv = useKV()
  const keymap = useOpencodeKeymap()
  const event = useEvent()
  const sdk = useSDK()
  const toast = useToast()
  const themeState = useTheme()
  const { theme, mode, setMode, locked, lock, unlock } = themeState
  const sync = useSync()
  const project = useProject()
  const exit = useExit()
  const promptRef = usePromptRef()
  const pluginRuntime = usePluginRuntime()
  const attention = createTuiAttention({ renderer, config: tuiConfig, kv })
  const clipboard = useClipboard()

  const api = createTuiApi(
    createTuiApiAdapters({
      version: InstallationVersion,
      tuiConfig,
      dialog,
      keymap,
      kv,
      route,
      routes: pluginRuntime.routes,
      event,
      sdk,
      sync,
      theme: themeState,
      toast,
      renderer,
      attention,
      Slot: pluginRuntime.Slot,
    }),
  )
  const [ready, setReady] = createSignal(false)
  props.pluginHost
    .start({
      api,
      config: tuiConfig,
      runtime: pluginRuntime,
      dispose: () => attention.dispose(),
    })
    .catch((error) => {
      console.error("Failed to load TUI plugins", error)
    })
    .finally(() => {
      setReady(true)
    })

  // conhost القديم (cmd/PowerShell بلا Windows Terminal) لا يملك font fallback
  // للعربية فتظهر مربعات مهما فعلنا — التنبيه بالإنجليزية لأنها الوحيدة المقروءة هناك.
  if (win32IsLegacyConsole()) {
    toast.show({
      title: "Arabic display",
      message: "This console cannot show Arabic characters (no font fallback). Run arabcode inside Windows Terminal instead.",
      variant: "warning",
      duration: 15000,
    })
  }

  // Let selection copy/dismiss win ahead of normal bindings when explicit copy is required.
  const offSelectionKeys = keymap.intercept(
    "key",
    ({ event }) => {
      if (!Flag.OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT) return
      Selection.handleSelectionKey(renderer, toast, event, clipboard)
    },
    { priority: 1 },
  )
  onCleanup(() => {
    offSelectionKeys()
    attention.dispose()
  })

  // Wire up console copy-to-clipboard via opentui's onCopySelection callback
  renderer.console.onCopySelection = async (text: string) => {
    if (!text || text.length === 0) return

    await clipboard
      .write?.(text)
      .then(() => toast.show({ message: "تم النسخ إلى الحافظة", variant: "info" }))
      .catch(toast.error)

    renderer.clearSelection()
  }
  const [terminalTitleEnabled, setTerminalTitleEnabled] = createSignal(kv.get("terminal_title_enabled", true))
  const [pasteSummaryEnabled, setPasteSummaryEnabled] = createSignal(
    kv.get("paste_summary_enabled", !sync.data.config.experimental?.disable_paste_summary),
  )

  // Update terminal window title based on current route and session
  createEffect(() => {
    if (!terminalTitleEnabled() || Flag.OPENCODE_DISABLE_TERMINAL_TITLE) return

    if (route.data.type === "home") {
      renderer.setTerminalTitle("arabcode")
      return
    }

    if (route.data.type === "session") {
      const session = sync.session.get(route.data.sessionID)
      if (!session || isDefaultTitle(session.title)) {
        renderer.setTerminalTitle("arabcode")
        return
      }

      const title = session.title.length > 40 ? session.title.slice(0, 37) + "..." : session.title
      renderer.setTerminalTitle(`OC | ${title}`)
      return
    }

    if (route.data.type === "plugin") {
      renderer.setTerminalTitle(`OC | ${route.data.id}`)
    }
  })

  const args = useArgs()
  onMount(() => {
    batch(() => {
      if (args.agent) local.agent.set(args.agent)
      if (args.model) {
        const { providerID, modelID } = Model.parse(args.model)
        if (!providerID || !modelID)
          return toast.show({
            variant: "warning",
            message: `صيغة نموذج غير صالحة: ${args.model}`,
            duration: 3000,
          })
        local.model.set({ providerID, modelID }, { recent: true })
      }
      if (args.sessionID && !args.fork) {
        route.navigate({
          type: "session",
          sessionID: args.sessionID,
        })
      }
    })
  })

  let continued = false
  createEffect(() => {
    // When using -c, session list is loaded in blocking phase, so we can navigate at "partial"
    if (continued || sync.status === "loading" || !args.continue) return
    const match = sync.data.session
      .toSorted((a, b) => b.time.updated - a.time.updated)
      .find((x) => x.parentID === undefined)?.id
    if (match) {
      continued = true
      if (args.fork) {
        void sdk.client.session.fork({ sessionID: match }).then((result) => {
          if (result.data?.id) {
            route.navigate({ type: "session", sessionID: result.data.id })
          } else {
            toast.show({ message: "فشل تفريع الجلسة", variant: "error" })
          }
        })
      } else {
        route.navigate({ type: "session", sessionID: match })
      }
    }
  })

  // Handle --session with --fork: wait for sync to be fully complete before forking
  // (session list loads in non-blocking phase for --session, so we must wait for "complete"
  // to avoid a race where reconcile overwrites the newly forked session)
  let forked = false
  createEffect(() => {
    if (forked || sync.status !== "complete" || !args.sessionID || !args.fork) return
    forked = true
    void sdk.client.session.fork({ sessionID: args.sessionID }).then((result) => {
      if (result.data?.id) {
        route.navigate({ type: "session", sessionID: result.data.id })
      } else {
        toast.show({ message: "فشل تفريع الجلسة", variant: "error" })
      }
    })
  })

  createEffect(
    on(
      () => sync.status === "complete" && sync.data.provider.length === 0,
      (isEmpty, wasEmpty) => {
        // only trigger when we transition into an empty-provider state
        if (!isEmpty || wasEmpty) return
        dialog.replace(() => <DialogProviderList />)
      },
    ),
  )

  const connected = useConnected()
  const currentWorktreeWorkspace = createMemo(() => {
    const workspaceID = project.workspace.current()
    if (!workspaceID) return
    const workspace = project.workspace.get(workspaceID)
    if (workspace?.type !== "worktree" || !workspace.directory) return
    return workspace
  })
  const appCommands = createMemo(() =>
    [
      {
        name: COMMAND_PALETTE_COMMAND,
        title: "عرض لوحة الأوامر",
        category: "النظام",
        hidden: true,
        run: () => {
          dialog.replace(() => <CommandPaletteDialog />)
        },
      },
      {
        name: "session.list",
        title: "تبديل الجلسة",
        category: "الجلسة",
        suggested: sync.data.session.length > 0,
        slashName: "sessions",
        slashAliases: ["resume", "continue"],
        run: () => {
          dialog.replace(() => <DialogSessionList />)
        },
      },
      {
        name: "session.new",
        title: "جلسة جديدة",
        suggested: route.data.type === "session",
        category: "الجلسة",
        slashName: "new",
        slashAliases: ["clear"],
        run: () => {
          route.navigate({
            type: "home",
          })
          dialog.clear()
        },
      },
      {
        name: "workspace.copy_path",
        title: "نسخ مسار worktree",
        category: "مساحة العمل",
        enabled: () => currentWorktreeWorkspace() !== undefined,
        run: async () => {
          const workspace = currentWorktreeWorkspace()
          if (!workspace?.directory) return
          await clipboard
            .write?.(workspace.directory)
            .then(() => toast.show({ message: "تم نسخ مسار worktree", variant: "info" }))
            .catch(toast.error)
          dialog.clear()
        },
      },
      {
        name: "workspace.list",
        title: "إدارة مساحات العمل",
        category: "مساحة العمل",
        hidden: !Flag.OPENCODE_EXPERIMENTAL_WORKSPACES,
        slashName: "workspaces",
        run: () => {
          dialog.replace(() => <DialogWorkspaceList />)
        },
      },
      ...Array.from({ length: 9 }, (_, i) => ({
        name: `session.quick_switch.${i + 1}`,
        title: `التبديل إلى الجلسة في الخانة السريعة ${i + 1}`,
        category: "الجلسة",
        hidden: true,
        run: () => {
          local.session.quickSwitch(i + 1)
        },
      })),
      {
        name: "model.list",
        title: "تبديل النموذج",
        suggested: true,
        category: "الوكيل",
        slashName: "models",
        // Bias /mo toward /models over /move without changing global fuzzy scoring.
        slashAliases: ["mo"],
        run: () => {
          dialog.replace(() => <DialogModel />)
        },
      },
      {
        name: "model.cycle_recent",
        title: "التنقل بين النماذج",
        category: "الوكيل",
        hidden: true,
        run: () => {
          local.model.cycle(1)
        },
      },
      {
        name: "model.cycle_recent_reverse",
        title: "التنقل بين النماذج عكسياً",
        category: "الوكيل",
        hidden: true,
        run: () => {
          local.model.cycle(-1)
        },
      },
      {
        name: "model.cycle_favorite",
        title: "التنقل بين النماذج المفضلة",
        category: "الوكيل",
        hidden: true,
        run: () => {
          local.model.cycleFavorite(1)
        },
      },
      {
        name: "model.cycle_favorite_reverse",
        title: "التنقل بين النماذج المفضلة عكسياً",
        category: "الوكيل",
        hidden: true,
        run: () => {
          local.model.cycleFavorite(-1)
        },
      },
      {
        name: "agent.list",
        title: "تبديل الوكيل",
        category: "الوكيل",
        slashName: "agents",
        run: () => {
          dialog.replace(() => <DialogAgent />)
        },
      },
      {
        name: "mcp.list",
        title: "تفعيل/تعطيل خوادم MCP",
        category: "الوكيل",
        slashName: "mcps",
        run: () => {
          dialog.replace(() => <DialogMcp />)
        },
      },
      {
        name: "agent.cycle",
        title: "التنقل بين الوكلاء",
        category: "الوكيل",
        hidden: true,
        run: () => {
          local.agent.move(1)
        },
      },
      {
        name: "variant.cycle",
        title: "التنقل بين المتغيّرات",
        category: "الوكيل",
        run: () => {
          local.model.variant.cycle()
        },
      },
      {
        name: "variant.list",
        title: "تبديل متغيّر النموذج",
        category: "الوكيل",
        hidden: local.model.variant.list().length === 0,
        slashName: "variants",
        run: () => {
          if (local.model.variant.list().length === 0) {
            return toast.show({
              title: "لا تتوفر متغيّرات",
              message: "النموذج الحالي لا يدعم أي متغيّرات.",
              variant: "info",
            })
          }
          dialog.replace(() => <DialogVariant />)
        },
      },
      {
        name: "agent.cycle.reverse",
        title: "التنقل بين الوكلاء عكسياً",
        category: "الوكيل",
        hidden: true,
        run: () => {
          local.agent.move(-1)
        },
      },
      {
        name: "provider.connect",
        title: "ربط مزوّد",
        suggested: !connected(),
        slashName: "connect",
        run: () => {
          dialog.replace(() => <DialogProviderList />)
        },
        category: "المزوّد",
      },
      ...(sync.data.console_state.switchableOrgCount > 1
        ? [
            {
              name: "console.org.switch",
              title: "تبديل المنظمة",
              suggested: Boolean(sync.data.console_state.activeOrgName),
              slashName: "org",
              slashAliases: ["orgs", "switch-org"],
              run: () => {
                dialog.replace(() => <DialogConsoleOrg />)
              },
              category: "المزوّد",
            },
          ]
        : []),
      {
        name: "opencode.status",
        title: "عرض الحالة",
        slashName: "status",
        run: () => {
          dialog.replace(() => <DialogStatus />)
        },
        category: "النظام",
      },
      {
        name: "opencode.debug",
        title: "عرض معلومات التصحيح",
        slashName: "debug",
        run: () => {
          dialog.replace(() => <DialogDebug />)
        },
        category: "النظام",
      },
      {
        name: "theme.switch",
        title: "تبديل السمة",
        slashName: "themes",
        run: () => {
          dialog.replace(() => <DialogThemeList />)
        },
        category: "النظام",
      },
      {
        name: "theme.switch_mode",
        title: mode() === "dark" ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن",
        run: () => {
          setMode(mode() === "dark" ? "light" : "dark")
          dialog.clear()
        },
        category: "النظام",
      },
      {
        name: "theme.mode.lock",
        title: locked() ? "إلغاء قفل وضع السمة" : "قفل وضع السمة",
        run: () => {
          if (locked()) unlock()
          else lock()
          dialog.clear()
        },
        category: "النظام",
      },
      {
        name: "help.show",
        title: "مساعدة",
        slashName: "help",
        run: () => {
          dialog.replace(() => <DialogHelp />)
        },
        category: "النظام",
      },
      {
        name: "docs.open",
        title: "فتح الوثائق",
        run: () => {
          open("https://github.com/abdallhx2/arabcode").catch(() => {})
          dialog.clear()
        },
        category: "النظام",
      },
      {
        name: "app.exit",
        title: "الخروج من التطبيق",
        slashName: "exit",
        slashAliases: ["quit", "q"],
        run: () => exit(),
        category: "النظام",
      },
      {
        name: "app.debug",
        title: "تفعيل/تعطيل لوحة التصحيح",
        category: "النظام",
        run: () => {
          renderer.toggleDebugOverlay()
          dialog.clear()
        },
      },
      {
        name: "app.console",
        title: "تفعيل/تعطيل وحدة التحكم",
        category: "النظام",
        run: () => {
          renderer.console.toggle()
          dialog.clear()
        },
      },
      {
        name: "app.heap_snapshot",
        title: "كتابة لقطة heap",
        category: "النظام",
        run: async () => {
          const files = await props.onSnapshot?.()
          toast.show({
            variant: "info",
            message: `كُتبت لقطة heap في ${files?.join(", ")}`,
            duration: 5000,
          })
          dialog.clear()
        },
      },
      {
        name: "terminal.suspend",
        title: "تعليق الطرفية",
        category: "النظام",
        hidden: true,
        enabled: process.platform !== "win32",
        run: () => {
          renderer.suspend()
          process.once("SIGCONT", () => renderer.resume())
          process.kill(0, "SIGTSTP")
        },
      },
      {
        name: "terminal.title.toggle",
        title: terminalTitleEnabled() ? "تعطيل عنوان الطرفية" : "تفعيل عنوان الطرفية",
        category: "النظام",
        run: () => {
          setTerminalTitleEnabled((prev) => {
            const next = !prev
            kv.set("terminal_title_enabled", next)
            if (!next) renderer.setTerminalTitle("")
            return next
          })
          dialog.clear()
        },
      },
      {
        name: "app.toggle.animations",
        title: kv.get("animations_enabled", true) ? "تعطيل الحركات" : "تفعيل الحركات",
        category: "النظام",
        run: () => {
          kv.set("animations_enabled", !kv.get("animations_enabled", true))
          dialog.clear()
        },
      },
      {
        name: "app.toggle.file_context",
        title: kv.get("file_context_enabled", true) ? "تعطيل سياق الملفات" : "تفعيل سياق الملفات",
        category: "النظام",
        run: () => {
          kv.set("file_context_enabled", !kv.get("file_context_enabled", true))
          dialog.clear()
        },
      },
      {
        name: "app.toggle.diffwrap",
        title: kv.get("diff_wrap_mode", "word") === "word" ? "تعطيل التفاف أسطر التغييرات" : "تفعيل التفاف أسطر التغييرات",
        category: "النظام",
        run: () => {
          const current = kv.get("diff_wrap_mode", "word")
          kv.set("diff_wrap_mode", current === "word" ? "none" : "word")
          dialog.clear()
        },
      },
      {
        name: "app.toggle.paste_summary",
        title: pasteSummaryEnabled() ? "تعطيل ملخص اللصق" : "تفعيل ملخص اللصق",
        category: "النظام",
        run: () => {
          setPasteSummaryEnabled((prev) => {
            const next = !prev
            kv.set("paste_summary_enabled", next)
            return next
          })
          dialog.clear()
        },
      },
      {
        name: "app.toggle.session_directory_filter",
        title: kv.get("session_directory_filter_enabled", true)
          ? "تعطيل تصفية الجلسات حسب المجلد"
          : "تفعيل تصفية الجلسات حسب المجلد",
        category: "النظام",
        run: async () => {
          kv.set("session_directory_filter_enabled", !kv.get("session_directory_filter_enabled", true))
          await sync.session.refresh()
          dialog.clear()
        },
      },
      {
        name: "permission.mode",
        title:
          local.permission.mode === "auto" ? "تعطيل الموافقة التلقائية على الأذونات" : "تفعيل الموافقة التلقائية على الأذونات",
        category: "النظام",
        run: () => {
          local.permission.toggle()
          dialog.clear()
        },
      },
    ].map((command) => ({
      namespace: "palette",
      ...command,
    })),
  )

  useBindings(() => ({
    commands: appCommands(),
  }))

  useBindings(() => ({
    mode: OPENCODE_BASE_MODE,
    bindings: tuiConfig.keybinds.gather("app", appBindingCommands),
  }))

  useBindings(() => ({
    bindings: tuiConfig.keybinds.gather("app.global", appGlobalBindingCommands),
  }))

  useBindings(() => ({
    mode: OPENCODE_BASE_MODE,
    enabled: () => {
      const current = promptRef.current
      if (!current?.focused) return true
      return current.current.input === ""
    },
    bindings: tuiConfig.keybinds.gather("app_exit", ["app.exit"]),
  }))

  event.on("tui.command.execute", (evt, { workspace }) => {
    if (workspace !== project.workspace.current()) return
    keymap.dispatchCommand(evt.properties.command)
  })

  event.on("tui.toast.show", (evt, { workspace }) => {
    if (workspace !== project.workspace.current()) return
    toast.show({
      title: evt.properties.title,
      message: evt.properties.message,
      variant: evt.properties.variant,
      duration: evt.properties.duration,
    })
  })

  event.on("tui.session.select", (evt, { workspace }) => {
    if (workspace !== project.workspace.current()) return
    route.navigate({
      type: "session",
      sessionID: evt.properties.sessionID,
    })
  })

  event.on("session.deleted", (evt) => {
    if (route.data.type === "session" && route.data.sessionID === evt.properties.info.id) {
      route.navigate({ type: "home" })
      toast.show({
        variant: "info",
        message: "حُذفت الجلسة الحالية",
      })
    }
  })

  event.on("session.error", (evt, { workspace }) => {
    if (workspace !== project.workspace.current()) return
    const error = evt.properties.error
    if (error && typeof error === "object" && error.name === "MessageAbortedError") return
    const message = errorMessage(error)

    toast.show({
      variant: "error",
      message,
      duration: 5000,
    })
  })

  event.on("installation.update-available", async (evt) => {
    console.log("installation.update-available", evt)
    const version = evt.properties.version

    const skipped = kv.get("skipped_version")
    if (skipped && !isVersionGreater(version, skipped)) return

    const choice = await DialogConfirm.show(
      dialog,
      `تحديث متاح`,
      `يتوفر إصدار جديد v${version}. هل تريد التحديث الآن؟`,
      "تخطي",
    )

    if (choice === false) {
      kv.set("skipped_version", version)
      return
    }

    if (choice !== true) return

    toast.show({
      variant: "info",
      message: `جارٍ التحديث إلى v${version}...`,
      duration: 30000,
    })

    const result = await sdk.client.global.upgrade({ target: version })

    if (result.error || !result.data?.success) {
      toast.show({
        variant: "error",
        title: "فشل التحديث",
        message: "فشل التحديث",
        duration: 10000,
      })
      return
    }

    await DialogAlert.show(
      dialog,
      "اكتمل التحديث",
      `تم التحديث إلى arabcode v${result.data.version} بنجاح. يرجى إعادة تشغيل التطبيق.`,
    )

    void exit()
  })

  const plugin = createMemo(() => {
    if (!ready()) return
    if (route.data.type !== "plugin") return
    const render = pluginRuntime.routes.get(route.data.id)
    if (!render) return <PluginRouteMissing id={route.data.id} onHome={() => route.navigate({ type: "home" })} />
    return render({ params: route.data.data })
  })

  return (
    <box
      width={dimensions().width}
      height={dimensions().height}
      flexDirection="column"
      backgroundColor={theme.background}
      onMouseDown={(evt) => {
        if (!Flag.OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT) return
        if (evt.button !== MouseButton.RIGHT) return

        if (!Selection.copy(renderer, toast, clipboard)) return
        evt.preventDefault()
        evt.stopPropagation()
      }}
      onMouseUp={
        !Flag.OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT
          ? () => Selection.copy(renderer, toast, clipboard)
          : undefined
      }
    >
      <Show when={Flag.OPENCODE_SHOW_TTFD}>
        <TimeToFirstDraw />
      </Show>
      <Show when={ready()}>
        <box flexGrow={1} minHeight={0} flexDirection="column">
          <Switch>
            <Match when={route.data.type === "home"}>
              <Home />
            </Match>
            <Match when={route.data.type === "session"}>
              <Show when={route.data.type === "session" ? route.data.sessionID : undefined} keyed>
                {(_) => <Session />}
              </Show>
            </Match>
          </Switch>
          {plugin()}
        </box>
        <box flexShrink={0}>
          <pluginRuntime.Slot name="app_bottom" />
        </box>
        <pluginRuntime.Slot name="app" />
      </Show>
      <Show when={!startup.skipInitialLoading}>
        <StartupLoading ready={ready} />
      </Show>
    </box>
  )
}
