export * as PublicEventManifest from "./public-event-manifest"

import { Event } from "@arabcode/schema/event"
import { EventManifest } from "@arabcode/schema/event-manifest"

export const Definitions = EventManifest.ServerDefinitions
export const Latest = Event.latest(Definitions)
