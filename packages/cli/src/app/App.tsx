import { createSeededContent } from "@towerlab/content";
import { applyAction, createRun, observeRun, type RunAction, type RunState } from "@towerlab/core";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { useEffect, useRef, useState } from "react";

import { DEFAULT_LOCALE, formatLogEntries, localizeObservation, text, type Locale } from "../i18n.js";
import { readShopAction, type ShopMenuMode } from "../shop.js";
import { getMapCompactLegendLine } from "../view.js";
import { Controls, MapTreeView, PhaseBody, RecentLogPanel, StatusBar } from "./components.js";
import { useTerminalDimensions } from "./use-terminal-dimensions.js";
import { getErrorMessage, getTerminalTextWidth, readChoiceIndex } from "./utils.js";

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
  const recentLogEntries = formatLogEntries(content, view.log, locale);
  const relicNames = view.relics.length > 0 ? view.relics.map((relic) => relic.name).join(", ") : text(locale, "none");
  const compactLegendLine = getMapCompactLegendLine(locale);
  const sidebarWidth = Math.max(32, Math.min(52, Math.max(getTerminalTextWidth(compactLegendLine) + 4, Math.floor(columns * 0.35))));
  const compactMapPhase = view.phase === "map" && rows <= 24;
  const showSidebar = view.phase !== "map" && rows >= 24 && columns - sidebarWidth >= 48;
  const hideMainMapLegend = compactMapPhase || (view.phase === "map" && rows <= 24 && columns < 100);
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

  const ruleWidth = Math.max(0, columns);

  return (
    <Box flexDirection="column" width={columns} height={rows} overflow="hidden">
      <Box flexDirection="column" flexShrink={0} paddingX={1} overflow="hidden">
        <StatusBar observation={view} locale={locale} relicNames={relicNames} hpBarWidth={hpBarWidth} compact={compactMapPhase} />
      </Box>
      {!compactMapPhase ? (
        <Text dimColor wrap="truncate-end">
          {"─".repeat(ruleWidth)}
        </Text>
      ) : null}

      <Box flexDirection="row" flexGrow={1} overflow="hidden">
        <Box flexDirection="column" flexGrow={1} paddingLeft={1} overflow="hidden">
          {!showSidebar && view.phase === "map" ? (
            <MapTreeView map={content.map} observation={view} actions={actions} locale={locale} width={columns - 2} showLegend={!hideMainMapLegend} />
          ) : null}
          <PhaseBody observation={view} locale={locale} shopMenu={shopMenu} hpBarWidth={hpBarWidth} compactMapPhase={compactMapPhase} />
          {showInlineLog ? (
            <Box marginTop={1} flexDirection="column" overflow="hidden">
              <RecentLogPanel entries={recentLogEntries} locale={locale} limit={recentLogLimit} />
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
              <RecentLogPanel entries={recentLogEntries} locale={locale} limit={recentLogLimit} />
            </Box>
          </Box>
        ) : null}
      </Box>

      {!compactMapPhase ? (
        <Text dimColor wrap="truncate-end">
          {"─".repeat(ruleWidth)}
        </Text>
      ) : null}
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
