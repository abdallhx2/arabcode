import { Argument, Flag } from "effect/unstable/cli"
import { Spec } from "../framework/spec"

declare const OPENCODE_CLI_NAME: string | undefined

export const Commands = Spec.make(typeof OPENCODE_CLI_NAME === "string" ? OPENCODE_CLI_NAME : "arabcode", {
  description: "واجهة سطر الأوامر لمعاينة arabcode 2.0",
  commands: [
    Spec.make("api", {
      description: "إرسال طلب إلى الخادم قيد التشغيل",
      params: {
        request: Argument.string("operation | method path").pipe(
          Argument.withDescription("معرّف عملية OpenAPI، أو طريقة HTTP متبوعة بمسار"),
          Argument.variadic({ min: 1, max: 2 }),
        ),
        data: Flag.string("data").pipe(Flag.withAlias("d"), Flag.withDescription("متن الطلب"), Flag.optional),
        header: Flag.string("header").pipe(
          Flag.withAlias("H"),
          Flag.withDescription("ترويسة الطلب بصيغة name:value"),
          Flag.atMost(100),
        ),
        param: Flag.keyValuePair("param").pipe(Flag.withDescription("مُعامل مسار أو استعلام في OpenAPI"), Flag.optional),
      },
    }),
    Spec.make("debug", {
      description: "أدوات التصحيح واستكشاف الأخطاء",
      commands: [Spec.make("agents", { description: "عرض جميع الوكلاء" })],
    }),
    Spec.make("migrate", { description: "ترحيل بيانات v1 إلى v2" }),
    Spec.make("service", {
      description: "إدارة خادم الخلفية",
      commands: [
        Spec.make("start", { description: "تشغيل خادم الخلفية" }),
        Spec.make("restart", { description: "إعادة تشغيل خادم الخلفية" }),
        Spec.make("status", { description: "عرض حالة خادم الخلفية" }),
        Spec.make("stop", { description: "إيقاف خادم الخلفية" }),
        Spec.make("password", {
          description: "عرض كلمة مرور الخادم أو تعيينها",
          params: { value: Argument.string("value").pipe(Argument.optional) },
        }),
      ],
    }),
    Spec.make("serve", {
      description: "تشغيل خادم API للإصدار v2",
      params: {
        hostname: Flag.string("hostname").pipe(Flag.withDefault("127.0.0.1")),
        port: Flag.integer("port").pipe(Flag.optional),
        register: Flag.boolean("register").pipe(Flag.withDefault(false)),
      },
    }),
  ],
})
