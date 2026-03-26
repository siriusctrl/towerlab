import { createSeededContent, listCharacters, type CharacterId } from "@towerlab/content";
import { applyAction, createRun, observeRun, type RunAction, type RunContent, type RunState } from "@towerlab/core";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_LOCALE, formatLogEntries, localizeCharacterName, localizeObservation, text, type Locale } from "../i18n.js";
import { readShopAction, type ShopMenuMode } from "../shop.js";
import { getMapCompactLegendLine } from "../view.js";
import {
  CharacterSelectScreen,
  Controls,
  LIBRARY_SECTION_COUNT,
  MapTreeView,
  PhaseBody,
  RecentLogPanel,
  ReferenceControls,
  ReferencePanel,
  STATUS_SECTION_COUNT,
  StatusBar,
} from "./components.js";
import { useTerminalDimensions } from "./use-terminal-dimensions.js";
import { getErrorMessage, getTerminalTextWidth, readChoiceIndex } from "./utils.js";

export interface AppProps {
  seed: number;
  characterId?: CharacterId;
  locale?: Locale;
}

const characters = listCharacters();
type ReferenceMode = "hidden" | "status" | "library";

export function App({ seed, characterId, locale = DEFAULT_LOCALE }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const { columns, rows } = useTerminalDimensions(stdout);
  const [characterSelectMode, setCharacterSelectMode] = useState<"choose" | "library">("choose");
  const [characterSelectIndex, setCharacterSelectIndex] = useState(0);
  const [selectedCharacterId, setSelectedCharacterId] = useState<CharacterId | undefined>(characterId);
  const [content, setContent] = useState<RunContent | null>(() => characterId ? createSeededContent(seed, characterId) : null);
  const [state, setState] = useState<RunState | null>(() => (characterId ? createRun(createSeededContent(seed, characterId), seed) : null));
  const [actions, setActions] = useState<RunAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>("hidden");
  const [statusSectionIndex, setStatusSectionIndex] = useState(0);
  const [librarySectionIndex, setLibrarySectionIndex] = useState(0);
  const [referenceScrollOffset, setReferenceScrollOffset] = useState(0);
  const stateRef = useRef(state);
  const contentRef = useRef(content);
  const actionsRef = useRef(actions);
  const [shopMenu, setShopMenu] = useState<ShopMenuMode>("top");
  const characterLibraryContents = useMemo(
    () => characters.map((character) => createSeededContent(seed, character.id as CharacterId)),
    [seed],
  );
  const view = content && state ? localizeObservation(observeRun(content, state), locale) : null;
  const currentMap = content && view ? content.acts[view.act - 1]?.map ?? [] : [];
  const recentLogEntries = content && view ? formatLogEntries(content, view.log, locale) : [];
  const relicNames = view && view.relics.length > 0 ? view.relics.map((relic) => relic.name).join(", ") : text(locale, "none");
  const characterName = selectedCharacterId ? localizeCharacterName(selectedCharacterId, locale) : "";
  const compactLegendLine = getMapCompactLegendLine(locale);
  const defaultSidebarWidth = Math.max(32, Math.min(52, Math.max(getTerminalTextWidth(compactLegendLine) + 4, Math.floor(columns * 0.35))));
  const combatSidebarWidth = Math.max(28, Math.min(40, Math.max(getTerminalTextWidth(compactLegendLine) + 2, Math.floor(columns * 0.28))));
  const sidebarWidth = view?.phase === "combat" ? combatSidebarWidth : defaultSidebarWidth;
  const compactMapPhase = view?.phase === "map" && rows <= 24;
  const showSidebar = view ? view.phase !== "map" && rows >= 24 && columns - sidebarWidth >= 48 : false;
  const inspectorWidth = Math.max(42, Math.min(64, Math.max(38, Math.floor(columns * 0.42))));
  const showInspectorSidebar = view ? referenceMode !== "hidden" && rows >= 22 && columns - inspectorWidth >= 48 : false;
  const showReferenceInMain = Boolean(view && referenceMode !== "hidden" && !showInspectorSidebar);
  const showAnySidebar = showSidebar || showInspectorSidebar;
  const hideMainMapLegend = compactMapPhase || (view?.phase === "map" && rows <= 24 && columns < 100);
  const showInlineLog = !showAnySidebar && !showReferenceInMain && rows >= 28;
  const recentLogLimit = rows >= 30 ? 6 : rows >= 26 ? 5 : 4;
  const hpBarWidth = Math.min(20, Math.max(10, Math.floor(columns * 0.15)));
  const referenceHeight = Math.max(8, rows - (compactMapPhase ? 6 : 9));
  const mainPaneWidth = Math.max(32, columns - (showInspectorSidebar ? inspectorWidth + 4 : 2));

  const startCharacterRun = (nextCharacterId: CharacterId, nextIndex: number) => {
    const nextContent = createSeededContent(seed, nextCharacterId);
    const nextState = createRun(nextContent, seed);
    contentRef.current = nextContent;
    stateRef.current = nextState;
    actionsRef.current = [];
    setSelectedCharacterId(nextCharacterId);
    setContent(nextContent);
    setState(nextState);
    setActions([]);
    setError(null);
    setShopMenu("top");
    setReferenceMode("hidden");
    setStatusSectionIndex(0);
    setLibrarySectionIndex(0);
    setReferenceScrollOffset(0);
    setCharacterSelectMode("choose");
    setCharacterSelectIndex(nextIndex);
  };

  const runAction = (action: RunAction) => {
    if (!contentRef.current || !stateRef.current) {
      return;
    }

    try {
      const nextState = applyAction(contentRef.current, stateRef.current, action);
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
    if (!contentRef.current) {
      return;
    }

    const nextState = createRun(contentRef.current, seed);
    stateRef.current = nextState;
    actionsRef.current = [];
    setState(nextState);
    setActions([]);
    setError(null);
    setShopMenu("top");
    setReferenceMode("hidden");
    setStatusSectionIndex(0);
    setLibrarySectionIndex(0);
    setReferenceScrollOffset(0);
  };

  useEffect(() => {
    if (view?.phase !== "shop") {
      setShopMenu("top");
    }
  }, [view?.phase]);

  const toggleReference = (nextMode: Exclude<ReferenceMode, "hidden">) => {
    setReferenceMode((current) => {
      const resolved = current === nextMode ? "hidden" : nextMode;
      setReferenceScrollOffset(0);
      if (resolved === "status" && current !== "status") {
        setStatusSectionIndex(0);
      }
      if (resolved === "library" && current !== "library") {
        setLibrarySectionIndex(0);
      }
      return resolved;
    });
  };

  useInput((input, key) => {
    if ((key.ctrl && input === "c") || input === "q") {
      exit();
      return;
    }

    if (!view) {
      if (input === "l") {
        setCharacterSelectMode((current) => {
          if (current === "choose") {
            setLibrarySectionIndex(0);
            setReferenceScrollOffset(0);
            return "library";
          }
          return "choose";
        });
        return;
      }

      if (characterSelectMode === "library") {
        if (key.escape) {
          setCharacterSelectMode("choose");
          setReferenceScrollOffset(0);
          return;
        }

        if (input === "[" || key.leftArrow) {
          setLibrarySectionIndex((current) => (current - 1 + LIBRARY_SECTION_COUNT) % LIBRARY_SECTION_COUNT);
          setReferenceScrollOffset(0);
          return;
        }

        if (input === "]" || key.rightArrow) {
          setLibrarySectionIndex((current) => (current + 1) % LIBRARY_SECTION_COUNT);
          setReferenceScrollOffset(0);
          return;
        }

        if (input === "j" || key.downArrow) {
          setReferenceScrollOffset((current) => current + 1);
          return;
        }

        if (input === "k" || key.upArrow) {
          setReferenceScrollOffset((current) => Math.max(0, current - 1));
          return;
        }

        const choiceIndex = readChoiceIndex(input, characters.length);
        if (choiceIndex !== null) {
          setCharacterSelectIndex(choiceIndex);
          setReferenceScrollOffset(0);
          return;
        }

        return;
      }

      const choiceIndex = readChoiceIndex(input, characters.length);
      if (choiceIndex !== null) {
        startCharacterRun(characters[choiceIndex].id as CharacterId, choiceIndex);
      }
      return;
    }

    if (input === "d") {
      toggleReference("status");
      return;
    }

    if (input === "l") {
      toggleReference("library");
      return;
    }

    if (referenceMode !== "hidden") {
      if (key.escape) {
        setReferenceMode("hidden");
        setReferenceScrollOffset(0);
        return;
      }

      if (input === "[" || key.leftArrow) {
        if (referenceMode === "status") {
          setStatusSectionIndex((current) => (current - 1 + STATUS_SECTION_COUNT) % STATUS_SECTION_COUNT);
        } else {
          setLibrarySectionIndex((current) => (current - 1 + LIBRARY_SECTION_COUNT) % LIBRARY_SECTION_COUNT);
        }
        setReferenceScrollOffset(0);
        return;
      }

      if (input === "]" || key.rightArrow) {
        if (referenceMode === "status") {
          setStatusSectionIndex((current) => (current + 1) % STATUS_SECTION_COUNT);
        } else {
          setLibrarySectionIndex((current) => (current + 1) % LIBRARY_SECTION_COUNT);
        }
        setReferenceScrollOffset(0);
        return;
      }

      if (input === "j" || key.downArrow) {
        setReferenceScrollOffset((current) => current + 1);
        return;
      }

      if (input === "k" || key.upArrow) {
        setReferenceScrollOffset((current) => Math.max(0, current - 1));
        return;
      }

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

    if (view.phase === "blessing") {
      const choiceIndex = readChoiceIndex(input, view.blessings.length);
      if (choiceIndex !== null) {
        runAction({ type: "chooseBlessing", blessingId: view.blessings[choiceIndex].id });
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

  if (!view) {
    return (
        <CharacterSelectScreen
          characters={characters}
          contents={characterLibraryContents}
          locale={locale}
          libraryHeight={Math.max(8, rows - 9)}
          showLibrary={characterSelectMode === "library"}
          selectedCharacterIndex={characterSelectIndex}
          librarySectionIndex={librarySectionIndex}
        referenceScrollOffset={referenceScrollOffset}
      />
    );
  }

  return (
    <Box flexDirection="column" width={columns} height={rows} overflow="hidden">
      <Box flexDirection="column" flexShrink={0} paddingX={1} overflow="hidden">
        <StatusBar observation={view} locale={locale} characterName={characterName} relicNames={relicNames} hpBarWidth={hpBarWidth} compact={compactMapPhase} />
      </Box>
      {!compactMapPhase ? (
        <Text dimColor wrap="truncate-end">
          {"─".repeat(ruleWidth)}
        </Text>
      ) : null}

      <Box flexDirection="row" flexGrow={1} overflow="hidden">
          <Box flexDirection="column" flexGrow={1} paddingLeft={1} overflow="hidden">
          {view.phase === "map" && !showReferenceInMain ? (
            <MapTreeView map={currentMap} observation={view} actions={actions} locale={locale} width={mainPaneWidth} showLegend={!hideMainMapLegend} />
          ) : null}
          {showReferenceInMain ? (
            <ReferencePanel
              content={content!}
              state={state!}
              locale={locale}
              referenceMode={referenceMode === "hidden" ? "status" : referenceMode}
              statusSectionIndex={statusSectionIndex}
              librarySectionIndex={librarySectionIndex}
              scrollOffset={referenceScrollOffset}
              height={referenceHeight}
            />
          ) : (
            <>
              <PhaseBody content={content!} observation={view} locale={locale} shopMenu={shopMenu} hpBarWidth={hpBarWidth} compactMapPhase={compactMapPhase} />
              {showInlineLog ? (
                <Box marginTop={1} flexDirection="column" overflow="hidden">
                  <RecentLogPanel entries={recentLogEntries} locale={locale} limit={recentLogLimit} />
                </Box>
              ) : null}
            </>
          )}
        </Box>

        {showInspectorSidebar ? (
          <Box
            flexDirection="column"
            width={inspectorWidth}
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
            <ReferencePanel
              content={content!}
              state={state!}
              locale={locale}
              referenceMode={referenceMode === "hidden" ? "status" : referenceMode}
              statusSectionIndex={statusSectionIndex}
              librarySectionIndex={librarySectionIndex}
              scrollOffset={referenceScrollOffset}
              height={referenceHeight}
            />
          </Box>
        ) : showSidebar ? (
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
            <MapTreeView map={currentMap} observation={view} actions={actions} locale={locale} width={sidebarWidth - 3} compact compactLegendLine={compactLegendLine} />
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
        <ReferenceControls locale={locale} referenceMode={referenceMode} />
        {error ? (
          <Text color="red" wrap="truncate-end">
            {text(locale, "inputError")}: {error}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
