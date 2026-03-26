import { createSeededContent } from "@towerlab/content";
import { applyAction, createRun, observeRun, type MapNode, type Observation, type RunAction, type RunState } from "@towerlab/core";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_LOCALE,
  formatNodeLabel,
  formatText,
  localizeErrorMessage,
  localizeObservation,
  localizePhaseLabel,
  text,
  type Locale,
} from "./i18n.js";
import {
  SHOP_MENU_BACK_KEY,
  SHOP_MENU_BUY_KEY,
  SHOP_MENU_REMOVE_KEY,
  createShopBindings,
  type ShopMenuMode,
  readShopAction,
} from "./shop.js";
import {
  createMapFloorRows,
  deriveVisitedNodeIds,
  getEarlierEventsLine,
  getHpColor,
  getMapCompactLegendLine,
  getMapLegendLines,
  getRecentLogView,
  renderHpBar,
  type MapTreeCell,
} from "./view.js";

export interface AppProps {
  seed: number;
  locale?: Locale;
}

export function App({ seed, locale = DEFAULT_LOCALE }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { columns, rows } = useTerminalDimensions(stdout);
  const content = createSeededContent(seed);
  const [state, setState] = useState<RunState>(() => createRun(content, seed));
  const [actions, setActions] = useState<RunAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const actionsRef = useRef(actions);
  const [shopMenu, setShopMenu] = useState<ShopMenuMode>("top");
  const view = localizeObservation(observeRun(content, state), locale);
  const relicNames = view.relics.length > 0 ? view.relics.map((relic) => relic.name).join(", ") : text(locale, "none");
  const compactLegendLine = getMapCompactLegendLine(locale);
  const sidebarWidth = Math.max(32, Math.min(52, Math.max(getTerminalTextWidth(compactLegendLine) + 4, Math.floor(columns * 0.35))));
  const showSidebar = view.phase !== "map" && rows >= 24 && columns - sidebarWidth >= 48;
  const showInlineLog = !showSidebar && rows >= 28;
  const recentLogLimit = rows >= 30 ? 6 : rows >= 26 ? 5 : 4;
  const hpBarWidth = Math.min(20, Math.max(10, Math.floor(columns * 0.15)));

  const runAction = (action: RunAction) => {
    try {
      const nextState = applyAction(content, stateRef.current, action);
      const nextActions = [...actionsRef.current, action];
      stateRef.current = nextState;
      actionsRef.current = nextActions;
      setState(nextState);
      setActions(nextActions);
      setError(null);
    } catch (actionError) {
      setError(getErrorMessage(actionError, locale));
    }
  };

  const restart = () => {
    const nextState = createRun(content, seed);
    stateRef.current = nextState;
    actionsRef.current = [];
    setState(nextState);
    setActions([]);
    setError(null);
    setShopMenu("top");
  };

  useEffect(() => {
    if (view.phase !== "shop") {
      setShopMenu("top");
    }
  }, [view.phase]);

  useInput((input, key) => {
    if ((key.ctrl && input === "c") || input === "q") {
      exit();
      return;
    }

    if (view.phase === "combat") {
      if (input === "e") {
        runAction({ type: "endTurn" });
        return;
      }

      const handIndex = readChoiceIndex(input, view.hand.length);
      if (handIndex !== null) {
        runAction({ type: "playCard", handIndex });
      }
      return;
    }

    if (view.phase === "map") {
      const choiceIndex = readChoiceIndex(input, view.nextNodes.length);
      if (choiceIndex !== null) {
        runAction({ type: "choosePath", nodeId: view.nextNodes[choiceIndex].id });
      }
      return;
    }

    if (view.phase === "rest") {
      const choiceIndex = readChoiceIndex(input, view.restOptions.length);
      if (choiceIndex !== null) {
        runAction({ type: "chooseRest", optionId: view.restOptions[choiceIndex].id });
      }
      return;
    }

    if (view.phase === "reward") {
      if (input === "s") {
        runAction({ type: "skipReward" });
        return;
      }

      const rewardIndex = readChoiceIndex(input, view.cardChoices.length);
      if (rewardIndex !== null) {
        runAction({ type: "takeReward", rewardIndex });
      }
      return;
    }

    if (view.phase === "shop") {
      const result = readShopAction(input, view, shopMenu);

      if (result) {
        if (result.type === "openMenu") {
          setShopMenu(result.menu);
          return;
        }

        runAction(result.action);
      }
      return;
    }

    if (input === "r") {
      restart();
    }
  });

  const ruleWidth = Math.max(0, columns - 2);

  return (
    <Box flexDirection="column" width={columns} height={rows} overflow="hidden">
      <Box flexDirection="column" flexShrink={0} paddingX={1} overflow="hidden">
        <StatusBar observation={view} locale={locale} relicNames={relicNames} hpBarWidth={hpBarWidth} />
      </Box>
      <Text dimColor wrap="truncate-end">
        {"\u2500".repeat(ruleWidth)}
      </Text>

      <Box flexDirection="row" flexGrow={1} overflow="hidden">
        <Box flexDirection="column" flexGrow={1} paddingLeft={1} overflow="hidden">
          {!showSidebar && view.phase === "map" ? (
            <MapTreeView map={content.map} observation={view} actions={actions} locale={locale} width={columns - 2} />
          ) : null}
          <PhaseBody observation={view} locale={locale} shopMenu={shopMenu} hpBarWidth={hpBarWidth} />
          {showInlineLog ? (
            <Box marginTop={1} flexDirection="column" overflow="hidden">
              <RecentLogPanel observation={view} locale={locale} limit={recentLogLimit} />
            </Box>
          ) : null}
        </Box>

        {showSidebar ? (
          <Box
            flexDirection="column"
            width={sidebarWidth}
            flexShrink={0}
            borderStyle="single"
            borderLeft
            borderTop={false}
            borderBottom={false}
            borderRight={false}
            borderColor="gray"
            paddingLeft={1}
            overflow="hidden"
          >
            <MapTreeView map={content.map} observation={view} actions={actions} locale={locale} width={sidebarWidth - 3} compact compactLegendLine={compactLegendLine} />
            <Box marginTop={1} flexDirection="column" overflow="hidden">
              <RecentLogPanel observation={view} locale={locale} limit={recentLogLimit} />
            </Box>
          </Box>
        ) : null}
      </Box>

      <Text dimColor wrap="truncate-end">
        {"\u2500".repeat(ruleWidth)}
      </Text>
      <Box flexDirection="column" flexShrink={0} paddingX={1} overflow="hidden">
        <Controls observation={view} locale={locale} shopMenu={shopMenu} />
        {error ? (
          <Text color="red" wrap="truncate-end">
            {text(locale, "inputError")}: {error}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}

function StatusBar({
  observation,
  locale,
  relicNames,
  hpBarWidth,
}: {
  observation: Observation;
  locale: Locale;
  relicNames: string;
  hpBarWidth: number;
}) {
  const hpBar = renderHpBar(observation.hp, observation.maxHp, hpBarWidth);
  const hpColor = getHpColor(observation.hp, observation.maxHp);
  const showRelics = relicNames !== text(locale, "none");

  return (
    <Box flexDirection="column" flexShrink={0} overflow="hidden">
      <Text wrap="truncate-end">
        <Text bold color="cyan">{text(locale, "snapshotTitle")}</Text>
        <Text dimColor>
          {"  "}{text(locale, "seed")} {observation.seed} {"\u00b7"} {text(locale, "floor")} {observation.floor} {"\u00b7"}{" "}
          {localizePhaseLabel(observation.phase, locale)} {"\u00b7"} {formatNodeLabel(observation.currentNode, locale)}
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

function useTerminalDimensions(stdout: NodeJS.WriteStream): { columns: number; rows: number } {
  const [dimensions, setDimensions] = useState(() => ({
    columns: stdout.columns ?? 80,
    rows: stdout.rows ?? 24,
  }));

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        columns: stdout.columns ?? 80,
        rows: stdout.rows ?? 24,
      });
    };

    updateDimensions();
    stdout.on("resize", updateDimensions);

    return () => {
      stdout.off("resize", updateDimensions);
    };
  }, [stdout]);

  return dimensions;
}

