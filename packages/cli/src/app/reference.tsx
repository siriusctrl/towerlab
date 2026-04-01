import type { CharacterDefinition, RunContent, RunState } from "@towerlab/core";
import { Box, Text } from "ink";

import {
  formatCardEffectLines,
  formatText,
  type CardLike,
  type CliCardDefinition,
  localizeCardDefinition,
  localizeCardKeyword,
  localizeCharacterName,
  localizeCharacterSummary,
  localizeRelicDefinition,
  text,
  type Locale,
} from "../i18n.js";
import { getTerminalTextWidth } from "./utils.js";

type ReferenceMode = "hidden" | "status" | "library";
type LibrarySection = "starter" | "common" | "rare" | "epic" | "relics" | "terms";
type StatusSection = "deck" | "relics";
type ReferenceLine = {
  text: string;
  bold?: boolean;
  dim?: boolean;
  color?: string;
};
type ReferenceEntry = ReferenceLine[];
type ReferenceSection<Key extends string> = {
  key: Key;
  title: string;
  entries: ReferenceEntry[];
};

const LIBRARY_SECTIONS: LibrarySection[] = ["starter", "common", "rare", "epic", "relics", "terms"];
const STATUS_SECTIONS: StatusSection[] = ["deck", "relics"];

export const LIBRARY_SECTION_COUNT = LIBRARY_SECTIONS.length;
export const STATUS_SECTION_COUNT = STATUS_SECTIONS.length;

export function getReferencePanelMaxScroll(
  content: RunContent,
  state: RunState,
  locale: Locale,
  referenceMode: Exclude<ReferenceMode, "hidden">,
  statusSectionIndex: number,
  librarySectionIndex: number,
  height: number,
  width: number,
): number {
  const section =
    referenceMode === "status"
      ? buildStatusSection(content, state, locale, STATUS_SECTIONS[statusSectionIndex] ?? STATUS_SECTIONS[0]!)
      : buildLibrarySection(content, locale, LIBRARY_SECTIONS[librarySectionIndex] ?? LIBRARY_SECTIONS[0]!);
  const headerLines = 4;
  const bodyHeight = Math.max(4, height - headerLines);
  return getMaxReferenceEntryScroll(wrapReferenceEntries(section.entries, width), bodyHeight);
}

