import { Dimensions } from 'react-native';

export const MAX_PHOTOS = 9;
export const GAP = 8;

const screenWidth = Dimensions.get('window').width;
export const photoWidth = (screenWidth - 16 - GAP * 2) / 3;
export const photoHeight = photoWidth * 1.4;

export interface PhotoTransform {
  scale: number;
  translateX: number;
  translateY: number;
  scaledWidth: number;
  scaledHeight: number;
}

export function calculatePhotoTransform(photo: {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}): PhotoTransform {
  // Calculate scale needed to fill the frame
  const scaleX = photoWidth / photo.width;
  const scaleY = photoHeight / photo.height;

  // Use the larger scale to ensure the frame is completely filled
  const scale = Math.max(scaleX, scaleY);

  // Calculate the scaled dimensions
  const scaledWidth = photo.width * scale;
  const scaledHeight = photo.height * scale;

  // Calculate center point in scaled coordinates
  const scaledCenterX = photo.centerX * scale;
  const scaledCenterY = photo.centerY * scale;

  // Calculate translation needed to center the photo's focal point
  const translateX = photoWidth / 2 - scaledCenterX;
  const translateY = photoHeight / 2 - scaledCenterY;

  return {
    scale,
    translateX,
    translateY,
    scaledWidth,
    scaledHeight,
  };
}
