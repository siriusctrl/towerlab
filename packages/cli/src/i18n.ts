import type {
  BlessingDefinition,
  CardDefinition,
  CardInstance,
  CardKeyword,
  PassiveEffect,
  PassiveEffectKind,
  CombatObservation,
  EnemyIntent,
  LogEffect,
  LogEvent,
  ObservedEnemy,
  Observation,
  ResolvedCard,
  RewardObservation,
  RelicDefinition,
  RestObservation,
  RestOption,
  RunContent,
  ShopObservation,
} from "@towerlab/core";

import {
  cardKeywords,
  cardNames,
  characterNames,
  characterSummaries,
  enemyNames,
  intentDescriptions,
  localeText,
  nodeNames,
  relicDescriptions,
  relicNames,
  restOptionDescriptions,
  restOptionLabels,
  type Dictionary,
  type Locale,
} from "./dictionaries.js";

export type { Locale } from "./dictionaries.js";

export const SUPPORTED_LOCALES = ["en", "zh"] as const;

export const DEFAULT_LOCALE: Locale = "en";

export function readLocale(args: string[]): Locale {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg !== "--lang" && arg !== "--locale") {
      continue;
    }

    const value = args[index + 1];

    if (!value) {
      throw new Error(`${arg} requires a value`);
    }

    if (isLocale(value)) {
      return value;
    }

    throw new Error(`${arg} must be one of ${SUPPORTED_LOCALES.join(", ")}`);
  }

  return DEFAULT_LOCALE;
}

export function localizeObservation(
  observation: Observation,
  locale: Locale,
  content: RunContent | null = null,
): Observation {
  if (locale === "en") {
    return observation;
  }

  const relics = observation.relics.map((relic) => localizeRelicDefinition(relic, locale));

  if (observation.phase === "combat") {
    const combatObservation: CombatObservation = observation;

    return {
      ...combatObservation,
      relics,
      hand: localizeObservedCards(combatObservation.hand as CardLike[], locale, content),
      enemy: {
        ...combatObservation.enemy,
        name: localizeEnemyName(combatObservation.enemy.name, locale),
        intent: localizeIntent(combatObservation.enemy.intent, locale),
      },
    };
  }

  if (observation.phase === "rest") {
    const restObservation: RestObservation = observation;

    return {
      ...restObservation,
      relics,
      restOptions: restObservation.restOptions.map((option) => localizeRestOption(option, locale)),
      upgradableDeckCards: restObservation.upgradableDeckCards.map((entry) => ({
        ...entry,
        card: localizeCardDefinition(entry.card as CardLike, locale, content),
        upgradedCard: localizeCardDefinition(entry.upgradedCard as CardLike, locale, content),
      })),
    };
  }

  if (observation.phase === "reward") {
    const rewardObservation: RewardObservation = observation;

    return {
      ...rewardObservation,
      relics,
      rewardItems: rewardObservation.rewardItems.map((item) => {
        if (item.kind === "gold") {
          return item;
        }

        if (item.kind === "relic") {
          return {
            ...item,
            relic: localizeRelicDefinition(item.relic, locale),
          };
        }

        return {
          ...item,
          cardChoices: localizeObservedCards(item.cardChoices as (string | CardLike)[], locale, content),
        };
      }),
      cardChoices: localizeObservedCards(rewardObservation.cardChoices as (string | CardLike)[], locale, content),
    };
  }

  if (observation.phase === "shop") {
    const shopObservation: ShopObservation = observation;

    return {
      ...shopObservation,
      relics,
      forSale: shopObservation.forSale.map((offer) => ({
        ...offer,
        card: localizeCardDefinition(offer.card as CardLike, locale, content),
      })),
      removableDeckCards: shopObservation.removableDeckCards.map((entry) => ({
        ...entry,
        card: localizeCardDefinition(entry.card as CardLike, locale, content),
      })),
    };
  }

  return {
    ...observation,
    relics,
  };
}

export function formatLogEntries(content: RunContent, log: LogEvent[], locale: Locale): string[] {
  return log.map((event) => formatLogEvent(content, event, locale));
}

