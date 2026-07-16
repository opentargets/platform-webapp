
import { GenTrackProvider, GenTrackTooltipProvider } from "ui";
import BodyContentInner from './BodyContentInner';

function randomRect({ xMin, xMax, yMin, yMax }) {
  const category = Math.floor(Math.random() * 20);
  return {
    x: Math.random() * (xMax - xMin) + xMin,
    y: category * 5,
    category,
    w: Math.random() * 2,
    h: 5,
  }
}

// generate some fake data for now
const xMin = 200;
const xMax = 700;
const yMin = 0;
const yMax = 100;
const barInterval = (xMax - xMin) / 50;
const data = {
  longRects: [
    { x1: 200, x2: 500, y1: 1, y2: 24 },
    { x1: 300, x2: 650, y1: 26, y2: 49 },
    { x1: 250, x2: 400, y1: 51, y2: 74 },
    { x1: 600, x2: 700, y1: 76, y2: 99 },
  ],
  shortRects: new Array(5_000).fill(0).map(() => randomRect({xMin, xMax, yMin, yMax})),
  bars: new Array(50).fill(1).map((_, i) => {
    const h = Math.random() * yMax;
    return {
      x: xMin + (i * barInterval),
      y: 100 - h,
      w: barInterval - 1,
      h,
    };
  }),
}

function BodyContent({}) {
  return (
    <GenTrackProvider initialState={{ data, xMin: 200, xMax: 700 }} >
      <GenTrackTooltipProvider >
        <BodyContentInner data={data} yMin={yMin} yMax={yMax} />
      </GenTrackTooltipProvider>
    </GenTrackProvider>
  );
}

export default BodyContent;