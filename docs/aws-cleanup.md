# AWS cleanup

Everything KagazReady creates in AWS, and how to remove it. All commands assume the AWS CLI is
signed in (`aws login`) to the hackathon account and that the region is `ap-south-1`.

## What exists

| Resource                                           | Created by                   | Removed by             |
| -------------------------------------------------- | ---------------------------- | ---------------------- |
| CloudFormation stack `kagazready`                  | `sam deploy`                 | step 1                 |
| — S3 upload bucket (private, lifecycle 1 day)      | the stack                    | step 1 (emptied first) |
| — DynamoDB table (on-demand, TTL)                  | the stack                    | step 1                 |
| — HTTP API + stage, 4 Lambda functions, 4 roles    | the stack                    | step 1                 |
| — 5 CloudWatch log groups (7-day retention)        | the stack                    | step 1                 |
| CloudFormation stack `aws-sam-cli-managed-default` | `sam deploy --resolve-s3`    | step 2                 |
| — SAM artefact bucket                              | that stack                   | step 2 (emptied first) |
| Amplify app `kagazready` (id `d109ovvm872kui`)     | `aws amplify create-app`     | step 3                 |
| AWS Budget (cost alert)                            | Billing console, by the team | step 4 (optional)      |
| AWS Support case (Bedrock quotas)                  | Support console, by the team | resolves itself        |

Nothing else was created. No IAM users, no access keys, no EC2, no VPC changes.

## Steps

### 1. Delete the application stack

The upload bucket has `DeletionPolicy: Delete`, but CloudFormation cannot delete a bucket that
still holds objects. Empty it first (objects expire within a day anyway):

```bash
BUCKET=$(aws cloudformation describe-stacks --stack-name kagazready --region ap-south-1 --query "Stacks[0].Outputs[?OutputKey=='UploadBucketName'].OutputValue" --output text)
```

```bash
aws s3 rm "s3://$BUCKET" --recursive --region ap-south-1
```

```bash
cd services && SAM_CLI_TELEMETRY=0 sam delete --stack-name kagazready --region ap-south-1 --no-prompts
```

Confirm: `aws cloudformation describe-stacks --stack-name kagazready` should fail with "does not
exist".

### 2. Delete the SAM artefact stack

`sam delete` does not remove the bucket SAM created for deployment artefacts.

```bash
ARTEFACTS=$(aws cloudformation describe-stack-resources --stack-name aws-sam-cli-managed-default --region ap-south-1 --query "StackResources[?ResourceType=='AWS::S3::Bucket'].PhysicalResourceId" --output text)
```

```bash
aws s3 rm "s3://$ARTEFACTS" --recursive --region ap-south-1
```

```bash
aws cloudformation delete-stack --stack-name aws-sam-cli-managed-default --region ap-south-1
```

### 3. Delete the Amplify app

```bash
aws amplify delete-app --app-id d109ovvm872kui --region ap-south-1
```

This removes the branch, the deployments and the `*.amplifyapp.com` URL.

### 4. Optional: the budget

The cost budget bills nothing (the first two budgets per account are free). Delete it from
Billing → Budgets if the account is being retired.

### 5. Verify the account is quiet

```bash
aws cloudformation list-stacks --region ap-south-1 --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query "StackSummaries[].StackName"
```

```bash
aws s3 ls
```

```bash
aws amplify list-apps --region ap-south-1 --query "apps[].name"
```

All three should be empty. Check Billing → Bills a day later; the expected charge is USD 0.00.

## Local machine

The only local state is `~/.aws/config` (a login profile; no long-lived keys were ever created)
and the SAM build cache under `services/.aws-sam/`, which is gitignored and safe to delete.