export function formatLogEvent(content: RunContent, event: LogEvent, locale: Locale): string {
  switch (event.type) {
    case "actStarted":
      return locale === "zh" ? `进入第 ${event.act} 层。新的祝福在等待。` : `Entered act ${event.act}. New blessings await.`;
    case "enteredNode":
      return locale === "zh"
        ? `进入 ${localizeNodeName(event.nodeId, locale)}（${localizeNodeKind(event.kind, locale)}）。`
        : `Entered ${localizeNodeName(event.nodeId, locale)} (${event.kind}).`;
    case "movedToNode":
      return locale === "zh"
        ? `前往 ${localizeNodeName(event.nodeId, locale)}（${localizeNodeKind(event.kind, locale)}）。`
        : `Moved to ${localizeNodeName(event.nodeId, locale)} (${event.kind}).`;
    case "atEntrance":
      return locale === "zh" ? "来到入口。请选择第一条路径。" : "At the entrance. Choose the first path.";
    case "blessingChosen":
      return locale === "zh"
        ? `接受祝福：${formatBlessingName(content, readBlessing(content, event.blessingId), locale)}。`
        : `Accepted blessing: ${formatBlessingName(content, readBlessing(content, event.blessingId), locale)}.`;
    case "goldGained":
      return locale === "zh" ? `获得 ${event.amount} 金币。` : `Gained ${event.amount} gold.`;
    case "enemyAppeared": {
      const enemyName = readEnemyName(content, event.enemyId);
      return locale === "zh"
        ? `${localizeEnemyName(enemyName, locale)}出现。意图：${localizeIntentDescription(event.intent.description, locale)}。`
        : `${enemyName} appears. Intent: ${event.intent.description}.`;
    }
    case "playedCard": {
      const cardName = readCardName(content, event.cardId);
      const displayName = event.upgraded ? `${cardName}+` : cardName;
      const effects = formatLogEffects(event.effects, locale);

      if (effects.length === 0) {
        return locale === "zh" ? `打出${localizeCardName(displayName, locale)}。` : `Played ${displayName}.`;
      }

      return locale === "zh"
        ? `打出${localizeCardName(displayName, locale)}：${effects.join("，")}。`
        : `Played ${displayName}: ${effects.join(", ")}.`;
    }
    case "enemyDefeated": {
      const enemyName = readEnemyName(content, event.enemyId);
      return locale === "zh"
        ? `击败${localizeEnemyName(enemyName, locale)}。奖励中包含 ${event.gold} 金币。`
        : `Defeated ${enemyName}. Rewards include ${event.gold} gold.`;
    }
    case "rewardOffered":
      return locale === "zh" ? "获得奖励。请选择要领取的奖励，或跳过剩余奖励。" : "Won a reward. Claim rewards or skip the rest.";
    case "rewardCardAdded": {
      const cardName = readCardName(content, event.cardId);
      return locale === "zh"
        ? `将${localizeCardName(cardName, locale)}加入牌组。`
        : `Added ${cardName} to deck.`;
    }
    case "blessingCardAdded": {
      const cardName = readCardName(content, event.cardId);
      return locale === "zh"
        ? `祝福将${localizeCardName(cardName, locale)}加入牌组。`
        : `Blessing added ${cardName} to deck.`;
    }
    case "cardUpgraded": {
      const cardName = readCardName(content, event.cardId);
      return locale === "zh"
        ? `将${localizeCardName(cardName, locale)}强化为${localizeCardName(`${cardName}+`, locale)}。`
        : `Upgraded ${cardName} to ${cardName}+.`;
    }
    case "rewardSkipped":
      return locale === "zh" ? "跳过奖励。" : "Skipped reward.";
    case "chooseNextPath":
      return locale === "zh" ? "请选择下一条路径。" : "Choose the next path.";
    case "chooseCampfire":
      return locale === "zh" ? "请选择如何使用营火。" : "Choose how to use the campfire.";
    case "recoveredHp":
      return locale === "zh" ? `恢复 ${event.amount} 点生命。` : `Recovered ${event.amount} HP.`;
    case "shopEntered":
      return locale === "zh" ? "你发现了一间商店。看看有哪些货物。" : "You found a shop. Browse the offers.";
    case "shopCardBought": {
      const cardName = readCardName(content, event.cardId);
      return locale === "zh"
        ? `购买${localizeCardName(cardName, locale)}，花费 ${event.gold} 金币。`
        : `Bought ${cardName} for ${event.gold} gold.`;
    }
    case "deckCardRemoved": {
      const cardName = event.upgraded ? `${readCardName(content, event.cardId)}+` : readCardName(content, event.cardId);
      return locale === "zh"
        ? `从牌组移除${localizeCardName(cardName, locale)}，花费 ${event.gold} 金币。`
        : `Removed ${cardName} from deck for ${event.gold} gold.`;
    }
    case "shopLeft":
      return locale === "zh" ? "离开商店。" : "Left the shop.";
    case "relicAlreadyOwned": {
      const relicName = readRelicName(content, event.relicId);
      return locale === "zh"
        ? `遗物${localizeRelicName(relicName, locale)}已经获得过。`
        : `Relic ${relicName} already acquired.`;
    }
    case "relicAcquired": {
      const relicName = readRelicName(content, event.relicId);
      return locale === "zh"
        ? `获得遗物${localizeRelicName(relicName, locale)}。`
        : `Acquired relic ${relicName}.`;
    }
    case "enemyUsedIntent": {
      const enemyName = readEnemyName(content, event.enemyId);
      return locale === "zh"
        ? `${localizeEnemyName(enemyName, locale)}使用了${localizeIntentDescription(event.intent.description, locale)}。`
        : `${enemyName} uses ${event.intent.description}.`;
    }
    case "playerDefeated":
      return locale === "zh" ? "你被击败了。" : "You were defeated.";
    case "turnStarted":
      return locale === "zh"
        ? `第 ${event.turn} 回合。意图：${localizeIntentDescription(event.intent.description, locale)}。`
        : `Turn ${event.turn}. Intent: ${event.intent.description}.`;
    case "bossCleared":
      return locale === "zh" ? "首领倒下了。高塔已被攻克。" : "The boss falls. The tower is clear.";
    case "pathVictory":
      return locale === "zh" ? "道路的尽头是胜利。" : "The path ends in victory.";
    case "climbEnded":
      return locale === "zh" ? "你的攀登到此结束。" : "Your climb ends here.";
  }

  return locale === "zh" ? "未知事件。" : "Unknown event.";
}

export function text(locale: Locale, key: keyof typeof localeText.en): string {
  return localeText[locale][key];
}

export function formatText(
  locale: Locale,
  key: keyof typeof localeText.en,
  replacements: Record<string, string | number>,
): string {
  let value = text(locale, key);

  for (const [placeholder, replacement] of Object.entries(replacements)) {
    value = value.split(`{${placeholder}}`).join(String(replacement));
  }

  return value;
}

const nodeKindKeys: Record<string, keyof typeof localeText.en> = {
  battle: "battle",
  elite: "elite",
  rest: "rest",
  shop: "shop",
  boss: "boss",
  start: "start",
};

export function localizeNodeKind(kind: string, locale: Locale): string {
  if (locale === "en") {
    return kind;
  }

  const key = nodeKindKeys[kind];
  return key ? text(locale, key) : kind;
}

