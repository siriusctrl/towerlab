import { createSeededContent, DEFAULT_CHARACTER_ID } from "@towerlab/content";
import { createRun, observeRun, type Observation, type RunContent } from "@towerlab/core";

import {
  DEFAULT_LOCALE,
  formatBlessingAcquisition,
  formatBlessingDescription,
  formatBlessingName,
  formatNodeLabel,
  formatText,
  formatLogEntries,
  localizeCharacterName,
  localizeObservation,
  localizePhaseLabel,
  text,
  type Locale,
} from "../i18n.js";
import { createShopBindings } from "../shop.js";
import {
  createMapFloorRows,
  deriveVisitedNodeIds,
  formatMapLines,
  getEarlierEventsLine,
  getMapLegendLines,
  getRecentLogView,
} from "../view.js";

export function renderSnapshot(seed: number, locale: Locale = DEFAULT_LOCALE, characterId = DEFAULT_CHARACTER_ID): string {
  const content = createSeededContent(seed, characterId);
  const state = createRun(content, seed);
  const observation = localizeObservation(observeRun(content, state), locale);
  const currentMap = content.acts[observation.act - 1]?.map ?? [];
  const visitedNodeIds = deriveVisitedNodeIds(currentMap, []);

  return renderObservation(content, observation, locale, visitedNodeIds);
}

function renderObservation(content: RunContent, observation: Observation, locale: Locale, visitedNodeIds: string[] = []): string {
  const currentMap = content.acts[observation.act - 1]?.map ?? [];
  const mapSection = formatMapLines(createMapFloorRows(currentMap, observation, locale, visitedNodeIds, 60));
  const recentLog = getRecentLogView(formatLogEntries(content, observation.log, locale));
  const mapLegendLines = getMapLegendLines(locale);

  const lines = [
    text(locale, "snapshotTitle"),
    `${text(locale, "seed")}: ${observation.seed}`,
    `${text(locale, "character")}: ${localizeCharacterName(content.character.id, locale)}`,
    `${text(locale, "phase")}: ${localizePhaseLabel(observation.phase, locale)}`,
    `${text(locale, "act")}: ${observation.act}/${observation.totalActs}`,
    `${text(locale, "hp")}: ${observation.hp}/${observation.maxHp}  ${text(locale, "gold")}: ${observation.gold}  ${text(locale, "floor")}: ${observation.floor}`,
    `${text(locale, "node")}: ${formatNodeLabel(observation.currentNode, locale)}`,
    `${text(locale, "relics")}: ${observation.relics.map((relic) => relic.name).join(", ") || text(locale, "none")}`,
    "",
    `${text(locale, "map")}:`,
    ...mapLegendLines,
    ...mapSection,
    "",
  ];

  if (observation.phase === "combat") {
    lines.push(
      `${text(locale, "combat")}  ${text(locale, "draw")} ${observation.drawPileCount} ${text(locale, "discard")} ${observation.discardPileCount}`,
      `${observation.enemy.name} ${text(locale, "hp")} ${observation.enemy.hp}/${observation.enemy.maxHp} ${text(locale, "block")} ${observation.enemy.block} → ${observation.enemy.intent.description}`,
      `${text(locale, "energy")} ${observation.energy}  ${text(locale, "block")} ${observation.block}`,
    );

    for (const [index, card] of observation.hand.entries()) {
      lines.push(`${index + 1}. ${card.name} [${card.cost}] ${card.description}`);
    }
  } else if (observation.phase === "blessing") {
    const labelSuffix = locale === "zh" ? "：" : ": ";
    lines.push(`${text(locale, "blessing")}:`);

    for (const [index, blessing] of observation.blessings.entries()) {
      const acquisition = formatBlessingAcquisition(blessing, locale);
      lines.push(`${index + 1}. ${formatBlessingName(content, blessing, locale)}`);
      if (acquisition) {
        lines.push(`   ${text(locale, "blessingGainLabel")}${labelSuffix}${acquisition}`);
      }
      lines.push(`   ${text(locale, "blessingEffectLabel")}${labelSuffix}${formatBlessingDescription(content, blessing, locale)}`);
    }
  } else if (observation.phase === "map") {
    lines.push(`${text(locale, "paths")}`);

    for (const [index, node] of observation.nextNodes.entries()) {
      lines.push(`${index + 1}. ${formatNodeLabel(node, locale)}`);
    }
  } else if (observation.phase === "rest") {
    lines.push(`${text(locale, "rest")}:`);

    for (const [index, option] of observation.restOptions.entries()) {
      lines.push(`${index + 1}. ${option.label} - ${option.description}`);
    }
  } else if (observation.phase === "reward") {
    lines.push(`${text(locale, "reward")}:`);

    for (const [index, card] of observation.cardChoices.entries()) {
      lines.push(`${index + 1}. ${card.name} [${card.cost}] ${card.description}`);
    }

    lines.push(`s. ${text(locale, "skipReward")}`);
  } else if (observation.phase === "shop") {
    const shopBindings = createShopBindings(observation);
    lines.push(`${text(locale, "shop")}:`);
    lines.push(text(locale, "shopBuySection"));

    for (const option of shopBindings.buyOptions) {
      lines.push(`${option.key ?? "·"}. ${option.card.name} [${option.card.cost}]`);
    }

    if (shopBindings.buyOptions.length > 0 && !shopBindings.buyOptions.some((option) => option.key !== null)) {
      lines.push(text(locale, "shopNoAffordableBuys"));
    }

    lines.push("");
    lines.push(formatText(locale, "shopRemoveSection", { cost: observation.removeDeckCardCost }));

    for (const option of shopBindings.removeOptions) {
      lines.push(
        `${option.key ?? "·"}. ${text(locale, "remove")} ${option.card.name} ${formatText(locale, "shopDeckSlot", { index: option.deckIndex + 1 })}`,
      );
    }

    if (shopBindings.removeOptions.length > 0 && !shopBindings.removeOptions.some((option) => option.key !== null)) {
      lines.push(text(locale, "shopNoAffordableRemovals"));
    }

    if (shopBindings.removeOptions.length === 0) {
      lines.push(text(locale, "noRemovableCards"));
    }

    lines.push(`${shopBindings.leaveKey}. ${text(locale, "leaveShop")}`);
  } else {
    lines.push(`${text(locale, "outcome")}: ${localizePhaseLabel(observation.phase, locale)}`);
  }

  lines.push("", `${text(locale, "recentLog")}:`);

  for (const entry of recentLog.entries) {
    lines.push(`- ${entry}`);
  }

  const earlierEvents = getEarlierEventsLine(recentLog.hiddenCount, locale);
  if (earlierEvents) {
    lines.push(earlierEvents);
  }

  return lines.join("\n");
}
