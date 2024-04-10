#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { ApiStack } from "./constructs/ApiStack/ApiStack";
import { CognitoStack } from "./constructs/CognitoStack/CognitoStack";
import { DatabaseStack } from "./constructs/DatabaseStack/DatabaseStack";

const app = new cdk.App();

let stageName = app.node.tryGetContext("stageName");
let ssmStageName = app.node.tryGetContext("ssmStageName");

if (!stageName) {
  console.log("Defaulting stage name to: dev");
  stageName = "dev";
}

if (!ssmStageName) {
  console.log(`Defaulting ssm stage name to: ${stageName}`);
  ssmStageName = stageName;
}

const dbStack = new DatabaseStack(app, `DatabaseStack-${stageName}`, {
  stageName,
});

const cognitoStack = new CognitoStack(app, `CognitoStack-${stageName}`, {
  stageName,
});

new ApiStack(app, `ApiStack-${stageName}`, {
  serviceName: "cdk-bootstrap",
  stageName,
  ssmStageName,
  restaurantsTable: dbStack.restaurantsTable,
  cognitoUserPool: cognitoStack.cognitoUserPool,
  webUserPoolClient: cognitoStack.webUserPoolClient,
  serverUserPoolClient: cognitoStack.serverUserPoolClient,
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
