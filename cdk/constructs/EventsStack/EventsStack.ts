import { Stack, StackProps } from "aws-cdk-lib";
import { EventBus } from "aws-cdk-lib/aws-events";
import { Construct } from "constructs";

interface EventStackProps extends StackProps {
  stageName: "dev" | "stage" | "prod";
  serviceName: string;
  // TODO: use ssmStageName or remove it...
  ssmStageName: string;
}

export class EventsStack extends Stack {
  public orderEventBus: EventBus;
  constructor(scope: Construct, id: string, props: EventStackProps) {
    super(scope, id, props);

    this.orderEventBus = new EventBus(this, "OrderEventBus", {
      eventBusName: `${props?.serviceName}-${props.stageName}-order-events`,
    });
  }
}
