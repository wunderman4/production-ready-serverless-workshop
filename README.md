# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## TODO:

- Create script for running build before deploy

## Useful commands

- `aws sso login` logs you in for cdk commands
- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests in handler mode
- `npm run test:e2e` perform the jest tests in http mode
- `npm run deploy` builds before deploying. (need to be logged in)
- `npm run extractEnvVars` runs a script to gather all env variables.
- `cdk deploy -- context stageName=branch-name` deploys the app to a new environment.
- `cdk destroy --context stageName=branch-name` destroys the app with the stageName provided.
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template

## Structure overview

- /cdk folder: this contains the entry point of your CDK application
  - /constructs folder: where your stacks live.
- /functions folder: this is where you Lambdas live.
- /tests folder: this is where you add tests for your CDK code
- cdk.json: this is the manifest file for the CDK
- AWS SDK is a dev dependency to the project instead of a production dependency. The reason for this is that the AWS SDK is already available in the Lambda execution environment, so we don't need to include it in our bundle, which helps reduce deployment time and also helps improve Lambda's cold start performance as well.

## Adding types

This repo has @type/aws-lambda installed.The import statement (import ... from 'aws-lambda') imports the type definitions. It does not import the aws-lambda NPM package, which is an unrelated third-party tool. For example, here is a minimal new handler

```ts
import { Handler } from "aws-lambda";

export const hello: Handler = async (event, context) => ({
  statusCode: 200,
  body: JSON.stringify({
    message: "hello world",
  }),
});
```

> _.js and _.d.ts files are git ignored because these are generated when running build and should not be committed. See the `.gitignore` for more info

## Questions

- Whats with the duplicate exports from client-lib vs cognito-lib ex: ScanCommand
