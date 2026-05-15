export interface Transform {
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  usingBounds: boolean;
  crop: {
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
  };
}

export const EPSILON = 0.5;

export function round(value: number, gridSize: number, minValue: number, maxValue: number) {
  return Math.min(maxValue, Math.max(minValue, Math.round(value / gridSize) * gridSize));
}

export function withinEpsilon(a: number, b: number) {
  return Math.abs(a - b) < EPSILON;
}

export function snapToGrid(
  canvas: { width: number, height: number },
  grid: { width: number, height: number },
  transform: Transform,
): Transform {
  const gridWidth = canvas.width / grid.width;
  const gridHeight = canvas.height / grid.height;

  const roundedWidth = round(transform.width, gridWidth, gridWidth, canvas.width);
  const croppedSourceWidth = transform.sourceWidth - (transform.crop.left ?? 0) - (transform.crop.right ?? 0);
  const scale = roundedWidth / croppedSourceWidth;
  const roundedHeight = transform.usingBounds
    ? round(transform.height, gridHeight, gridHeight, canvas.height)
    : transform.sourceHeight * scale;

  const roundedX = round(transform.positionX, gridWidth, 0, canvas.width);
  const top = transform.positionY;
  const bottom = transform.positionY + roundedHeight;
  const roundedTop = round(top, gridHeight, 0, canvas.height);
  const roundedBottom = round(bottom, gridHeight, 0, canvas.height);
  // Bias towards top alignment
  const roundedY = Math.abs(roundedTop - top) < Math.abs(roundedBottom - bottom) + 1
    ? roundedTop
    : roundedBottom - roundedHeight;
  const rounded: Transform = {
    positionX: roundedX,
    positionY: roundedY,
    width: roundedWidth,
    height: roundedHeight,
    sourceWidth: transform.sourceWidth,
    sourceHeight: transform.sourceHeight,
    usingBounds: transform.usingBounds,
    crop: transform.crop,
  };
  return rounded;
}
