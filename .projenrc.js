const { GitHubActionTypeScriptProject } = require('projen-github-action-typescript');
const project = new GitHubActionTypeScriptProject({
  defaultReleaseBranch: 'main',
  devDeps: ['projen-github-action-typescript'],
  name: 'cdk8s-action',
  deps: ['@octokit/rest'],
  bundledDeps: ['@octokit/rest'],
});
project.synth();