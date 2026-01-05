export const config = {
  port: process.env.PORT || 8080,
  mediaPath: process.env.MEDIA_PATH || '/data',
  videoExtensions: [
    '.mp4',
    '.mkv',
    '.avi',
    '.mov',
    '.wmv',
    '.flv',
    '.webm',
    '.m4v',
    '.mpg',
    '.mpeg',
    '.3gp',
  ],
};
