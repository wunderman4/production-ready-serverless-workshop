import { CfnOutput, CfnParameter, Fn, Stack, StackProps } from "aws-cdk-lib";
import {
  AuthorizationType,
  CfnAuthorizer,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { EventBus } from "aws-cdk-lib/aws-events";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

interface ApiStackProps extends StackProps {
  stageName: "dev" | "stage" | "prod";
  ssmStageName: string;
  restaurantsTable: Table;
  cognitoUserPool: UserPool;
  webUserPoolClient: UserPoolClient;
  serverUserPoolClient: UserPoolClient;
  serviceName: string;
  orderEventBus: EventBus;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    this.declareParameters(props);

    const api = new RestApi(this, `${props.stageName}-MyApi`, {
      deployOptions: {
        stageName: props.stageName,
      },
    });

    const getIndex = this.declareGetIndexFunction(props, api);
    const getRestaurants = this.declareGetRestaurantsFunction(props);
    const searchRestaurants = this.declareSearchRestaurantsFunction(props);
    const placeOrder = this.declarePlaceOrderFunction(props);

    this.declareApiEndpoints(props, api, {
      getIndex,
      getRestaurants,
      searchRestaurants,
      placeOrder,
    });

    this.declareOutputs(props, api);
  }

  // FIXME: reduce props to only needed ones...
  private declareParameters(props: ApiStackProps) {
    new CfnParameter(this, "KmsArnParameter", {
      type: "AWS::SSM::Parameter::Value<String>",
      default: `/${props.serviceName}/${props.ssmStageName}/kmsArn`,
    });
  }

  private declareGetIndexFunction(props: ApiStackProps, api: RestApi) {
    // @ts-ignore - FIXME: something about construct no c element...
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
        cognito_client_id: props.webUserPoolClient.userPoolClientId,
        cognito_user_pool_id: props.cognitoUserPool.userPoolId,
        orders_api: Fn.sub(
          `https://\${${apiLogicalId}}.execute-api.\${AWS::Region}.amazonaws.com/${props.stageName}/orders`
        ),
        restaurants_api: Fn.sub(
          `https://\${${apiLogicalId}}.execute-api.\${AWS::Region}.amazonaws.com/${props.stageName}/restaurants`
        ),
      },
    });

    getIndexFunction.role?.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["execute-api:Invoke"],
        resources: [
          Fn.sub(
            `arn:aws:execute-api:\${AWS::Region}:\${AWS::AccountId}:\${${apiLogicalId}}/${props.ssmStageName}/GET/restaurants`
          ),
        ],
      })
    );
    return getIndexFunction;
  }

  private declareGetRestaurantsFunction(props: ApiStackProps) {
    const getRestaurantsFunction = new NodejsFunction(this, "GetRestaurants", {
      runtime: Runtime.NODEJS_20_X,
      handler: "handler",
      entry: "functions/getRestaurants/getRestaurants.ts",
      environment: {
        middy_cache_enabled: "true",
        middy_cache_expiry_milliseconds: "60000", // 1 minute
        restaurants_table: props.restaurantsTable.tableName,
        service_name: props.serviceName,
        ssm_stage_name: props.stageName,
      },
    });
    props.restaurantsTable.grantReadData(getRestaurantsFunction);
    getRestaurantsFunction.role?.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ssm:GetParameters*"],
        resources: [
          Fn.sub(
            `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.ssmStageName}/get-restaurants/config`
          ),
        ],
      })
    );
    return getRestaurantsFunction;
  }

  private declareSearchRestaurantsFunction(props: ApiStackProps) {
    const searchRestaurantsFunction = new NodejsFunction(
      this,
      "SearchRestaurants",
      {
        runtime: Runtime.NODEJS_20_X,
        handler: "handler",
        entry: "functions/searchRestaurants/searchRestaurants.ts",
        environment: {
          middy_cache_enabled: "true",
          middy_cache_expiry_milliseconds: "60000", // 1 minute
          restaurants_table: props.restaurantsTable.tableName,
          service_name: props.serviceName,
          ssm_stage_name: props.stageName,
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
          Fn.sub(
            `arn:aws:ssm:\${AWS::Region}:\${AWS::AccountId}:parameter/${props.serviceName}/${props.stageName}/search-restaurants/secretString`
          ),
        ],
      })
    );
    searchRestaurantsFunction.role?.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["kms:Decrypt"],
        resources: [Fn.ref("KmsArnParameter")],
      })
    );
    return searchRestaurantsFunction;
  }

  private declarePlaceOrderFunction(props: ApiStackProps) {
    const placeOrderFunction = new NodejsFunction(this, "PlaceOrder", {
      runtime: Runtime.NODEJS_20_X,
      handler: "handler",
      entry: "functions/placeOrder/placeOrder.ts",
      environment: {
        bus_name: props.orderEventBus.eventBusName,
      },
    });
    props.orderEventBus.grantPutEventsTo(placeOrderFunction);
    return placeOrderFunction;
  }

  private declareApiEndpoints(
    props: ApiStackProps,
    api: RestApi,
    functions: {
      getIndex: NodejsFunction;
      getRestaurants: NodejsFunction;
      searchRestaurants: NodejsFunction;
      placeOrder: NodejsFunction;
    }
  ) {
    const cognitoAuthorizer = new CfnAuthorizer(this, "CognitoAuthorizer", {
      identitySource: "method.request.header.Authorization",
      name: "CognitoAuthorizer",
      providerArns: [props.cognitoUserPool.userPoolArn],
      restApiId: api.restApiId,
      type: "COGNITO_USER_POOLS",
    });

    // GET /
    api.root.addMethod("GET", new LambdaIntegration(functions.getIndex));

    const restaurantResource = api.root.addResource("restaurants");

    // GET /restaurants
    restaurantResource.addMethod(
      "GET",
      new LambdaIntegration(functions.getRestaurants),
      { authorizationType: AuthorizationType.IAM }
    );

    // POST /search
    restaurantResource
      .addResource("search")
      .addMethod("POST", new LambdaIntegration(functions.searchRestaurants), {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: {
          authorizerId: cognitoAuthorizer.ref,
        },
      });

    // POST /orders

    api.root
      .addResource("orders")
      .addMethod("POST", new LambdaIntegration(functions.placeOrder), {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: {
          authorizerId: cognitoAuthorizer.ref,
        },
      });
  }

  private declareOutputs(props: ApiStackProps, api: RestApi) {
    new CfnOutput(this, "ApiUrl", {
      value: api.url ?? "Something went wrong with the deployment",
    });

    new CfnOutput(this, "CognitoServerClientId", {
      value: props.serverUserPoolClient.userPoolClientId,
    });

    new StringParameter(this, "ApiUrlParameter", {
      parameterName: `/${props.serviceName}/${props.ssmStageName}/service-url`,
      stringValue: api.url ?? "Something went wrong with the deployment",
    });
  }
}
