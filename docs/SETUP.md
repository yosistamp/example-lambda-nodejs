# Setup

## init

```bash
mkdir user-api
cd user-api
npm init -y
```

## install typescript

```bash
npm install -D typescript @types/node @types/aws-lambda esbuild
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-lambda-powertools/logger @aws-lambda-powertools/parser zod@~3 @middy/core @middy/http-json-body-parser @middy/http-event-normalizer @middy/http-error-handler
```

## init tsconfig

```bash
npx tsc --init
```

## modify tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

## create sample code

[see]()

## create dockerfile 

[see](./user-api/Dockerfile)

## create SAM Template

[see](./user-api/sam/template.yaml)


## build

```bash
export ACCOUNT_ID=<アカウントID>

docker build -t user-api .
docker tag user-api:latest $ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/user-api:latest
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com
docker push $ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/user-api:latest
```

## deploy

```bash
sam deploy --guided
```

## clean up

```bash
sam delete
```
