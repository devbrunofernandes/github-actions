const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

const validateBranchName = ({ branchName }) =>
  /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);
const validateDirectoryName = ({ dirName }) =>
  /^[a-zA-Z0-9_\-\/]+$/.test(dirName);

const setup_git = async () => {
  await exec.exec(`git config --global user.name "gh-automation"`);
  await exec.exec(`git config --global user.email "gh-automation@email.com"`);
};

const setup_logger = ({ debug, prefix } = { debug: false, prefix: ''}) => ({
  debug: (message) => {
    if (debug) {
      core.info(`DEBUG ${prefix}${prefix ? ' : ' : ''}${message}`);
    }
  },
  error: (message) => {
    core.error(`${prefix}${prefix ? ' : ' : ''}${message}`);
  },
  info: (message) => {
    core.info(`${prefix}${prefix ? ' : ' : ''}${message}`);
  }
});

const common_exec_options = {
  cwd: working_directory
};

async function run() {
  // inputs
  const base_branch = core.getInput('base-branch', { required: true});
  const target_branch = core.getInput('target-branch', { required: true});
  const head_branch = core.getInput('head-branch') || target_branch;
  const working_directory = core.getInput('working-directory', { required: true});
  const gh_token = core.getInput('gh-token', { required: true});
  const debug = core.getBooleanInput('debug');
  const logger = setup_logger({debug, prefix: '[js-dependency-update]'});

  core.setSecret(gh_token);

  // validating
  logger.debug('Validating inputs - base-branch, head-branch, working-directory');

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
  logger.debug(`base branch is ${base_branch}`);
  logger.debug(`target branch is ${target_branch}`);
  logger.debug(`working directory is ${working_directory}`);

  // executing commands in shell
  await exec.exec('npm update', [], {
    ...common_exec_options
  });

  const git_status_result = await exec.getExecOutput('git status -s package*.json', [], {
    ...common_exec_options
  });

  if (git_status_result.stdout.length > 0) {
    logger.debug('There are some updates avaliable.');
    logger.debug('Setting up git');
    setup_git();

    logger.debug('Commiting and pushing package*.json');

    await exec.exec(`git checkout -b ${target_branch}`, [], {
      ...common_exec_options
    });

    await exec.exec('git add package.json package-lock.json', [], {
      ...common_exec_options
    });

    await exec.exec('git commit -m \"Updating dependencies node packages\"', [], {
      ...common_exec_options
    });

    await exec.exec(`git push -u origin ${target_branch} --force`, [], {
      ...common_exec_options
    });

    logger.debug('Fetching octokit API');
    const octokit = github.getOctokit(gh_token);

    try {
      logger.debug(`Creating PR using head branch ${head_branch}`);
      await octokit.rest.pulls.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        title: `Update NPM dependencies`,
        body: `This pull request updates NPM packages`,
        base: base_branch,
        head: head_branch 
      });
    } catch (e) {
      logger.error('Something went wrong while creating the PR. Check logs below.');
      core.setFailed(e.message);
      logger.error(e);
    }
  } else {
    logger.info('No updates avaliable.');
  }
}

run();