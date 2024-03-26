# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## TODO:

- Create script for running build before deploy

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template
- `aws sso login` logs you in for cdk commands
- `cdk:deploy` builds before deploying.
- `cdk deploy -- context stageName=branch-name` deploys the app to a new environment.
- `cdk destroy --context stageName=branch-name` destroys the app with the stageName provided.
- ` ./export-env.sh ApiStack-dev us-east-1` runs a script to gather all env variables.

## Structure overview

- /bin folder: this contains the entry point of your CDK application
- /lib folder: this is where you configure your stacks and constructs
- /test folder: this is where you add tests for your CDK code

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

_.js and _.d.ts files are git ignored because these are generated when running build and should not be committed. See the `.gitignore` for more info

## Questions

- After deleting the folders as recommended, should the bin leftover in the package.json be removed as well? Should something else replace it?
  ```
  "bin": {
      "production-ready-serverless-workshop": "bin/production-ready-serverless-workshop.js"
  },
  ```
- Which dependency is the one that triggers the docker dependency?
  - The nodeJsFn is what triggers the docker build because node could require packages that contain direct binaries which need to work in the lambda runtime.
- Whats with the duplicate exports from client-lib vs cognito-lib ex: ScanCommand
