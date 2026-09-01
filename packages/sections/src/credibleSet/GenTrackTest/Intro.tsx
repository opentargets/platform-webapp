
import { Typography } from "@mui/material";

export default function Intro() {
  return (
    <>
      <Typography sx={{ pt: 4 }}>
        Demo of the prototype <code>GenTrack</code> component rendering fake data. The purpose is to check the component works and has good performance - ignore appearance details, lack of tooltip, loading flash, etc. for now.
      </Typography>
      <p>The basic idea of the component is to display a set of horizontally aligned 'tracks' that show anything we want. More details:</p>
      <ul>
        <li>Any number of top-level and zoom-level tracks. The same track can be used at both levels, but need not be.</li>
        <li>Each track can show arbitrary content.</li>
        <li>All tracks share the same x-scale. Each track has its own y-scale.</li>
        <li>An optional x-info (any React component) is shown above the top-level tracks and a (possibly) different x-info is shown above the zoom-level tracks. Each x-info component is passed the relevant scale - note that the bottom x-info updates on pan/zoom.</li>
        <li>Each track takes an optional y-info (any React component) which is passed the relevant scale.</li>
      </ul>
      <p>Tracks are written in Pixi/react. There is a single Pixi.js (WebGL) canvas for the top-level tracks and a second Pixi canvas for the zoom-level tracks (if used). The <code>GenTrack</code> component takes care of positioning the tracks, stretching them to the correct width, adding the pan-zoom window, etc.</p>

      <p>Pixi.js + Pixi/react is a good choice since it keeps everything in React, is easy to use, has smallish download size and excellent performance. In this example, the 'Segments' tracks each have 20,000 elements but we could go much higher. While the example only draws rectangles, Pixi can draw anything we will need for this type of visualisation.</p>
    </>
  )
}