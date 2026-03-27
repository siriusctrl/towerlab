import type { CharacterDefinition, MapNode, Observation, RunAction, RunContent, RunState } from "@towerlab/core";
import { Box, Text } from "ink";

import {
  formatBlessingAcquisition,
  formatBlessingDescription,
  formatBlessingName,
  formatCombatStatus,
  formatNodeLabel,
  formatText,
  formatCardEffectLines,
  type CliCardDefinition,
  type CardLike,
  localizeCardDefinition,
  localizeCardKeyword,
  localizeCharacterName,
  localizeCharacterSummary,
  localizePhaseLabel,
  localizeRelicDefinition,
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

type ReferenceMode = "hidden" | "status" | "library";
type RestMode = "options" | "upgrade";
type LibrarySection = "starter" | "common" | "rare" | "epic" | "relics";
type StatusSection = "deck" | "relics";
export type RestDeckUpgradeCard = {
  deckIndex: number;
  card: CliCardDefinition;
  upgradedCard: CliCardDefinition;
};
type ReferenceLine = {
  text: string;
  bold?: boolean;
  dim?: boolean;
  color?: string;
};

const LIBRARY_SECTIONS: LibrarySection[] = ["starter", "common", "rare", "epic", "relics"];
const STATUS_SECTIONS: StatusSection[] = ["deck", "relics"];

export const LIBRARY_SECTION_COUNT = LIBRARY_SECTIONS.length;
export const STATUS_SECTION_COUNT = STATUS_SECTIONS.length;

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
  const combatStatus = observation.phase === "combat" ? formatCombatStatus(observation.status, locale) : null;

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
            <Text>{"  "}{text(locale, "energy")} {observation.energy}/{observation.baseEnergy}</Text>
            <Text>{"  "}{text(locale, "block")} {observation.block}</Text>
            {combatStatus ? <Text>{"  "}{combatStatus}</Text> : null}
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
  restMode,
  restUpgradeCards,
  hpBarWidth,
  compactMapPhase,
}: {
  content: RunContent;
  observation: Observation;
  locale: Locale;
  shopMenu: ShopMenuMode;
  restMode: RestMode;
  restUpgradeCards: ReadonlyArray<RestDeckUpgradeCard>;
  hpBarWidth: number;
  compactMapPhase: boolean;
}) {
  if (observation.phase === "combat") {
    const enemyHpBar = renderHpBar(observation.enemy.hp, observation.enemy.maxHp, Math.min(15, hpBarWidth));
    const enemyHpColor = getHpColor(observation.enemy.hp, observation.enemy.maxHp);
    const enemyStatus = formatCombatStatus(observation.enemy.status, locale);

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
        {enemyStatus ? (
          <Text dimColor wrap="truncate-end">
            {text(locale, "status")}: {enemyStatus}
          </Text>
        ) : null}
        {observation.hand.length > 0 ? (
          observation.hand.map((card, index) => (
            <CardBlock
              key={`${index}-${card.id}`}
              card={card}
              locale={locale}
              namePrefix={`${index + 1}. `}
              indent="   "
              dimmed={card.cost > observation.energy}
            />
          ))
        ) : (
          <Text dimColor>{text(locale, "emptyHand")}</Text>
        )}
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
          const acquisition = formatBlessingAcquisition(blessing, locale);
          const description = formatBlessingDescription(content, blessing, locale);
          const blessingCard = blessing.cardId ? localizeCardDefinition(content.cards[blessing.cardId]!, locale, content) : null;
          const blessingLines = blessingCard ? formatCardEffectLines(blessingCard, locale) : [];

          return (
            <Box key={blessing.id} flexDirection="column">
              <Text bold wrap="truncate-end">
                {index + 1}. {formatBlessingName(content, blessing, locale)}
              </Text>
              {blessingCard?.keywords?.map((keyword) => (
                <Text key={`${blessing.id}-${keyword}`} color="yellow" bold wrap="truncate-end">
                  {"   "}{localizeCardKeyword(keyword, locale)}
                </Text>
              ))}
              {blessingLines.map((line) => (
                <Text key={`${blessing.id}-effect-${line}`} dimColor wrap="truncate-end">
                  {"   "}{line}
                </Text>
              ))}
              {acquisition ? (
                <Text dimColor wrap="truncate-end">
                  {"   "}{text(locale, "blessingGainLabel")}{labelSuffix}{acquisition}
                </Text>
              ) : null}
              <Text dimColor wrap="truncate-end">
                {"   "}{text(locale, "blessingEffectLabel")}{labelSuffix}{description}
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
      return (
        <>
          <Text bold color="yellow">
            {text(locale, "rest")}
          </Text>
          <Text wrap="truncate-end">{text(locale, "chooseDeckUpgrade")}</Text>
          {restUpgradeCards.length > 0 ? (
            restUpgradeCards.map((option, index) => (
              <Box key={`${option.deckIndex}-${option.card.id}`} flexDirection="column">
                <Text dimColor wrap="truncate-end">
                  {index + 1}. {option.card.name} → {option.upgradedCard.name}
                </Text>
                <CardBlock
                  card={option.upgradedCard}
                  locale={locale}
                  namePrefix="   "
                  indent="      "
                />
              </Box>
            ))
          ) : (
            <Text dimColor wrap="truncate-end">
              {text(locale, "noUpgradableDeckCards")}
            </Text>
          )}
          <Text dimColor wrap="truncate-end">
            {text(locale, "next")}: {observation.nextNodes.map((node) => formatNodeLabel(node, locale)).join(", ")}
          </Text>
        </>
      );
    }

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
          <CardBlock key={card.id} card={card} locale={locale} namePrefix={`${index + 1}. `} indent="   " />
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

export function Controls({
  observation,
  locale,
  shopMenu,
  restMode,
}: {
  observation: Observation;
  locale: Locale;
  shopMenu: ShopMenuMode;
  restMode: RestMode;
}) {
  const baseControls =
    observation.phase === "blessing"
      ? text(locale, "controlsBlessing")
      : observation.phase === "combat"
        ? text(locale, "controlsCombat")
        : observation.phase === "map"
          ? text(locale, "controlsMap")
          : observation.phase === "rest"
            ? restMode === "upgrade"
              ? text(locale, "controlsRestUpgrade")
              : text(locale, "controlsRest")
            : observation.phase === "reward"
              ? text(locale, "controlsReward")
              : observation.phase === "shop"
                ? shopMenu === "buy"
                  ? text(locale, "controlsShopBuy")
                  : shopMenu === "remove"
                    ? text(locale, "controlsShopRemove")
                    : text(locale, "controlsShop")
                : text(locale, "controlsEnd");

  return <Text dimColor wrap="truncate-end">{baseControls}</Text>;
}

export function ReferenceControls({ locale, referenceMode }: { locale: Locale; referenceMode: ReferenceMode }) {
  return (
    <Text dimColor wrap="truncate-end">
      {referenceMode === "hidden" ? text(locale, "controlsReferenceClosed") : text(locale, "controlsReferenceOpen")}
    </Text>
  );
}

export function ReferencePanel({
  content,
  state,
  locale,
  referenceMode,
  statusSectionIndex,
  librarySectionIndex,
  scrollOffset,
  height,
}: {
  content: RunContent;
  state: RunState;
  locale: Locale;
  referenceMode: Exclude<ReferenceMode, "hidden">;
  statusSectionIndex: number;
  librarySectionIndex: number;
  scrollOffset: number;
  height: number;
}) {
  const section =
    referenceMode === "status"
      ? buildStatusSection(content, state, locale, STATUS_SECTIONS[statusSectionIndex] ?? STATUS_SECTIONS[0]!)
      : buildLibrarySection(content, locale, LIBRARY_SECTIONS[librarySectionIndex] ?? LIBRARY_SECTIONS[0]!);
  const characterName = localizeCharacterName(content.character.id, locale);
  const headerLines = 4;
  const bodyHeight = Math.max(4, height - headerLines);
  const maxScroll = Math.max(0, section.lines.length - bodyHeight);
  const clampedScroll = Math.min(scrollOffset, maxScroll);
  const visibleLines = section.lines.slice(clampedScroll, clampedScroll + bodyHeight);
  const start = section.lines.length === 0 ? 0 : clampedScroll + 1;
  const end = clampedScroll + visibleLines.length;

  return (
    <Box flexDirection="column" overflow="hidden">
      <Text bold color="cyan" wrap="truncate-end">
        {referenceMode === "status" ? text(locale, "status") : text(locale, "library")}
      </Text>
      <Text dimColor wrap="truncate-end">
        {characterName} {"·"} {section.title}
      </Text>
      <Text wrap="truncate-end">
        {(referenceMode === "status" ? STATUS_SECTIONS : LIBRARY_SECTIONS).map((candidate, index) => (
          <Text key={candidate} color={candidate === section.key ? "yellow" : "gray"} bold={candidate === section.key}>
            {index > 0 ? "  " : ""}
            {referenceMode === "status"
              ? statusSectionLabel(locale, candidate as StatusSection)
              : librarySectionLabel(locale, candidate as LibrarySection)}
          </Text>
        ))}
      </Text>
      <Text dimColor wrap="truncate-end">
        {formatText(locale, "referenceScrollStatus", { start, end, total: section.lines.length })}
      </Text>
      {visibleLines.length > 0 ? (
        visibleLines.map((line, index) => (
          <Text key={`${section.key}-${clampedScroll + index}-${line.text}`} color={line.color} bold={line.bold} dimColor={line.dim} wrap="truncate-end">
            {line.text}
          </Text>
        ))
      ) : (
        <Text dimColor wrap="truncate-end">
          {text(locale, "emptyReferenceSection")}
        </Text>
      )}
    </Box>
  );
}

function buildStatusSection(
  content: RunContent,
  state: RunState,
  locale: Locale,
  section: StatusSection,
): { key: StatusSection; title: string; lines: ReferenceLine[] } {
  if (section === "deck") {
    return {
      key: section,
      title: formatText(locale, "deckSize", { count: state.deck.length }),
      lines: formatCardCollectionLines(state.deck, content, locale),
    };
  }

  return {
    key: section,
    title: formatText(locale, "relicCount", { count: state.relics.length }),
    lines: formatRelicCollectionLines(state.relics, content, locale),
  };
}

function buildLibrarySection(content: RunContent, locale: Locale, section: LibrarySection): { key: LibrarySection; title: string; lines: ReferenceLine[] } {
  if (section === "starter") {
    return {
      key: section,
      title: text(locale, "starterDeckSection"),
      lines: formatCardCollectionLines(content.character.starterDeck, content, locale),
    };
  }

  if (section === "common" || section === "rare" || section === "epic") {
    return {
      key: section,
      title: librarySectionLabel(locale, section),
      lines: formatCardCollectionLines(content.character.rewardCardPools[section], content, locale),
    };
  }

  const startingRelic = content.relics[content.character.startingRelicId];
  const eliteRelics = content.character.relicPools.elite
    .map((relicId) => content.relics[relicId])
    .filter((relic): relic is NonNullable<typeof relic> => relic !== undefined);
  const bossRelics = content.character.relicPools.boss
    .map((relicId) => content.relics[relicId])
    .filter((relic): relic is NonNullable<typeof relic> => relic !== undefined);

  return {
    key: section,
    title: text(locale, "relicLibrarySection"),
    lines: [
      { text: text(locale, "starterRelic"), bold: true, dim: true },
      ...(startingRelic ? [formatRelicLine(startingRelic, locale)] : []),
      { text: text(locale, "eliteRelicsSection"), bold: true, dim: true },
      ...eliteRelics.map((relic) => formatRelicLine(relic, locale)),
      { text: text(locale, "bossRelicsSection"), bold: true, dim: true },
      ...bossRelics.map((relic) => formatRelicLine(relic, locale)),
    ],
  };
}

function librarySectionLabel(locale: Locale, section: LibrarySection): string {
  if (section === "starter") return text(locale, "starterDeckSection");
  if (section === "common") return text(locale, "commonCardsSection");
  if (section === "rare") return text(locale, "rareCardsSection");
  if (section === "epic") return text(locale, "epicCardsSection");
  return text(locale, "relicLibrarySection");
}

function statusSectionLabel(locale: Locale, section: StatusSection): string {
  if (section === "deck") return text(locale, "deck");
  return text(locale, "currentRelics");
}

function formatCardCollectionLines(
  cardIds: ReadonlyArray<string | CardLike | { cardId: string; upgraded: boolean; instanceId: string }>,
  content: RunContent,
  locale: Locale,
): ReferenceLine[] {
  const counts = new Map<string, { card: CliCardDefinition; count: number }>();

  for (const entry of cardIds) {
    const cardLike = typeof entry === "string"
      ? { id: entry, cost: 0 }
      : "cardId" in entry
        ? { id: entry.cardId, baseCardId: entry.cardId, upgraded: entry.upgraded, instanceId: entry.instanceId }
        : entry;
    const card = localizeCardDefinition(
      cardLike,
      locale,
      content,
    );
    const key = `${card.id}|${card.upgraded ? "1" : "0"}`;
    const current = counts.get(key);

    if (!current) {
      counts.set(key, { card, count: 1 });
    } else {
      counts.set(key, { card: current.card, count: current.count + 1 });
    }
  }

  return [...counts.values()].flatMap(({ card, count }) =>
    buildCardReferenceLines(card, locale, `${count > 1 ? `${count}x ` : ""}`, "  "),
  );
}

function CardBlock({
  card,
  locale,
  namePrefix,
  indent,
  dimmed = false,
}: {
  card: CliCardDefinition;
  locale: Locale;
  namePrefix: string;
  indent: string;
  dimmed?: boolean;
}) {
  const effectLines = formatCardEffectLines(card, locale);

  return (
    <Box flexDirection="column">
      <Text color={dimmed ? "gray" : undefined} bold wrap="truncate-end">
        {namePrefix}{card.name} <Text dimColor>[{card.cost}]</Text>
      </Text>
      {card.keywords?.map((keyword) => (
        <Text key={`${card.id}-${keyword}`} color="yellow" bold wrap="truncate-end">
          {indent}{localizeCardKeyword(keyword, locale)}
        </Text>
      ))}
      {effectLines.map((line) => (
        <Text key={`${card.id}-${line}`} color={dimmed ? "gray" : undefined} wrap="truncate-end">
          {indent}{line}
        </Text>
      ))}
    </Box>
  );
}

function buildCardReferenceLines(card: CliCardDefinition, locale: Locale, namePrefix: string, indent: string): ReferenceLine[] {
  const lines: ReferenceLine[] = [
    { text: `${namePrefix}${card.name} [${card.cost}]`, bold: true },
  ];

  for (const keyword of card.keywords ?? []) {
    lines.push({
      text: `${indent}${localizeCardKeyword(keyword, locale)}`,
      bold: true,
      color: "yellow",
    });
  }

  for (const line of formatCardEffectLines(card, locale)) {
    lines.push({ text: `${indent}${line}` });
  }

  return lines;
}

function formatRelicLine(relic: NonNullable<RunContent["relics"][string]>, locale: Locale): ReferenceLine {
  const localized = localizeRelicDefinition(relic, locale);
  return { text: `${localized.name} - ${localized.description}` };
}

function formatRelicCollectionLines(relicIds: string[], content: RunContent, locale: Locale): ReferenceLine[] {
  return relicIds
    .map((relicId) => content.relics[relicId])
    .filter((relic): relic is NonNullable<RunContent["relics"][string]> => relic !== undefined)
    .map((relic) => formatRelicLine(relic, locale));
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
  contents,
  locale,
  libraryHeight,
  showLibrary,
  selectedCharacterIndex,
  librarySectionIndex,
  referenceScrollOffset,
}: {
  characters: CharacterDefinition[];
  contents: RunContent[];
  locale: Locale;
  libraryHeight: number;
  showLibrary: boolean;
  selectedCharacterIndex: number;
  librarySectionIndex: number;
  referenceScrollOffset: number;
}) {
  const selectedContent = contents[selectedCharacterIndex] ?? contents[0];

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
      {showLibrary && selectedContent ? (
        <CharacterSelectLibraryPanel
          content={selectedContent}
          locale={locale}
          librarySectionIndex={librarySectionIndex}
          scrollOffset={referenceScrollOffset}
          height={libraryHeight}
        />
      ) : null}
      <Box marginTop={1}>
        <Text dimColor wrap="truncate-end">
          {showLibrary ? text(locale, "controlsCharacterSelectLibraryOpen") : text(locale, "controlsCharacterSelect")}
        </Text>
      </Box>
    </Box>
  );
}

