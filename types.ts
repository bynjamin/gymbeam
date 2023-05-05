import { Express } from 'express';

export type Coordinates = {
  x: number;
  y: number;
  z: number;
};

export type Position = {
  positionId: string;
  x: number;
  y: number;
  z: number;
  productId: string;
  quantity: number;
};

export type Individual = {
  path: Position[];
  distance?: number | undefined;
};

export type Data = {
  start: Coordinates;
  positionsMap: Map<string, Position[]>;
};

export type ResultPositionType = {
  productId: string;
  positionId: string;
};

export type ResultType = {
  pickingOrder: ResultPositionType[];
  distance: number;
};

export type RequestBody = {
  workerPosition?: Coordinates;
  productIds?: string[];
};

export interface TypedRequestBody<T> extends Express.Request {
  body: T;
}
