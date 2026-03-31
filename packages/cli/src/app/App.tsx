import { createSeededContent, listCharacters, type CharacterId } from "@towerlab/content";
import { applyAction, createRun, observeRun, type RunAction, type RunContent, type RunState } from "@towerlab/core";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import { useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_LOCALE, formatLogEntries, localizeCharacterName, localizeObservation, text, type Locale } from "../i18n.js";
import { readShopAction, SHOP_BUY_PAGE_SIZE, SHOP_REMOVE_PAGE_SIZE, type ShopMenuMode } from "../shop.js";
import { getMapCompactLegendLine } from "../view.js";
import {
  CombatEffectsPanel,
  CombatEffectsSummary,
  CharacterSelectScreen,
  Controls,
  COMBAT_HAND_PAGE_SIZE,
  getCharacterSelectLibraryMaxScroll,
  getReferencePanelMaxScroll,
  LIBRARY_SECTION_COUNT,
  MapTreeView,
  RestDeckUpgradeCard,
  PhaseBody,
  RecentLogPanel,
  ReferenceControls,
  ReferencePanel,
  REST_UPGRADE_PAGE_SIZE,
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
  const [restMode, setRestMode] = useState<"options" | "upgrade">("options");
  const [restUpgradePage, setRestUpgradePage] = useState(0);
  const [combatHandPage, setCombatHandPage] = useState(0);
  const [shopBuyPage, setShopBuyPage] = useState(0);
  const [shopRemovePage, setShopRemovePage] = useState(0);
  const [quitConfirming, setQuitConfirming] = useState(false);
  const stateRef = useRef(state);
  const contentRef = useRef(content);
  const actionsRef = useRef(actions);
  const [shopMenu, setShopMenu] = useState<ShopMenuMode>("top");
  const characterLibraryContents = useMemo(
    () => characters.map((character) => createSeededContent(seed, character.id as CharacterId)),
    [seed],
  );
  const view = content && state ? localizeObservation(observeRun(content, state), locale, content) : null;
  const currentMap = content && view ? content.acts[view.act - 1]?.map ?? [] : [];
  const restUpgradeCards = useMemo<RestDeckUpgradeCard[]>(() => (view?.phase === "rest" ? view.upgradableDeckCards : []), [view]);
  const recentLogEntries = content && view ? formatLogEntries(content, view.log, locale) : [];
  const relicNames = view && view.relics.length > 0 ? view.relics.map((relic) => relic.name).join(", ") : text(locale, "none");
  const characterName = selectedCharacterId ? localizeCharacterName(selectedCharacterId, locale) : "";
  const compactLegendLine = getMapCompactLegendLine(locale);
  const defaultSidebarWidth = Math.max(32, Math.min(52, Math.max(getTerminalTextWidth(compactLegendLine) + 4, Math.floor(columns * 0.35))));
  const combatSidebarWidth = Math.max(34, Math.min(44, Math.max(getTerminalTextWidth(compactLegendLine) + 4, Math.floor(columns * 0.32))));
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
  const characterSelectLibraryHeight = Math.max(8, rows - 9);
  const mainPaneWidth = Math.max(32, columns - (showInspectorSidebar ? inspectorWidth + 4 : 2));
  const referencePanelWidth = showInspectorSidebar ? inspectorWidth - 3 : mainPaneWidth - 2;
  const characterSelectLibraryWidth = Math.max(24, columns - 4);
  const shopBuyPageCount = view?.phase === "shop" ? Math.max(1, Math.ceil(view.forSale.length / SHOP_BUY_PAGE_SIZE)) : 1;
  const shopRemovePageCount = view?.phase === "shop" ? Math.max(1, Math.ceil(view.removableDeckCards.length / SHOP_REMOVE_PAGE_SIZE)) : 1;
  const resolvedShopBuyPage = view?.phase === "shop" ? Math.min(Math.max(shopBuyPage, 0), shopBuyPageCount - 1) : 0;
  const resolvedShopRemovePage = view?.phase === "shop" ? Math.min(Math.max(shopRemovePage, 0), shopRemovePageCount - 1) : 0;
  const referenceMaxScroll =
    content && state && referenceMode !== "hidden"
      ? getReferencePanelMaxScroll(
          content,
          state,
          locale,
          referenceMode,
          statusSectionIndex,
          librarySectionIndex,
          referenceHeight,
          referencePanelWidth,
        )
      : 0;
  const characterSelectLibraryMaxScroll =
    !view && characterSelectMode === "library"
      ? getCharacterSelectLibraryMaxScroll(
          characterLibraryContents[characterSelectIndex] ?? characterLibraryContents[0]!,
          locale,
          librarySectionIndex,
          characterSelectLibraryHeight,
          characterSelectLibraryWidth,
        )
      : 0;

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
    setRestMode("options");
    setRestUpgradePage(0);
    setCombatHandPage(0);
    setShopBuyPage(0);
    setShopRemovePage(0);
    setQuitConfirming(false);
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
      setQuitConfirming(false);
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
    setRestMode("options");
    setRestUpgradePage(0);
    setCombatHandPage(0);
    setShopBuyPage(0);
    setShopRemovePage(0);
    setQuitConfirming(false);
  };

  useEffect(() => {
    if (view?.phase !== "shop") {
      setShopMenu("top");
      setShopBuyPage(0);
      setShopRemovePage(0);
    }
  }, [view?.phase]);

  useEffect(() => {
    if (view?.phase !== "combat") {
      setCombatHandPage(0);
    }
  }, [view?.phase]);

  useEffect(() => {
    if (view?.phase === "rest") {
      setRestMode(view.mode === "upgrade" ? "upgrade" : "options");
      if (view.mode !== "upgrade") {
        setRestUpgradePage(0);
      }
      return;
    }

    setRestMode("options");
    setRestUpgradePage(0);
  }, [view]);

  useEffect(() => {
    setReferenceScrollOffset((current) => Math.min(current, view ? referenceMaxScroll : characterSelectLibraryMaxScroll));
  }, [view, referenceMaxScroll, characterSelectLibraryMaxScroll]);

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
    if (key.ctrl && input === "c") {
      exit();
      return;
    }

    if (quitConfirming) {
      if (key.escape) {
        exit();
        return;
      }

      setQuitConfirming(false);
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

      if (key.escape) {
        if (characterSelectMode === "library") {
          setCharacterSelectMode("choose");
          setReferenceScrollOffset(0);
          return;
        }

        exit();
        return;
      }

      if (characterSelectMode === "library") {
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
          setReferenceScrollOffset((current) => Math.min(current + 1, characterSelectLibraryMaxScroll));
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
      setQuitConfirming(false);
      toggleReference("status");
      return;
    }

    if (input === "l") {
      setQuitConfirming(false);
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
        setReferenceScrollOffset((current) => Math.min(current + 1, referenceMaxScroll));
        return;
      }

      if (input === "k" || key.upArrow) {
        setReferenceScrollOffset((current) => Math.max(0, current - 1));
        return;
      }

      return;
    }

    if (key.escape) {
      setQuitConfirming(true);
      return;
    }

    if (view.phase === "combat") {
      const totalPages = Math.max(1, Math.ceil(view.hand.length / COMBAT_HAND_PAGE_SIZE));
      const currentPage = Math.min(combatHandPage, totalPages - 1);
      const pageStart = currentPage * COMBAT_HAND_PAGE_SIZE;
      const pageCards = view.hand.slice(pageStart, pageStart + COMBAT_HAND_PAGE_SIZE);

      if (input === "[" || key.leftArrow) {
        if (totalPages > 1) {
          setCombatHandPage((page) => (page - 1 + totalPages) % totalPages);
        }
        return;
      }

      if (input === "]" || key.rightArrow) {
        if (totalPages > 1) {
          setCombatHandPage((page) => (page + 1) % totalPages);
        }
        return;
      }

      if (input === " ") {
        runAction({ type: "endTurn" });
        return;
      }

      const handIndex = readChoiceIndex(input, pageCards.length);
      if (handIndex !== null) {
        runAction({ type: "playCard", handIndex: pageStart + handIndex });
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
      const isUpgradeMode = view.mode === "upgrade" || restMode === "upgrade";

      if (isUpgradeMode) {
        const totalPages = Math.max(1, Math.ceil(restUpgradeCards.length / REST_UPGRADE_PAGE_SIZE));
        const currentPage = Math.min(restUpgradePage, totalPages - 1);
        const pageStart = currentPage * REST_UPGRADE_PAGE_SIZE;
        const pageCards = restUpgradeCards.slice(pageStart, pageStart + REST_UPGRADE_PAGE_SIZE);

        if (input === "b") {
          setRestMode("options");
          setRestUpgradePage(0);
          return;
        }

        if (input === "[" || key.leftArrow) {
          if (totalPages > 1) {
            setRestUpgradePage((page) => (page - 1 + totalPages) % totalPages);
          }
          return;
        }

        if (input === "]" || key.rightArrow) {
          if (totalPages > 1) {
            setRestUpgradePage((page) => (page + 1) % totalPages);
          }
          return;
        }

        const cardIndex = readChoiceIndex(input, pageCards.length);
        if (cardIndex !== null) {
          const deckIndex = pageCards[cardIndex]?.deckIndex;

          if (deckIndex !== undefined) {
            runAction({ type: "upgradeRestCard", deckIndex });
          }
        }

        return;
      }

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

      if (view.mode === "cards") {
        if (input === "b") {
          runAction({ type: "backReward" });
          return;
        }

        const rewardIndex = readChoiceIndex(input, view.cardChoices.length);
        if (rewardIndex !== null) {
          runAction({ type: "takeRewardCard", rewardIndex });
        }
        return;
      }

      const rewardIndex = readChoiceIndex(input, view.rewardItems.length);
      if (rewardIndex !== null) {
        runAction({ type: "takeReward", rewardIndex: view.rewardItems[rewardIndex]!.rewardIndex });
      }
      return;
    }

    if (view.phase === "shop") {
      if (shopMenu === "buy") {
        const totalPages = shopBuyPageCount;

        if (input === "[" || key.leftArrow) {
          if (totalPages > 1) {
            setShopBuyPage((page) => {
              const normalizedPage = Math.min(Math.max(page, 0), totalPages - 1);
              return (normalizedPage - 1 + totalPages) % totalPages;
            });
          }
          return;
        }

        if (input === "]" || key.rightArrow) {
          if (totalPages > 1) {
            setShopBuyPage((page) => {
              const normalizedPage = Math.min(Math.max(page, 0), totalPages - 1);
              return (normalizedPage + 1) % totalPages;
            });
          }
          return;
        }
      }

      if (shopMenu === "remove") {
        const totalPages = shopRemovePageCount;

        if (input === "[" || key.leftArrow) {
          if (totalPages > 1) {
            setShopRemovePage((page) => {
              const normalizedPage = Math.min(Math.max(page, 0), totalPages - 1);
              return (normalizedPage - 1 + totalPages) % totalPages;
            });
          }
          return;
        }

        if (input === "]" || key.rightArrow) {
          if (totalPages > 1) {
            setShopRemovePage((page) => {
              const normalizedPage = Math.min(Math.max(page, 0), totalPages - 1);
              return (normalizedPage + 1) % totalPages;
            });
          }
          return;
        }
      }

      const result = readShopAction(input, view, shopMenu, resolvedShopBuyPage, resolvedShopRemovePage);

      if (result) {
        if (result.type === "openMenu") {
          if (result.menu === "buy") {
            setShopBuyPage(0);
          }
          if (result.menu === "remove") {
            setShopRemovePage(0);
          }
          if (result.menu === "top") {
            setShopBuyPage(0);
            setShopRemovePage(0);
          }
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
          libraryHeight={characterSelectLibraryHeight}
          showLibrary={characterSelectMode === "library"}
          selectedCharacterIndex={characterSelectIndex}
          librarySectionIndex={librarySectionIndex}
          referenceScrollOffset={referenceScrollOffset}
          width={characterSelectLibraryWidth}
      />
    );
  }

  return (
    <Box flexDirection="column" width={columns} height={rows} overflow="hidden">
      <Box flexDirection="column" flexShrink={0} paddingX={1} overflow="hidden">
        <StatusBar observation={view} locale={locale} characterName={characterName} relicNames={relicNames} hpBarWidth={hpBarWidth} compact={compactMapPhase} />
        {!showSidebar && view.phase === "combat" ? (
          <CombatEffectsSummary effects={view.activePassives ?? []} locale={locale} />
        ) : null}
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
              width={referencePanelWidth}
            />
          ) : (
            <>
              <PhaseBody
                content={content!}
                observation={view}
                locale={locale}
                shopMenu={shopMenu}
                shopBuyPage={resolvedShopBuyPage}
                shopRemovePage={resolvedShopRemovePage}
                combatHandPage={combatHandPage}
                restMode={restMode}
                restUpgradeCards={restUpgradeCards}
                restUpgradePage={restUpgradePage}
                hpBarWidth={hpBarWidth}
                compactMapPhase={compactMapPhase}
              />
              {view.phase === "combat" && showSidebar && (view.activePassives?.length ?? 0) > 0 ? (
                <Box marginTop={1} flexDirection="column" overflow="hidden">
                  <CombatEffectsPanel effects={view.activePassives ?? []} locale={locale} />
                </Box>
              ) : null}
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
              width={referencePanelWidth}
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
        <Controls
          observation={view}
          locale={locale}
          shopMenu={shopMenu}
          shopBuyPageCount={view.phase === "shop" ? Math.max(1, Math.ceil(view.forSale.length / SHOP_BUY_PAGE_SIZE)) : 1}
          shopRemovePageCount={
            view.phase === "shop" ? Math.max(1, Math.ceil(view.removableDeckCards.length / SHOP_REMOVE_PAGE_SIZE)) : 1
          }
          restMode={restMode}
          restUpgradePageCount={Math.max(1, Math.ceil(restUpgradeCards.length / REST_UPGRADE_PAGE_SIZE))}
          combatHandPageCount={view.phase === "combat" ? Math.max(1, Math.ceil(view.hand.length / COMBAT_HAND_PAGE_SIZE)) : 1}
        />
        <ReferenceControls locale={locale} referenceMode={referenceMode} />
        {quitConfirming ? (
          <Text color="yellow" wrap="truncate-end">
            {text(locale, "quitConfirm")}
          </Text>
        ) : null}
        {error ? (
          <Text color="red" wrap="truncate-end">
            {text(locale, "inputError")}: {error}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
