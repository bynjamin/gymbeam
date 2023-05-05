import express, { Express, Response } from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import logger from 'morgan';
import { Position, RequestBody, TypedRequestBody } from './types';
import { shortestPath } from './shortestPath';

dotenv.config();
const port = process.env.PORT;
axios.defaults.headers['X-API-KEY'] = process.env.APIKEY || '';

const app: Express = express();
app.use(logger('dev'));
app.use(express.json());


app.post('/', async function(req: TypedRequestBody<RequestBody>, res: Response) {
  const { workerPosition, productIds } = req.body;
  if (!workerPosition || !productIds) {
    throw new Error('workerPosition and productIds are required parameters');
  }

  const positionsMap = new Map<string, Position[]>();

  for (const productId of productIds) {
    const positions = (await axios.get(`https://dev.aux.boxpi.com/case-study/products/${productId}/positions`)).data;
    positionsMap.set(productId, positions);
  }

  const data = {start: workerPosition, positionsMap};
  const result = shortestPath(data);

  res.send(result);
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});