export function localizeNodeName(nodeId: string, locale: Locale): string {
  const names = nodeNames[locale] as Dictionary;
  if (names[nodeId]) {
    return names[nodeId];
  }

  const generated = nodeId.match(/^(?:act(\d+)-)?(start|battle|elite|rest|shop|boss)-r(\d+)(?:-p(\d+))?$/u);
  if (generated) {
    const [, , kind, row, position] = generated;
    if (kind === "start") {
      return locale === "zh" ? "岔路口" : "Crossroads";
    }
    if (kind === "boss") {
      return locale === "zh" ? "顶峰" : "Summit";
    }

    const suffix = `${Number(row)}-${Number(position ?? "1")}`;
    return locale === "zh" ? `房间 ${suffix}` : `Room ${suffix}`;
  }

  return nodeId;
}

export function localizeCharacterName(characterId: string, locale: Locale): string {
  const names = characterNames[locale] as Dictionary;
  return names[characterId] ?? characterId;
}

export function localizeCharacterSummary(characterId: string, locale: Locale): string {
  const summaries = characterSummaries[locale] as Dictionary;
  return summaries[characterId] ?? characterId;
}

export function formatNodeLabel(
  node: { id: string; kind: string },
  locale: Locale,
): string {
  return `${localizeNodeName(node.id, locale)} (${localizeNodeKind(node.kind, locale)})`;
}

export function formatBlessingName(content: RunContent, blessing: BlessingDefinition, locale: Locale): string {
  if (blessing.kind === "relic" && blessing.relicId) {
    return localizeRelicDefinition(content.relics[blessing.relicId]!, locale).name;
  }

  const localizedCard = blessing.cardId
    ? localizeCardDefinition({ id: blessing.cardId, upgraded: blessing.upgraded }, locale, content)
    : null;
  return localizedCard?.name ?? text(locale, "reward");
}

export function formatBlessingDescription(content: RunContent, blessing: BlessingDefinition, locale: Locale): string {
  if (blessing.kind === "relic" && blessing.relicId) {
    return localizeRelicDefinition(content.relics[blessing.relicId]!, locale).description;
  }

  if (!blessing.cardId) {
    return "";
  }

  const resolvedCard = resolveCardDefinition({ id: blessing.cardId, upgraded: blessing.upgraded }, content);
  return formatStructuredDescription(resolvedCard, locale);
}

export function formatBlessingAcquisition(blessing: BlessingDefinition, locale: Locale): string | null {
  if (blessing.kind === "card") {
    return text(locale, "blessingGainToDeck");
  }

  if (blessing.kind === "relic") {
    return text(locale, "blessingGainRelic");
  }

  return null;
}

const nodeKindBadges: Record<Locale, Record<string, string>> = {
  en: { battle: "F", elite: "E", rest: "R", shop: "$", boss: "B", start: "S" },
  zh: { battle: "战", elite: "精", rest: "营", shop: "商", boss: "首", start: "始" },
};

export function localizeNodeKindBadge(kind: string, locale: Locale): string {
  return nodeKindBadges[locale][kind] ?? kind.slice(0, 1).toUpperCase();
}

const phaseLabelKeys: Record<string, keyof typeof localeText.en> = {
  blessing: "blessing",
  combat: "combat",
  map: "map",
  rest: "rest",
  reward: "reward",
  shop: "shop",
  victory: "victory",
  defeat: "defeat",
};

export function localizePhaseLabel(phase: Observation["phase"], locale: Locale): string {
  const key = phaseLabelKeys[phase];
  return key ? text(locale, key) : text(locale, "defeat");
}

