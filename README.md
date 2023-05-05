## Run project locally

1. run `cp .env.example .env`
2. customize .env (add your api key for gymbeam API)
3. run `yarn` or `yarn install`
4. run `yarn dev` to start development server in watch mode
5. optionaly run `yarn build` and `yarn start` to run compiled code

## Available requests

### POST /
#### Required body
- workerPosition:
  - x: number
  - y: number
  - z: number
- productIds: string[] (use valid gymbeam product ids)
