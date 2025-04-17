/////////////////////////////CustomSVGMaskPath Component/////////////////////////////////////////////////////////////////////////////////////

// This component creates a custom SVG mask path for the WorkHoursChart component.
// It defines a mask that cuts a hole in the canvas, displaying the chart at the correct position with an additional 50px offset downwards.

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { Animated } from "react-native";

///////////////////////////////////////////////////////////////////////////////////////////////////

interface StepType {
  name?: string; // optional: name of the current step, used to determine specific behavior
  order?: number; // optional: order of the step, for sequencing
}

interface SvgMaskArguments {
  size: Animated.ValueXY; // size of the area to mask
  position: Animated.ValueXY; // position of the mask relative to the canvas
  canvasSize: { x: number; y: number }; // dimensions of the canvas
  step: StepType; // current step info for determining specific adjustments
}

///////////////////////////////////////////////////////////////////////////////////////////////////

export function customSvgMaskPath({
  size,
  position,
  canvasSize,
  step,
}: SvgMaskArguments): string {
  // apply an extra vertical offset if the step is 'WorkHoursChart' (50px downwards)
  const extraY = step.name === "WorkHoursChart" ? 50 : 0;

  // extract x and y positions from Animated.ValueXY
  const x0 = (position.x as any).__getValue() as number;
  const y0 = ((position.y as any).__getValue() as number) + extraY;

  // calculate the bottom-right corner of the mask rectangle
  const x1 = x0 + ((size.x as any).__getValue() as number);
  const y1 = y0 + ((size.y as any).__getValue() as number);

  // construct and return the SVG path string for the mask
  return (
    // create a rectangular mask for the entire canvas
    `M0,0H${canvasSize.x}V${canvasSize.y}H0V0` +
    // create an inner rectangle that will be "cut out" from the mask
    `ZM${x0},${y0}H${x1}V${y1}H${x0}V${y0}Z`
  );
}