function MapTreeView({
  map,
  observation,
  actions,
  locale,
  width,
  compact = false,
  compactLegendLine,
}: {
  map: MapNode[];
  observation: Observation;
  actions: RunAction[];
  locale: Locale;
  width: number;
  compact?: boolean;
  compactLegendLine?: string;
}) {
  const visitedNodeIds = deriveVisitedNodeIds(map, actions);
  const mapRows = createMapFloorRows(map, observation, locale, visitedNodeIds, width, compact ? "icon" : "icon");

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
      ) : (
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
      )}
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

function PhaseBody({
  observation,
  locale,
  shopMenu,
  hpBarWidth,
}: {
  observation: Observation;
  locale: Locale;
  shopMenu: ShopMenuMode;
  hpBarWidth: number;
}) {
  if (observation.phase === "combat") {
    const enemyHpBar = renderHpBar(observation.enemy.hp, observation.enemy.maxHp, Math.min(15, hpBarWidth));
    const enemyHpColor = getHpColor(observation.enemy.hp, observation.enemy.maxHp);

    return (
      <>
        <Text wrap="truncate-end">
          <Text bold color="red">{text(locale, "combat")}</Text>
          <Text dimColor>{"  "}{text(locale, "draw")} {observation.drawPileCount} {"\u00b7"} {text(locale, "discard")} {observation.discardPileCount}</Text>
        </Text>
        <Text wrap="truncate-end">
          <Text>{observation.enemy.name} </Text>
          <Text color={enemyHpColor}>{enemyHpBar}</Text>
          <Text> {observation.enemy.hp}/{observation.enemy.maxHp}</Text>
          {observation.enemy.block > 0 ? (
            <Text dimColor> {text(locale, "block")} {observation.enemy.block}</Text>
          ) : null}
          <Text dimColor> {"\u2192"} </Text>
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

  if (observation.phase === "map") {
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
              {option.key ? `${option.key}. ` : "\u00b7 "}
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
              {option.key ? `${option.key}. ` : "\u00b7 "}
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

function Controls({ observation, locale, shopMenu }: { observation: Observation; locale: Locale; shopMenu: ShopMenuMode }) {
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

function RecentLogPanel({ observation, locale, limit }: { observation: Observation; locale: Locale; limit: number }) {
  const recentLog = getRecentLogView(observation.log, limit);
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

function readChoiceIndex(input: string, limit: number): number | null {
  if (!/^[1-9]$/.test(input)) {
    return null;
  }

  const index = Number(input) - 1;

  if (index < 0 || index >= limit) {
    return null;
  }

  return index;
}

function getErrorMessage(error: unknown, locale: Locale): string {
  if (error instanceof Error) {
    return localizeErrorMessage(error.message, locale);
  }

  return localizeErrorMessage("unknown error", locale);
}

const MAP_CELL_COLORS: Record<string, string | undefined> = {
  current: "green",
  next: "yellow",
  nextChoice1: "cyan",
  nextChoice2: "magenta",
  nextChoice3: "blue",
  future: "white",
  futureChoice1: "cyan",
  futureChoice2: "magenta",
  futureChoice3: "blue",
  past: "gray",
  closed: "gray",
  connector: "gray",
  connectorChoice1: "cyan",
  connectorChoice2: "magenta",
  connectorChoice3: "blue",
};

function getMapCellColor(cell: MapTreeCell): string | undefined {
  return MAP_CELL_COLORS[cell.status];
}

function isDimmedMapCell(cell: MapTreeCell): boolean {
  return cell.status === "closed" || cell.status === "past" || cell.status === "connector";
}

function isEmphasizedMapCell(cell: MapTreeCell): boolean {
  return cell.status === "current" || cell.status === "next" || /^nextChoice/u.test(cell.status);
}

function getChoiceColor(index: number): string | undefined {
  if (index === 0) return "cyan";
  if (index === 1) return "magenta";
  if (index === 2) return "blue";
  return undefined;
}

function getTerminalTextWidth(text: string): number {
  let width = 0;

  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;
    if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) continue;
    width += isWideCodePoint(codePoint) ? 2 : 1;
  }

  return width;
}

function isWideCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    codePoint === 0x2329 ||
    codePoint === 0x232a ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6)
  );
}
