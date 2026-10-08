/**
 * `prompt-updated-notify` consumer — tells owners of a prompt that a new version exists.
 *
 * Audience: users in the "buyers" segment for whom `entitlements.canAccess(user, prompt)` is true
 * (the contract has no "owners of prompt X" query yet — requested in the report; this is O(buyers)).
 * Idempotency: checkpoint key `prompt_update:<promptId>@<version>`; finished runs are skipped.
 */
import type {
  CatalogService,
  Config,
  EntitlementService,
  Locale,
  Logger,
  PromptDetail,
  SettingsService,
  UserService,
} from "@rasa/shared";
import type { Clock, Messengers } from "../deps";
import { msg } from "../i18n";
import { deepLink } from "../messenger";
import type { PromptUpdatedPayload } from "../public";
import { faNum, notifyAdmins } from "../util";
import { fanout } from "./fanout";

export interface PromptUpdatedDeps {
  config: Config;
  logger: Logger;
  clock: Clock;
  messengers: Messengers;
  users: UserService;
  settings: SettingsService;
  catalog: CatalogService;
  entitlements: EntitlementService;
}

export async function runPromptUpdatedNotify(
  deps: PromptUpdatedDeps,
  payload: PromptUpdatedPayload,
) {
  const log = deps.logger.child({
    job: "prompt-updated-notify",
    promptId: payload.promptId,
    version: payload.version,
  });
  if (!payload?.promptId || !payload.version) throw new Error("promptId and version are required");

  const detailCache = new Map<Locale, PromptDetail | null>();
  const getDetail = async (locale: Locale) => {
    if (!detailCache.has(locale))
      detailCache.set(locale, await deps.catalog.getPrompt(payload.promptId, locale));
    return detailCache.get(locale) ?? null;
  };
  if (!(await getDetail("fa"))) {
    log.warn("prompt not found — nothing to notify");
    return null;
  }
  const usernames = new Map<string, string>();

  const result = await fanout(deps, {
    checkpointKey: `prompt_update:${payload.promptId}@${payload.version}`,
    audience: deps.users.iterateAudience({ segment: "buyers" }, 500),
    render: async (user) => {
      if (!(await deps.entitlements.canAccess(user.id, payload.promptId))) return null;
      const detail = (await getDetail(user.locale)) ?? (await getDetail("fa"));
      if (!detail) return null;
      const m = deps.messengers[user.platform];
      if (!m) return null;
      let username = usernames.get(user.platform);
      if (!username) {
        username = await m.botUsername();
        usernames.set(user.platform, username);
      }
      return {
        text: msg("promptUpdated", user.locale, { title: detail.title, version: payload.version }),
        opts: {
          buttons: [
            [
              {
                text: msg("openPrompt", user.locale),
                url: deepLink(user.platform, username, `p_${payload.promptId}`),
              },
            ],
          ],
        },
      };
    },
  });
  if (!result.alreadyDone) {
    log.info(result, "prompt update notifications sent");
    const title = (await getDetail("fa"))?.title ?? payload.promptId;
    await notifyAdmins(
      deps,
      `🔁 اطلاع‌رسانی نسخه‌ی ${payload.version} «${title}» به ${faNum(result.sent)} خریدار ارسال شد.`,
    );
  }
  return result;
}
