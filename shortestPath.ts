/**
 * Implementation of searching for shortest possible path using Genetic algorithms
 * Author: Filip Konig
 */


import _ from 'lodash';
import { Coordinates, Position, Individual, Data, ResultType } from './types';

const NUMBER_OF_GENERATIONS = 1000;
const POPULATION_SIZE = 40;
const NUMBER_OF_WINNERS = 2
const NUMBER_OF_BEST_SELECTIONS = Math.floor((POPULATION_SIZE - NUMBER_OF_WINNERS) / 3);
const NUMBER_OF_TOURNAMENT_SELECTIONS = POPULATION_SIZE - NUMBER_OF_WINNERS - NUMBER_OF_BEST_SELECTIONS;

function euclidianDistance(v1: Coordinates, v2: Coordinates): number {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    const dz = v1.z - v2.z;

    return Math.sqrt( dx * dx + dy * dy + dz * dz );
}

function fitness(path: Coordinates[]): number {
  const totalDistance = path.reduce((acc, curr, currIdx, arr) => {
    if (currIdx === 0) {
      return 0;
    }

    return acc + euclidianDistance(arr[currIdx - 1], curr);
  } , 0);

  return totalDistance;
}

function parseCoordinates(position: Position): Coordinates {
  return {
    x: position.x,
    y: position.y,
    z: position.z
  };
}

function recalculateFitness(population: Individual[], startPoint: Coordinates): Individual[] {
  const populationWithFitness: Individual[] = [];
  population.forEach((item) => {
    populationWithFitness.push({path: item.path, distance: fitness([startPoint, ...item.path.map(parseCoordinates)])});
  })

  return populationWithFitness;
}

function generatePath (positionsMap: Map<string, Position[]>): Position[] {
  const path = Array.from(positionsMap.values()).map(_.sample) as unknown as Position[];
  return _.shuffle(path);
}

// {path: [{ positionId: string, x, y, z}], distance: number}
function generatePopulation(data: Data, size: number): Individual[] {
  const { positionsMap } = data;

  const population = [];
  for (let i = 0; i < size; i++) {
    const path = generatePath(positionsMap);
    population.push({ path, distance: fitness(path.map(parseCoordinates)) });
  }
  return population;
}

function orderCrossover(population: Individual[], random = false): Individual[] {
  const mutatedPopulation = [];
  for (let i = 0; i < population.length; i += 2) {
    let parentA, parentB: Position[] | undefined;
    if (random) {
      parentA = _.sample(population)?.path;
      parentB = _.sample(population)?.path;
    } else {
      parentA = population[i].path;
      parentB = population[i + 1].path;
    }

    if (!parentA || !parentB) {
      throw new Error('orderCrossover() -> Population is empty');
    }

    const crossIndex = Math.floor(Math.random() * parentA.length - 1) + 1;

    const xA = parentA.slice(0, crossIndex);
    const xB = parentB.slice(0, crossIndex);

    const missingGenIdsA = parentA.slice(crossIndex).map((product) => product.productId);
    const missingGenIdsB = parentB.slice(crossIndex).map((product) => product.productId);

    const orderedMissingGensA: Position[] = []
    const orderedMissingGensB: Position[] = []

    parentB.forEach((product) => {
      if (missingGenIdsA.includes(product.productId)) {
        orderedMissingGensA.push(product);
      }
    });

    parentA.forEach((product) => {
      if (missingGenIdsB.includes(product.productId)) {
        orderedMissingGensB.push(product);
      }
    });

    const childA = [...xA, ...orderedMissingGensA];
    const childB = [...xB, ...orderedMissingGensB];

    mutatedPopulation.push({ path: childA }, { path:childB });
  }

  return mutatedPopulation;
}

function swapGen(population: Individual[], probability: number): Individual[] {
  const mutatedPopulation = [];
  for (let i = 0; i < population.length; i++) {
    const path = [...population[i].path];
    for (let j = 0; j < path.length; j++) {
      // const position = path[j];
      if (probability >= Math.random()) {
        let swapIndex = j;
        while(swapIndex === j) {
          swapIndex = Math.floor(Math.random() * path.length);
        }
        const temp = path[j];
        path[j] = path[swapIndex];
        path[swapIndex] = temp;
      }
    }
    mutatedPopulation.push({path});
  }

  return mutatedPopulation;
}

