import { Fn, Stack, StackProps } from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

interface ApiStackProps extends StackProps {
  stageName: "dev" | "stage" | "prod";
  restaurantsTable: Table;
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

    const getIndexLambdaIntegration = new LambdaIntegration(getIndexFunction);
    const getRestaurantsLambdaIntegration = new LambdaIntegration(
      getRestaurantsFunction
    );
    api.root.addMethod("GET", getIndexLambdaIntegration);
    api.root
      .addResource("restaurants")
      .addMethod("GET", getRestaurantsLambdaIntegration);
  }
}
