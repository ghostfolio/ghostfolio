set -xe
echo "$DOCKER_HUB_ACCESS_TOKEN" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin

docker build -t ghostfolio/ghostfolio:$TRAVIS_TAG -t ghostfolio/ghostfolio:latest .
docker push ghostfolio/ghostfolio --all-tags
