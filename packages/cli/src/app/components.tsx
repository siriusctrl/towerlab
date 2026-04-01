import type { MapNode, Observation, RunAction, RunContent } from "@towerlab/core";
import { Box, Text } from "ink";

import {
  formatBlessingDescription,
  formatBlessingName,
  formatCardEffectLines,
  formatCombatStatus,
  formatCompactIntent,
  formatNodeLabel,
  formatPassiveEffect,
  formatPassiveEffectShort,
  formatText,
  type CliCardDefinition,
  localizeCardDefinition,
  localizeCardKeyword,
  localizePhaseLabel,
  text,
  type Locale,
} from "../i18n.js";
import {
  SHOP_BUY_PAGE_SIZE,
  SHOP_MENU_BACK_KEY,
  SHOP_MENU_BUY_KEY,
  SHOP_MENU_REMOVE_KEY,
  SHOP_REMOVE_PAGE_SIZE,
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

export {
  CharacterSelectScreen,
  getCharacterSelectLibraryMaxScroll,
  getReferencePanelMaxScroll,
  LIBRARY_SECTION_COUNT,
  ReferenceControls,
  ReferencePanel,
  STATUS_SECTION_COUNT,
} from "./reference.js";

type RestMode = "options" | "upgrade";
export type RestDeckUpgradeCard = {
  deckIndex: number;
  card: CliCardDefinition;
  upgradedCard: CliCardDefinition;
};

export const COMBAT_HAND_PAGE_SIZE = 9;
export const REST_UPGRADE_PAGE_SIZE = 9;

function getCardRarityColor(rarity: CliCardDefinition["rarity"]): "cyan" | "magenta" | "white" {
  if (rarity === "epic") {
    return "magenta";
  }

  if (rarity === "rare") {
    return "cyan";
  }

  return "white";
}

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
  shopBuyPage,
  shopRemovePage,
  combatHandPage,
  restMode,
  restUpgradeCards,
  restUpgradePage,
  hpBarWidth,
  compactMapPhase,
  availableWidth,
}: {
  content: RunContent;
  observation: Observation;
  locale: Locale;
  shopMenu: ShopMenuMode;
  shopBuyPage: number;
  shopRemovePage: number;
  combatHandPage: number;
  restMode: RestMode;
  restUpgradeCards: ReadonlyArray<RestDeckUpgradeCard>;
  restUpgradePage: number;
  hpBarWidth: number;
  compactMapPhase: boolean;
  availableWidth?: number;
}) {
  if (observation.phase === "combat") {
    const totalPages = Math.max(1, Math.ceil(observation.hand.length / COMBAT_HAND_PAGE_SIZE));
    const currentPage = Math.min(combatHandPage, totalPages - 1);
    const pageStart = currentPage * COMBAT_HAND_PAGE_SIZE;
    const pageCards = observation.hand.slice(pageStart, pageStart + COMBAT_HAND_PAGE_SIZE);
    const enemyHpBar = renderHpBar(observation.enemy.hp, observation.enemy.maxHp, Math.min(15, hpBarWidth));
    const enemyHpColor = getHpColor(observation.enemy.hp, observation.enemy.maxHp);
    const enemyStatus = formatCombatStatus(observation.enemy.status, locale);
    const playerStatus = formatCombatStatus(observation.status, locale);
    const activePassives = observation.activePassives ?? [];
    const width = availableWidth ?? 80;
    const useTwoColumn = width >= 60;
    const enemyWidth = useTwoColumn ? Math.max(24, Math.min(38, Math.floor(width * 0.38))) : 0;

    const header = (
      <Text wrap="truncate-end">
        <Text bold color="red">
          {text(locale, "combat")}
          {totalPages > 1 ? ` ${formatText(locale, "pageStatus", { current: currentPage + 1, total: totalPages })}` : ""}
        </Text>
        <Text dimColor>{"  "}{text(locale, "draw")} {observation.drawPileCount} {"·"} {text(locale, "discard")} {observation.discardPileCount}</Text>
      </Text>
    );

    const enemyPanel = (
      <Box flexDirection="column" width={useTwoColumn ? enemyWidth : undefined} flexShrink={0} overflow="hidden">
        <Text wrap="truncate-end">
          <Text bold>{observation.enemy.name}</Text>
        </Text>
        <Text wrap="truncate-end">
          <Text color={enemyHpColor}>{enemyHpBar}</Text>
          <Text> {observation.enemy.hp}/{observation.enemy.maxHp}</Text>
        </Text>
        {observation.enemy.block > 0 || observation.enemy.strength > 0 || enemyStatus ? (
          <Text wrap="truncate-end">
            {observation.enemy.block > 0 ? <Text>{text(locale, "block")} {observation.enemy.block}{"  "}</Text> : null}
            {observation.enemy.strength > 0 ? <Text color="red">{text(locale, "strength")} {observation.enemy.strength}{"  "}</Text> : null}
            {enemyStatus ? <Text color="magenta">{enemyStatus}</Text> : null}
          </Text>
        ) : null}
        {observation.enemy.totalPhases > 1 ? (
          <Text dimColor wrap="truncate-end">P{observation.enemy.phase}/{observation.enemy.totalPhases}</Text>
        ) : null}
        <Text bold color="yellow" wrap="truncate-end">
          {"→ "}{formatCompactIntent(observation.enemy, locale)}
        </Text>
      </Box>
    );

    const playerPanel = (
      <>
        <Text>
          <Text>{text(locale, "energy")} {observation.energy}/{observation.baseEnergy}</Text>
          <Text>{"  "}{text(locale, "block")} {observation.block}</Text>
          {playerStatus ? <Text color="magenta">{"  "}{playerStatus}</Text> : null}
        </Text>
        {activePassives.map((effect, index) => (
          <Text key={`passive-${index}`} dimColor>
            {formatPassiveEffectShort(effect as never, locale)}
          </Text>
        ))}
        <Text>{" "}</Text>
        {pageCards.length > 0 ? (
          pageCards.map((card, index) => (
            <CardBlock
              key={`${index}-${card.id}`}
              card={card}
              locale={locale}
              namePrefix={`${index + 1}. `}
              indent="   "
              playable={card.cost <= observation.energy}
            />
          ))
        ) : (
          <Text dimColor>{text(locale, "emptyHand")}</Text>
        )}
      </>
    );

    if (useTwoColumn) {
      return (
        <Box flexDirection="column" overflow="hidden">
          {header}
          <Box flexDirection="row" flexGrow={1} overflow="hidden">
            {enemyPanel}
            <Box
              flexDirection="column"
              flexGrow={1}
              borderStyle="single"
              borderLeft
              borderTop={false}
              borderBottom={false}
              borderRight={false}
              borderColor="gray"
              paddingLeft={1}
              overflow="hidden"
            >
              {playerPanel}
            </Box>
          </Box>
        </Box>
      );
    }

    return (
      <>
        {header}
        {enemyPanel}
        <Text>{" "}</Text>
        {playerPanel}
      </>
    );
  }

  if (observation.phase === "blessing") {
    const labelSuffix = locale === "zh" ? "：" : ": ";

    return (
      <>
        <Text bold color="yellow">{text(locale, "blessing")}</Text>
        <Text wrap="truncate-end">{text(locale, "chooseBlessing")}</Text>
        {observation.blessings.map((blessing, index) => {
          const description = formatBlessingDescription(content, blessing, locale);
          const blessingCard = blessing.cardId
            ? formatBlessingCard(content, blessing.cardId, blessing.upgraded, locale)
            : null;
          const blessingRelic = blessing.relicId ? content.relics[blessing.relicId] : null;

          return (
            <Box key={blessing.id} flexDirection="column">
              {blessingCard ? (
                <Text bold wrap="truncate-end">
                  {index + 1}. {text(locale, "blessingCardTitleLabel")}{labelSuffix}
                  <Text color={getCardRarityColor(blessingCard.rarity)}>[{blessingCard.cost}] {formatBlessingName(content, blessing, locale)}</Text>
                </Text>
              ) : blessingRelic ? (
                <Text bold wrap="truncate-end">
                  {index + 1}. {text(locale, "blessingRelicTitleLabel")}{labelSuffix}{formatBlessingName(content, blessing, locale)}
                </Text>
              ) : (
                <Text bold wrap="truncate-end">
                  {index + 1}. {formatBlessingName(content, blessing, locale)}
                </Text>
              )}
              {blessingCard?.keywords?.map((keyword) => (
                <Text key={`${blessing.id}-${keyword}`} color="yellow" bold wrap="truncate-end">
                  {"   "}{localizeCardKeyword(keyword, locale)}
                </Text>
              ))}
              <Text dimColor wrap="truncate-end">
                {"   "}{description}
              </Text>
            </Box>
          );
        })}
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
    if (restMode === "upgrade") {
      const totalPages = Math.max(1, Math.ceil(restUpgradeCards.length / REST_UPGRADE_PAGE_SIZE));
      const currentPage = Math.min(restUpgradePage, totalPages - 1);
      const pageStart = currentPage * REST_UPGRADE_PAGE_SIZE;
      const pageCards = restUpgradeCards.slice(pageStart, pageStart + REST_UPGRADE_PAGE_SIZE);

      return (
        <>
          <Text bold color="yellow">{text(locale, "rest")}</Text>
          <Text wrap="truncate-end">
            {text(locale, "chooseDeckUpgrade")}
            {totalPages > 1 ? ` ${formatText(locale, "pageStatus", { current: currentPage + 1, total: totalPages })}` : ""}
          </Text>
          {pageCards.length > 0 ? (
            pageCards.map((option, index) => (
              <Box key={`${option.deckIndex}-${option.card.id}`} flexDirection="column">
                <Text wrap="truncate-end">
                  <Text dimColor>{index + 1}. {option.card.name} [{option.card.cost}]</Text>
                  <Text>{" → "}</Text>
                  <Text bold>{option.upgradedCard.name} </Text>
                  <Text color="yellow">[{option.upgradedCard.cost}]</Text>
                </Text>
                {option.upgradedCard.keywords?.map((keyword) => (
                  <Text key={`${option.card.id}-${keyword}`} color="yellow" bold wrap="truncate-end">
                    {"      "}{localizeCardKeyword(keyword, locale)}
                  </Text>
                ))}
                {formatCardEffectLines(option.upgradedCard, locale).map((line) => (
                  <Text key={`${option.card.id}-${line}`} wrap="truncate-end">
                    {"      "}{line}
                  </Text>
                ))}
              </Box>
            ))
          ) : (
            <Text dimColor wrap="truncate-end">
              {text(locale, "noUpgradableDeckCards")}
            </Text>
          )}
        </>
      );
    }

    return (
      <>
        <Text bold color="yellow">{text(locale, "rest")}</Text>
        <Text wrap="truncate-end">{text(locale, "chooseCampfire")}</Text>
        {observation.restOptions.map((option, index) => (
          <Text key={option.id} wrap="truncate-end">
            {index + 1}. {option.label} - {option.description}
          </Text>
        ))}
      </>
    );
  }

  if (observation.phase === "reward") {
    if (observation.mode === "cards") {
      return (
        <>
          <Text bold color="yellow">{text(locale, "reward")}</Text>
          <Text wrap="truncate-end">{text(locale, "chooseRewardCards")}</Text>
          {observation.cardChoices.map((card, index) => (
            <CardBlock key={card.id} card={card} locale={locale} namePrefix={`${index + 1}. `} indent="   " />
          ))}
          <Text>b. {text(locale, "rewardBack")}</Text>
          <Text>s. {text(locale, "skipReward")}</Text>
        </>
      );
    }

    return (
      <>
        <Text bold color="yellow">{text(locale, "reward")}</Text>
        <Text wrap="truncate-end">{text(locale, "chooseReward")}</Text>
        {observation.rewardItems.map((rewardItem, index) => {
          if (rewardItem.kind === "gold") {
            return (
              <Text key={`reward-gold-${rewardItem.rewardIndex}`} wrap="truncate-end">
                {index + 1}. {text(locale, "rewardGoldItem")} - {rewardItem.amount} {text(locale, "gold")}
              </Text>
            );
          }

          if (rewardItem.kind === "relic") {
            return (
              <Box key={`reward-relic-${rewardItem.rewardIndex}`} flexDirection="column">
                <Text bold wrap="truncate-end">
                  {index + 1}. {text(locale, "rewardRelicItem")} - {rewardItem.relic.name}
                </Text>
                <Text dimColor wrap="truncate-end">
                  {"   "}{rewardItem.relic.description}
                </Text>
              </Box>
            );
          }

          return (
            <Box key={`reward-cards-${rewardItem.rewardIndex}`} flexDirection="column">
              <Text bold wrap="truncate-end">
                {index + 1}. {text(locale, "rewardCardItem")}
              </Text>
              <Text dimColor wrap="truncate-end">
                {"   "}{formatText(locale, "rewardCardPreview", { count: rewardItem.cardChoices.length })}
              </Text>
            </Box>
          );
        })}
        <Text>s. {text(locale, "skipReward")}</Text>
      </>
    );
  }

  if (observation.phase === "shop") {
    const topBindings = createShopBindings(observation);
    const submenuBindings = createShopBindings(
      observation,
      shopMenu === "buy" ? "buy" : shopMenu === "remove" ? "remove" : "flat",
      shopBuyPage,
      shopRemovePage,
    );
    const canBuyAny = topBindings.buyOptions.some((option) => option.key !== null);
    const canRemoveAny = topBindings.removeOptions.some((option) => option.key !== null);
    const canBuyOnPage = submenuBindings.buyOptions.some((option) => option.key !== null);
    const canRemoveOnPage = submenuBindings.removeOptions.some((option) => option.key !== null);

    if (shopMenu === "buy") {
      const totalPages = Math.max(1, Math.ceil(observation.forSale.length / SHOP_BUY_PAGE_SIZE));
      const currentPage = Math.min(shopBuyPage, totalPages - 1);

      return (
        <>
          <Text bold color="yellow">{text(locale, "shop")}</Text>
          <Text bold wrap="truncate-end">
            {text(locale, "shopBuySection")}
            {totalPages > 1 ? ` ${formatText(locale, "pageStatus", { current: currentPage + 1, total: totalPages })}` : ""}
          </Text>
          {submenuBindings.buyOptions.map((option) => (
            <CardBlock
              key={`${option.saleIndex}-${option.card.id}`}
              card={option.card}
              locale={locale}
              namePrefix={option.key ? `${option.key}. ` : "· "}
              indent="   "
              detailLines={[formatText(locale, "shopPriceLine", { cost: option.price })]}
            />
          ))}
          {submenuBindings.buyOptions.length > 0 && !canBuyOnPage ? (
            <Text dimColor wrap="truncate-end">{text(locale, "shopNoAffordableBuys")}</Text>
          ) : null}
          {submenuBindings.buyOptions.length === 0 ? <Text dimColor wrap="truncate-end">{text(locale, "shopNoCardsForSale")}</Text> : null}
          <Text color="yellow">
            {SHOP_MENU_BACK_KEY}. {text(locale, "shopBack")}
          </Text>
        </>
      );
    }

    if (shopMenu === "remove") {
      const totalPages = Math.max(1, Math.ceil(observation.removableDeckCards.length / SHOP_REMOVE_PAGE_SIZE));
      const currentPage = Math.min(shopRemovePage, totalPages - 1);

      return (
        <>
          <Text bold color="yellow">{text(locale, "shop")}</Text>
          <Text bold wrap="truncate-end">
            {formatText(locale, "shopRemoveSection", { cost: observation.removeDeckCardCost })}
            {totalPages > 1 ? ` ${formatText(locale, "pageStatus", { current: currentPage + 1, total: totalPages })}` : ""}
          </Text>
          {submenuBindings.removeOptions.map((option) => (
            <Text key={`${option.deckIndex}-${option.card.id}`} color={option.key ? undefined : "gray"} wrap="truncate-end">
              {option.key ? `${option.key}. ` : "· "}
              {text(locale, "remove")} {option.card.name} {formatText(locale, "shopDeckSlot", { index: option.deckIndex + 1 })}
            </Text>
          ))}
          {submenuBindings.removeOptions.length > 0 && !canRemoveOnPage ? (
            <Text dimColor wrap="truncate-end">
              {observation.remainingDeckRemovals === 0 ? text(locale, "shopNoRemainingRemovals") : text(locale, "shopNoAffordableRemovals")}
            </Text>
          ) : null}
          {submenuBindings.removeOptions.length === 0 ? (
            <Text dimColor wrap="truncate-end">
              {observation.remainingDeckRemovals === 0 ? text(locale, "shopNoRemainingRemovals") : text(locale, "noRemovableCards")}
            </Text>
          ) : null}
          <Text color="yellow">
            {SHOP_MENU_BACK_KEY}. {text(locale, "shopBack")}
          </Text>
        </>
      );
    }

    return (
      <>
        <Text bold color="yellow">{text(locale, "shop")}</Text>
        <Text wrap="truncate-end">{formatText(locale, "shopPrompt", { cost: observation.removeDeckCardCost })}</Text>
        <Text bold color={canBuyAny ? undefined : "gray"}>{SHOP_MENU_BUY_KEY}. {text(locale, "shopBuySection")}</Text>
        {!canBuyAny && topBindings.buyOptions.length > 0 ? <Text dimColor wrap="truncate-end">{text(locale, "shopNoAffordableBuys")}</Text> : null}
        {topBindings.buyOptions.length === 0 ? <Text dimColor wrap="truncate-end">{text(locale, "shopNoCardsForSale")}</Text> : null}
        <Text bold color={canRemoveAny ? undefined : "gray"}>
          {SHOP_MENU_REMOVE_KEY}. {formatText(locale, "shopRemoveSection", { cost: observation.removeDeckCardCost })}
        </Text>
        {!canRemoveAny && topBindings.removeOptions.length > 0 ? (
          <Text dimColor wrap="truncate-end">
            {observation.remainingDeckRemovals === 0 ? text(locale, "shopNoRemainingRemovals") : text(locale, "shopNoAffordableRemovals")}
          </Text>
        ) : null}
        {topBindings.removeOptions.length === 0 ? (
          <Text dimColor wrap="truncate-end">
            {observation.remainingDeckRemovals === 0 ? text(locale, "shopNoRemainingRemovals") : text(locale, "noRemovableCards")}
          </Text>
        ) : null}
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

export function Controls({
  observation,
  locale,
  shopMenu,
  shopBuyPageCount = 1,
  shopRemovePageCount = 1,
  restMode,
  restUpgradePageCount = 1,
  combatHandPageCount = 1,
}: {
  observation: Observation;
  locale: Locale;
  shopMenu: ShopMenuMode;
  shopBuyPageCount?: number;
  shopRemovePageCount?: number;
  restMode: RestMode;
  restUpgradePageCount?: number;
  combatHandPageCount?: number;
}) {
  const baseControls =
    observation.phase === "blessing"
      ? text(locale, "controlsBlessing")
      : observation.phase === "combat"
        ? combatHandPageCount > 1
          ? text(locale, "controlsCombatPaged")
          : text(locale, "controlsCombat")
        : observation.phase === "map"
          ? text(locale, "controlsMap")
          : observation.phase === "rest"
            ? restMode === "upgrade"
              ? restUpgradePageCount > 1
                ? text(locale, "controlsRestUpgradePaged")
                : text(locale, "controlsRestUpgrade")
              : text(locale, "controlsRest")
            : observation.phase === "reward"
              ? observation.mode === "cards"
                ? text(locale, "controlsRewardCards")
                : text(locale, "controlsReward")
              : observation.phase === "shop"
                ? shopMenu === "buy"
                  ? shopBuyPageCount > 1
                    ? text(locale, "controlsShopBuyPaged")
                    : text(locale, "controlsShopBuy")
                  : shopMenu === "remove"
                    ? shopRemovePageCount > 1
                      ? text(locale, "controlsShopRemovePaged")
                      : text(locale, "controlsShopRemove")
                    : text(locale, "controlsShop")
                : text(locale, "controlsEnd");

  return <Text dimColor wrap="truncate-end">{baseControls}</Text>;
}

export function RecentLogPanel({ entries, locale, limit }: { entries: string[]; locale: Locale; limit: number }) {
  const recentLog = getRecentLogView(entries, limit);
  const earlierEvents = getEarlierEventsLine(recentLog.hiddenCount, locale);

  return (
    <>
      <Text bold color="green">{text(locale, "recentLog")}</Text>
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

function CardBlock({
  card,
  locale,
  namePrefix,
  indent,
  detailLines,
  playable,
}: {
  card: CliCardDefinition;
  locale: Locale;
  namePrefix: string;
  indent: string;
  detailLines?: string[];
  playable?: boolean;
}) {
  const effectLines = formatCardEffectLines(card, locale);
  const dimmed = playable === false;
  const titleColor = dimmed ? undefined : getCardRarityColor(card.rarity);
  const costColor = dimmed ? "red" : "yellow";
  const keywordColor = dimmed ? "gray" : "yellow";
  const effectColor = dimmed ? "gray" : undefined;

  return (
    <Box flexDirection="column">
      <Text bold wrap="truncate-end" dimColor={dimmed}>
        {namePrefix}
        <Text color={titleColor}>{card.name}</Text> <Text color={costColor}>[{card.cost}]</Text>
      </Text>
      {detailLines?.map((line) => (
        <Text key={`${card.id}-detail-${line}`} dimColor wrap="truncate-end">
          {indent}{line}
        </Text>
      ))}
      {card.keywords?.map((keyword) => (
        <Text key={`${card.id}-${keyword}`} color={keywordColor} bold wrap="truncate-end" dimColor={dimmed}>
          {indent}{localizeCardKeyword(keyword, locale)}
        </Text>
      ))}
      {effectLines.map((line) => (
        <Text key={`${card.id}-${line}`} color={effectColor} dimColor={dimmed} wrap="truncate-end">
          {indent}{line}
        </Text>
      ))}
    </Box>
  );
}

function formatBlessingCard(content: RunContent, cardId: string, upgraded: boolean | undefined, locale: Locale) {
  return content.cards[cardId] ? localizeCardDefinition({ id: cardId, upgraded }, locale, content) : null;
}
