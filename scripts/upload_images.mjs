#!/usr/bin/env zx

const CONFIG = require('../upload-config.json')

function awsProfile() {
  return `--profile ${CONFIG.aws.profile}`
}

async function remoteAllImages() {
  const command = `aws s3 ls ${CONFIG.aws.imagesBucket} --recursive ${awsProfile()}`
  const data = await $`${command.split(' ')}`.pipe($`awk '{print $NF}'`)
  return data.stdout.split('\n')
}

async function localAllImages() {
  const data = await $`find content`.pipe($`grep -E '(png|jpeg|jpg)'`)
  return data.stdout.split('\n')
}

function remoteUrl(path) {
  return `${CONFIG.aws.cloudfrontUrl}/${remoteName(path)}`
}

function remoteName(path) {
  const filtered = /(content|posts|pages)/
  return path.split('/').filter(s => !s.match(filtered)).join('-')
}

function indexPath(path) {
  let index = path.split('/')
  index[index.length - 1] = 'index.mdx'
  return index.join('/')
}

function imageName(path) {
  const fragments = path.split('/')
  return fragments[fragments.length - 1]
}

async function uploadS3(path, name) {
  const command = `aws s3 cp ${path} ${CONFIG.aws.imagesBucket}/${name} ${awsProfile()}`
  await $`${command.split(' ')}`
}

const remoteImages = await remoteAllImages()
const localImages = await localAllImages()

localImages.forEach(async (image) => {
  if (image === '') return

  const remoteImage = remoteName(image)
  if (!remoteImages.includes(remoteImage)) {
    // new file
    console.log(`uploading file: ${image}`)
    await uploadS3(image, remoteImage)

    // change mdx image file uri
    const index = indexPath(image)
    const name = imageName(image)
    // command is opened with $'', so it needs double-escaped
    // then, BSD sed creates backup file with -i option. set '' to avoid creation.
    const command = `sed -i \\'\\' -e s/\\(.\\/\\)\\{0,1\\}${name}/${remoteUrl(image).replace(/\//g, '\\/')}/g ${index}`
    await $`${command.split(' ')}`
  } else {
    console.log(`skipped file: ${image}`)
  }
})