export function localizeErrorMessage(message: string, locale: Locale): string {
  if (locale === "en") {
    return message;
  }

  const patterns: Array<[RegExp, (...groups: string[]) => string]> = [
    [/^(--[a-z-]+) requires a value$/, (flag) => `${flag} 需要提供一个值`],
    [/^hand index (\d+) is not available$/, (index) => `手牌索引 ${index} 不可用`],
    [/^reward index (\d+) is not available$/, (index) => `奖励索引 ${index} 不可用`],
    [/^shop card index (\d+) is not available$/, (index) => `商店卡牌索引 ${index} 不可用`],
    [/^deck index (\d+) is not available$/, (index) => `牌库索引 ${index} 不可用`],
    [/^node (.+) is not reachable from (.+)$/, (nodeId, fromNode) => `节点 ${localizeNodeName(nodeId, locale)} 无法从 ${localizeNodeName(fromNode, locale)} 到达`],
    [/^Need (\d+) gold to buy (.+)$/, (gold, cardName) => `需要 ${gold} 金币才能购买${localizeCardName(cardName, locale)}`],
    [/^Need (\d+) gold to remove (.+)$/, (gold, cardName) => `需要 ${gold} 金币才能移除${localizeCardName(cardName, locale)}`],
    [/^(.+) costs (\d+) energy$/, (cardName, cost) => `${localizeCardName(cardName, locale)} 需要 ${cost} 点能量`],
    [/^blessings are only available at the start of an act$/, () => "只有在每层开始时才能选择祝福"],
    [/^path choices are only available on the map$/, () => "只有在地图阶段才能选择路径"],
    [/^cards can only be played during combat$/, () => "只有在战斗阶段才能打出卡牌"],
    [/^ending the turn is only available during combat$/, () => "只有在战斗阶段才能结束回合"],
    [/^rest options are only available at rest nodes$/, () => "只有在营火节点才能选择营火行动"],
    [/^card upgrades are only available after choosing upgrade at a campfire$/, () => "只有在选择强化后才能在营火强化卡牌"],
    [/^no upgradable cards remain in the deck$/, () => "当前牌组里没有可强化的卡牌"],
    [/^reward choices are only available after combat$/, () => "只有在战斗后才能选择奖励"],
    [/^reward items can only be claimed from the reward menu$/, () => "只有在奖励菜单中才能领取奖励"],
    [/^card rewards can only be chosen from the card reward menu$/, () => "只有在卡牌奖励菜单中才能选择卡牌"],
    [/^can only go back while choosing a card reward$/, () => "只有在选择卡牌奖励时才能返回"],
    [/^card reward is not available$/, () => "当前没有可选的卡牌奖励"],
    [/^shop actions are only available at shop nodes$/, () => "只有在商店节点才能执行商店行动"],
    [/^deck removal is only available at shop nodes$/, () => "只有在商店节点才能移除卡牌"],
    [/^can only leave when in shop$/, () => "只有在商店中才能离开商店"],
    [/^Unknown option: (.+)$/, (arg) => `未知参数：${arg}`],
    [/^Unknown positional argument: (.+)$/, (arg) => `未知的位置参数：${arg}`],
    [/^Invalid JSON action: (.+)$/, (raw) => `动作 JSON 非法：${raw}`],
    [/^Invalid action shape: (.+)$/, (raw) => `动作结构非法：${raw}`],
    [/^Invalid chooseBlessing action: (.+)$/, (raw) => `chooseBlessing 动作非法：${raw}`],
    [/^Invalid choosePath action: (.+)$/, (raw) => `choosePath 动作非法：${raw}`],
    [/^Invalid playCard action: (.+)$/, (raw) => `playCard 动作非法：${raw}`],
    [/^Invalid chooseRest action: (.+)$/, (raw) => `chooseRest 动作非法：${raw}`],
    [/^Invalid upgradeRestCard action: (.+)$/, (raw) => `upgradeRestCard 动作非法：${raw}`],
    [/^Invalid takeReward action: (.+)$/, (raw) => `takeReward 动作非法：${raw}`],
    [/^Invalid takeRewardCard action: (.+)$/, (raw) => `takeRewardCard 动作非法：${raw}`],
    [/^Invalid buyShop action: (.+)$/, (raw) => `buyShop 动作非法：${raw}`],
    [/^Invalid removeDeckCard action: (.+)$/, (raw) => `removeDeckCard 动作非法：${raw}`],
    [/^Unsupported action type: (.+)$/, (actionType) => `不支持的动作类型：${actionType}`],
    [/^Invalid JSON action list: (.+)$/, (raw) => `动作列表 JSON 非法：${raw}`],
    [/^--actions must be a JSON array$/, () => "--actions 必须是 JSON 数组"],
    [/^--seeds must contain at least one integer$/, () => "--seeds 至少需要包含一个整数"],
    [/^--seeds must be a comma-separated list of integers$/, () => "--seeds 必须是以逗号分隔的整数列表"],
    [/^--seed-start and --count must be provided together$/, () => "--seed-start 和 --count 必须一起提供"],
    [/^create mode does not accept actions$/, () => "create 模式不接受 actions"],
    [/^batch mode does not accept actions$/, () => "batch 模式不接受 actions"],
    [/^--policy, --seeds, --seed-start, and --count are only valid in batch mode$/, () => "--policy、--seeds、--seed-start 和 --count 只能用于 batch 模式"],
    [/^(observe|replay) mode does not accept --action$/, (mode) => `${mode} 模式不接受 --action`],
    [/^batch mode requires --policy$/, () => "batch 模式需要提供 --policy"],
    [/^batch mode requires --seeds or --seed-start with --count$/, () => "batch 模式需要提供 --seeds，或同时提供 --seed-start 和 --count"],
    [/^step mode requires --action$/, () => "step 模式需要提供 --action"],
    [/^--seed must be an integer$/, () => "--seed 必须是整数"],
    [/^--seed-start must be an integer$/, () => "--seed-start 必须是整数"],
    [/^--count must be an integer$/, () => "--count 必须是整数"],
    [/^--count must be a positive integer$/, () => "--count 必须是正整数"],
    [/^--policy must be one of (.+)$/, (choices) => `--policy 必须是以下之一：${choices}`],
    [/^--character must be one of (.+)$/, (choices) => `--character 必须是以下之一：${choices}`],
    [/^--lang must be one of (.+)$/, (choices) => `--lang 必须是以下之一：${choices}`],
    [/^--locale must be one of (.+)$/, (choices) => `--locale 必须是以下之一：${choices}`],
    [/^headless mode requires --character$/, () => "headless 模式需要提供 --character"],
    [/^unknown character: (.+)$/, (characterId) => `未知角色：${characterId}`],
    [/^unknown error$/, () => "未知错误"],
  ];

  for (const [pattern, formatter] of patterns) {
    const match = message.match(pattern);

    if (match) {
      return formatter(...match.slice(1));
    }
  }

  return message;
}

function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export interface CliCardDefinition extends ResolvedCard {
  baseCardId?: string;
  keywords?: CardKeyword[];
}

export type CardLike =
  | CardDefinition
  | ResolvedCard
  | CardInstance
  | {
      id: string;
      name?: string;
      baseCardId?: string;
      upgraded?: boolean;
      cost?: number;
      description?: string;
      keywords?: CardKeyword[];
      damage?: number;
      block?: number;
      draw?: number;
      energy?: number;
      heal?: number;
      weak?: number;
      vulnerable?: number;
      poison?: number;
      poisonMultiplier?: number;
      passives?: PassiveEffect[];
      exhaust?: boolean;
      retain?: boolean;
    };

export function localizeCardDefinition(
  card: CardLike,
  locale: Locale,
  content: RunContent | null = null,
): CliCardDefinition {
  const resolved = resolveCardDefinition(card, content);

  const localizedName = locale === "en" ? resolved.name : localizeCardName(resolved.name, locale);
  const suffixName = resolved.upgraded && !/[+＋]$/.test(localizedName) ? `${localizedName}+` : localizedName;
  const localizedDescription = formatStructuredDescription(resolved, locale);

  return {
    ...resolved,
    upgraded: resolved.upgraded,
    name: suffixName,
    description: localizedDescription,
    keywords: resolveCardKeywords(resolved),
    cost: resolved.cost,
  };
}

