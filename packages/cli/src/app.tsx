import { sampleContent } from "@towerlab/content";
import { applyAction, createRun, observeRun, type Observation, type RunAction, type RunState } from "@towerlab/core";
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
import { createShopBindings, readShopAction } from "./shop.js";
import { createMapTreeRows, deriveVisitedNodeIds, getEarlierEventsLine, getRecentLogView, type MapTreeCell } from "./view.js";

export interface AppProps {
  seed: number;
  locale?: Locale;
}

export function App({ seed, locale = DEFAULT_LOCALE }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { columns, rows } = useTerminalDimensions(stdout);
  const [state, setState] = useState<RunState>(() => createRun(sampleContent, seed));
  const [actions, setActions] = useState<RunAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const actionsRef = useRef(actions);
  const view = localizeObservation(observeRun(sampleContent, state), locale);
  const relicNames = view.relics.length > 0 ? view.relics.map((relic) => relic.name).join(", ") : text(locale, "none");
  const showRecentLog = rows >= 28;
  const recentLogLimit = rows >= 30 ? 5 : rows >= 24 ? 4 : 3;

  const runAction = (action: RunAction) => {
    try {
      const nextState = applyAction(sampleContent, stateRef.current, action);
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
    const nextState = createRun(sampleContent, seed);
    stateRef.current = nextState;
    actionsRef.current = [];
    setState(nextState);
    setActions([]);
    setError(null);
  };

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
      const action = readShopAction(input, view);
      if (action) {
        runAction(action);
      }
      return;
    }

    if (input === "r") {
      restart();
    }
  });

  return (
    <Box flexDirection="column" width={columns} height={rows} overflow="hidden">
      <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column" flexShrink={0} overflow="hidden">
        <Text bold color="cyan">
          {text(locale, "snapshotTitle")}
        </Text>
        <Text wrap="truncate-end">
          {text(locale, "seed")} {view.seed} | {text(locale, "floor")} {view.floor} | {text(locale, "node")}{" "}
          {formatNodeLabel(view.currentNode, locale)}
        </Text>
        <Text wrap="truncate-end">
          {text(locale, "hp")} {view.hp}/{view.maxHp} | {text(locale, "gold")} {view.gold}
        </Text>
        <Text dimColor wrap="truncate-end">
          {text(locale, "relics")}: {relicNames}
        </Text>
      </Box>

      <Box marginTop={1} borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column" flexGrow={1} overflow="hidden">
        <PhaseView observation={view} actions={actions} locale={locale} />
      </Box>

      {showRecentLog ? (
        <Box marginTop={1} borderStyle="round" borderColor="green" paddingX={1} flexDirection="column" flexShrink={0} overflow="hidden">
          <RecentLogPanel observation={view} locale={locale} limit={recentLogLimit} />
        </Box>
      ) : null}

      <Box marginTop={1} flexDirection="column" flexShrink={0} overflow="hidden">
        <Controls observation={view} locale={locale} />
        {error ? (
          <Text color="red" wrap="truncate-end">
            {text(locale, "inputError")}: {error}
          </Text>
        ) : null}
      </Box>
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

function PhaseView({ observation, actions, locale }: { observation: Observation; actions: RunAction[]; locale: Locale }) {
  const showMap = observation.phase === "map";

  return (
    <>
      {showMap ? <MapTreeView observation={observation} actions={actions} locale={locale} /> : null}
      <Box marginTop={showMap ? 1 : 0} flexDirection="column" overflow="hidden">
        <PhaseBody observation={observation} locale={locale} />
      </Box>
    </>
  );
}

function MapTreeView({ observation, actions, locale }: { observation: Observation; actions: RunAction[]; locale: Locale }) {
  const visitedNodeIds = deriveVisitedNodeIds(sampleContent.map, actions);
  const mapRows = createMapTreeRows(sampleContent.map, observation, locale, visitedNodeIds);

  return (
    <>
      <Text bold color="magenta">
        {text(locale, "map")}
      </Text>
      {mapRows.map((row, rowIndex) => (
        <Text key={rowIndex} wrap="truncate-end">
          {row.map((cell, cellIndex) => (
            <Text
              key={`${rowIndex}-${cellIndex}`}
              color={getMapCellColor(cell)}
              dimColor={cell.status === "closed" || cell.status === "past" || cell.status === "connector"}
              bold={cell.status === "current" || cell.status === "next"}
            >
              {cell.text}
            </Text>
          ))}
        </Text>
      ))}
    </>
  );
}

function PhaseBody({ observation, locale }: { observation: Observation; locale: Locale }) {
  if (observation.phase === "combat") {
    return (
      <>
        <Text bold color="yellow">
          {text(locale, "combat")}
        </Text>
        <Text wrap="truncate-end">
          {text(locale, "enemy")} {observation.enemy.name}: {observation.enemy.hp}/{observation.enemy.maxHp} {text(locale, "hp")}
          {observation.enemy.block > 0 ? `${locale === "zh" ? `，${observation.enemy.block} 点${text(locale, "block")}` : `, ${observation.enemy.block} ${text(locale, "block").toLowerCase()}`}` : ""}
        </Text>
        <Text wrap="truncate-end">
          {text(locale, "intent")}: {observation.enemy.intent.description}
        </Text>
        <Text wrap="truncate-end">
          {text(locale, "energy")} {observation.energy} | {text(locale, "block")} {observation.block} | {text(locale, "draw")}{" "}
          {observation.drawPileCount} | {text(locale, "discard")} {observation.discardPileCount}
        </Text>
        <Text dimColor wrap="truncate-end">
          {text(locale, "node")}: {formatNodeLabel(observation.currentNode, locale)}
        </Text>
        <Text bold>{text(locale, "hand")}</Text>
        {observation.hand.length > 0 ? (
          observation.hand.map((card, index) => (
            <Text key={`${index}-${card.id}`} color={card.cost > observation.energy ? "gray" : undefined} wrap="truncate-end">
              {index + 1}. {card.name} [{card.cost}] {card.description}
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
        <Text wrap="truncate-end">{text(locale, "chooseNextNode")}</Text>
        {observation.nextNodes.map((node, index) => (
          <Text key={node.id} wrap="truncate-end">
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
    const shopBindings = createShopBindings(observation);
    const buyHotkeys = shopBindings.buyOptions.filter((option) => option.key !== null);
    const removeHotkeys = shopBindings.removeOptions.filter((option) => option.key !== null);

    return (
      <>
        <Text bold color="yellow">
          {text(locale, "shop")}
        </Text>
        <Text wrap="truncate-end">{formatText(locale, "shopPrompt", { cost: observation.removeDeckCardCost })}</Text>
        <Text bold>{text(locale, "shopBuySection")}</Text>
        {shopBindings.buyOptions.map((option) => (
          <Text key={option.card.id} color={option.key ? undefined : "gray"} wrap="truncate-end">
            {option.key ? `${option.key}. ` : "· "}
            {option.card.name} [{option.card.cost}]
          </Text>
        ))}
        {shopBindings.buyOptions.length > 0 && buyHotkeys.length === 0 ? (
          <Text dimColor wrap="truncate-end">
            {text(locale, "shopNoAffordableBuys")}
          </Text>
        ) : null}
        <Text bold>{formatText(locale, "shopRemoveSection", { cost: observation.removeDeckCardCost })}</Text>
        {shopBindings.removeOptions.map((option) => (
          <Text key={`${option.deckIndex}-${option.card.id}`} color={option.key ? undefined : "gray"} wrap="truncate-end">
            {option.key ? `${option.key}. ` : "· "}
            {text(locale, "remove")} {option.card.name} {formatText(locale, "shopDeckSlot", { index: option.deckIndex + 1 })}
          </Text>
        ))}
        {shopBindings.removeOptions.length > 0 && removeHotkeys.length === 0 ? (
          <Text dimColor wrap="truncate-end">
            {text(locale, "shopNoAffordableRemovals")}
          </Text>
        ) : null}
        {shopBindings.removeOptions.length === 0 ? <Text dimColor wrap="truncate-end">{text(locale, "noRemovableCards")}</Text> : null}
        <Text color="yellow">{shopBindings.leaveKey}. {text(locale, "leaveShop")}</Text>
        <Text dimColor wrap="truncate-end">
          {text(locale, "next")}: {observation.nextNodes.map((node) => formatNodeLabel(node, locale)).join(", ")}
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

function Controls({ observation, locale }: { observation: Observation; locale: Locale }) {
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

function getMapCellColor(cell: MapTreeCell): string | undefined {
  if (cell.status === "current") {
    return "green";
  }

  if (cell.status === "next") {
    return "yellow";
  }

  if (cell.status === "future") {
    return "white";
  }

  if (cell.status === "past" || cell.status === "closed" || cell.status === "connector") {
    return "gray";
  }

  return undefined;
}
