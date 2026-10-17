import { Composition } from 'remotion'
import { ImageAnalysis } from './ImageAnalysis'
import { Matching } from './Matching'
import { Overview } from './Overview'
import { Routes } from './Routes'

const size = { width: 960, height: 540, fps: 30 }

export function Root() {
  return (
    <>
      <Composition component={Overview} durationInFrames={300} id="overview" {...size} />
      <Composition component={ImageAnalysis} durationInFrames={360} id="image-analysis" {...size} />
      <Composition component={Matching} durationInFrames={390} id="matching" {...size} />
      <Composition component={Routes} durationInFrames={420} id="routes" {...size} />
    </>
  )
}