export function formatCardEffectLines(card: CliCardDefinition, locale: Locale): string[] {
  const structuredLines = buildStructuredEffectLines(card, locale);
  const fallbackLines = buildFallbackEffectLines(card.description, locale);
  if (fallbackLines.length === 0) {
    return structuredLines;
  }

  if (structuredLines.length === 0) {
    return fallbackLines;
  }

  const structuredSignatures = new Set(
    structuredLines.flatMap((line) => [
      normalizeComparableText(line),
      ...buildFallbackEffectLines(line, locale).map((clause) => normalizeComparableText(clause)),
    ]),
  );
  const keywordSignatures = new Set(
    (card.keywords ?? []).map((keyword) => normalizeComparableText(localizeCardKeyword(keyword, locale))),
  );
  const deduplicatedFallback: string[] = [];

  for (const fallbackLine of fallbackLines) {
    const normalizedFallback = normalizeComparableText(fallbackLine);
    if (!normalizedFallback) {
      continue;
    }

    if (structuredSignatures.has(normalizedFallback)) {
      continue;
    }

    if (keywordSignatures.has(normalizedFallback)) {
      continue;
    }

    deduplicatedFallback.push(fallbackLine);
  }

  if (deduplicatedFallback.length > 0) {
    return [...structuredLines, ...deduplicatedFallback];
  }

  return structuredLines;
}

function buildStructuredEffectLines(card: CliCardDefinition, locale: Locale): string[] {
  const sentences: string[] = [];

  if (card.damage != null && card.damage !== 0) {
    sentences.push(locale === "zh" ? `造成 ${card.damage} 点伤害。` : `Deal ${card.damage} damage.`);
  }

  if (card.block != null && card.block !== 0) {
    sentences.push(locale === "zh" ? `获得 ${card.block} 点格挡。` : `Gain ${card.block} block.`);
  }

  if (card.draw != null && card.draw !== 0) {
    sentences.push(locale === "zh" ? `抽 ${card.draw} 张牌。` : `Draw ${card.draw} card${card.draw === 1 ? "" : "s"}.`);
  }

  if (card.energy != null && card.energy !== 0) {
    sentences.push(locale === "zh" ? `获得 ${card.energy} 点能量。` : `Gain ${card.energy} energy.`);
  }

  if (card.heal != null && card.heal !== 0) {
    sentences.push(locale === "zh" ? `恢复 ${card.heal} 点生命。` : `Recover ${card.heal} HP.`);
  }

  if (card.weak != null && card.weak !== 0) {
    sentences.push(locale === "zh" ? `施加 ${card.weak} 层虚弱。` : `Apply ${card.weak} Weak.`);
  }

  if (card.vulnerable != null && card.vulnerable !== 0) {
    sentences.push(locale === "zh" ? `施加 ${card.vulnerable} 层易伤。` : `Apply ${card.vulnerable} Vulnerable.`);
  }

  if (card.poison != null && card.poison !== 0) {
    sentences.push(locale === "zh" ? `施加 ${card.poison} 层中毒。` : `Apply ${card.poison} Poison.`);
  }

  if (card.poisonMultiplier != null && card.poisonMultiplier !== 1) {
    sentences.push(locale === "zh" ? "将中毒层数翻倍。" : "Multiply Poison by 2.");
  }

  if (card.passives?.length) {
    sentences.push(...card.passives.map((passive) => formatPassiveEffect(passive, locale)));
  }

  if (sentences.length === 0) {
    return [];
  }

  return [sentences.join(locale === "zh" ? "" : " ")];
}

function buildFallbackEffectLines(description: string, locale: Locale): string[] {
  if (!description) {
    return [];
  }

  const clauses = description
    .split(/[.!?。！？；;]+/u)
    .map((clause) => clause.trim())
    .filter(Boolean);

  if (clauses.length === 0) {
    return [];
  }

  if (locale === "en") {
    return clauses.map((clause) => `${clause}.`);
  }

  return clauses.map(translateEnglishClauseToChinese);
}

function translateEnglishClauseToChinese(clause: string): string {
  const normalized = clause.replace(/\s+/gu, " ").trim();

  const patterns: Array<[RegExp, (value: string) => string]> = [
    [/^Deal (\d+) damage$/iu, (value) => `造成 ${value} 点伤害。`],
    [/^Gain (\d+) block$/iu, (value) => `获得 ${value} 点格挡。`],
    [/^Draw (\d+) card[s]?$/iu, (value) => `抽 ${value} 张牌。`],
    [/^Gain (\d+) energy$/iu, (value) => `获得 ${value} 点能量。`],
    [/^Recover (\d+) HP$/iu, (value) => `恢复 ${value} 点生命。`],
    [/^Apply (\d+) Weak$/iu, (value) => `施加 ${value} 层虚弱。`],
    [/^Apply (\d+) Vulnerable$/iu, (value) => `施加 ${value} 层易伤。`],
    [/^Apply (\d+) Poison$/iu, (value) => `施加 ${value} 层中毒。`],
    [/^Multiply Poison by 2$/iu, () => "将中毒层数翻倍。"],
    [/^Your block is not removed at end of turn this combat$/iu, () => "本场战斗中，你的格挡不会在回合结束时失去。"],
    [/^Your Strike cards deal (\d+) more damage this combat$/iu, (value) => `本场战斗中，你的打击牌额外造成 ${value} 点伤害。`],
    [/^Whenever you exhaust a card this combat, gain (\d+) block$/iu, (value) => `本场战斗中，每当你消耗一张牌，获得 ${value} 点格挡。`],
    [/^Your attacks apply (\d+) Poison this combat$/iu, (value) => `本场战斗中，你的攻击额外施加 ${value} 层中毒。`],
    [/^Your attacks deal (\d+) more damage to debuffed enemies this combat$/iu, (value) => `本场战斗中，你对带减益的敌人额外造成 ${value} 点伤害。`],
    [/^Whenever you apply Weak, Vulnerable, or Poison this combat, draw (\d+) card[s]?$/iu, (value) => `本场战斗中，每当你施加虚弱、易伤或中毒，抽 ${value} 张牌。`],
    [/^Exhaust$/iu, () => "消耗。"],
    [/^Retain$/iu, () => "保留。"],
    [/^Ethereal$/iu, () => "虚无。"],
  ];

  for (const [pattern, render] of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return render(match[1] ?? "");
    }
  }

  return `${normalized}。`;
}

