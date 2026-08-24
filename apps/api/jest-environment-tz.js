const NodeEnvironment = require('jest-environment-node').TestEnvironment;

// Jest gives each test file a copy of `process`, so a test cannot change the
// time zone at run time. This environment sets `TZ` on the real process of the
// worker, which resets the internal date cache of Node.
class TimeZoneEnvironment extends NodeEnvironment {
  constructor(config, context) {
    super(config, context);

    this.timeZone = config.projectConfig.testEnvironmentOptions?.timeZone;
  }

  async setup() {
    this.previousTimeZone = process.env.TZ;

    if (this.timeZone) {
      process.env.TZ = this.timeZone;
    }

    await super.setup();
  }

  async teardown() {
    try {
      await super.teardown();
    } finally {
      if (this.previousTimeZone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = this.previousTimeZone;
      }
    }
  }
}

module.exports = TimeZoneEnvironment;
