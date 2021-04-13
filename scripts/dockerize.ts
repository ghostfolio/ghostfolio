import * as dotenv from 'dotenv';
import * as path from 'path';

const replace = require('replace-in-file');
const version = require(path.resolve(__dirname, '..', 'package.json')).version;

/**
 * Creates a docker image
 */
class Dockerizer {
  /**
   * @constructor
   */
  constructor() {
    dotenv.config({
      path: path.resolve(__dirname, '..', '.env')
    });
  }

  public async dockerize(aVersion: string) {
    console.log('Dockerizing...');

    console.log('Version:', aVersion);

    await this.executeShellCommand('rm -rf ./dist');

    console.log(`Building source...`);

    await this.executeShellCommand('ng build --prod api');

    await this.executeShellCommand('ng build --prod client');

    await this.executeShellCommand('yarn run replace-placeholders-in-build');

    console.log(`Copying files...`);

    await this.executeShellCommand(`mkdir -p ./docker/${aVersion}`);
    await this.executeShellCommand(`cp -r ./dist/ ./docker/${aVersion}`);

    await this.executeShellCommand(`mkdir ./docker/${aVersion}/prisma`);
    await this.executeShellCommand(
      `cp -r ./prisma/schema.prisma ./docker/${aVersion}/prisma/schema.prisma`
    );

    await this.executeShellCommand(
      `cp ./docker-compose.yml ./docker/${aVersion}`
    );

    try {
      replace.sync({
        allowEmptyPaths: false,
        files: `./docker/${aVersion}/docker-compose.yml`,
        from: /{{VERSION}}/g,
        to: aVersion
      });
    } catch (error) {
      console.error('Error while replacing docker-compose.yml:', error);
    }

    await this.executeShellCommand(`cp ./Dockerfile ./docker/${aVersion}`);
    await this.executeShellCommand(`cp ./package.json ./docker/${aVersion}`);
    await this.executeShellCommand(`cp ./yarn.lock ./docker/${aVersion}`);

    await this.executeShellCommand(
      `cd docker/${aVersion} && yarn install --production`
    );

    console.log('Dockerizing has been completed successfully.');
  }

  /**
   * Executes a shell command and return it as a promise
   */
  private executeShellCommand(cmd: string) {
    const exec = require('child_process').exec;
    return new Promise((resolve, reject) => {
      // Maximum buffer size increased to 1000 * 1000KB
      exec(cmd, { maxBuffer: 1000 * 1024 * 1000 }, (error, stdout, stderr) => {
        if (error) {
          console.warn(error);
        }
        resolve(stdout ? stdout : stderr);
      });
    });
  }
}

const dockerizer = new Dockerizer();
dockerizer.dockerize(version);
