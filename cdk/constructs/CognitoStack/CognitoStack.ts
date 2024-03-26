import { Stack, StackProps } from "aws-cdk-lib";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

interface CognitoStackProps extends StackProps {
  stageName: "dev" | "stage" | "prod";
}

export class CognitoStack extends Stack {
  cognitoUserPool: UserPool;
  webUserPoolClient: UserPoolClient;
  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    // TODO: use stageNmae in userPool name.
    this.cognitoUserPool = new UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInCaseSensitive: false,
      autoVerify: { email: true },
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 10,
        requireDigits: true,
        requireLowercase: true,
        requireSymbols: true,
        requireUppercase: true,
      },
      standardAttributes: {
        email: { required: true, mutable: true },
        familyName: { required: true, mutable: true },
        givenName: { required: true, mutable: true },
      },
    });

    this.webUserPoolClient = new UserPoolClient(this, "WebUserPoolClient", {
      userPool: this.cognitoUserPool,
      authFlows: { userSrp: true },
      preventUserExistenceErrors: true,
    });

    new UserPoolClient(this, "ServerUserPoolClient", {
      userPool: this.cognitoUserPool,
      authFlows: { adminUserPassword: true },
      preventUserExistenceErrors: true,
    });
  }
}
