import { AgentV2 } from "@arabcode/core/agent"
import { AISDK } from "@arabcode/core/aisdk"
import { Catalog } from "@arabcode/core/catalog"
import { CommandV2 } from "@arabcode/core/command"
import { Credential } from "@arabcode/core/credential"
import { AppNodeBuilder } from "@arabcode/core/effect/app-node-builder"
import { LayerNodePlatform } from "@arabcode/core/effect/app-node-platform"
import { LayerNode } from "@arabcode/core/effect/layer-node"
import { EventV2 } from "@arabcode/core/event"
import { FileSystem } from "@arabcode/core/filesystem"
import { FSUtil } from "@arabcode/core/fs-util"
import { Integration } from "@arabcode/core/integration"
import { Location } from "@arabcode/core/location"
import { Npm } from "@arabcode/core/npm"
import { PluginV2 } from "@arabcode/core/plugin"
import { Reference } from "@arabcode/core/reference"
import { SkillV2 } from "@arabcode/core/skill"
import { Effect, Layer } from "effect"
import { tempLocationLayer } from "../fixture/location"

const npmLayer = Layer.succeed(
  Npm.Service,
  Npm.Service.of({
    add: () => Effect.succeed({ directory: "", entrypoint: undefined }),
    install: () => Effect.void,
    which: () => Effect.succeed(undefined),
  }),
)

export const PluginTestLayer = AppNodeBuilder.build(
  LayerNode.group([
    FileSystem.node,
    FSUtil.node,
    Location.node,
    Npm.node,
    Credential.node,
    EventV2.node,
    LayerNodePlatform.httpClient,
    PluginV2.node,
    AgentV2.node,
    AISDK.node,
    Catalog.node,
    CommandV2.node,
    Integration.node,
    Reference.node,
    SkillV2.node,
  ]),
  [
    [Location.node, tempLocationLayer],
    [Npm.node, npmLayer],
  ],
)
