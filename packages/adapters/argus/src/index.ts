/** Argus adapter — reserved, not implemented in MVP */

export interface ArgusSignal {
  id: string;
  type: "news" | "entity" | "event";
  content: string;
  source: string;
  timestamp: string;
}

export interface ArgusAdapter {
  search(query: string): Promise<ArgusSignal[]>;
  getEntity(id: string): Promise<ArgusSignal | null>;
}