export function localizeObservedCards<T extends readonly (string | CardLike)[]>(
  cards: T,
  locale: Locale,
  content: RunContent | null,
): CliCardDefinition[] {
  return cards.map((card) => localizeCardDefinition(typeof card === "string" ? { id: card } : card, locale, content));
}

export function localizeCardKeyword(keyword: CardKeyword, locale: Locale): string {
  return cardKeywords[locale][keyword] ?? keyword;
}

export function formatPassiveEffect(passive: PassiveEffect, locale: Locale): string {
  if (passive.kind === "retainBlock") {
    return locale === "zh" ? "本场战斗中，你的格挡不会在回合结束时失去。" : "Your block is not removed at end of turn this combat.";
  }

  if (passive.kind === "strikeBonusDamage") {
    return locale === "zh" ? `本场战斗中，你的打击牌额外造成 ${passive.value} 点伤害。` : `Your Strike cards deal ${passive.value} more damage this combat.`;
  }

  if (passive.kind === "exhaustBlock") {
    return locale === "zh" ? `本场战斗中，每当你消耗一张牌，获得 ${passive.value} 点格挡。` : `Whenever you exhaust a card this combat, gain ${passive.value} block.`;
  }

  if (passive.kind === "attackPoison") {
    return locale === "zh" ? `本场战斗中，你的攻击额外施加 ${passive.value} 层中毒。` : `Your attacks apply ${passive.value} Poison this combat.`;
  }

  if (passive.kind === "debuffBonusDamage") {
    return locale === "zh" ? `本场战斗中，你对带减益的敌人额外造成 ${passive.value} 点伤害。` : `Your attacks deal ${passive.value} more damage to debuffed enemies this combat.`;
  }

  if (passive.kind === "debuffDraw") {
    return locale === "zh" ? `本场战斗中，每当你施加虚弱、易伤或中毒，抽 ${passive.value} 张牌。` : `Whenever you apply Weak, Vulnerable, or Poison this combat, draw ${passive.value} card${passive.value === 1 ? "" : "s"}.`;
  }

  return locale === "zh" ? `${passive.kind} ${passive.value}` : `${passive.kind} ${passive.value}`;
}

export function formatPassiveEffects(passives: PassiveEffect[], locale: Locale): string {
  return passives.map((passive) => formatPassiveEffect(passive, locale)).join(locale === "zh" ? "" : " ");
}

export function formatCombatStatus(status: { weak: number; vulnerable: number; poison: number }, locale: Locale): string | null {
  const parts: string[] = [];

  if (status.weak > 0) {
    parts.push(`${text(locale, "weak")} ${status.weak}`);
  }

  if (status.vulnerable > 0) {
    parts.push(`${text(locale, "vulnerable")} ${status.vulnerable}`);
  }

  if (status.poison > 0) {
    parts.push(`${text(locale, "poison")} ${status.poison}`);
  }

  return parts.length > 0 ? parts.join(locale === "zh" ? "，" : ", ") : null;
}

/**
 * Build a compact intent string from structured intent data + effective damage.
 * Example: "Attack 7 x2 · +2 Weak" or "Block 8 · +2 Str"
 */
export function formatCompactIntent(enemy: ObservedEnemy, locale: Locale): string {
  const intent = enemy.intent;
  const effectiveDmg = enemy.effectiveDamagePerHit;
  const parts: string[] = [];

  if (intent.kind === "attack" || intent.kind === "attackBlock") {
    const dmg = effectiveDmg ?? intent.damage ?? 0;
    const hits = Math.max(1, intent.hits ?? 1);
    const hitSuffix = hits > 1 ? ` x${hits}` : "";
    parts.push(`${text(locale, "intentAttack")} ${dmg}${hitSuffix}`);
  }

  if (intent.kind === "attackBlock" || intent.kind === "block" || intent.kind === "buff") {
    if (intent.block && intent.block > 0) {
      parts.push(locale === "zh" ? `${text(locale, "block")} ${intent.block}` : `Block ${intent.block}`);
    }
  }

  if (intent.kind === "heal" || (intent.heal && intent.heal > 0)) {
    parts.push(locale === "zh" ? `恢复 ${intent.heal}` : `Heal ${intent.heal}`);
  }

  if (intent.weak && intent.weak > 0) {
    parts.push(locale === "zh" ? `+${intent.weak} ${text(locale, "weak")}` : `+${intent.weak} Weak`);
  }
  if (intent.vulnerable && intent.vulnerable > 0) {
    parts.push(locale === "zh" ? `+${intent.vulnerable} ${text(locale, "vulnerable")}` : `+${intent.vulnerable} Vuln`);
  }
  if (intent.poison && intent.poison > 0) {
    parts.push(locale === "zh" ? `+${intent.poison} ${text(locale, "poison")}` : `+${intent.poison} Poison`);
  }
  if (intent.selfStrength && intent.selfStrength > 0) {
    parts.push(locale === "zh" ? `自身 +${intent.selfStrength} ${text(locale, "strength")}` : `Self +${intent.selfStrength} Str`);
  }
  if (intent.clearPlayerBlock) {
    parts.push(locale === "zh" ? "清空格挡" : "Clear Block");
  }
  if (intent.cleanse) {
    parts.push(locale === "zh" ? "净化" : "Cleanse");
  }

  return parts.join(" · ");
}

