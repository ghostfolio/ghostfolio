const replace = require('replace-in-file');
const now = new Date();
const buildTimestamp = `${formatWithTwoDigits(
  now.getDate()
)}.${formatWithTwoDigits(
  now.getMonth() + 1
)}.${now.getFullYear()} ${formatWithTwoDigits(
  now.getHours()
)}:${formatWithTwoDigits(now.getMinutes())}`;
const options = {
  files: './dist/apps/client/main.*.js',
  from: /{BUILD_TIMESTAMP}/g,
  to: buildTimestamp,
  allowEmptyPaths: false
};

try {
  const changedFiles = replace.sync(options);
  console.log('Build version set: ' + buildTimestamp);
  console.log(changedFiles);
} catch (error) {
  console.error('Error occurred:', error);
}

function formatWithTwoDigits(aNumber) {
  return aNumber < 10 ? '0' + aNumber : aNumber;
}
