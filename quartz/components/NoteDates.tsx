import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { noteDatesText } from "../util/noteDates"

/** "Publicado el … · actualizado el …" from the dates Scratchpad writes. */
const NoteDates: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const text = noteDatesText(fileData.frontmatter ?? {})
  return text ? <p class={classNames(displayClass, "note-dates")}>{text}</p> : null
}

NoteDates.css = `
.note-dates {
  margin-top: 0;
  color: var(--gray);
  font-size: 0.9rem;
}
`

export default (() => NoteDates) satisfies QuartzComponentConstructor