/** Short label for a passive effect, suitable for inline display. */
export function formatPassiveEffectShort(passive: PassiveEffect, locale: Locale): string {
  if (passive.kind === "retainBlock") {
    return locale === "zh" ? "格挡不会在回合结束时失去" : "Block retained at end of turn";
  }
  if (passive.kind === "strikeBonusDamage") {
    return locale === "zh" ? `打击牌额外 +${passive.value} 伤害` : `Strike cards +${passive.value} damage`;
  }
  if (passive.kind === "exhaustBlock") {
    return locale === "zh" ? `消耗卡牌时获得 ${passive.value} 格挡` : `Exhaust a card → gain ${passive.value} Block`;
  }
  if (passive.kind === "attackPoison") {
    return locale === "zh" ? `攻击附加 ${passive.value} 中毒` : `Attacks apply ${passive.value} Poison`;
  }
  if (passive.kind === "debuffBonusDamage") {
    return locale === "zh" ? `对减益敌人额外 +${passive.value} 伤害` : `+${passive.value} damage vs debuffed`;
  }
  if (passive.kind === "debuffDraw") {
    return locale === "zh" ? `施加减益时抽 ${passive.value} 张牌` : `Apply debuff → draw ${passive.value}`;
  }
  return `${passive.kind} ${passive.value}`;
}

export function localizeRelicDefinition(relic: RelicDefinition, locale: Locale): RelicDefinition {
  if (locale === "en") {
    return relic;
  }

  return {
    ...relic,
    name: localizeRelicName(relic.name, locale),
    description: localizeRelicDescription(relic.description, locale),
  };
}

function localizeIntent(intent: EnemyIntent, locale: Locale): EnemyIntent {
  if (locale === "en") {
    return intent;
  }

  return {
    ...intent,
    description: localizeIntentDescription(intent.description, locale),
  };
}

function localizeRestOption(option: RestOption, locale: Locale): RestOption {
  if (locale === "en") {
    return option;
  }

  return {
    ...option,
    label: localizeRestOptionLabel(option.label, locale),
    description: localizeRestOptionDescription(option.description, locale),
  };
}

function localizeCardName(name: string, locale: Locale): string {
  if (locale !== "zh") {
    return name;
  }

  if (/[+＋]$/.test(name)) {
    const baseName = name.replace(/[+＋]$/u, "");
    return `${cardNames[baseName] ?? baseName}+`;
  }

  return cardNames[name] ?? name;
}

function formatStructuredDescription(card: CardLike, locale: Locale): string {
  const lines = formatCardEffectLines(card as CliCardDefinition, locale);
  return joinCardTextLines(lines, locale);
}

function localizeEnemyName(name: string, locale: Locale): string {
  return locale === "zh" ? (enemyNames[name] ?? name) : name;
}

function localizeIntentDescription(description: string, locale: Locale): string {
  if (locale !== "zh") {
    return description;
  }

  const parsed = parseIntentDescription(description);
  return parsed ?? intentDescriptions[description] ?? description;
}

function parseIntentDescription(description: string): string | null {
  const clauses = description.split(/\s+and\s+/u);
  const translated = clauses.map((clause) => translateIntentClauseToChinese(clause.trim()));

  if (translated.some((clause) => clause === null)) {
    return null;
  }

  return translated.join("，");
}

function translateIntentClauseToChinese(clause: string): string | null {
  const multiAttackMatch = clause.match(/^Attack for (\d+) x(\d+)$/u);
  if (multiAttackMatch) {
    return `攻击 ${multiAttackMatch[2]} 次，每次造成 ${multiAttackMatch[1]} 点`;
  }

  const attackMatch = clause.match(/^Attack for (\d+)$/u);
  if (attackMatch) {
    return `攻击造成 ${attackMatch[1]} 点`;
  }

  const blockMatch = clause.match(/^Gain (\d+) block$/u);
  if (blockMatch) {
    return `获得 ${blockMatch[1]} 点格挡`;
  }

  const healMatch = clause.match(/^Recover (\d+) HP$/u);
  if (healMatch) {
    return `恢复 ${healMatch[1]} 点生命`;
  }

  const weakMatch = clause.match(/^Apply (\d+) Weak$/u);
  if (weakMatch) {
    return `施加 ${weakMatch[1]} 层虚弱`;
  }

  const vulnerableMatch = clause.match(/^Apply (\d+) Vulnerable$/u);
  if (vulnerableMatch) {
    return `施加 ${vulnerableMatch[1]} 层易伤`;
  }

  const poisonMatch = clause.match(/^Apply (\d+) Poison$/u);
  if (poisonMatch) {
    return `施加 ${poisonMatch[1]} 层中毒`;
  }

  const strengthMatch = clause.match(/^Gain (\d+) Strength$/u);
  if (strengthMatch) {
    return `获得 ${strengthMatch[1]} 点力量`;
  }

  if (clause === "Clear your block") {
    return "清空你的格挡";
  }

  if (clause === "Cleanse debuffs") {
    return "清除自身减益";
  }

  return null;
}

function localizeRelicName(name: string, locale: Locale): string {
  return locale === "zh" ? (relicNames[name] ?? name) : name;
}

function localizeRelicDescription(description: string, locale: Locale): string {
  return locale === "zh" ? (relicDescriptions[description] ?? description) : description;
}

function localizeRestOptionLabel(label: string, locale: Locale): string {
  return locale === "zh" ? (restOptionLabels[label] ?? label) : label;
}

function localizeRestOptionDescription(description: string, locale: Locale): string {
  if (locale !== "zh") {
    return description;
  }

  const healMatch = description.match(/^Heal (\d+) HP\.$/u);
  if (healMatch) {
    return `恢复 ${healMatch[1]} 点生命。`;
  }

  return restOptionDescriptions[description] ?? description;
}

