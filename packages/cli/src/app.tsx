import { sampleContent } from "@towerlab/content";
import { applyAction, createRun, observeRun, type Observation, type RunAction, type RunState } from "@towerlab/core";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { useEffect, useState } from "react";

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
import { createMapListEntries, deriveVisitedNodeIds, formatMapLines, getEarlierEventsLine, getMapLegendLines, getRecentLogView } from "./view.js";

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
  const view = localizeObservation(observeRun(sampleContent, state), locale);
  const relicNames = view.relics.length > 0 ? view.relics.map((relic) => relic.name).join(", ") : text(locale, "none");
  const isWideLayout = columns >= 110;
  const sidebarWidth = isWideLayout ? Math.min(38, Math.max(30, Math.floor(columns * 0.34))) : undefined;
  const recentLogLimit = rows >= 30 ? 5 : rows >= 24 ? 4 : 3;

  const runAction = (action: RunAction) => {
    try {
      setState((current) => applyAction(sampleContent, current, action));
      setActions((current) => [...current, action]);
      setError(null);
    } catch (actionError) {
      setError(getErrorMessage(actionError, locale));
    }
  };

  const restart = () => {
    setState(createRun(sampleContent, seed));
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
      const removeChoices = view.removableDeckCards;
      const leaveIndex = view.forSale.length + removeChoices.length;
      const choiceIndex = readChoiceIndex(input, leaveIndex + 1);

      if (choiceIndex === null) {
        return;
      }

      if (choiceIndex < view.forSale.length) {
        runAction({ type: "buyShop", saleIndex: choiceIndex });
        return;
      }

      const removableIndex = choiceIndex - view.forSale.length;
      if (removableIndex < removeChoices.length) {
        runAction({ type: "removeDeckCard", deckIndex: removeChoices[removableIndex].deckIndex });
        return;
      }

      runAction({ type: "leaveShop" });
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

      <Box marginTop={1} flexDirection={isWideLayout ? "row" : "column"} flexGrow={1} overflow="hidden">
        <Box
          flexGrow={1}
          flexBasis={0}
          marginRight={isWideLayout ? 1 : 0}
          marginBottom={isWideLayout ? 0 : 1}
          borderStyle="round"
          borderColor="yellow"
          paddingX={1}
          flexDirection="column"
          overflow="hidden"
        >
          <PhaseView observation={view} locale={locale} />
        </Box>

        <Box width={sidebarWidth} flexGrow={isWideLayout ? 0 : 1} flexShrink={0} flexDirection="column" overflow="hidden">
          <Box borderStyle="round" borderColor="magenta" paddingX={1} flexDirection="column" flexShrink={0} overflow="hidden">
            <MapPanel observation={view} actions={actions} locale={locale} />
          </Box>

          <Box
            marginTop={1}
            borderStyle="round"
            borderColor="green"
            paddingX={1}
            flexDirection="column"
            flexGrow={1}
            overflow="hidden"
          >
            <RecentLogPanel observation={view} locale={locale} limit={recentLogLimit} />
          </Box>
        </Box>
      </Box>

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

function PhaseView({ observation, locale }: { observation: Observation; locale: Locale }) {
  if (observation.phase === "combat") {
    return (
      <>
        <Text bold color="yellow">
          {text(locale, "combat")}
        </Text>
        <Text>
          {text(locale, "enemy")} {observation.enemy.name}: {observation.enemy.hp}/{observation.enemy.maxHp} {text(locale, "hp")}
          {observation.enemy.block > 0 ? `${locale === "zh" ? `，${observation.enemy.block} 点${text(locale, "block")}` : `, ${observation.enemy.block} ${text(locale, "block").toLowerCase()}`}` : ""}
        </Text>
        <Text>
          {text(locale, "intent")}: {observation.enemy.intent.description}
        </Text>
        <Text>
          {text(locale, "energy")} {observation.energy} | {text(locale, "block")} {observation.block} | {text(locale, "draw")}{" "}
          {observation.drawPileCount} | {text(locale, "discard")} {observation.discardPileCount}
        </Text>
        <Text bold>{text(locale, "hand")}</Text>
        {observation.hand.length > 0 ? (
          observation.hand.map((card, index) => (
            <Text key={`${index}-${card.id}`} color={card.cost > observation.energy ? "gray" : undefined}>
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
        <Text bold color="yellow">
          {text(locale, "map")}
        </Text>
        <Text>{text(locale, "chooseNextNode")}</Text>
        {observation.nextNodes.map((node, index) => (
          <Text key={node.id}>
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
        <Text>{text(locale, "chooseCampfire")}</Text>
        {observation.restOptions.map((option, index) => (
          <Text key={option.id}>
            {index + 1}. {option.label} - {option.description}
          </Text>
        ))}
        <Text dimColor>
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
        <Text>{text(locale, "chooseReward")}</Text>
        {observation.cardChoices.map((card, index) => (
          <Text key={card.id}>
            {index + 1}. {card.name} [{card.cost}] {card.description}
          </Text>
        ))}
        <Text>s. {text(locale, "skipReward")}</Text>
      </>
    );
  }

  if (observation.phase === "shop") {
    const leaveIndex = observation.forSale.length + observation.removableDeckCards.length + 1;
    const canAffordRemove = observation.gold >= observation.removeDeckCardCost;

    return (
      <>
        <Text bold color="yellow">
          {text(locale, "shop")}
        </Text>
        <Text>{formatText(locale, "shopPrompt", { cost: observation.removeDeckCardCost })}</Text>
        {observation.forSale.map((card, index) => (
          <Text key={card.id}>
            {index + 1}. {text(locale, "buy")} {card.name}
          </Text>
        ))}
        {observation.removableDeckCards.map((entry, index) => (
          <Text key={`${entry.deckIndex}-${entry.card.id}`} color={canAffordRemove ? undefined : "gray"}>
            {observation.forSale.length + index + 1}. {text(locale, "remove")} {entry.card.name}{" "}
            {locale === "zh"
              ? `（牌组 #${entry.deckIndex + 1}，${observation.removeDeckCardCost} ${text(locale, "gold")}）`
              : `(deck #${entry.deckIndex + 1}) for ${observation.removeDeckCardCost} ${text(locale, "gold").toLowerCase()}`}
          </Text>
        ))}
        <Text color="yellow">
          {leaveIndex}. {text(locale, "leaveShop")}
        </Text>
        <Text dimColor>
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
    const optionCount = observation.forSale.length + observation.removableDeckCards.length + 1;
    return <Text dimColor wrap="truncate-end">{formatText(locale, "controlsShop", { max: Math.min(9, optionCount) })}</Text>;
  }

  return <Text dimColor wrap="truncate-end">{text(locale, "controlsEnd")}</Text>;
}

function MapPanel({ observation, actions, locale }: { observation: Observation; actions: RunAction[]; locale: Locale }) {
  const visitedNodeIds = deriveVisitedNodeIds(sampleContent.map, actions);
  const mapEntries = createMapListEntries(sampleContent.map, observation, visitedNodeIds);
  const mapLines = formatMapLines(mapEntries, locale);
  const legendLines = getMapLegendLines(locale);

  return (
    <>
      <Text bold color="magenta">
        {text(locale, "map")}
      </Text>
      {legendLines.map((line) => (
        <Text key={line} dimColor wrap="truncate-end">
          {line}
        </Text>
      ))}
      {mapLines.map((line) => (
        <Text key={line} wrap="truncate-end">
          {line}
        </Text>
      ))}
    </>
  );
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
