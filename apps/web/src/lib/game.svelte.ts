import {
  type Achievement,
  achievements,
  type Board,
  EMPTY_BOARD,
  type GameData,
  Progress,
  placePiece,
  RecipeBook,
  type Zone,
} from "@anyang/core";
import gameDataUrl from "@anyang/data/game-data.json?url";
import type { SaveStore } from "./storage";

export type Notice =
  | { key: number; kind: "discovery"; id: string }
  | { key: number; kind: "achievement"; achievement: Achievement };

export type Feedback = { key: number; kind: "rejected" | "known"; text: string } | null;

export async function loadGame(store: SaveStore): Promise<Game> {
  const response = await fetch(gameDataUrl);
  if (!response.ok) throw new Error(`Could not load game data (${response.status})`);
  const book = new RecipeBook((await response.json()) as GameData);
  return new Game(book, store, Progress.restore(book, await store.load()));
}

export class Game {
  readonly book: RecipeBook;
  private readonly store: SaveStore;

  progress: Progress;
  board = $state.raw<Board>(EMPTY_BOARD);
  /** Element picked by tapping, for tap-to-place and the details panel. */
  selected = $state<string | null>(null);
  /** Discoveries the player has not looked at yet. */
  unseen = $state.raw(new Set<string>());
  notices = $state<Notice[]>([]);
  feedback = $state.raw<Feedback>(null);

  private nextKey = 1;

  constructor(book: RecipeBook, store: SaveStore, progress: Progress) {
    this.book = book;
    this.store = store;
    this.progress = $state.raw(progress);
  }

  get achievements(): Achievement[] {
    return achievements(this.book, this.progress);
  }

  isDiscovered = (id: string): boolean => this.progress.has(id);

  select(id: string | null): void {
    this.selected = id;
    if (id && this.unseen.has(id)) {
      const unseen = new Set(this.unseen);
      unseen.delete(id);
      this.unseen = unseen;
    }
  }

  drop(id: string, zone: Zone): void {
    const outcome = placePiece(this.book, this.board, id, zone, this.isDiscovered);
    this.board = outcome.board;

    if (outcome.kind === "rejected") {
      this.feedback = {
        key: this.nextKey++,
        kind: "rejected",
        text:
          outcome.reason === "unsupported-zone"
            ? "这里放不下 · Extend a row sideways, a column up or down"
            : "没有反应 · Nothing forms there",
      };
      return;
    }
    if (outcome.kind !== "created") {
      this.feedback = null;
      return;
    }

    if (this.isDiscovered(outcome.result)) {
      this.feedback = {
        key: this.nextKey++,
        kind: "known",
        text: `已有 · Already found ${outcome.result}`,
      };
      return;
    }
    this.feedback = null;
    this.discover(outcome.result);
  }

  clearBoard(): void {
    this.board = EMPTY_BOARD;
    this.feedback = null;
  }

  dismiss(key: number): void {
    this.notices = this.notices.filter((notice) => notice.key !== key);
  }

  async reset(): Promise<void> {
    await this.store.clear();
    this.progress = Progress.start(this.book);
    this.unseen = new Set();
    this.selected = null;
    this.notices = [];
    this.clearBoard();
  }

  private discover(id: string): void {
    const before = new Set(this.achievements.filter((a) => a.unlocked).map((a) => a.id));
    this.progress = this.progress.discover(id);
    this.unseen = new Set(this.unseen).add(id);
    this.notices.push({ key: this.nextKey++, kind: "discovery", id });
    for (const achievement of this.achievements) {
      if (achievement.unlocked && !before.has(achievement.id)) {
        this.notices.push({ key: this.nextKey++, kind: "achievement", achievement });
      }
    }
    void this.store.save(this.progress.toSave());
  }
}
