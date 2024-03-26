import { Fn, Stack, StackProps } from "aws-cdk-lib";
import {
  AuthorizationType,
  CfnAuthorizer,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

interface ApiStackProps extends StackProps {
  stageName: "dev" | "stage" | "prod";
  restaurantsTable: Table;
  cognitoUserPool: UserPool;
  webUserPoolClient: UserPoolClient;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    const { stageName, restaurantsTable } = props;

    const api = new RestApi(this, `${stageName}-MyApi`, {
      deployOptions: {
        stageName,
      },
    });
    // @ts-ignore - TODO: fix this one.
    const apiLogicalId = this.getLogicalId(api.node.defaultChild);
    console.log("apiLogicalId: ", apiLogicalId);

    const getIndexFunction = new NodejsFunction(this, "GetIndex", {
      runtime: Runtime.NODEJS_LATEST,
      handler: "handler",
      entry: "functions/getIndex/getIndex.ts",
      bundling: {
        commandHooks: {
          afterBundling: (inputDir: string, outputDir: string) => [
            `mkdir ${outputDir}/static`,
            `cp ${inputDir}/static/index.html ${outputDir}/static/index.html`,
          ],
          beforeBundling: () => [],
          beforeInstall: () => [],
        },
      },
      environment: {
        // restaurants_api: api.urlForPath("/restaurants"),
        restaurants_api: Fn.sub(
          `https://\${${apiLogicalId}}.execute-api.\${AWS::Region}.amazonaws.com/${props.stageName}/restaurants`
        ),
        cognito_user_pool_id: props.cognitoUserPool.userPoolId,
        cognito_client_id: props.webUserPoolClient.userPoolClientId,
      },
    });

    const getRestaurantsFunction = new Function(this, "GetRestaurants", {
      runtime: Runtime.NODEJS_LATEST,
      handler: "getRestaurants/getRestaurants.handler",
      code: Code.fromAsset("functions"),
      environment: {
        default_results: "8",
        restaurants_table: restaurantsTable.tableName,
      },
    });
    restaurantsTable.grantReadData(getRestaurantsFunction);

    const searchRestaurantsFunction = new Function(this, "SearchRestaurants", {
      runtime: Runtime.NODEJS_LATEST,
      handler: "searchRestaurants/searchRestaurants.handler",
      code: Code.fromAsset("functions"),
      environment: {
        default_results: "8",
        restaurants_table: restaurantsTable.tableName,
      },
    });
    restaurantsTable.grantReadData(searchRestaurantsFunction);

    const getIndexLambdaIntegration = new LambdaIntegration(getIndexFunction);
    const getRestaurantsLambdaIntegration = new LambdaIntegration(
      getRestaurantsFunction
    );
    const searchRestaurantsLambdaIntegration = new LambdaIntegration(
      searchRestaurantsFunction
    );

    const cognitoAuthorizer = new CfnAuthorizer(this, "CognitoAuthorizer", {
      restApiId: api.restApiId,
      name: "CognitoAuthorizer",
      type: "COGNITO_USER_POOLS",
      identitySource: "method.request.header.Authorization",
      providerArns: [props.cognitoUserPool.userPoolArn],
    });

    api.root.addMethod("GET", getIndexLambdaIntegration);

    const restaurantResource = api.root.addResource("restaurants");
    restaurantResource.addMethod("GET", getRestaurantsLambdaIntegration, {
      authorizationType: AuthorizationType.IAM,
    });
    restaurantResource
      .addResource("search")
      .addMethod("POST", searchRestaurantsLambdaIntegration, {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: {
          authorizerId: cognitoAuthorizer.ref,
        },
      });

    const apiInvokePolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["execute-api:Invoke"],
      resources: [
        Fn.sub(
          `arn:aws:execute-api:\${AWS::Region}:\${AWS::AccountId}:\${${apiLogicalId}}/${props.stageName}/GET/restaurants`
        ),
      ],
    });
    getIndexFunction.role?.addToPrincipalPolicy(apiInvokePolicy);
  }
}