function invertPartOrder(population: Individual[], probability: number): Individual[] {
  const mutatedPopulation = [];
  for (let i = 0; i < population.length; i++) {
    const path = [...population[i].path];
    if (probability >= Math.random()) {
      const startIdx = Math.floor(Math.random() * (path.length - 1));
      const endIdx = Math.floor(Math.random() * (path.length - startIdx - 1)) + startIdx + 2;
      const mutatedPath = [...path.slice(0, startIdx), ..._.reverse(path.slice(startIdx, endIdx)), ...path.slice(endIdx)];
      mutatedPopulation.push({path: mutatedPath});
    } else {
      mutatedPopulation.push({path});
    }
  }

  return mutatedPopulation;
}

function changeProductPosition(population: Individual[], data: Data, probability: number): Individual[] {
  const mutatedPopulation = [];
  for (let i = 0; i < population.length; i++) {
    const path = [...population[i].path];
    for (let j = 0; j < path.length; j++) {
      const position = path[j];
      if (probability >= Math.random()) {
        while(path[j] === position && data.positionsMap.get(position.productId)?.length || 0 > 1) {
          const newPosition = _.sample(data.positionsMap.get(position.productId));
          if (!newPosition) {
            throw new Error(`changeProductPosition() -> Missing position data for product: ${position.productId}`);
          }
          path[j] = newPosition;
        }
      }
    }
    mutatedPopulation.push({path});
  }

  return mutatedPopulation;
}

function selectBest(population: Individual[], numberOfElements: number): Individual[] {
  const orderedPopulation = [...population].sort((a, b) => {
    if (!a.distance || !b.distance) {
      throw new Error('selectBest() -> Distance is undefined');
    }
    return a.distance > b.distance ? 1 : -1;
  });
  return orderedPopulation.slice(0, numberOfElements);
}

function regenerateWorst(population: Individual[], data: Data, numberOfElements: number) {
  const orderedPopulation = [...population].sort((a, b) => {
    if (!a.distance || !b.distance) {
      throw new Error('regenerateWorst() -> Distance is undefined');
    }
    return a.distance > b.distance ? 1 : -1;
  });
  return [...orderedPopulation.slice(0, -numberOfElements), ...generatePopulation(data, numberOfElements)];
}

function selectTournament(population: Individual[], numberOfElements: number): Individual[] {
  const selection = [];

  for (let i = 0; i < numberOfElements; i++) {
    const tournament = [_.sample(population), _.sample(population)];
    if (!tournament[0]?.distance || !tournament[1]?.distance) {
      throw new Error('selectTournament() -> Distance is undefined');
    }
    selection.push(tournament[0].distance < tournament[1].distance ? tournament[0] : tournament[1])
  }
  return selection;
}

function parseResult(bestPath: Individual): ResultType {
  if (!bestPath.distance) {
    throw new Error('parseResult() -> Distance is missing')
  }
  return {
    pickingOrder: bestPath.path.map((item) => ({ productId: item.productId, positionId: item.positionId })),
    distance: bestPath.distance
  }
}

export function shortestPath(data: Data) {
  let population = generatePopulation(data, POPULATION_SIZE);
  const progress: number[] = [];

  for (let i = 0; i < NUMBER_OF_GENERATIONS; i++) {
    population = regenerateWorst(population, data, 1);
    const bestPaths = selectBest(population, NUMBER_OF_WINNERS);
    const selectionA = selectBest(population, NUMBER_OF_BEST_SELECTIONS);
    const selectionB = selectTournament(population, NUMBER_OF_TOURNAMENT_SELECTIONS);
    let selection = [...selectionA, ...selectionB];
    selection = orderCrossover(selection, Boolean(i % 2));
    selection = swapGen(selection, 0.2);
    selection = invertPartOrder(selection, 0.3);
    selection = changeProductPosition(selection, data, 0.1);
    population = [...bestPaths, ...selection];
    population = recalculateFitness(population, data.start);

    if (i % 10 === 0) {
      progress.push(selectBest(population, 1)[0].distance || 0);
    }
  }
  console.log(progress);
  return parseResult(selectBest(population, 1)[0]);
}
