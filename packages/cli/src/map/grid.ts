import type { MapCellStatus, MapTreeCell, MapTreeRow } from "../view.js";

const DIR_NORTH = 1;
const DIR_EAST = 2;
const DIR_SOUTH = 4;
const DIR_WEST = 8;

const CONNECTOR_GLYPHS = new Map<number, string>([
  [0, " "],
  [DIR_NORTH, "│"],
  [DIR_SOUTH, "│"],
  [DIR_NORTH | DIR_SOUTH, "│"],
  [DIR_EAST, "─"],
  [DIR_WEST, "─"],
  [DIR_EAST | DIR_WEST, "─"],
  [DIR_SOUTH | DIR_EAST, "┌"],
  [DIR_SOUTH | DIR_WEST, "┐"],
  [DIR_NORTH | DIR_EAST, "└"],
  [DIR_NORTH | DIR_WEST, "┘"],
  [DIR_NORTH | DIR_SOUTH | DIR_EAST, "├"],
  [DIR_NORTH | DIR_SOUTH | DIR_WEST, "┤"],
  [DIR_EAST | DIR_WEST | DIR_SOUTH, "┬"],
  [DIR_EAST | DIR_WEST | DIR_NORTH, "┴"],
  [DIR_NORTH | DIR_EAST | DIR_SOUTH | DIR_WEST, "┼"],
]);

type GridCell = {
  ch: string;
  status: MapCellStatus;
  mask: number;
};

export type CharGrid = {
  width: number;
  height: number;
  cells: GridCell[][];
};

export type Point = {
  x: number;
  y: number;
};

export function createGrid(width: number, height: number): CharGrid {
  const cells: GridCell[][] = [];

  for (let y = 0; y < height; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ ch: " ", status: "connector", mask: 0 });
    }
    cells.push(row);
  }

  return { width, height, cells };
}

export function placeLabel(grid: CharGrid, centerX: number, y: number, label: string, status: MapCellStatus): void {
  const labelWidth = label.length;
  let startX = Math.max(0, centerX - Math.floor(labelWidth / 2));

  if (startX + labelWidth > grid.width) {
    startX = Math.max(0, grid.width - labelWidth);
  }

  if (y < 0 || y >= grid.height) {
    return;
  }

  for (let index = 0; index < label.length && startX + index < grid.width; index++) {
    grid.cells[y][startX + index] = { ch: label[index], status, mask: 0 };
  }
}

export function addPath(grid: CharGrid, points: Point[], status: MapCellStatus): void {
  const filtered = dedupePoints(points);
  if (filtered.length < 2) return;

  for (let index = 0; index < filtered.length - 1; index++) {
    addSegment(grid, filtered[index]!, filtered[index + 1]!, status);
  }
}

function addSegment(grid: CharGrid, from: Point, to: Point, status: MapCellStatus): void {
  let currentX = from.x;
  let currentY = from.y;

  while (currentX !== to.x || currentY !== to.y) {
    const nextX = currentX === to.x ? currentX : currentX + Math.sign(to.x - currentX);
    const nextY = currentY === to.y ? currentY : currentY + Math.sign(to.y - currentY);

    if (currentX !== nextX && currentY !== nextY) {
      throw new Error("non-orthogonal connector segment");
    }

    addConnection(grid, currentX, currentY, nextX, nextY, status);
    currentX = nextX;
    currentY = nextY;
  }
}

function addConnection(grid: CharGrid, fromX: number, fromY: number, toX: number, toY: number, status: MapCellStatus): void {
  const direction = directionBetween(fromX, fromY, toX, toY);
  if (direction === 0) return;

  addConnectorDirection(grid, fromX, fromY, direction, status);
  addConnectorDirection(grid, toX, toY, oppositeDirection(direction), status);
}

function directionBetween(fromX: number, fromY: number, toX: number, toY: number): number {
  if (fromX === toX && fromY === toY - 1) return DIR_SOUTH;
  if (fromX === toX && fromY === toY + 1) return DIR_NORTH;
  if (fromY === toY && fromX === toX - 1) return DIR_EAST;
  if (fromY === toY && fromX === toX + 1) return DIR_WEST;
  return 0;
}

function oppositeDirection(direction: number): number {
  if (direction === DIR_NORTH) return DIR_SOUTH;
  if (direction === DIR_SOUTH) return DIR_NORTH;
  if (direction === DIR_EAST) return DIR_WEST;
  if (direction === DIR_WEST) return DIR_EAST;
  return 0;
}

function addConnectorDirection(grid: CharGrid, x: number, y: number, direction: number, status: MapCellStatus): void {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return;

  const cell = grid.cells[y][x];
  if (!isConnectorStatus(cell.status)) return;

  cell.mask |= direction;
  cell.ch = CONNECTOR_GLYPHS.get(cell.mask) ?? "┼";
  cell.status = mergeConnectorStatus(cell.status, status);
}

function dedupePoints(points: Point[]): Point[] {
  const filtered: Point[] = [];

  for (const point of points) {
    const previous = filtered.at(-1);
    if (previous && previous.x === point.x && previous.y === point.y) {
      continue;
    }
    filtered.push(point);
  }

  return filtered;
}

function mergeConnectorStatus(current: MapCellStatus, incoming: MapCellStatus): MapCellStatus {
  if (current === "connector") return incoming;
  if (incoming === "connector") return current;
  if (current === incoming) return current;
  return "connector";
}

function isConnectorStatus(status: MapCellStatus): boolean {
  return status === "connector" || status === "connectorChoice1" || status === "connectorChoice2" || status === "connectorChoice3";
}

export function gridToRows(grid: CharGrid): MapTreeRow[] {
  const rows: MapTreeRow[] = [];

  for (let y = 0; y < grid.height; y++) {
    const row: MapTreeCell[] = [];
    let text = "";
    let currentStatus: MapCellStatus = grid.cells[y][0]?.status ?? "connector";

    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      if (cell.status !== currentStatus) {
        if (text.length > 0) {
          row.push({ text, status: currentStatus });
        }
        text = cell.ch;
        currentStatus = cell.status;
      } else {
        text += cell.ch;
      }
    }

    if (text.length > 0) {
      row.push({ text, status: currentStatus });
    }

    const lineText = row.map((cell) => cell.text).join("");
    if (lineText.trim().length > 0) {
      rows.push(row);
    }
  }

  return rows;
}
