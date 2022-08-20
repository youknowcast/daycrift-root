#!/usr/bin/env zx

//
// Upload local files to AWS S3
// usage:
//   % ./scripts/upload_images.mjs
// This tool compares AWS S3 image files and local image files.
// Files that does not exist in S3 are found at local, then upload all.
// AWS S3 file format is {year}-{month}-{yyyymmdd}-{file name} and all files are flatly at S3 root directory.
//

//
// upload_config.json
// {
//   "removeAfterUpload": {if you want to remove file after upload, set true. or not, set false},
//   "aws": {
//     "profile": "{your aws profile name}",
//     "imagesBucket": "{your aws s3 bucket uri, begin with `s3://`}",
//     "cloudfrontUrl": "{your aws cloudfront url}"
//   }
// }
//
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
  let ret = []
  try {
    const data = await $`find content`.pipe($`grep -E '(png|jpeg|jpg)'`)
    ret = data.stdout.split('\n')
  } catch (e) {
    console.log('there are no local images')
  }
  return ret
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

async function removeImage(path) {
  if (CONFIG.removeAfterUpload && fs.pathExists(path)) {
    const command = `rm -f ${path}`
    await $`${command.split(' ')}`
  }
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
    const command = `sed -i -e s/\\(.\\/\\)\\{0,1\\}${name}/${remoteUrl(image).replace(/\//g, '\\/')}/g ${index}`
    await $`${command.split(' ')}`

    // remove image file
    await removeImage(image)
  } else {
    console.log(`skipped file: ${image}`)

    await remoteImage(image)
  }
})
