import { Stack, StackProps } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

interface DatabaseStackProps extends StackProps {
  stageName: "dev" | "stage" | "prod";
}

export class DatabaseStack extends Stack {
  public readonly restaurantsTable: Table;

  constructor(scope: Construct, id: string, props?: DatabaseStackProps) {
    super(scope, id, props);

    const restaurantsTable = new Table(this, "RestaurantsTable", {
      partitionKey: { name: "name", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    this.restaurantsTable = restaurantsTable;
  }
}
