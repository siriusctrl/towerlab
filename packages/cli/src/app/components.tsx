import type { CharacterDefinition, MapNode, Observation, RunAction, RunContent } from "@towerlab/core";
import { Box, Text } from "ink";

import {
  formatBlessingDescription,
  formatBlessingName,
  formatNodeLabel,
  formatText,
  localizeCharacterName,
  localizeCharacterSummary,
  localizePhaseLabel,
  text,
  type Locale,
} from "../i18n.js";
import {
  SHOP_MENU_BACK_KEY,
  SHOP_MENU_BUY_KEY,
  SHOP_MENU_REMOVE_KEY,
  createShopBindings,
  type ShopMenuMode,
} from "../shop.js";
import {
  createMapFloorRows,
  deriveVisitedNodeIds,
  getEarlierEventsLine,
  getHpColor,
  getMapCompactLegendLine,
  getMapLegendLines,
  getRecentLogView,
  renderHpBar,
} from "../view.js";
import { getChoiceColor, getMapCellColor, isDimmedMapCell, isEmphasizedMapCell } from "./utils.js";

export function StatusBar({
  observation,
  locale,
  characterName,
  relicNames,
  hpBarWidth,
  compact = false,
}: {
  observation: Observation;
  locale: Locale;
  characterName: string;
  relicNames: string;
  hpBarWidth: number;
  compact?: boolean;
}) {
  const hpBar = renderHpBar(observation.hp, observation.maxHp, hpBarWidth);
  const hpColor = getHpColor(observation.hp, observation.maxHp);
  const showRelics = relicNames !== text(locale, "none");

  if (compact) {
    return (
      <Box flexDirection="column" flexShrink={0} overflow="hidden">
        <Text wrap="truncate-end">
          <Text bold color="cyan">{text(locale, "snapshotTitle")}</Text>
          <Text dimColor>
            {"  "}{text(locale, "seed")} {observation.seed} {"·"} {characterName} {"·"} {text(locale, "act")} {observation.act}/{observation.totalActs} {"·"}{" "}
            {text(locale, "floor")} {observation.floor} {"·"} {text(locale, "hp")} {observation.hp}/{observation.maxHp} {"·"} {text(locale, "gold")} {observation.gold} {"·"}{" "}
            {formatNodeLabel(observation.currentNode, locale)}
          </Text>
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexShrink={0} overflow="hidden">
      <Text wrap="truncate-end">
        <Text bold color="cyan">{text(locale, "snapshotTitle")}</Text>
        <Text dimColor>
          {"  "}{text(locale, "seed")} {observation.seed} {"·"} {characterName} {"·"} {text(locale, "act")} {observation.act}/{observation.totalActs} {"·"} {text(locale, "floor")} {observation.floor} {"·"}{" "}
          {localizePhaseLabel(observation.phase, locale)} {"·"} {formatNodeLabel(observation.currentNode, locale)}
        </Text>
      </Text>
      <Text wrap="truncate-end">
        <Text>{text(locale, "hp")} </Text>
        <Text color={hpColor}>{hpBar}</Text>
        <Text> {observation.hp}/{observation.maxHp}</Text>
        <Text>{"  "}{text(locale, "gold")} {observation.gold}</Text>
        {observation.phase === "combat" ? (
          <>
            <Text>{"  "}{text(locale, "energy")} {observation.energy}</Text>
            <Text>{"  "}{text(locale, "block")} {observation.block}</Text>
          </>
        ) : null}
      </Text>
      {showRelics ? (
        <Text dimColor wrap="truncate-end">
          {text(locale, "relics")}: {relicNames}
        </Text>
      ) : null}
    </Box>
  );
}

export function MapTreeView({
  map,
  observation,
  actions,
  locale,
  width,
  compact = false,
  compactLegendLine,
  showLegend = true,
}: {
  map: MapNode[];
  observation: Observation;
  actions: RunAction[];
  locale: Locale;
  width: number;
  compact?: boolean;
  compactLegendLine?: string;
  showLegend?: boolean;
}) {
  const visitedNodeIds = deriveVisitedNodeIds(map, actions);
  const mapRows = createMapFloorRows(map, observation, locale, visitedNodeIds, width, "icon");

  return (
    <>
      {compact ? (
        <>
          <Text bold color="magenta" wrap="truncate-end">
            {text(locale, "map")}
          </Text>
          <Text dimColor wrap="truncate-end">
            {compactLegendLine ?? getMapCompactLegendLine(locale)}
          </Text>
        </>
      ) : showLegend ? (
        <>
          <Text bold color="magenta">
            {text(locale, "map")}
          </Text>
          {getMapLegendLines(locale).map((line, index) => (
            <Text key={`legend-${index}`} dimColor wrap="truncate-end">
              {line}
            </Text>
          ))}
        </>
      ) : null}
      {mapRows.map((row, rowIndex) => (
        <Text key={rowIndex} wrap="truncate-end">
          {row.map((cell, cellIndex) => (
            <Text
              key={`${rowIndex}-${cellIndex}`}
              color={getMapCellColor(cell)}
              dimColor={isDimmedMapCell(cell)}
              bold={isEmphasizedMapCell(cell)}
            >
              {cell.text}
            </Text>
          ))}
        </Text>
      ))}
    </>
  );
}

export function PhaseBody({
  content,
  observation,
  locale,
  shopMenu,
  hpBarWidth,
  compactMapPhase,
}: {
  content: RunContent;
  observation: Observation;
  locale: Locale;
  shopMenu: ShopMenuMode;
  hpBarWidth: number;
  compactMapPhase: boolean;
}) {
  if (observation.phase === "combat") {
    const enemyHpBar = renderHpBar(observation.enemy.hp, observation.enemy.maxHp, Math.min(15, hpBarWidth));
    const enemyHpColor = getHpColor(observation.enemy.hp, observation.enemy.maxHp);

    return (
      <>
        <Text wrap="truncate-end">
          <Text bold color="red">{text(locale, "combat")}</Text>
          <Text dimColor>{"  "}{text(locale, "draw")} {observation.drawPileCount} {"·"} {text(locale, "discard")} {observation.discardPileCount}</Text>
        </Text>
        <Text wrap="truncate-end">
          <Text>{observation.enemy.name} </Text>
          <Text color={enemyHpColor}>{enemyHpBar}</Text>
          <Text> {observation.enemy.hp}/{observation.enemy.maxHp}</Text>
          {observation.enemy.block > 0 ? (
            <Text dimColor> {text(locale, "block")} {observation.enemy.block}</Text>
          ) : null}
          <Text dimColor> {"→"} </Text>
          <Text>{observation.enemy.intent.description}</Text>
        </Text>
        {observation.hand.length > 0 ? (
          observation.hand.map((card, index) => (
            <Text key={`${index}-${card.id}`} color={card.cost > observation.energy ? "gray" : undefined} wrap="truncate-end">
              {index + 1}. {card.name} <Text dimColor>[{card.cost}]</Text> {card.description}
            </Text>
          ))
        ) : (
          <Text dimColor>{text(locale, "emptyHand")}</Text>
        )}
      </>
    );
  }

  if (observation.phase === "blessing") {
    return (
      <>
        <Text bold color="yellow">{text(locale, "blessing")}</Text>
        <Text wrap="truncate-end">{text(locale, "chooseBlessing")}</Text>
        {observation.blessings.map((blessing, index) => (
          <Text key={blessing.id} wrap="truncate-end">
            {index + 1}. {formatBlessingName(content, blessing, locale)} - {formatBlessingDescription(content, blessing, locale)}
          </Text>
        ))}
      </>
    );
  }

  if (observation.phase === "map") {
    if (compactMapPhase) {
      return (
        <Text bold wrap="truncate-end">
          {text(locale, "paths")}{" "}
          {observation.nextNodes.map((node, index) => (
            <Text key={node.id} color={getChoiceColor(index)} bold>
              {index > 0 ? "  " : ""}
              {index + 1}. {formatNodeLabel(node, locale)}
            </Text>
          ))}
        </Text>
      );
    }

    return (
      <>
        <Text bold>{text(locale, "paths")}</Text>
        {observation.nextNodes.map((node, index) => (
          <Text key={node.id} color={getChoiceColor(index)} bold wrap="truncate-end">
            {index + 1}. {formatNodeLabel(node, locale)}
          </Text>
        ))}
      </>
    );
  }

  if (observation.phase === "rest") {
    return (
      <>
        <Text bold color="yellow">
          {text(locale, "rest")}
        </Text>
        <Text wrap="truncate-end">{text(locale, "chooseCampfire")}</Text>
        {observation.restOptions.map((option, index) => (
          <Text key={option.id} wrap="truncate-end">
            {index + 1}. {option.label} - {option.description}
          </Text>
        ))}
        <Text dimColor wrap="truncate-end">
          {text(locale, "next")}: {observation.nextNodes.map((node) => formatNodeLabel(node, locale)).join(", ")}
        </Text>
      </>
    );
  }

  if (observation.phase === "reward") {
    return (
      <>
        <Text bold color="yellow">
          {text(locale, "reward")}
        </Text>
        <Text wrap="truncate-end">{text(locale, "chooseReward")}</Text>
        {observation.cardChoices.map((card, index) => (
          <Text key={card.id} wrap="truncate-end">
            {index + 1}. {card.name} [{card.cost}] {card.description}
          </Text>
        ))}
        <Text>s. {text(locale, "skipReward")}</Text>
      </>
    );
  }

  if (observation.phase === "shop") {
    const topBindings = createShopBindings(observation);
    const submenuBindings = createShopBindings(
      observation,
      shopMenu === "buy" ? "buy" : shopMenu === "remove" ? "remove" : "flat",
    );
    const canBuyAny = topBindings.buyOptions.some((option) => option.key !== null);
    const canRemoveAny = topBindings.removeOptions.some((option) => option.key !== null);

    if (shopMenu === "buy") {
      return (
        <>
          <Text bold color="yellow">
            {text(locale, "shop")}
          </Text>
          <Text bold>{text(locale, "shopBuySection")}</Text>
          {submenuBindings.buyOptions.map((option) => (
            <Text key={option.card.id} color={option.key ? undefined : "gray"} wrap="truncate-end">
              {option.key ? `${option.key}. ` : "· "}
              {option.card.name} [{option.card.cost}]
            </Text>
          ))}
          {submenuBindings.buyOptions.length > 0 && !canBuyAny ? (
            <Text dimColor wrap="truncate-end">
              {text(locale, "shopNoAffordableBuys")}
            </Text>
          ) : null}
          <Text dimColor wrap="truncate-end">
            {text(locale, "next")}: {observation.nextNodes.map((node) => formatNodeLabel(node, locale)).join(", ")}
          </Text>
          <Text color="yellow">
            {SHOP_MENU_BACK_KEY}. {text(locale, "shopBack")}
          </Text>
        </>
      );
    }

    if (shopMenu === "remove") {
      return (
        <>
          <Text bold color="yellow">
            {text(locale, "shop")}
          </Text>
          <Text bold>{formatText(locale, "shopRemoveSection", { cost: observation.removeDeckCardCost })}</Text>
          {submenuBindings.removeOptions.map((option) => (
            <Text
              key={`${option.deckIndex}-${option.card.id}`}
              color={option.key ? undefined : "gray"}
              wrap="truncate-end"
            >
              {option.key ? `${option.key}. ` : "· "}
              {text(locale, "remove")} {option.card.name} {formatText(locale, "shopDeckSlot", { index: option.deckIndex + 1 })}
            </Text>
          ))}
          {submenuBindings.removeOptions.length > 0 && !canRemoveAny ? (
            <Text dimColor wrap="truncate-end">
              {text(locale, "shopNoAffordableRemovals")}
            </Text>
          ) : null}
          {submenuBindings.removeOptions.length === 0 ? <Text dimColor wrap="truncate-end">{text(locale, "noRemovableCards")}</Text> : null}
          <Text dimColor wrap="truncate-end">
            {text(locale, "next")}: {observation.nextNodes.map((node) => formatNodeLabel(node, locale)).join(", ")}
          </Text>
          <Text color="yellow">
            {SHOP_MENU_BACK_KEY}. {text(locale, "shopBack")}
          </Text>
        </>
      );
    }

    return (
      <>
        <Text bold color="yellow">
          {text(locale, "shop")}
        </Text>
        <Text wrap="truncate-end">{formatText(locale, "shopPrompt", { cost: observation.removeDeckCardCost })}</Text>
        <Text bold color={canBuyAny ? undefined : "gray"}>{SHOP_MENU_BUY_KEY}. {text(locale, "shopBuySection")}</Text>
        {!canBuyAny && topBindings.buyOptions.length > 0 ? (
          <Text dimColor wrap="truncate-end">
            {text(locale, "shopNoAffordableBuys")}
          </Text>
        ) : null}
        <Text bold color={canRemoveAny ? undefined : "gray"}>
          {SHOP_MENU_REMOVE_KEY}. {formatText(locale, "shopRemoveSection", { cost: observation.removeDeckCardCost })}
        </Text>
        {!canRemoveAny && topBindings.removeOptions.length > 0 ? (
          <Text dimColor wrap="truncate-end">
            {text(locale, "shopNoAffordableRemovals")}
          </Text>
        ) : null}
        {topBindings.removeOptions.length === 0 ? <Text dimColor wrap="truncate-end">{text(locale, "noRemovableCards")}</Text> : null}
        <Text dimColor wrap="truncate-end">
          {text(locale, "next")}: {observation.nextNodes.map((node) => formatNodeLabel(node, locale)).join(", ")}
        </Text>
        <Text color="yellow">
          {topBindings.leaveKey}. {text(locale, "leaveShop")}
        </Text>
      </>
    );
  }

  return (
    <>
      <Text bold color={observation.phase === "victory" ? "green" : "red"}>
        {localizePhaseLabel(observation.phase, locale)}
      </Text>
      <Text>{observation.phase === "victory" ? text(locale, "theClimbComplete") : text(locale, "towerWon")}</Text>
      <Text>{text(locale, "pressRestart")}</Text>
    </>
  );
}

export function Controls({ observation, locale, shopMenu }: { observation: Observation; locale: Locale; shopMenu: ShopMenuMode }) {
  if (observation.phase === "blessing") {
    return <Text dimColor wrap="truncate-end">{text(locale, "controlsBlessing")}</Text>;
  }

  if (observation.phase === "combat") {
    return <Text dimColor wrap="truncate-end">{text(locale, "controlsCombat")}</Text>;
  }

  if (observation.phase === "map") {
    return <Text dimColor wrap="truncate-end">{text(locale, "controlsMap")}</Text>;
  }

  if (observation.phase === "rest") {
    return <Text dimColor wrap="truncate-end">{text(locale, "controlsRest")}</Text>;
  }

  if (observation.phase === "reward") {
    return <Text dimColor wrap="truncate-end">{text(locale, "controlsReward")}</Text>;
  }

  if (observation.phase === "shop") {
    if (shopMenu === "buy") {
      return <Text dimColor wrap="truncate-end">{text(locale, "controlsShopBuy")}</Text>;
    }

    if (shopMenu === "remove") {
      return <Text dimColor wrap="truncate-end">{text(locale, "controlsShopRemove")}</Text>;
    }

    return <Text dimColor wrap="truncate-end">{text(locale, "controlsShop")}</Text>;
  }

  return <Text dimColor wrap="truncate-end">{text(locale, "controlsEnd")}</Text>;
}

export function RecentLogPanel({ entries, locale, limit }: { entries: string[]; locale: Locale; limit: number }) {
  const recentLog = getRecentLogView(entries, limit);
  const earlierEvents = getEarlierEventsLine(recentLog.hiddenCount, locale);

  return (
    <>
      <Text bold color="green">
        {text(locale, "recentLog")}
      </Text>
      {recentLog.entries.map((entry, index) => (
        <Text key={`${index}-${entry}`} wrap="truncate-end">
          - {entry}
        </Text>
      ))}
      {earlierEvents ? (
        <Text dimColor wrap="truncate-end">
          {earlierEvents}
        </Text>
      ) : null}
    </>
  );
}

export function CharacterSelectScreen({
  characters,
  locale,
}: {
  characters: CharacterDefinition[];
  locale: Locale;
}) {
  return (
    <Box flexDirection="column" paddingX={1} overflow="hidden">
      <Text bold color="cyan">{text(locale, "snapshotTitle")}</Text>
      <Text bold>{text(locale, "chooseCharacter")}</Text>
      {characters.map((character, index) => (
        <Box key={character.id} marginTop={index === 0 ? 1 : 0} flexDirection="column">
          <Text wrap="truncate-end">
            {index + 1}. <Text bold>{localizeCharacterName(character.id, locale)}</Text>
            <Text dimColor> {"·"} {text(locale, "hp")} {character.maxHp} {"·"} {text(locale, "gold")} {character.startGold}</Text>
          </Text>
          <Text dimColor wrap="truncate-end">
            {localizeCharacterSummary(character.id, locale)}
          </Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor wrap="truncate-end">{text(locale, "controlsCharacterSelect")}</Text>
      </Box>
    </Box>
  );
}
