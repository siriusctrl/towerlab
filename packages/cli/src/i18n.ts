import type {
  CardDefinition,
  CombatObservation,
  EnemyIntent,
  Observation,
  RewardObservation,
  RelicDefinition,
  RestObservation,
  RestOption,
  ShopObservation,
} from "@towerlab/core";

export const SUPPORTED_LOCALES = ["en", "zh"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

type Dictionary = Record<string, string>;

const cardNames: Dictionary = {
  Strike: "打击",
  Defend: "防御",
  Surge: "突进",
  "Quick Guard": "快速格挡",
  "Punishing Hit": "惩戒一击",
  "Heavy Blow": "重击",
  Precision: "精准打击",
};

const cardDescriptions: Dictionary = {
  "Deal 6 damage.": "造成 6 点伤害。",
  "Gain 5 block.": "获得 5 点格挡。",
  "Deal 4 damage. Gain 4 block.": "造成 4 点伤害。获得 4 点格挡。",
  "Gain 7 block.": "获得 7 点格挡。",
  "Deal 9 damage.": "造成 9 点伤害。",
  "Deal 11 damage.": "造成 11 点伤害。",
  "Deal 6 damage. Gain 2 block.": "造成 6 点伤害。获得 2 点格挡。",
};

const enemyNames: Dictionary = {
  Sentry: "哨卫",
  Crusher: "粉碎者",
  "Forge Keeper": "熔炉守卫",
  "Watch Core": "监视核心",
};

const nodeNames = {
  en: {
    crossroads: "Crossroads",
    gate: "Gate",
    hall: "Hall",
    forge: "Forge",
    restCamp: "Rest Camp",
    market: "Market",
    summit: "Summit",
  },
  zh: {
    crossroads: "岔路口",
    gate: "城门",
    hall: "大厅",
    forge: "熔炉",
    restCamp: "营地",
    market: "集市",
    summit: "顶峰",
  },
} as const satisfies Record<Locale, Dictionary>;

const intentDescriptions: Dictionary = {
  "Jab for 5": "刺击 5 点",
  "Brace for 6 block": "准备获得 6 点格挡",
  "Lunge for 7": "猛冲造成 7 点",
  "Crush for 8 and gain 4 block": "粉碎造成 8 点并获得 4 点格挡",
  "Patch 6 HP": "恢复 6 点生命",
  "Hammer for 12": "重锤造成 12 点",
  "Smash for 10 and gain 4 block": "猛砸造成 10 点并获得 4 点格挡",
  "Stabilize 8 HP": "稳定恢复 8 点生命",
  "Crush for 14": "重击造成 14 点",
  "Charge 8 block": "充能获得 8 点格挡",
  "Pulse for 11": "脉冲造成 11 点",
  "Overload for 14 and gain 5 block": "过载造成 14 点并获得 5 点格挡",
};

const relicNames: Dictionary = {
  "Combat Focus": "战斗专注",
  "Buckler Frame": "盾框",
  "Reinforced Frame": "强化框架",
  "Medicine Pack": "医疗包",
  "Merchant Tag": "商人徽记",
};

const relicDescriptions: Dictionary = {
  "Gain 1 extra energy at the start of each combat.": "每场战斗开始时额外获得 1 点能量。",
  "Start each combat with +2 block.": "每场战斗开始时获得 2 点格挡。",
  "Gain 12 max HP.": "获得 12 点最大生命。",
  "Recover +3 HP from campfire recovery.": "在营火恢复时额外回复 3 点生命。",
  "Shop cards cost 1 less.": "商店中的卡牌价格降低 1。",
};

const restOptionLabels: Dictionary = {
  Recover: "恢复",
  Fortify: "巩固",
};

const restOptionDescriptions: Dictionary = {
  "Heal 18 HP.": "回复 18 点生命。",
  "Gain 5 max HP and heal 5 HP.": "获得 5 点最大生命并回复 5 点生命。",
};

const localeText = {
  en: {
    battle: "battle",
    block: "Block",
    boss: "boss",
    buy: "Buy",
    chooseCampfire: "Choose a campfire action.",
    chooseNextNode: "Choose the next node.",
    chooseReward: "Choose one card reward, or skip.",
    combat: "Combat",
    cost: "Cost",
    controlsCombat: "Controls: 1-9 play card, e end turn, q quit",
    controlsEnd: "Controls: r restart, q quit",
    controlsMap: "Controls: 1-9 choose path, q quit",
    controlsRest: "Controls: 1-9 choose rest action, q quit",
    controlsReward: "Controls: 1-9 choose reward, s skip, q quit",
    controlsShop: "Controls: 1 buy, 2 remove, 0 leave, q quit",
    controlsShopBuy: "Controls: 1-9 choose card to buy, b back, q quit",
    controlsShopRemove: "Controls: a-z choose card to remove, b back, q quit",
    shopBack: "Back",
    deckRemoval: "Deck removal:",
    defeat: "Defeat",
    discard: "Discard",
    draw: "Draw",
    elite: "elite",
    emptyHand: "Hand is empty.",
    earlierEvents: "... {count} earlier events",
    enemy: "Enemy",
    energy: "Energy",
    floor: "Floor",
    gold: "Gold",
    hand: "Hand",
    hp: "HP",
    inputError: "Input error",
    intent: "Intent",
    leaveShop: "Leave shop",
    log: "Log",
    map: "Map",
    mapIconLegend: "{start} start  {battle} fight  {elite} elite  {rest} rest  {shop} shop  {boss} boss",
    mapLegendClosedLine: "{marker} closed",
    mapLegendCurrentLine: "{marker} current",
    mapLegendFutureLine: "{marker} future",
    mapLegendNextLine: "{marker} next",
    mapLegendPastLine: "{marker} passed",
    recentLog: "Recent Activity",
    next: "Next",
    node: "Node",
    none: "None",
    noRemovableCards: "No removable cards are available.",
    outcome: "Outcome",
    paths: "Paths:",
    phase: "Phase",
    pressRestart: "Press r to restart with the same seed or q to quit.",
    quit: "quit",
    relics: "Relics",
    remove: "Remove",
    removeCost: "gold each",
    rest: "Rest",
    reward: "Reward",
    seed: "Seed",
    shop: "Shop",
    shopBuySection: "Buy",
    shopDeckSlot: "(deck #{index})",
    shopNoAffordableBuys: "You cannot afford any cards right now.",
    shopNoAffordableRemovals: "You cannot afford deck removal right now.",
    shopPrompt: "Buy, remove ({cost} gold each), or leave.",
    shopRemoveSection: "Remove ({cost} gold)",
    skipReward: "Skip reward",
    snapshotTitle: "TowerLab",
    start: "start",
    theClimbComplete: "The climb is complete.",
    towerWon: "The tower won this run.",
    turnEnd: "end turn",
    victory: "Victory",
  },
  zh: {
    battle: "战斗",
    block: "格挡",
    boss: "首领",
    buy: "购买",
    chooseCampfire: "选择一项营火行动。",
    chooseNextNode: "选择下一个节点。",
    chooseReward: "选择一张奖励卡，或跳过。",
    combat: "战斗",
    cost: "费用",
    controlsCombat: "操作：1-9 打出卡牌，e 结束回合，q 退出",
    controlsEnd: "操作：r 以相同种子重新开始，q 退出",
    controlsMap: "操作：1-9 选择路径，q 退出",
    controlsRest: "操作：1-9 选择营火行动，q 退出",
    controlsReward: "操作：1-9 选择奖励，s 跳过，q 退出",
    controlsShop: "操作：1 购买，2 移除，0 离开商店，q 退出",
    controlsShopBuy: "操作：1-9 选择待购买卡牌，b 返回，q 退出",
    controlsShopRemove: "操作：a-z 选择移除卡牌，b 返回，q 退出",
    shopBack: "返回",
    deckRemoval: "移除卡牌：",
    defeat: "失败",
    discard: "弃牌堆",
    draw: "抽牌堆",
    elite: "精英",
    emptyHand: "手牌为空。",
    earlierEvents: "... 还有 {count} 条更早事件",
    enemy: "敌人",
    energy: "能量",
    floor: "层数",
    gold: "金币",
    hand: "手牌",
    hp: "生命",
    inputError: "输入错误",
    intent: "意图",
    leaveShop: "离开商店",
    log: "日志",
    map: "地图",
    mapIconLegend: "{start} 起点  {battle} 战斗  {elite} 精英  {rest} 营地  {shop} 商店  {boss} 首领",
    mapLegendClosedLine: "{marker} 已错过",
    mapLegendCurrentLine: "{marker} 当前",
    mapLegendFutureLine: "{marker} 未来",
    mapLegendNextLine: "{marker} 下一步",
    mapLegendPastLine: "{marker} 已走过",
    recentLog: "最近事件",
    next: "后续节点",
    node: "节点",
    none: "无",
    noRemovableCards: "当前没有可移除的卡牌。",
    outcome: "结果",
    paths: "路径：",
    phase: "阶段",
    pressRestart: "按 r 使用相同种子重新开始，或按 q 退出。",
    quit: "退出",
    relics: "遗物",
    remove: "移除",
    removeCost: "金币/次",
    rest: "营火",
    reward: "奖励",
    seed: "种子",
    shop: "商店",
    shopBuySection: "购买",
    shopDeckSlot: "（牌组 #{index}）",
    shopNoAffordableBuys: "当前买不起任何卡牌。",
    shopNoAffordableRemovals: "当前金币不足，无法移除卡牌。",
    shopPrompt: "可购买、移除（每次 {cost} 金币），或离开。",
    shopRemoveSection: "移除（{cost} 金币）",
    skipReward: "跳过奖励",
    snapshotTitle: "TowerLab",
    start: "起点",
    theClimbComplete: "这次攀登已经完成。",
    towerWon: "这次攀登被高塔终结了。",
    turnEnd: "结束回合",
    victory: "胜利",
  },
} as const satisfies Record<Locale, Dictionary>;

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
  const log = observation.log.map((entry) => localizeLogEntry(entry, locale));

  if (observation.phase === "combat") {
    const combatObservation: CombatObservation = observation;

    return {
      ...combatObservation,
      relics,
      log,
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
      log,
      restOptions: restObservation.restOptions.map((option) => localizeRestOption(option, locale)),
    };
  }

  if (observation.phase === "reward") {
    const rewardObservation: RewardObservation = observation;

    return {
      ...rewardObservation,
      relics,
      log,
      cardChoices: rewardObservation.cardChoices.map((card) => localizeCard(card, locale)),
    };
  }

  if (observation.phase === "shop") {
    const shopObservation: ShopObservation = observation;

    return {
      ...shopObservation,
      relics,
      log,
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
    log,
  };
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

export function localizeNodeKind(kind: string, locale: Locale): string {
  if (locale === "en") {
    return kind;
  }

  if (kind === "battle") {
    return text(locale, "battle");
  }

  if (kind === "elite") {
    return text(locale, "elite");
  }

  if (kind === "rest") {
    return text(locale, "rest");
  }

  if (kind === "shop") {
    return text(locale, "shop");
  }

  if (kind === "boss") {
    return text(locale, "boss");
  }

  if (kind === "start") {
    return text(locale, "start");
  }

  return kind;
}

export function localizeNodeName(nodeId: string, locale: Locale): string {
  const names = nodeNames[locale] as Dictionary;
  return names[nodeId] ?? nodeId;
}

export function formatNodeLabel(
  node: { id: string; kind: string },
  locale: Locale,
): string {
  return `${localizeNodeName(node.id, locale)} (${localizeNodeKind(node.kind, locale)})`;
}

export function localizeNodeKindBadge(kind: string, locale: Locale): string {
  if (locale === "zh") {
    if (kind === "battle") {
      return "战";
    }

    if (kind === "elite") {
      return "精";
    }

    if (kind === "rest") {
      return "营";
    }

    if (kind === "shop") {
      return "商";
    }

    if (kind === "boss") {
      return "首";
    }

    if (kind === "start") {
      return "始";
    }
  }

  if (kind === "battle") {
    return "F";
  }

  if (kind === "elite") {
    return "E";
  }

  if (kind === "rest") {
    return "R";
  }

  if (kind === "shop") {
    return "S";
  }

  if (kind === "boss") {
    return "B";
  }

  if (kind === "start") {
    return "S";
  }

  return kind.slice(0, 1).toUpperCase();
}

export function localizePhaseLabel(phase: Observation["phase"], locale: Locale): string {
  if (phase === "combat") {
    return text(locale, "combat");
  }

  if (phase === "map") {
    return text(locale, "map");
  }

  if (phase === "rest") {
    return text(locale, "rest");
  }

  if (phase === "reward") {
    return text(locale, "reward");
  }

  if (phase === "shop") {
    return text(locale, "shop");
  }

  if (phase === "victory") {
    return text(locale, "victory");
  }

  return text(locale, "defeat");
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

function localizeFragment(fragment: string, locale: Locale): string {
  if (locale === "en") {
    return fragment;
  }

  const dealMatch = fragment.match(/^deal (\d+)$/);
  if (dealMatch) {
    return `造成 ${dealMatch[1]} 点伤害`;
  }

  const blockMatch = fragment.match(/^gain (\d+) block$/);
  if (blockMatch) {
    return `获得 ${blockMatch[1]} 点格挡`;
  }

  return fragment;
}

function localizeLogEntry(entry: string, locale: Locale): string {
  if (locale === "en") {
    return entry;
  }

  const patterns: Array<[RegExp, (...groups: string[]) => string]> = [
    [/^Entered (.+) \((battle|elite|rest|shop|boss|start)\)\.$/, (nodeId, kind) => `进入 ${localizeNodeName(nodeId, locale)}（${localizeNodeKind(kind, locale)}）。`],
    [/^Moved to (.+) \((battle|elite|rest|shop|boss|start)\)\.$/, (nodeId, kind) => `前往 ${localizeNodeName(nodeId, locale)}（${localizeNodeKind(kind, locale)}）。`],
    [/^At the entrance\. Choose the first path\.$/, () => "来到入口。请选择第一条路径。"],
    [/^(.+) appears\. Intent: (.+)\.$/, (enemyName, intent) => `${localizeEnemyName(enemyName, locale)}出现。意图：${localizeIntentDescription(intent, locale)}。`],
    [/^Played (.+): (.+)\.$/, (cardName, details) => `打出${localizeCardName(cardName, locale)}：${details.split(", ").map((fragment) => localizeFragment(fragment, locale)).join("，")}。`],
    [/^Played (.+)\.$/, (cardName) => `打出${localizeCardName(cardName, locale)}。`],
    [/^Defeated (.+) and gained (\d+) gold\.$/, (enemyName, gold) => `击败${localizeEnemyName(enemyName, locale)}，获得 ${gold} 金币。`],
    [/^Won a reward\. Choose a card reward or skip\.$/, () => "获得奖励。请选择一张卡牌奖励，或跳过。"],
    [/^Skipped reward\.$/, () => "跳过奖励。"],
    [/^Choose the next path\.$/, () => "请选择下一条路径。"],
    [/^Choose how to use the campfire\.$/, () => "请选择如何使用营火。"],
    [/^Recovered (\d+) HP\.$/, (hp) => `恢复 ${hp} 点生命。`],
    [/^Fortified for \+(\d+) max HP\.$/, (hp) => `巩固成功，最大生命 +${hp}。`],
    [/^You found a shop\. Browse the offers\.$/, () => "你发现了一间商店。看看有哪些货物。"],
    [/^Bought (.+) for (\d+) gold\.$/, (cardName, gold) => `购买${localizeCardName(cardName, locale)}，花费 ${gold} 金币。`],
    [/^Removed (.+) from deck for (\d+) gold\.$/, (cardName, gold) => `从牌组移除${localizeCardName(cardName, locale)}，花费 ${gold} 金币。`],
    [/^Left the shop\.$/, () => "离开商店。"],
    [/^Relic (.+) already acquired\.$/, (relicName) => `遗物${localizeRelicName(relicName, locale)}已经获得过。`],
    [/^Acquired relic (.+)\.$/, (relicName) => `获得遗物${localizeRelicName(relicName, locale)}。`],
    [/^(.+) uses (.+)\.$/, (enemyName, intent) => `${localizeEnemyName(enemyName, locale)}使用了${localizeIntentDescription(intent, locale)}。`],
    [/^You were defeated\.$/, () => "你被击败了。"],
    [/^Turn (\d+)\. Intent: (.+)\.$/, (turn, intent) => `第 ${turn} 回合。意图：${localizeIntentDescription(intent, locale)}。`],
    [/^The boss falls\. The tower is clear\.$/, () => "首领倒下了。高塔已被攻克。"],
    [/^The path ends in victory\.$/, () => "道路的尽头是胜利。"],
    [/^Your climb ends here\.$/, () => "你的攀登到此结束。"],
  ];

  for (const [pattern, formatter] of patterns) {
    const match = entry.match(pattern);

    if (match) {
      return formatter(...match.slice(1));
    }
  }

  return entry;
}
