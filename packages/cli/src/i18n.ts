import type {
  CardDefinition,
  CombatObservation,
  EnemyIntent,
  LogEffect,
  LogEvent,
  Observation,
  RewardObservation,
  RelicDefinition,
  RestObservation,
  RestOption,
  RunContent,
  ShopObservation,
} from "@towerlab/core";

import {
  cardDescriptions,
  cardNames,
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

export function localizeObservation(observation: Observation, locale: Locale): Observation {
  if (locale === "en") {
    return observation;
  }

  const relics = observation.relics.map((relic) => localizeRelic(relic, locale));

  if (observation.phase === "combat") {
    const combatObservation: CombatObservation = observation;

    return {
      ...combatObservation,
      relics,
      hand: combatObservation.hand.map((card) => localizeCard(card, locale)),
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
    };
  }

  if (observation.phase === "reward") {
    const rewardObservation: RewardObservation = observation;

    return {
      ...rewardObservation,
      relics,
      cardChoices: rewardObservation.cardChoices.map((card) => localizeCard(card, locale)),
    };
  }

  if (observation.phase === "shop") {
    const shopObservation: ShopObservation = observation;

    return {
      ...shopObservation,
      relics,
      forSale: shopObservation.forSale.map((card) => localizeCard(card, locale)),
      removableDeckCards: shopObservation.removableDeckCards.map((entry) => ({
        ...entry,
        card: localizeCard(entry.card, locale),
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
    case "enteredNode":
      return locale === "zh"
        ? `进入 ${localizeNodeName(event.nodeId, locale)}（${localizeNodeKind(event.kind, locale)}）。`
        : `Entered ${event.nodeId} (${event.kind}).`;
    case "movedToNode":
      return locale === "zh"
        ? `前往 ${localizeNodeName(event.nodeId, locale)}（${localizeNodeKind(event.kind, locale)}）。`
        : `Moved to ${event.nodeId} (${event.kind}).`;
    case "atEntrance":
      return locale === "zh" ? "来到入口。请选择第一条路径。" : "At the entrance. Choose the first path.";
    case "enemyAppeared": {
      const enemyName = readEnemyName(content, event.enemyId);
      return locale === "zh"
        ? `${localizeEnemyName(enemyName, locale)}出现。意图：${localizeIntentDescription(event.intent.description, locale)}。`
        : `${enemyName} appears. Intent: ${event.intent.description}.`;
    }
    case "playedCard": {
      const cardName = readCardName(content, event.cardId);
      const effects = formatLogEffects(event.effects, locale);

      if (effects.length === 0) {
        return locale === "zh" ? `打出${localizeCardName(cardName, locale)}。` : `Played ${cardName}.`;
      }

      return locale === "zh"
        ? `打出${localizeCardName(cardName, locale)}：${effects.join("，")}。`
        : `Played ${cardName}: ${effects.join(", ")}.`;
    }
    case "enemyDefeated": {
      const enemyName = readEnemyName(content, event.enemyId);
      return locale === "zh"
        ? `击败${localizeEnemyName(enemyName, locale)}，获得 ${event.gold} 金币。`
        : `Defeated ${enemyName} and gained ${event.gold} gold.`;
    }
    case "rewardOffered":
      return locale === "zh" ? "获得奖励。请选择一张卡牌奖励，或跳过。" : "Won a reward. Choose a card reward or skip.";
    case "rewardCardAdded": {
      const cardName = readCardName(content, event.cardId);
      return locale === "zh"
        ? `将${localizeCardName(cardName, locale)}加入牌组。`
        : `Added ${cardName} to deck.`;
    }
    case "rewardSkipped":
      return locale === "zh" ? "跳过奖励。" : "Skipped reward.";
    case "chooseNextPath":
      return locale === "zh" ? "请选择下一条路径。" : "Choose the next path.";
    case "chooseCampfire":
      return locale === "zh" ? "请选择如何使用营火。" : "Choose how to use the campfire.";
    case "recoveredHp":
      return locale === "zh" ? `恢复 ${event.amount} 点生命。` : `Recovered ${event.amount} HP.`;
    case "fortified":
      return locale === "zh" ? `巩固成功，最大生命 +${event.maxHp}。` : `Fortified for +${event.maxHp} max HP.`;
    case "shopEntered":
      return locale === "zh" ? "你发现了一间商店。看看有哪些货物。" : "You found a shop. Browse the offers.";
    case "shopCardBought": {
      const cardName = readCardName(content, event.cardId);
      return locale === "zh"
        ? `购买${localizeCardName(cardName, locale)}，花费 ${event.gold} 金币。`
        : `Bought ${cardName} for ${event.gold} gold.`;
    }
    case "deckCardRemoved": {
      const cardName = readCardName(content, event.cardId);
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
    value = value.replace(`{${placeholder}}`, String(replacement));
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

  const generated = nodeId.match(/^(start|battle|elite|rest|shop|boss)-r(\d+)(?:-p(\d+))?$/u);
  if (generated) {
    const [, kind, row, position] = generated;
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

export function formatNodeLabel(
  node: { id: string; kind: string },
  locale: Locale,
): string {
  return `${localizeNodeName(node.id, locale)} (${localizeNodeKind(node.kind, locale)})`;
}

const nodeKindBadges: Record<Locale, Record<string, string>> = {
  en: { battle: "F", elite: "E", rest: "R", shop: "$", boss: "B", start: "S" },
  zh: { battle: "战", elite: "精", rest: "营", shop: "商", boss: "首", start: "始" },
};

export function localizeNodeKindBadge(kind: string, locale: Locale): string {
  return nodeKindBadges[locale][kind] ?? kind.slice(0, 1).toUpperCase();
}

const phaseLabelKeys: Record<string, keyof typeof localeText.en> = {
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
    [/^path choices are only available on the map$/, () => "只有在地图阶段才能选择路径"],
    [/^cards can only be played during combat$/, () => "只有在战斗阶段才能打出卡牌"],
    [/^ending the turn is only available during combat$/, () => "只有在战斗阶段才能结束回合"],
    [/^rest options are only available at rest nodes$/, () => "只有在营火节点才能选择营火行动"],
    [/^reward choices are only available after combat$/, () => "只有在战斗后才能选择奖励"],
    [/^shop actions are only available at shop nodes$/, () => "只有在商店节点才能执行商店行动"],
    [/^deck removal is only available at shop nodes$/, () => "只有在商店节点才能移除卡牌"],
    [/^can only leave when in shop$/, () => "只有在商店中才能离开商店"],
    [/^Unknown positional argument: (.+)$/, (arg) => `未知的位置参数：${arg}`],
    [/^Invalid JSON action: (.+)$/, (raw) => `动作 JSON 非法：${raw}`],
    [/^Invalid action shape: (.+)$/, (raw) => `动作结构非法：${raw}`],
    [/^Invalid choosePath action: (.+)$/, (raw) => `choosePath 动作非法：${raw}`],
    [/^Invalid playCard action: (.+)$/, (raw) => `playCard 动作非法：${raw}`],
    [/^Invalid chooseRest action: (.+)$/, (raw) => `chooseRest 动作非法：${raw}`],
    [/^Invalid takeReward action: (.+)$/, (raw) => `takeReward 动作非法：${raw}`],
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
    [/^--lang must be one of (.+)$/, (choices) => `--lang 必须是以下之一：${choices}`],
    [/^--locale must be one of (.+)$/, (choices) => `--locale 必须是以下之一：${choices}`],
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

function localizeCard(card: CardDefinition, locale: Locale): CardDefinition {
  if (locale === "en") {
    return card;
  }

  return {
    ...card,
    name: localizeCardName(card.name, locale),
    description: localizeCardDescription(card.description, locale),
  };
}

function localizeRelic(relic: RelicDefinition, locale: Locale): RelicDefinition {
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
  return locale === "zh" ? (cardNames[name] ?? name) : name;
}

function localizeCardDescription(description: string, locale: Locale): string {
  return locale === "zh" ? (cardDescriptions[description] ?? description) : description;
}

function localizeEnemyName(name: string, locale: Locale): string {
  return locale === "zh" ? (enemyNames[name] ?? name) : name;
}

function localizeIntentDescription(description: string, locale: Locale): string {
  return locale === "zh" ? (intentDescriptions[description] ?? description) : description;
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
  return locale === "zh" ? (restOptionDescriptions[description] ?? description) : description;
}

function formatLogEffects(effects: LogEffect[], locale: Locale): string[] {
  return effects.map((effect) => {
    if (effect.type === "damage") {
      return locale === "zh" ? `造成 ${effect.amount} 点伤害` : `deal ${effect.amount}`;
    }

    return locale === "zh" ? `获得 ${effect.amount} 点格挡` : `gain ${effect.amount} block`;
  });
}

function readCardName(content: RunContent, cardId: string): string {
  return content.cards[cardId]?.name ?? cardId;
}

function readEnemyName(content: RunContent, enemyId: string): string {
  return content.enemies[enemyId]?.name ?? enemyId;
}

function readRelicName(content: RunContent, relicId: string): string {
  return content.relics[relicId]?.name ?? relicId;
}
