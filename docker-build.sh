#!/bin/sh

# Must be logged to docker hub:
# docker login -u cyphernode

# Must enable experimental cli features
# "experimental": "enabled" in ~/.docker/config.json

image() {
  local arch=$1
  local arch2=$2

  echo "Building and pushing cyphernode/lnurl for ${arch} tagging as ${version} alpine arch ${arch2}..."

  docker build --no-cache -t cyphernode/lnurl:${arch}-${version} --build-arg ARCH=${arch2} . \
  && docker push cyphernode/lnurl:${arch}-${version}

  return $?
}

manifest() {
  echo "Creating and pushing manifest for cyphernode/lnurl for version ${version}..."

  docker manifest create cyphernode/lnurl:${version} \
                         cyphernode/lnurl:${x86_docker}-${version} \
                         cyphernode/lnurl:${arm_docker}-${version} \
                         cyphernode/lnurl:${aarch64_docker}-${version} \
  && docker manifest annotate cyphernode/lnurl:${version} cyphernode/lnurl:${arm_docker}-${version} --os linux --arch ${arm_docker} \
  && docker manifest annotate cyphernode/lnurl:${version} cyphernode/lnurl:${x86_docker}-${version} --os linux --arch ${x86_docker} \
  && docker manifest annotate cyphernode/lnurl:${version} cyphernode/lnurl:${aarch64_docker}-${version} --os linux --arch ${aarch64_docker} \
  && docker manifest push -p cyphernode/lnurl:${version}

  return $?
}

x86_docker="amd64"
x86_alpine=""
arm_docker="arm"
arm_alpine="arm32"
aarch64_docker="arm64"
aarch64_alpine=""

# Build amd64 and arm64 first, building for arm will trigger the manifest creation and push on hub

#arch_docker=${arm_docker} ; arch_alpine=${arm_alpine}
#arch_docker=${aarch64_docker} ; arch_alpine=${aarch64_alpine}
arch_docker=${x86_docker} ; arch_alpine=${x86_alpine}

version="v0.1.0-rc.1"

echo "arch_docker=$arch_docker, arch_alpine=$arch_alpine"

image ${arch_docker} ${arch_alpine}

[ $? -ne 0 ] && echo "Error" && exit 1

[ "${arch_docker}" = "${x86_docker}" ] && echo "Built and pushed ${arch_docker} only" && exit 0
[ "${arch_docker}" = "${aarch64_docker}" ] && echo "Built and pushed ${arch_docker} only" && exit 0
[ "${arch_docker}" = "${arm_docker}" ] && echo "Built and pushed images, now building and pushing manifest for all archs..."

manifest

[ $? -ne 0 ] && echo "Error" && exit 1