export function getCharacterSelectLibraryMaxScroll(
  content: RunContent,
  locale: Locale,
  librarySectionIndex: number,
  height: number,
  width: number,
): number {
  const section = buildLibrarySection(content, locale, LIBRARY_SECTIONS[librarySectionIndex] ?? LIBRARY_SECTIONS[0]!);
  const bodyHeight = Math.max(4, height - 4);
  return getMaxReferenceEntryScroll(wrapReferenceEntries(section.entries, width), bodyHeight);
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
  width,
}: {
  content: RunContent;
  state: RunState;
  locale: Locale;
  referenceMode: Exclude<ReferenceMode, "hidden">;
  statusSectionIndex: number;
  librarySectionIndex: number;
  scrollOffset: number;
  height: number;
  width: number;
}) {
  const section =
    referenceMode === "status"
      ? buildStatusSection(content, state, locale, STATUS_SECTIONS[statusSectionIndex] ?? STATUS_SECTIONS[0]!)
      : buildLibrarySection(content, locale, LIBRARY_SECTIONS[librarySectionIndex] ?? LIBRARY_SECTIONS[0]!);
  const characterName = localizeCharacterName(content.character.id, locale);
  const headerLines = 4;
  const bodyHeight = Math.max(4, height - headerLines);
  const wrappedEntries = wrapReferenceEntries(section.entries, width);
  const maxScroll = getMaxReferenceEntryScroll(wrappedEntries, bodyHeight);
  const clampedScroll = Math.min(scrollOffset, maxScroll);
  const visibleEntries = getVisibleReferenceEntries(wrappedEntries, clampedScroll, bodyHeight);
  const visibleLines = visibleEntries.flat();
  const start = wrappedEntries.length === 0 ? 0 : clampedScroll + 1;
  const end = wrappedEntries.length === 0 ? 0 : Math.min(wrappedEntries.length, clampedScroll + visibleEntries.length);

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
        {formatText(locale, "referenceScrollStatus", { start, end, total: section.entries.length })}
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

export function CharacterSelectScreen({
  characters,
  contents,
  locale,
  libraryHeight,
  showLibrary,
  selectedCharacterIndex,
  librarySectionIndex,
  referenceScrollOffset,
  width,
}: {
  characters: CharacterDefinition[];
  contents: RunContent[];
  locale: Locale;
  libraryHeight: number;
  showLibrary: boolean;
  selectedCharacterIndex: number;
  librarySectionIndex: number;
  referenceScrollOffset: number;
  width: number;
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
          width={width}
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
  width,
}: {
  content: RunContent;
  locale: Locale;
  librarySectionIndex: number;
  scrollOffset: number;
  height: number;
  width: number;
}) {
  const section = buildLibrarySection(content, locale, LIBRARY_SECTIONS[librarySectionIndex] ?? LIBRARY_SECTIONS[0]!);
  const characterName = localizeCharacterName(content.character.id, locale);
  const bodyHeight = Math.max(4, height - 4);
  const wrappedEntries = wrapReferenceEntries(section.entries, width);
  const maxScroll = getMaxReferenceEntryScroll(wrappedEntries, bodyHeight);
  const clampedScroll = Math.min(scrollOffset, maxScroll);
  const visibleEntries = getVisibleReferenceEntries(wrappedEntries, clampedScroll, bodyHeight);
  const visibleLines = visibleEntries.flat();
  const start = wrappedEntries.length === 0 ? 0 : clampedScroll + 1;
  const end = wrappedEntries.length === 0 ? 0 : Math.min(wrappedEntries.length, clampedScroll + visibleEntries.length);

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
        {formatText(locale, "referenceScrollStatus", { start, end, total: section.entries.length })}
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
): ReferenceSection<StatusSection> {
  if (section === "deck") {
    return {
      key: section,
      title: formatText(locale, "deckSize", { count: state.deck.length }),
      entries: formatCardCollectionEntries(state.deck, content, locale),
    };
  }

  return {
    key: section,
    title: formatText(locale, "relicCount", { count: state.relics.length }),
    entries: formatRelicCollectionEntries(state.relics, content, locale),
  };
}

function buildLibrarySection(content: RunContent, locale: Locale, section: LibrarySection): ReferenceSection<LibrarySection> {
  if (section === "starter") {
    return {
      key: section,
      title: text(locale, "starterDeckSection"),
      entries: formatCardCollectionEntries(content.character.starterDeck, content, locale),
    };
  }

  if (section === "common" || section === "rare" || section === "epic") {
    return {
      key: section,
      title: librarySectionLabel(locale, section),
      entries: formatCardCollectionEntries(content.character.rewardCardPools[section], content, locale),
    };
  }

  if (section === "terms") {
    return {
      key: section,
      title: text(locale, "termsSection"),
      entries: buildTermsEntries(locale),
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
    entries: [
      [{ text: text(locale, "starterRelic"), bold: true, dim: true }],
      ...(startingRelic ? [formatRelicEntry(startingRelic, locale)] : []),
      [{ text: text(locale, "eliteRelicsSection"), bold: true, dim: true }],
      ...eliteRelics.map((relic) => formatRelicEntry(relic, locale)),
      [{ text: text(locale, "bossRelicsSection"), bold: true, dim: true }],
      ...bossRelics.map((relic) => formatRelicEntry(relic, locale)),
    ],
  };
}

function librarySectionLabel(locale: Locale, section: LibrarySection): string {
  if (section === "starter") return text(locale, "starterDeckSection");
  if (section === "common") return text(locale, "commonCardsSection");
  if (section === "rare") return text(locale, "rareCardsSection");
  if (section === "epic") return text(locale, "epicCardsSection");
  if (section === "terms") return text(locale, "termsSection");
  return text(locale, "relicLibrarySection");
}

function statusSectionLabel(locale: Locale, section: StatusSection): string {
  if (section === "deck") return text(locale, "deck");
  return text(locale, "currentRelics");
}

function formatCardCollectionEntries(
  cardIds: ReadonlyArray<string | CardLike | { cardId: string; upgraded: boolean; instanceId: string }>,
  content: RunContent,
  locale: Locale,
): ReferenceEntry[] {
  const counts = new Map<string, { card: CliCardDefinition; count: number }>();

  for (const entry of cardIds) {
    const cardLike = typeof entry === "string"
      ? { id: entry }
      : "cardId" in entry
        ? { id: entry.cardId, baseCardId: entry.cardId, upgraded: entry.upgraded, instanceId: entry.instanceId }
        : entry;
    const card = localizeCardDefinition(cardLike, locale, content);
    const key = `${card.id}|${card.upgraded ? "1" : "0"}`;
    const current = counts.get(key);

    if (!current) {
      counts.set(key, { card, count: 1 });
    } else {
      counts.set(key, { card: current.card, count: current.count + 1 });
    }
  }

  return [...counts.values()].map(({ card, count }) =>
    buildCardReferenceLines(card, locale, `${count > 1 ? `${count}x ` : ""}`, "  "),
  );
}

function buildCardReferenceLines(card: CliCardDefinition, locale: Locale, namePrefix: string, indent: string): ReferenceEntry {
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

function formatRelicEntry(relic: NonNullable<RunContent["relics"][string]>, locale: Locale): ReferenceEntry {
  const localized = localizeRelicDefinition(relic, locale);
  return [{ text: `${localized.name} - ${localized.description}` }];
}

function formatRelicCollectionEntries(relicIds: string[], content: RunContent, locale: Locale): ReferenceEntry[] {
  return relicIds
    .map((relicId) => content.relics[relicId])
    .filter((relic): relic is NonNullable<RunContent["relics"][string]> => relic !== undefined)
    .map((relic) => formatRelicEntry(relic, locale));
}

function buildTermsEntries(locale: Locale): ReferenceEntry[] {
  return [
    buildTermEntry(text(locale, "strength"), text(locale, "glossaryStrengthDescription")),
    buildTermEntry(text(locale, "weak"), text(locale, "glossaryWeakDescription")),
    buildTermEntry(text(locale, "vulnerable"), text(locale, "glossaryVulnerableDescription")),
    buildTermEntry(text(locale, "poison"), text(locale, "glossaryPoisonDescription")),
    buildTermEntry(localizeCardKeyword("exhaust", locale), text(locale, "glossaryExhaustDescription")),
    buildTermEntry(localizeCardKeyword("retain", locale), text(locale, "glossaryRetainDescription")),
    buildTermEntry(localizeCardKeyword("ethereal", locale), text(locale, "glossaryEtherealDescription")),
    buildTermEntry(text(locale, "powers"), text(locale, "glossaryCombatEffectsDescription")),
  ];
}

function buildTermEntry(title: string, description: string): ReferenceEntry {
  return [
    { text: title, bold: true, color: "yellow" },
    { text: `  ${description}` },
  ];
}

function getVisibleReferenceEntries(entries: ReferenceEntry[], startIndex: number, bodyHeight: number): ReferenceEntry[] {
  const visibleEntries: ReferenceEntry[] = [];
  let usedLines = 0;

  for (let index = startIndex; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (visibleEntries.length > 0 && usedLines + entry.length > bodyHeight) {
      break;
    }
    visibleEntries.push(entry);
    usedLines += entry.length;
    if (usedLines >= bodyHeight) {
      break;
    }
  }

  return visibleEntries;
}

function getMaxReferenceEntryScroll(entries: ReferenceEntry[], bodyHeight: number): number {
  if (entries.length === 0) {
    return 0;
  }

  let usedLines = 0;

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    usedLines += entries[index]!.length;
    if (usedLines >= bodyHeight) {
      return index;
    }
  }

  return 0;
}

function wrapReferenceEntries(entries: ReferenceEntry[], width: number): ReferenceEntry[] {
  const maxWidth = Math.max(12, width);
  return entries.map((entry) => entry.flatMap((line) => wrapReferenceLine(line, maxWidth)));
}

function wrapReferenceLine(line: ReferenceLine, width: number): ReferenceLine[] {
  if (getTerminalTextWidth(line.text) <= width) {
    return [line];
  }

  const indent = line.text.match(/^\s*/u)?.[0] ?? "";
  const indentWidth = Math.min(getTerminalTextWidth(indent), Math.max(0, width - 4));
  const segments = wrapTextToWidth(line.text, width, indentWidth > 0 ? indent : "");

  return segments.map((text) => ({ ...line, text }));
}

function wrapTextToWidth(text: string, width: number, continuationPrefix: string): string[] {
  const segments: string[] = [];
  const continuationWidth = getTerminalTextWidth(continuationPrefix);
  let current = "";
  let currentWidth = 0;
  let segmentIndex = 0;

  for (const char of text) {
    const charWidth = getTerminalTextWidth(char);
    const maxWidth = segmentIndex === 0 ? width : Math.max(1, width - continuationWidth);

    if (currentWidth + charWidth > maxWidth && current.length > 0) {
      segments.push(segmentIndex === 0 ? current : `${continuationPrefix}${current}`);
      current = char;
      currentWidth = charWidth;
      segmentIndex += 1;
      continue;
    }

    current += char;
    currentWidth += charWidth;
  }

  if (current.length > 0 || segments.length === 0) {
    segments.push(segmentIndex === 0 ? current : `${continuationPrefix}${current}`);
  }

  return segments;
}
