import { CfnOutput, Fn, Stack, StackProps } from "aws-cdk-lib";
import {
  AuthorizationType,
  CfnAuthorizer,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

interface ApiStackProps extends StackProps {
  stageName: "dev" | "stage" | "prod";
  restaurantsTable: Table;
  cognitoUserPool: UserPool;
  webUserPoolClient: UserPoolClient;
  serverUserPoolClient: UserPoolClient;
  serviceName: string;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const api = new RestApi(this, `${props.stageName}-MyApi`, {
      deployOptions: {
        stageName: props.stageName,
      },
    });
    // @ts-ignore - TODO: fix this one.
    const apiLogicalId = this.getLogicalId(api.node.defaultChild);

    const getIndexFunction = new NodejsFunction(this, "GetIndex", {
      runtime: Runtime.NODEJS_20_X,
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
        restaurants_api: Fn.sub(
          `https://\${${apiLogicalId}}.execute-api.\${AWS::Region}.amazonaws.com/${props.stageName}/restaurants`
        ),
        cognito_user_pool_id: props.cognitoUserPool.userPoolId,
        cognito_client_id: props.webUserPoolClient.userPoolClientId,
      },
    });
    getIndexFunction.role?.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: [
          Fn.sub(
            `arn:aws:execute-api:\${AWS::Region}:\${AWS::AccountId}:\${${apiLogicalId}}/${props.stageName}/GET/restaurants`
          ),
        ],
      })
    );

    const getRestaurantsFunction = new NodejsFunction(this, "GetRestaurants", {
      runtime: Runtime.NODEJS_20_X,
      handler: "handler",
      entry: "functions/getRestaurants/getRestaurants.ts",
      environment: {
        restaurants_table: props.restaurantsTable.tableName,
        service_name: props.serviceName,
        stage_name: props.stageName,
      },
    });
    props.restaurantsTable.grantReadData(getRestaurantsFunction);
    getRestaurantsFunction.role?.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ssm:GetParameters*"],
        resources: [
          Fn.sub(
            `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.stageName}/get-restaurants/config`
          ),
        ],
      })
    );

    const searchRestaurantsFunction = new NodejsFunction(
      this,
      "SearchRestaurants",
      {
        runtime: Runtime.NODEJS_20_X,
        handler: "handler",
        entry: "functions/searchRestaurants/searchRestaurants.ts",
        environment: {
          restaurants_table: props.restaurantsTable.tableName,
          service_name: props.serviceName,
          stage_name: props.stageName,
        },
      }
    );
    props.restaurantsTable.grantReadData(searchRestaurantsFunction);
    searchRestaurantsFunction.role?.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ssm:GetParameters*"],
        resources: [
          Fn.sub(
            `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.stageName}/search-restaurants/config`
          ),
        ],
      })
    );

    const getIndexLambdaIntegration = new LambdaIntegration(getIndexFunction);
    const getRestaurantsLambdaIntegration = new LambdaIntegration(
      getRestaurantsFunction
    );
    const searchRestaurantsLambdaIntegration = new LambdaIntegration(
      searchRestaurantsFunction
    );

    const cognitoAuthorizer = new CfnAuthorizer(this, "CognitoAuthorizer", {
      identitySource: "method.request.header.Authorization",
      name: "CognitoAuthorizer",
      providerArns: [props.cognitoUserPool.userPoolArn],
      restApiId: api.restApiId,
      type: "COGNITO_USER_POOLS",
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

    new CfnOutput(this, "ApiUrl", {
      value: api.url ?? "Something went wrong with the deployment",
    });

    new CfnOutput(this, "CognitoServerClientId", {
      value: props.serverUserPoolClient.userPoolClientId,
    });
  }
}
