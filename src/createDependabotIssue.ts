import { Octokit } from '@octokit/rest';

const DEPENDABOT_SECURITY_INCIDENT_LABEL = 'dependabot-security-finding';
const P0_ISSUE_LABEL = 'priority/p0';
const TRIAGE_LABEL = 'needs-triage';

const owner = getRepositoryOwner();
const repository = getRepositoryName();
const client = createOctokitClient();

/**
 * Runs as part of Dependabot Security Notification workflow.
 * This creates an issue for any dependabot security alerts that github creates for the repository.
 */
export async function run() {
  const existingIssues = await client.issues.listForRepo({
    owner: owner,
    repo: repository,
  });

  // This also returns pull requests, so making sure we are only considering issues
  // https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28#list-repository-issues
  const existingDependabotSecurityIssues = existingIssues.data.filter((issue) =>
    issue.labels.includes(DEPENDABOT_SECURITY_INCIDENT_LABEL) && !('pull_request' in issue) && issue.state === 'open',
  );

  const dependabotSecurityIncidents = await client.dependabot.listAlertsForRepo({
    owner: owner,
    repo: repository,
  });

  const openSecurityIncidents = dependabotSecurityIncidents.data.filter((incident) => incident.state === 'open');

  for (const incident of openSecurityIncidents) {
    const severity = incident.security_advisory.severity.toUpperCase();
    const summary = incident.security_advisory.summary;

    const issueTitle = `[${severity}] ${summary}`;

    const issueExists = existingDependabotSecurityIssues.find((issue) => issue.title === issueTitle);

    if (issueExists === undefined) {
      await createDependabotSecurityIssue(issueTitle, incident.html_url);
    }
  }
}

/**
 * Helper method to create a dependabot security alert issue.
 * @param issueTitle The title of the issue to create.
 * @param incidentUrl The URL to the dependabot security alert.
 */
async function createDependabotSecurityIssue(issueTitle: string, incidentUrl: string) {
  await client.issues.create({
    owner: owner,
    repo: repository,
    title: issueTitle,
    body: `Github reported a new dependabot security incident at: ${incidentUrl}`,
    labels: [
      DEPENDABOT_SECURITY_INCIDENT_LABEL,
      P0_ISSUE_LABEL,
      TRIAGE_LABEL,
    ],
  });
}

/**
 * Create an octokit client.
 * @returns Octokit
 */
export function createOctokitClient(): Octokit {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error('GITHUB_TOKEN must be set');
  }

  return new Octokit({ auth: token });
}

/**
 * Retrieves the repository owner from environment
 * @returns Repository owner
 */
export function getRepositoryOwner(): string {
  const ownerName = process.env.OWNER_NAME;

  if (!ownerName) {
    throw new Error('OWNER_NAME must be set');
  }

  return ownerName;
}

/**
 * Retrieves the repository name from environment
 * @returns Repository name
 */
export function getRepositoryName(): string {
  const repositoryName = process.env.REPO_NAME;

  if (!repositoryName) {
    throw new Error('REPO_NAME must be set');
  }

  // Repository name is of format 'owner/repositoryName'
  // https://docs.github.com/en/actions/learn-github-actions/contexts#github-context
  return repositoryName.split('/')[1];
}

run().catch((err) => {
  throw new Error(err);
});