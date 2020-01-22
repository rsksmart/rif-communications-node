import LevelStore from "datastore-level"; //Web-Browser compatible store

declare module "interface-datastore" {
  export interface Datastore<Value = Buffer> {
    open(): Promise<void>;
    put(key: Key, val: Value): Promise<void>;
    get(key: Key): Promise<Value>;
    has(key: Key): Promise<boolean>;
    delete(key: Key): Promise<void>;
    batch(): Batch<Value>;
    query(q: Query<Value>): AsyncIterable<Result<Value>>;
    close(): Promise<void>;
  }
}