function CharacterSelectLibraryPanel({
  content,
  locale,
  librarySectionIndex,
  scrollOffset,
  height,
}: {
  content: RunContent;
  locale: Locale;
  librarySectionIndex: number;
  scrollOffset: number;
  height: number;
}) {
  const section = buildLibrarySection(content, locale, LIBRARY_SECTIONS[librarySectionIndex] ?? LIBRARY_SECTIONS[0]!);
  const characterName = localizeCharacterName(content.character.id, locale);
  const bodyHeight = Math.max(4, height - 4);
  const maxScroll = Math.max(0, section.lines.length - bodyHeight);
  const clampedScroll = Math.min(scrollOffset, maxScroll);
  const visibleLines = section.lines.slice(clampedScroll, clampedScroll + bodyHeight);
  const start = section.lines.length === 0 ? 0 : clampedScroll + 1;
  const end = clampedScroll + visibleLines.length;

  return (
    <Box marginTop={1} flexDirection="column" overflow="hidden">
      <Text bold color="magenta">{text(locale, "library")}</Text>
      <Text dimColor wrap="truncate-end">
        {characterName} · {section.title}
      </Text>
      <Text wrap="truncate-end">
        {LIBRARY_SECTIONS.map((candidate, index) => (
          <Text key={candidate} color={candidate === section.key ? "yellow" : "gray"} bold={candidate === section.key}>
            {index > 0 ? "  " : ""}
            {librarySectionLabel(locale, candidate)}
          </Text>
        ))}
      </Text>
      <Text dimColor wrap="truncate-end">
        {formatText(locale, "referenceScrollStatus", { start, end, total: section.lines.length })}
      </Text>
      {visibleLines.length > 0 ? (
        visibleLines.map((line, index) => (
          <Text key={`${section.key}-${clampedScroll + index}-${line.text}`} color={line.color} bold={line.bold} dimColor={line.dim} wrap="truncate-end">
            {line.text}
          </Text>
        ))
      ) : (
        <Text dimColor wrap="truncate-end">
          {text(locale, "emptyReferenceSection")}
        </Text>
      )}
    </Box>
  );
}
