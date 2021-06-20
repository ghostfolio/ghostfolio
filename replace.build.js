const dotenv = require('dotenv');
const path = require('path');
const replace = require('replace-in-file');

dotenv.config({
  path: path.resolve(__dirname, '.env')
});

const now = new Date();
const buildTimestamp = `${formatWithTwoDigits(
  now.getDate()
)}.${formatWithTwoDigits(
  now.getMonth() + 1
)}.${now.getFullYear()} ${formatWithTwoDigits(
  now.getHours()
)}:${formatWithTwoDigits(now.getMinutes())}`;

try {
  let changedFiles = replace.sync({
    files: './dist/apps/client/main.*.js',
    from: /{BUILD_TIMESTAMP}/g,
    to: buildTimestamp,
    allowEmptyPaths: false
  });
  console.log('Build version set: ' + buildTimestamp);
  console.log(changedFiles);

  changedFiles = replace.sync({
    files: './dist/apps/client/main.*.js',
    from: /{STRIPE_PUBLIC_KEY}/g,
    to: process.env.STRIPE_PUBLIC_KEY ?? '',
    allowEmptyPaths: false
  });
  console.log(changedFiles);
} catch (error) {
  console.error('Error occurred:', error);
}

function formatWithTwoDigits(aNumber) {
  return aNumber < 10 ? '0' + aNumber : aNumber;
}
