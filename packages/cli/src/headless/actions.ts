import type { RunAction } from "@towerlab/core";

export function parseAction(raw: string): RunAction {
  let decoded: unknown;

  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON action: ${raw}`);
  }

  if (!isRecord(decoded) || typeof decoded.type !== "string") {
    throw new Error(`Invalid action shape: ${raw}`);
  }

  switch (decoded.type) {
    case "chooseBlessing": {
      if (typeof decoded.blessingId !== "string") {
        throw new Error(`Invalid chooseBlessing action: ${raw}`);
      }

      return { type: "chooseBlessing", blessingId: decoded.blessingId };
    }

    case "choosePath": {
      if (typeof decoded.nodeId !== "string") {
        throw new Error(`Invalid choosePath action: ${raw}`);
      }

      return { type: "choosePath", nodeId: decoded.nodeId };
    }

    case "playCard": {
      if (typeof decoded.handIndex !== "number" || !Number.isInteger(decoded.handIndex)) {
        throw new Error(`Invalid playCard action: ${raw}`);
      }

      return { type: "playCard", handIndex: decoded.handIndex };
    }

    case "endTurn":
      return { type: "endTurn" };

    case "chooseRest": {
      if (decoded.optionId !== "recover" && decoded.optionId !== "fortify") {
        throw new Error(`Invalid chooseRest action: ${raw}`);
      }

      return { type: "chooseRest", optionId: decoded.optionId };
    }

    case "skipReward":
      return { type: "skipReward" };

    case "takeReward": {
      if (typeof decoded.rewardIndex !== "number" || !Number.isInteger(decoded.rewardIndex)) {
        throw new Error(`Invalid takeReward action: ${raw}`);
      }

      return { type: "takeReward", rewardIndex: decoded.rewardIndex };
    }

    case "buyShop": {
      if (typeof decoded.saleIndex !== "number" || !Number.isInteger(decoded.saleIndex)) {
        throw new Error(`Invalid buyShop action: ${raw}`);
      }

      return { type: "buyShop", saleIndex: decoded.saleIndex };
    }

    case "removeDeckCard": {
      if (typeof decoded.deckIndex !== "number" || !Number.isInteger(decoded.deckIndex)) {
        throw new Error(`Invalid removeDeckCard action: ${raw}`);
      }

      return { type: "removeDeckCard", deckIndex: decoded.deckIndex };
    }

    case "leaveShop":
      return { type: "leaveShop" };

    default:
      throw new Error(`Unsupported action type: ${decoded.type}`);
  }
}

export function parseActions(raw: string): RunAction[] {
  let decoded: unknown;

  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON action list: ${raw}`);
  }

  if (!Array.isArray(decoded)) {
    throw new Error("--actions must be a JSON array");
  }

  return decoded.map((entry) => parseAction(JSON.stringify(entry)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
