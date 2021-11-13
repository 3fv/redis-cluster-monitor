#!/bin/bash -e

NPM_VERSION=${1}

if [[ -z "${NPM_VERSION}" ]];then
  echo "package version must be provided"
  exit 255
fi

git push --tags
echo Publishing

yarn publish . --from-package --non-interactive --tag ${NPM_VERSION}

git push 
echo "Successfully released version ${NPM_VERSION}!"