function formatLogEffects(effects: LogEffect[], locale: Locale): string[] {
  return effects.map((effect) => {
    if (effect.type === "damage") {
      return locale === "zh" ? `造成 ${effect.amount} 点伤害` : `deal ${effect.amount}`;
    }

    if (effect.type === "block") {
      return locale === "zh" ? `获得 ${effect.amount} 点格挡` : `gain ${effect.amount} block`;
    }

    if (effect.type === "draw") {
      return locale === "zh" ? `抽 ${effect.amount} 张牌` : `draw ${effect.amount}`;
    }

    if (effect.type === "energy") {
      return locale === "zh" ? `获得 ${effect.amount} 点能量` : `gain ${effect.amount} energy`;
    }

    if (effect.type === "heal") {
      return locale === "zh" ? `恢复 ${effect.amount} 点生命` : `recover ${effect.amount} HP`;
    }

    if (effect.type === "weak") {
      return locale === "zh" ? `施加 ${effect.amount} 层虚弱` : `apply ${effect.amount} Weak`;
    }

    if (effect.type === "vulnerable") {
      return locale === "zh" ? `施加 ${effect.amount} 层易伤` : `apply ${effect.amount} Vulnerable`;
    }

    if (effect.type === "poison") {
      return locale === "zh" ? `施加 ${effect.amount} 层中毒` : `apply ${effect.amount} Poison`;
    }

    if (effect.type === "passive") {
      return locale === "zh" ? formatPassiveEffect({ kind: effect.kind, value: effect.value }, locale).replace(/。$/u, "") : formatPassiveEffect({ kind: effect.kind, value: effect.value }, locale).replace(/\.$/u, "");
    }

    return locale === "zh" ? "消耗" : "exhaust";
  });
}

function readCardName(content: RunContent, cardId: string): string {
  return content.cards[cardId]?.name ?? cardId;
}

function resolveCardDefinition(card: CardLike, content: RunContent | null): CliCardDefinition {
  if (isCardInstance(card)) {
    if (!content) {
      throw new Error(`cannot resolve card instance ${card.instanceId} without run content`);
    }

    const definition = content.cards[card.cardId];
    if (!definition) {
      throw new Error(`unknown card: ${card.cardId}`);
    }

    return resolveCardDefinition(
      {
        ...resolveCardNumbers(definition, card.upgraded),
        id: definition.id,
        name: definition.name,
        baseCardId: definition.id,
        upgraded: card.upgraded,
      },
      content,
    );
  }

  if (isCardDefinition(card)) {
    return resolveCardDefinition(
      {
        ...resolveCardNumbers(card, false),
        id: card.id,
        name: card.name,
        baseCardId: card.id,
        upgraded: false,
      },
      content,
    );
  }

  const baseCardId = "baseCardId" in card ? card.baseCardId : undefined;
  const baseId = baseCardId ?? card.id;
  const baseCard = content ? content.cards[baseId] ?? content.cards[card.id] : null;
  const baseNumbers = baseCard ? resolveCardNumbers(baseCard, card.upgraded ?? false) : null;
  const merged = {
    ...(baseNumbers ?? {}),
    ...card,
    id: card.id,
    name: card.name ?? baseCard?.name ?? card.id,
    baseCardId: baseCardId ?? baseCard?.id ?? card.id,
    upgraded: card.upgraded ?? false,
    description: card.description ?? baseNumbers?.description ?? "",
    cost: card.cost ?? baseNumbers?.cost ?? 0,
  };

  return {
    id: merged.id,
    instanceId: "instanceId" in merged ? merged.instanceId : undefined,
    name: merged.name,
    rarity: baseCard?.rarity ?? "common",
    upgraded: merged.upgraded,
    baseCardId: merged.baseCardId,
    cost: merged.cost,
    description: merged.description,
    keywords: resolveCardKeywords(merged),
    damage: merged.damage,
    block: merged.block,
    draw: merged.draw,
    energy: merged.energy,
    heal: merged.heal,
    weak: merged.weak,
    vulnerable: merged.vulnerable,
    poison: merged.poison,
    poisonMultiplier: merged.poisonMultiplier,
    passives: merged.passives,
    exhaust: merged.exhaust,
    retain: merged.retain,
  };
}

function resolveCardKeywords(card: CardLike): CardKeyword[] {
  const keywordSet = new Set<CardKeyword>();

  const rawKeywords = "keywords" in card ? card.keywords ?? [] : [];
  for (const rawKeyword of rawKeywords) {
    if (rawKeyword === "exhaust" || rawKeyword === "retain" || rawKeyword === "ethereal") {
      keywordSet.add(rawKeyword);
    }
  }

  if ("exhaust" in card && card.exhaust) {
    keywordSet.add("exhaust");
  }

  if ("retain" in card && card.retain) {
    keywordSet.add("retain");
  }

  return [...keywordSet];
}


function normalizeText(value: string): string {
  return value
    .replace(/\s+/gu, " ")
    .replace(/[。！？，、；：,!?:;]/gu, ".")
    .trim();
}

function normalizeComparableText(value: string): string {
  return normalizeText(value).replace(/\./gu, "").replace(/\s+/gu, "");
}

function joinCardTextLines(lines: string[], locale: Locale): string {
  return lines.join(locale === "zh" ? "" : " ");
}

function readEnemyName(content: RunContent, enemyId: string): string {
  return content.enemies[enemyId]?.name ?? enemyId;
}

function readRelicName(content: RunContent, relicId: string): string {
  return content.relics[relicId]?.name ?? relicId;
}

function readBlessing(content: RunContent, blessingId: string): BlessingDefinition {
  for (const act of content.acts) {
    const blessing = act.blessings.find((candidate) => candidate.id === blessingId);

    if (blessing) {
      return blessing;
    }
  }

  throw new Error(`unknown blessing: ${blessingId}`);
}

function isCardDefinition(card: CardLike): card is CardDefinition {
  return "base" in card && "upgraded" in card && typeof card.base === "object" && typeof card.upgraded === "object";
}

function isCardInstance(card: CardLike): card is CardInstance {
  return "cardId" in card && "instanceId" in card && typeof card.cardId === "string";
}

function resolveCardNumbers(card: CardDefinition, upgraded: boolean): CardDefinition["base"] {
  return upgraded ? card.upgraded : card.base;
}
