// @ts-ignore
import React from "react"
import { Mermaid } from 'mdx-mermaid/lib/Mermaid'

// usage:
//   import md from '../src/markdown'
//   md(`sequenceDiagram
//     participant Alice
//     participant Bob
//     Alice->>John: Hello John, how are you?
//     loop Healthcheck
//         John->>John: Fight against hypochondria
//     end
//     Note right of John: Rational thoughts <br/>prevail!
//     John-->>Alice: Great!
//     John->>Bob: How about you?
//     Bob-->>John: Jolly good!`)
export default function Markdown(props) {
  return <Mermaid chart={props.graph} config={{theme:  { light: 'default', dark: 'default' }}} />
}

