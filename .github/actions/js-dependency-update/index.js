const core = require('@actions/core');
const exec = require('@actions/exec');

const github = require('@actions/github');

const validateBranchName = ({ branchName }) =>
  /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);
const validateDirectoryName = ({ dirName }) =>
  /^[a-zA-Z0-9_\-\/]+$/.test(dirName);

async function run() {
  /*
  1. Parse inputs:
    1.1 base-branch from which to check for updates
    1.2 target-branch to use to create the PR
    1.3 Github token for authentication purposes (to create PRs)
    1.4 Working directory for which to check dependencies
  2. Execute the NPM update command within the working director
  3. Check whether there are modified package*.json files
  4. If there are modified files:
    4.1 Add and commit files to the target-branch
    4.2 Create a PR to the base branch using the octokit API
  5. Otherwise, conclude the custom action.
  */
  core.info('I am a custom JS action');

  // inputs
  const base_branch = core.getInput('base-branch');
  const target_branch = core.getInput('target-branch');
  const working_directory = core.getInput('working-directory');
  const gh_token = core.getInput('gh-token');
  const debug = core.getBooleanInput('debug');

  core.setSecret(gh_token);

  // validating
  if (!validateBranchName({ branchName: base_branch })) {
    core.setFailed(
      'Invalid base-branch name. Branch names should include only characters, numbers, hyphens, underscores, dots, and forward slashes.'
    );
    return;
  }

  if (!validateBranchName({ branchName: target_branch })) {
    core.setFailed(
      'Invalid target-branch name. Branch names should include only characters, numbers, hyphens, underscores, dots, and forward slashes.'
    );
    return;
  }

  if (!validateDirectoryName({ dirName: working_directory })) {
    core.setFailed(
      'Invalid working directory name. Directory names should include only characters, numbers, hyphens, underscores, and forward slashes.'
    );
    return;
  }

  // print the values in the screen
  core.info(`[js-dependency-update] : base branch is ${base_branch}`);
  core.info(`[js-dependency-update] : target branch is ${target_branch}`);
  core.info(`[js-dependency-update] : working directory is ${working_directory}`);

  // executing commands in shell
  await exec.exec('npm update', [], {
    cwd: working_directory,
  });

  const git_status_result = await exec.getExecOutput('git status -s package*.json', [], {
    cwd: working_directory,
  });

  if (git_status_result.stdout.length > 0) {
    core.info('[js-dependency-update]: There are some updates avaliable.');

    exec.exec(`git checkout -b ${target_branch}`, [], {
      cwd: working_directory
    });

    exec.exec('git add package.json package-lock.json', [], {
      cwd: working_directory
    });

    exec.exec('git commit -m "Updating dependencies node packages"', [], {
      cwd: working_directory
    });

    exec.exec(`git push -u origin ${target_branch}`, [], {
      cwd: working_directory
    });

    const octokit = github.getOctokit(gh_token);

    try {
      await octokit.rest.pulls.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        title: `Update NPM dependencies`,
        body: `This pull request updates NPM packages`,
        base: base_branch,
        head: target_branch 
      });
    } catch (e) {
      core.error('[js-dependency-update] : Something went wrong while creating the PR. Check logs below.');
      core.setFailed(e.message);
      core.error(e);
    }
  } else {
    core.info('[js-dependency-update]: No updates avaliable.');
  }
}

run();