set -xe
echo "$DOCKER_HUB_ACCESS_TOKEN" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin

docker build -t ghostfolio/ghostfolio:$TRAVIS_TAG .
docker push ghostfolio/ghostfolio:$TRAVIS_TAG
