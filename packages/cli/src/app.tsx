import { sampleContent } from "@towerlab/content";
import { applyAction, createRun, observeRun, type Observation, type RunAction, type RunState } from "@towerlab/core";
import { Box, Text, useApp, useInput } from "ink";
import { useState } from "react";

export interface AppProps {
  seed: number;
}

export function App({ seed }: AppProps) {
  const { exit } = useApp();
  const [state, setState] = useState<RunState>(() => createRun(sampleContent, seed));
  const [error, setError] = useState<string | null>(null);
  const view = observeRun(sampleContent, state);
  const relicNames = view.relics.length > 0 ? view.relics.map((relic) => relic.name).join(", ") : "None";

  const runAction = (action: RunAction) => {
    try {
      setState((current) => applyAction(sampleContent, current, action));
      setError(null);
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  const restart = () => {
    setState(createRun(sampleContent, seed));
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
        const deckIndex = removeChoices[removableIndex].deckIndex;
        runAction({ type: "removeDeckCard", deckIndex });
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
    <Box flexDirection="column" paddingX={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column">
        <Text bold color="cyan">
          TowerLab
        </Text>
        <Text>
          Seed {view.seed} | Floor {view.floor} | Node {view.currentNode.id} ({view.currentNode.kind})
        </Text>
        <Text>
          HP {view.hp}/{view.maxHp} | Gold {view.gold}
        </Text>
        <Text dimColor>Relics: {relicNames}</Text>
      </Box>

      <Box marginTop={1} borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column">
        <PhaseView observation={view} />
      </Box>

      <Box marginTop={1} borderStyle="round" borderColor="green" paddingX={1} flexDirection="column">
        <Text bold color="green">
          Log
        </Text>
        {view.log.map((entry, index) => (
          <Text key={`${index}-${entry}`}>- {entry}</Text>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Controls observation={view} />
        {error ? (
          <Text color="red">Input error: {error}</Text>
        ) : null}
      </Box>
    </Box>
  );
}

function PhaseView({ observation }: { observation: Observation }) {
  if (observation.phase === "combat") {
    return (
      <>
        <Text bold color="yellow">
          Combat
        </Text>
        <Text>
          Enemy {observation.enemy.name}: {observation.enemy.hp}/{observation.enemy.maxHp} HP
          {observation.enemy.block > 0 ? `, ${observation.enemy.block} block` : ""}
        </Text>
        <Text>Intent: {observation.enemy.intent.description}</Text>
        <Text>
          Energy {observation.energy} | Block {observation.block} | Draw {observation.drawPileCount} | Discard{" "}
          {observation.discardPileCount}
        </Text>
        <Text bold>Hand</Text>
        {observation.hand.length > 0 ? (
          observation.hand.map((card, index) => (
            <Text key={`${index}-${card.id}`} color={card.cost > observation.energy ? "gray" : undefined}>
              {index + 1}. {card.name} [{card.cost}] {card.description}
            </Text>
          ))
        ) : (
          <Text dimColor>Hand is empty.</Text>
        )}
      </>
    );
  }

  if (observation.phase === "map") {
    return (
      <>
        <Text bold color="yellow">
          Map
        </Text>
        <Text>Choose the next node.</Text>
        {observation.nextNodes.map((node, index) => (
          <Text key={node.id}>
            {index + 1}. {node.id} ({node.kind})
          </Text>
        ))}
      </>
    );
  }

  if (observation.phase === "rest") {
    return (
      <>
        <Text bold color="yellow">
          Rest
        </Text>
        <Text>Choose a campfire action.</Text>
        {observation.restOptions.map((option, index) => (
          <Text key={option.id}>
            {index + 1}. {option.label} - {option.description}
          </Text>
        ))}
        <Text dimColor>
          Next: {observation.nextNodes.map((node) => `${node.id} (${node.kind})`).join(", ")}
        </Text>
      </>
    );
  }

  if (observation.phase === "reward") {
    return (
      <>
        <Text bold color="yellow">
          Reward
        </Text>
        <Text>Choose one card reward, or skip.</Text>
        {observation.cardChoices.map((card, index) => (
          <Text key={card.id}>
            {index + 1}. {card.name} [{card.cost}] {card.description}
          </Text>
        ))}
        <Text> s. Skip reward</Text>
      </>
    );
  }

  if (observation.phase === "shop") {
    const leaveIndex = observation.forSale.length + observation.removableDeckCards.length + 1;
    const canAffordRemove = observation.gold >= observation.removeDeckCardCost;
    return (
      <>
        <Text bold color="yellow">
          Shop
        </Text>
        <Text>
          Buy, remove ({observation.removeDeckCardCost} gold each), or leave.
        </Text>
        {observation.forSale.map((card, index) => (
          <Text key={card.id}>
            {index + 1}. Buy {card.name}
          </Text>
        ))}
        {observation.removableDeckCards.map((entry, index) => (
          <Text
            key={`${entry.deckIndex}-${entry.card.id}`}
            color={canAffordRemove ? undefined : "gray"}
          >
            {observation.forSale.length + index + 1}. Remove {entry.card.name} (deck #{entry.deckIndex + 1}) for{" "}
            {observation.removeDeckCardCost} gold
          </Text>
        ))}
        <Text color="yellow">
          {leaveIndex}. Leave shop
        </Text>
        <Text dimColor>Next: {observation.nextNodes.map((node) => `${node.id} (${node.kind})`).join(", ")}</Text>
      </>
    );
  }

  return (
    <>
      <Text bold color={observation.phase === "victory" ? "green" : "red"}>
        {observation.phase === "victory" ? "Victory" : "Defeat"}
      </Text>
      <Text>
        {observation.phase === "victory" ? "The climb is complete." : "The tower won this run."}
      </Text>
      <Text>Press r to restart with the same seed or q to quit.</Text>
    </>
  );
}

function Controls({ observation }: { observation: Observation }) {
  if (observation.phase === "combat") {
    return <Text dimColor>Controls: 1-9 play card, e end turn, q quit</Text>;
  }

  if (observation.phase === "map") {
    return <Text dimColor>Controls: 1-9 choose path, q quit</Text>;
  }

  if (observation.phase === "rest") {
    return <Text dimColor>Controls: 1-9 choose rest action, q quit</Text>;
  }

  if (observation.phase === "reward") {
    return <Text dimColor>Controls: 1-9 choose reward, s skip, q quit</Text>;
  }

  if (observation.phase === "shop") {
    const optionCount = observation.forSale.length + observation.removableDeckCards.length + 1;
    return <Text dimColor>Controls: 1-{Math.min(9, optionCount)} choose shop action, q quit</Text>;
  }

  return <Text dimColor>Controls: r restart, q quit</Text>;
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "unknown error";
}
